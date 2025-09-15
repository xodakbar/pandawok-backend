import { Request, Response } from 'express';
import pool from '../config/db';
import { enviarCorreo } from '../correo/mail';
import { QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';


const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

// Crear reserva con cliente

export const createReserva = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      nombre,
      apellido,
      correo_electronico,
      telefono,
      mesa_id,
      horario_id,
      fecha_reserva,
      cantidad_personas,
      notas = null,
    } = req.body;

    if (!nombre || !apellido || !correo_electronico || !telefono || !fecha_reserva || !cantidad_personas) {
      return res.status(400).json({ message: 'Faltan datos obligatorios para crear reserva' });
    }

    await client.query('BEGIN');

    // 1️⃣ Crear o actualizar cliente
    const clienteQuery = `
      INSERT INTO clientes (nombre, apellido, correo_electronico, telefono, notas)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (correo_electronico)
      DO UPDATE SET nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, telefono = EXCLUDED.telefono
      RETURNING *
    `;
    const clienteResult = await client.query(clienteQuery, [nombre, apellido, correo_electronico, telefono, notas]);
    const cliente = clienteResult.rows[0];

    // 2️⃣ Validación lista negra
    if (cliente.en_lista_negra) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cliente en lista negra' });
    }

    // 3️⃣ Validar duplicados (cliente, fecha, horario)
    const duplicadoQuery = `
      SELECT id FROM reservas
      WHERE cliente_id = $1 AND fecha_reserva = $2 AND horario_id = $3
    `;
    const duplicadoResult: QueryResult<any> = await client.query(duplicadoQuery, [
      cliente.id,
      fecha_reserva,
      horario_id,
    ]);
    if ((duplicadoResult.rowCount ?? 0) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ya existe una reserva para este cliente en esta fecha y horario' });
    }

    // 4️⃣ Crear reserva
    const reservaQuery = `
      INSERT INTO reservas (cliente_id, mesa_id, horario_id, fecha_reserva, cantidad_personas, notas, estado)
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
      RETURNING *
    `;
    const reservaResult = await client.query(reservaQuery, [
      cliente.id,
      mesa_id ?? null,
      horario_id ?? null,
      fecha_reserva,
      cantidad_personas,
      notas && notas.trim() !== '' ? notas : null,
    ]);
    const reserva = reservaResult.rows[0];

    // 5️⃣ Generar tokens únicos
    const confirmToken = uuidv4();
    const cancelToken = uuidv4();

    // 6️⃣ Crear tabla de tokens si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS reserva_tokens (
        id SERIAL PRIMARY KEY,
        reserva_id INT REFERENCES reservas(id),
        tipo VARCHAR(20),
        token VARCHAR(255)
      )
    `);

    // 7️⃣ Guardar tokens
    await client.query(
      `INSERT INTO reserva_tokens (reserva_id, tipo, token) VALUES ($1, 'confirm', $2), ($1, 'cancel', $3)`,
      [reserva.id, confirmToken, cancelToken]
    );

    await client.query('COMMIT');

    // 8️⃣ Construir links
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const confirmUrl = `${baseUrl}/confirmar-reserva/${confirmToken}`;
    const cancelUrl = `${baseUrl}/confirmar-reserva/${cancelToken}`;


    // 9️⃣ Enviar correo al cliente
    const subject = 'Confirma tu reserva en PandaWok';
    const html = `
      <p>Hola ${nombre} ${apellido},</p>
      <p>Tu reserva para el día ${new Date(fecha_reserva).toLocaleDateString()} está pendiente.</p>
      <p>Por favor confirma o rechaza tu hora:</p>
      <p>
        <a href="${confirmUrl}" style="padding:10px 20px; background-color:#28a745; color:white; text-decoration:none; margin-right:10px;">Confirmar</a>
        <a href="${cancelUrl}" style="padding:10px 20px; background-color:#dc3545; color:white; text-decoration:none;">Cancelar</a>
      </p>
      <p>Gracias,<br/>PandaWok</p>
    `;
    enviarCorreo(correo_electronico, subject, '', html).catch(console.error);

    return res.status(201).json({ success: true, reserva, cliente });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error en createReserva:', error);
    return res.status(500).json({ error: 'Error interno al crear reserva' });
  } finally {
    client.release();
  }
};


export const getReservasByDate = async (req: Request, res: Response) => {
  try {
    const { fecha } = req.query;
    const query = `
      SELECT r.*, 
             CONCAT(h.hora_inicio, ' - ', h.hora_fin) as horario_descripcion,
             m.numero_mesa, 
             s.nombre as salon_nombre,
             c.nombre as cliente_nombre,
             c.apellido as cliente_apellido,
             c.id as cliente_id
      FROM reservas r
      LEFT JOIN clientes c ON r.cliente_id = c.id
      LEFT JOIN horarios_disponibles h ON r.horario_id = h.id
      LEFT JOIN mesas m ON r.mesa_id = m.id
      LEFT JOIN salones s ON m.salon_id = s.id
      WHERE r.fecha_reserva = $1
      ORDER BY h.hora_inicio ASC NULLS LAST, r.id ASC
    `;
    const result = await pool.query(query, [fecha]);
    res.json({ reservas: result.rows.map(r => ({
      ...r,
      cliente_nombre: r.cliente_nombre || null,
      cliente_apellido: r.cliente_apellido || null,
    })) });
  } catch (error) {
    console.error('Error en getReservasByDate:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Crear reserva sin cliente (Walk-in)
export const createReservaWalkIn = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      mesa_id,
      horario_id = null,
      fecha_reserva,
      cantidad_personas,
      notas = null,
    } = req.body;

    if (!mesa_id || !fecha_reserva || !cantidad_personas) {
      return res.status(400).json({ message: 'Faltan datos obligatorios para crear reserva walk-in' });
    }

    await client.query('BEGIN');

    const reservaQuery = `
      INSERT INTO reservas (
        cliente_id, mesa_id, horario_id, fecha_reserva, cantidad_personas, notas
      ) VALUES (NULL, $1, $2, $3, $4, $5)
      RETURNING *
    `;

    const reservaResult = await client.query(reservaQuery, [
      mesa_id,
      horario_id,
      fecha_reserva,
      cantidad_personas,
      notas && notas.trim() !== '' ? notas : null,
    ]);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Reserva walk-in creada con éxito',
      reserva: reservaResult.rows[0],
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error en createReservaWalkIn:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};


//Muestra todas las mesas con reservas por fecha

;

// Actualizar reserva (con cliente o sin cliente)
export const updateReserva = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de reserva inválido' });
    }

    const {
      cliente_id,
      mesa_id,
      horario_id,
      fecha_reserva,
      cantidad_personas,
      notas = null,
    } = req.body;

    if (!fecha_reserva || !cantidad_personas) {
      return res.status(400).json({ message: 'Faltan datos obligatorios para actualizar reserva' });
    }

    // Convertir strings 'null' o undefined a null
    const clienteId = (cliente_id === undefined || cliente_id === null || cliente_id === 'null') ? null : Number(cliente_id);
    const mesaId = (mesa_id === undefined || mesa_id === null || mesa_id === 'null') ? null : Number(mesa_id);
    const horarioId = (horario_id === undefined || horario_id === null || horario_id === 'null') ? null : Number(horario_id);

    await client.query('BEGIN');

    const reservaUpdateQuery = `
      UPDATE reservas SET
        cliente_id = $1,
        mesa_id = COALESCE($2, NULL::integer),
        horario_id = COALESCE($3, NULL::integer),
        fecha_reserva = $4,
        cantidad_personas = $5,
        notas = $6
      WHERE id = $7
      RETURNING *
    `;

    const result = await client.query(reservaUpdateQuery, [
      clienteId,
      mesaId,
      horarioId,
      fecha_reserva,
      cantidad_personas,
      notas && notas.trim() !== '' ? notas : null,
      id,
    ]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Reserva actualizada con éxito',
      reserva: result.rows[0],
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error en updateReserva:', error);

    switch (error.code) {
      case PG_FOREIGN_KEY_VIOLATION:
        return res.status(404).json({
          error: 'Recurso no encontrado',
          message: 'El cliente, mesa o horario no existe.',
        });

      case PG_INVALID_TEXT_REPRESENTATION:
        return res.status(400).json({ error: 'Formato inválido en los datos' });

      default:
        return res.status(500).json({
          error: 'Error interno del servidor',
          message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
  } finally {
    client.release();
  }
};

// Obtener todas las reservas con datos de cliente embebidos

export const getReservas = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, estado, cliente, page = '1', limit = '20' } = req.query;

    // Paginación básica
    const pageNumber = Math.max(parseInt(page as string, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 100); // límite duro 100
    const offset = (pageNumber - 1) * pageSize;

    const values: any[] = [];
    let whereClauses: string[] = [];

    // Filtro por rango de fechas
    if (startDate && endDate) {
      whereClauses.push(`r.fecha_reserva BETWEEN $${values.length + 1} AND $${values.length + 2}`);
      values.push(startDate, endDate);
    }

    // Filtro por estado
    if (estado) {
      whereClauses.push(`r.estado ILIKE $${values.length + 1}`);
      values.push(estado);
    }

    // Filtro por nombre/apellido/correo del cliente
    if (cliente) {
      whereClauses.push(`(
        LOWER(c.nombre) ILIKE $${values.length + 1}
        OR LOWER(c.apellido) ILIKE $${values.length + 1}
        OR LOWER(c.correo_electronico) ILIKE $${values.length + 1}
      )`);
      values.push(`%${(cliente as string).toLowerCase()}%`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT r.*, 
             c.id as cliente_id, c.nombre as cliente_nombre, c.apellido as cliente_apellido, 
             c.telefono as cliente_telefono, c.correo_electronico as cliente_correo_electronico
      FROM reservas r
      LEFT JOIN clientes c ON c.id = r.cliente_id
      ${whereSQL}
      ORDER BY r.fecha_reserva DESC, r.horario_id
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM reservas r
      LEFT JOIN clientes c ON c.id = r.cliente_id
      ${whereSQL}
    `;

    const resultPromise = pool.query(query, [...values, pageSize, offset]);
    const countPromise = pool.query(countQuery, values);
    const [result, countResult] = await Promise.all([resultPromise, countPromise]);

    // Mapear resultados para anidar cliente dentro de reserva
    const reservas = result.rows.map(row => {
      const {
        cliente_id,
        cliente_nombre,
        cliente_apellido,
        cliente_telefono,
        cliente_correo_electronico,
        ...reservaData
      } = row;

      return {
        ...reservaData,
        cliente: cliente_id
          ? {
              id: cliente_id,
              nombre: cliente_nombre,
              apellido: cliente_apellido,
              telefono: cliente_telefono,
              correo_electronico: cliente_correo_electronico,
            }
          : null,
      };
    });

    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    return res.json({
      success: true,
      reservas,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      }
    });
  } catch (error) {
    console.error('Error en getReservas:', error);
    return res.status(500).json({
      error: 'Error interno al obtener reservas',
    });
  }
};


