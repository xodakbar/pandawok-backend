import { Request, Response } from 'express';
import pool from '../config/db';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

// Crear reserva
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

    const clienteQuery = `
      INSERT INTO clientes (nombre, apellido, correo_electronico, telefono, notas)
      VALUES ($1, $2, $3, $4, $5)
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
      notas && notas.trim() !== '' ? notas : null,
    ]);

    const cliente = clienteResult.rows[0];

    if (cliente.en_lista_negra) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'Cliente en lista negra',
        message: 'No se pueden realizar reservas para este cliente.',
      });
    }

    const mesaId = mesa_id && !isNaN(Number(mesa_id)) ? Number(mesa_id) : null;
    const horarioId = horario_id && !isNaN(Number(horario_id)) ? Number(horario_id) : null;

    const reservaQuery = `
      INSERT INTO reservas (
        cliente_id, mesa_id, horario_id,
        fecha_reserva, cantidad_personas, notas
      ) VALUES ($1, COALESCE($2, NULL::integer), COALESCE($3, NULL::integer), $4, $5, $6)
      RETURNING *
    `;

    const reservaResult = await client.query(reservaQuery, [
      cliente.id,
      mesaId,
      horarioId,
      fecha_reserva,
      cantidad_personas,
      notas && notas.trim() !== '' ? notas : null,
    ]);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Reserva creada con éxito',
      reserva: reservaResult.rows[0],
      cliente: {
        id: cliente.id,
        nombre,
        apellido,
        correo_electronico,
        telefono,
        es_frecuente: cliente.es_frecuente,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error en createReserva:', error);

    switch (error.code) {
      case PG_UNIQUE_VIOLATION:
        return res.status(409).json({
          error: 'Conflicto de reserva',
          message: 'Ya existe una reserva similar para este cliente.',
        });

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

// Obtener todas las reservas
export const getReservas = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             c.nombre, c.apellido, c.telefono, c.correo_electronico 
      FROM reservas r
      JOIN clientes c ON c.id = r.cliente_id
      ORDER BY r.fecha_reserva DESC, r.horario_id
    `);

    return res.json({
      success: true,
      reservas: result.rows,
    });
  } catch (error) {
    console.error('Error en getReservas:', error);
    return res.status(500).json({
      error: 'Error interno al obtener reservas',
    });
  }
};

// Obtener reservas por mesa y fecha (modificado para no devolver 404 si no hay reservas)
export const getReservaByMesa = async (req: Request, res: Response) => {
  const { mesaId } = req.params;
  const { fecha } = req.query;

  if (!mesaId || isNaN(Number(mesaId))) {
    return res.status(400).json({ error: 'ID de mesa inválido' });
  }

  if (!fecha || typeof fecha !== 'string') {
    return res.status(400).json({ error: 'Parámetro fecha es obligatorio y debe ser string' });
  }

  try {
    const result = await pool.query(`
      SELECT r.*, 
             c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.telefono, c.correo_electronico 
      FROM reservas r
      JOIN clientes c ON c.id = r.cliente_id
      WHERE r.mesa_id = $1 AND r.fecha_reserva = $2
      ORDER BY r.fecha_reserva DESC
    `, [mesaId, fecha]);

    // Si no hay reservas, devolver arreglo vacío con éxito
    return res.json({
      success: true,
      reservas: result.rows,
    });
  } catch (error) {
    console.error('Error en getReservaByMesa:', error);
    return res.status(500).json({
      error: 'Error interno al buscar la reserva',
    });
  }
};

// Obtener reserva por ID
export const getReservaById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const query = `
      SELECT r.*, 
             c.nombre, c.apellido, c.telefono, c.correo_electronico 
      FROM reservas r
      JOIN clientes c ON c.id = r.cliente_id
      WHERE r.id = $1
    `;
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    return res.json({
      success: true,
      reserva: rows[0],
    });
  } catch (error) {
    console.error('Error en getReservaById:', error);
    return res.status(500).json({ message: 'Error al obtener reserva' });
  }
};
