import { Request, Response } from 'express';
import pool from '../config/db';

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

    const mesaId = (mesa_id === undefined || mesa_id === null || mesa_id === 'null') ? null : Number(mesa_id);
    const horarioId = (horario_id === undefined || horario_id === null || horario_id === 'null') ? null : Number(horario_id);

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

    // Si clienteId es null, actualizamos reserva sin cliente (walk-in)
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
export const getReservas = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             c.nombre, c.apellido, c.telefono, c.correo_electronico 
      FROM reservas r
      LEFT JOIN clientes c ON c.id = r.cliente_id
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

// Obtener reservas por mesa y fecha (con LEFT JOIN)
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
      LEFT JOIN clientes c ON c.id = r.cliente_id
      WHERE r.mesa_id = $1 AND r.fecha_reserva = $2
      ORDER BY r.fecha_reserva DESC
    `, [mesaId, fecha]);

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