// Obtener reservas por mesa y fecha (con LEFT JOIN)
export const getReservasByMesa = async (req: Request, res: Response) => {
  try {
    const { mesa_id, fecha } = req.query;
    const query = `
      SELECT r.*, 
             CONCAT(h.hora_inicio, ' - ', h.hora_fin) as horario_descripcion,
             m.numero_mesa, 
             s.nombre as salon_nombre
      FROM reservas r
      LEFT JOIN horarios_disponibles h ON r.horario_id = h.id
      LEFT JOIN mesas m ON r.mesa_id = m.id
      LEFT JOIN salones s ON m.salon_id = s.id
      WHERE r.mesa_id = $1 AND r.fecha_reserva = $2
      ORDER BY h.hora_inicio ASC
    `;
    const result = await pool.query(query, [mesa_id, fecha]);
    res.json({ reservas: result.rows });
  } catch (error) {
    console.error('Error en getReservasByMesa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener reserva por ID (LEFT JOIN para admitir walk-in sin cliente)
export const getReservaById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const query = `
      SELECT r.*, 
             c.id as cliente_id,
             c.nombre, c.apellido, c.telefono, c.correo_electronico, c.es_frecuente, c.en_lista_negra,
             c.notas as cliente_notas, c.tags
      FROM reservas r
      LEFT JOIN clientes c ON c.id = r.cliente_id
      WHERE r.id = $1
    `;
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const row = rows[0];

    const reserva = {
      id: row.id,
      cliente_id: row.cliente_id,
      mesa_id: row.mesa_id,
      fecha_reserva: row.fecha_reserva,
      cantidad_personas: row.cantidad_personas,
      notas: row.notas,
      horario_id: row.horario_id,
      cliente: row.cliente_id
        ? {
            id: row.cliente_id,
            nombre: row.nombre,
            apellido: row.apellido,
            correo_electronico: row.correo_electronico,
            telefono: row.telefono,
            es_frecuente: row.es_frecuente,
            en_lista_negra: row.en_lista_negra,
            notas: row.cliente_notas,
            tags: row.tags,
          }
        : null,
    };

    return res.json({
      success: true,
      reserva,
    });
  } catch (error) {
    console.error('Error en getReservaById:', error);
    return res.status(500).json({ message: 'Error al obtener reserva' });
  }
};

// ** NUEVA FUNCIÓN: Marcar reserva como sentada **
export const sentarReserva = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de reserva inválido' });
    }

    await client.query('BEGIN');

    const updateQuery = `
      UPDATE reservas 
      SET status = $1 
      WHERE id = $2
      RETURNING *
    `;

    const statusSentado = 'sentado'; // Ajusta si usas otro valor para estado sentado

    const result = await client.query(updateQuery, [statusSentado, id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Reserva marcada como sentada',
      reserva: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al sentar reserva:', error);
    return res.status(500).json({ message: 'Error interno al sentar reserva' });
  } finally {
    client.release();
  }
};

