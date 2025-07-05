import { Request, Response } from 'express';
import pool from '../config/db';
export const createReserva = async (req: Request, res: Response) => {
  // --- Paso de depuración: Imprimir el body de la solicitud para verificar ---
  console.log('--- Solicitud POST /api/reservas recibida ---');
  console.log('Body de la solicitud:', req.body);
  // --- Fin de paso de depuración ---

  const client = await pool.connect();

  try {
    const {
      nombre,
      apellido,
      correo_electronico,
      telefono,
      // mesa_id y horario_id se desestructuran, pero NO serán obligatorios
      mesa_id,
      horario_id,
      fecha_reserva,
      cantidad_personas,
      notas = null // Las notas son opcionales por defecto en el body
    } = req.body;

    // --- CAMBIO CLAVE 1: Definir solo los campos obligatorios para el cliente ---
    // NO se incluyen mesa_id y horario_id aquí.
    const camposRequeridosParaCliente = {
      nombre,
      apellido, // Si 'apellido' es opcional en tu frontend, quítalo de aquí también.
      telefono,
      correo_electronico,
      fecha_reserva,
      cantidad_personas
    };

    // Filtra los campos que están ausentes, nulos o vacíos
    const camposFaltantes = Object.entries(camposRequeridosParaCliente)
      .filter(([_, value]) => value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key);

    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        error: 'Campos obligatorios faltantes para la reserva del cliente',
        campos: camposFaltantes
      });
    }

    // --- Validación de tipo para cantidad_personas ---
    const parsedCantidadPersonas = parseInt(cantidad_personas);
    if (isNaN(parsedCantidadPersonas) || parsedCantidadPersonas <= 0) {
      return res.status(400).json({ error: 'cantidad_personas debe ser un número válido y mayor que cero.' });
    }

    // --- Puedes añadir más validaciones de formato aquí, por ejemplo para fecha_reserva o correo_electronico ---
    // if (!isValidEmail(correo_electronico)) { ... }
    // if (!isValidDate(fecha_reserva)) { ... }


    await client.query('BEGIN'); // Inicia una transacción de base de datos

    // 1. Manejo del cliente (INSERT o UPDATE si el correo/teléfono ya existe)
    // El ON CONFLICT evita duplicados y actualiza el cliente si ya existe.
    const clienteQuery = `
      INSERT INTO clientes (
        nombre, apellido, correo_electronico, telefono, notas
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (correo_electronico) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        apellido = EXCLUDED.apellido,
        telefono = EXCLUDED.telefono,
        notas = COALESCE(EXCLUDED.notas, clientes.notas),
        fecha_actualizacion = CURRENT_TIMESTAMP
      RETURNING id, en_lista_negra, es_frecuente
    `;

    const clienteResult = await client.query(clienteQuery, [
      nombre,
      apellido,
      correo_electronico,
      telefono,
      notas
    ]);

    const cliente = clienteResult.rows[0];

    // 2. Verificar si el cliente está en lista negra
    if (cliente.en_lista_negra) {
      await client.query('ROLLBACK'); // Deshace los cambios del cliente si está en lista negra
      return res.status(403).json({
        error: 'Cliente en lista negra',
        message: 'No se pueden realizar reservas para este cliente.'
      });
    }

    // 3. Creación de la reserva
    // --- CAMBIO CLAVE 2: Permitir que mesa_id y horario_id sean NULL en la base de datos ---
    // COALESCE($2, NULL) y COALESCE($3, NULL) aseguran que si los parámetros son NULL/undefined,
    // se inserte un NULL explícito en la columna de la base de datos.
    const reservaQuery = `
      INSERT INTO reservas (
        cliente_id, mesa_id, horario_id,
        fecha_reserva, cantidad_personas, notas
      ) VALUES ($1, COALESCE($2, NULL::integer), COALESCE($3, NULL::integer), $4, $5, $6)
      RETURNING *
    `;

     // Aseguramos que mesa_id y horario_id sean null si no están presentes o son vacíos/cadenas no válidas
    const finalMesaId = (mesa_id === undefined || mesa_id === null || mesa_id === '') ? null : Number(mesa_id);
    const finalHorarioId = (horario_id === undefined || horario_id === null || horario_id === '') ? null : Number(horario_id);

    // Si por alguna razón mesa_id o horario_id fueran cadenas como "null" o "undefined"
    // y Number() las convierte en NaN, también las queremos como null.
    const mesaIdToInsert = (finalMesaId !== null && isNaN(finalMesaId)) ? null : finalMesaId;
    const horarioIdToInsert = (finalHorarioId !== null && isNaN(finalHorarioId)) ? null : finalHorarioId;


    const reservaResult = await client.query(reservaQuery, [
      cliente.id,
      mesaIdToInsert,      // <--- Usamos la variable verificada
      horarioIdToInsert,   // <--- Usamos la variable verificada
      fecha_reserva,
      parsedCantidadPersonas,
      notas
    ]);

    await client.query('COMMIT'); // Confirma la transacción

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Reserva creada con éxito. Mesa y horario serán asignados posteriormente.',
      reserva: reservaResult.rows[0], // La reserva completa recién creada
      cliente: { // Información relevante del cliente
        id: cliente.id,
        nombre,
        apellido,
        correo_electronico,
        telefono,
        es_frecuente: cliente.es_frecuente
      }
    });

  } catch (error: any) {
    await client.query('ROLLBACK'); // En caso de error, deshace toda la transacción

    console.error('Error en createReserva:', error);

    // Manejo específico de errores comunes de PostgreSQL
    if (error.code === '23505') { // Violación de restricción única
      // Esto podría ocurrir si hay una restricción UNIQUE en (cliente_id, fecha_reserva, horario_id)
      // y se intenta insertar una reserva con los mismos valores, incluso si mesa_id/horario_id son NULL.
      return res.status(409).json({
        error: 'Conflicto de reserva',
        message: 'Ya existe una reserva con los datos proporcionados para este cliente en esta fecha/hora.'
      });
    } else if (error.code === '23503') { // Violación de clave foránea
      // Este error indica que un ID referenciado no existe (ej. cliente_id no existe,
      // o un mesa_id/horario_id _proporcionado_ no existe, aunque ahora son NULLABLE).
      return res.status(404).json({
        error: 'Recurso no encontrado',
        message: 'El cliente, mesa o horario especificado no existe.'
      });
    } else if (error.code === '22P02') { // Error de formato de entrada (ej. texto donde va número)
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        message: 'Alguno de los campos tiene un formato incorrecto (ej. texto en un campo numérico).'
      });
    }

    // Respuesta genérica para otros errores del servidor
    res.status(500).json({
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined // Muestra el mensaje de error solo en desarrollo
    });

  } finally {
    client.release(); // Libera el cliente de la conexión a la base de datos
  }
};