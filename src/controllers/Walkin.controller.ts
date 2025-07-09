import { Request, Response } from 'express';
import pool from '../config/db';

const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

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