// Eliminar reserva por ID
export const deleteReserva = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Primero eliminar los tokens asociados
    await client.query(
      'DELETE FROM reserva_tokens WHERE reserva_id = $1',
      [req.params.id]
    );

    // Luego eliminar la reserva
    const result = await client.query(
      'DELETE FROM reservas WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Obtener las reservas actualizadas para la fecha de la reserva eliminada
    const fecha = result.rows[0].fecha_reserva;
    const reservasActualizadas = await client.query(`
      SELECT r.*, 
             CONCAT(h.hora_inicio, ' - ', h.hora_fin) as horario_descripcion,
             m.numero_mesa, 
             s.nombre as salon_nombre
      FROM reservas r
      LEFT JOIN horarios_disponibles h ON r.horario_id = h.id
      LEFT JOIN mesas m ON r.mesa_id = m.id
      LEFT JOIN salones s ON m.salon_id = s.id
      WHERE r.fecha_reserva = $1
      ORDER BY h.hora_inicio ASC
    `, [fecha]);

    await client.query('COMMIT');
    
    res.json({ 
      message: 'Reserva eliminada correctamente',
      reservas: reservasActualizadas.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar reserva:', error);
    res.status(500).json({ message: 'Error al eliminar la reserva' });
  } finally {
    client.release();
  }
};

// Obtener historial de reservas por cliente
export const getHistorialReservasPorCliente = async (req: Request, res: Response) => {
  const clienteId = Number(req.params.clienteId);

  if (isNaN(clienteId)) {
    return res.status(400).json({ message: 'ID de cliente inválido' });
  }

  try {
    const query = `
      SELECT r.*, 
             c.nombre, c.apellido, c.telefono, c.correo_electronico
      FROM reservas r
      LEFT JOIN clientes c ON c.id = r.cliente_id
      WHERE r.cliente_id = $1
      ORDER BY r.fecha_reserva DESC
    `;

    const { rows } = await pool.query(query, [clienteId]);

    return res.json({
      success: true,
      historial: rows,
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return res.status(500).json({ message: 'Error interno al obtener historial' });
  }
};


export const actualizarEstadoReserva = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID de reserva inválido' });
    }

    const estadosValidos = ['pendiente', 'confirmada', 'cancelada'];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const updateQuery = `
      UPDATE reservas 
      SET estado = $1, fecha_actualizacion = NOW() 
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [estado, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const reserva = result.rows[0];

    // Obtener datos del cliente
    const clienteQuery = 'SELECT nombre, apellido, correo_electronico FROM clientes WHERE id = $1';
    const clienteResult = await pool.query(clienteQuery, [reserva.cliente_id]);

    if (clienteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const cliente = clienteResult.rows[0];

    if (!cliente.correo_electronico) {
      console.warn(`Cliente ${cliente.nombre} ${cliente.apellido} no tiene correo electrónico válido.`);
    } else {
      const capitalizar = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

      const subject = `Estado de tu reserva #${reserva.id} actualizado`;
      const text = `Hola ${cliente.nombre} ${cliente.apellido},

Tu reserva para la fecha ${new Date(reserva.fecha_reserva).toLocaleDateString()} ha sido actualizada al estado: ${capitalizar(estado)}.

Gracias por contactarnos.

Saludos,
PandaWok.`;

      // Enviar correo sin bloquear la respuesta
      enviarCorreo(cliente.correo_electronico, subject, text).catch((mailError) => {
        console.error('Error enviando correo:', mailError);
      });
    }

    return res.json({
      success: true,
      message: 'Estado actualizado y correo enviado (o pendiente si hubo error de envío)',
      reserva,
    });
  } catch (error) {
    console.error('Error al actualizar estado reserva:', error);
    return res.status(500).json({ error: 'Error interno al actualizar estado' });
  }
};

// responderReservaCliente.ts
export const accionReserva = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Buscar token en DB
    const result = await pool.query(`
      SELECT rt.tipo, r.id as reserva_id, r.fecha_reserva, r.cantidad_personas, r.mesa_id,
             c.id as cliente_id, c.nombre, c.apellido, c.correo_electronico, c.telefono
      FROM reserva_tokens rt
      JOIN reservas r ON r.id = rt.reserva_id
      JOIN clientes c ON c.id = r.cliente_id
      WHERE rt.token = $1
    `, [token]);

    if (result.rowCount === 0) return res.status(404).send('Token inválido o expirado');

    const {
      tipo,
      reserva_id,
      fecha_reserva,
      cantidad_personas,
      mesa_id,
      cliente_id,
      nombre,
      apellido,
      correo_electronico,
      telefono
    } = result.rows[0];

    // Enviar correo al admin
    const subject = `Reserva ${tipo === 'confirm' ? 'confirmada' : 'cancelada'} por cliente`;
    const text = `
      El cliente ha ${tipo === 'confirm' ? 'confirmado' : 'cancelado'} su reserva.

      Datos de la reserva:
      - ID de reserva: ${reserva_id}
      - Fecha: ${new Date(fecha_reserva).toLocaleDateString()}
      - Cantidad de personas: ${cantidad_personas}
      - Mesa: ${mesa_id}

      Datos del cliente:
      - ID: ${cliente_id}
      - Nombre: ${nombre} ${apellido}
      - Correo: ${correo_electronico}
      - Teléfono: ${telefono}
    `;
    await enviarCorreo(process.env.EMAIL_USER!, subject, text);

    // Respuesta al cliente
    res.send(`
      <p>Has ${tipo === 'confirm' ? 'confirmado' : 'cancelado'} tu reserva correctamente.</p>
      <p>Gracias por contactarnos, ${nombre} ${apellido}.</p>
    `);

  } catch (error) {
    console.error('Error en accionReserva:', error);
    res.status(500).send('Error interno');
  }
};








