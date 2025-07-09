import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export const crearBloqueoMesa = async (req: Request, res: Response, next: NextFunction) => {
  const { mesa_id, fecha, hora_inicio, hora_fin } = req.body;

  if (!mesa_id || !fecha || !hora_inicio || !hora_fin) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios para crear bloqueo' });
  }

  if (hora_inicio >= hora_fin) {
    return res.status(400).json({ mensaje: 'La hora de inicio debe ser anterior a la hora de fin' });
  }

  try {
    // Validar que la mesa exista
    const mesaResult = await pool.query('SELECT id FROM mesas WHERE id = $1', [mesa_id]);
    if (mesaResult.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Mesa no encontrada' });
    }

    // Insertar bloqueo
    const insertQuery = `
      INSERT INTO mesa_bloqueos (mesa_id, fecha, hora_inicio, hora_fin)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [mesa_id, fecha, hora_inicio, hora_fin]);

    res.status(201).json({ bloqueo: result.rows[0], mensaje: 'Mesa bloqueada correctamente' });
  } catch (error) {
    console.error('Error creando bloqueo de mesa:', error);
    next(error);
  }
};

export const obtenerBloqueosPorSalonYFecha = async (req: Request, res: Response, next: NextFunction) => {
  const salonId = Number(req.params.salonId);
  const fecha = req.query.fecha as string;

  if (isNaN(salonId) || !fecha) {
    return res.status(400).json({ mensaje: 'Parámetros inválidos: salonId y fecha son obligatorios' });
  }

  try {
    // Obtener mesas del salón
    const mesasResult = await pool.query('SELECT id FROM mesas WHERE salon_id = $1', [salonId]);
    const mesasIds = mesasResult.rows.map(row => row.id);

    if (mesasIds.length === 0) {
      return res.json({ bloqueos: [] });
    }

    // Obtener bloqueos para esas mesas y fecha
    const bloqueosResult = await pool.query(
      `SELECT * FROM mesa_bloqueos
       WHERE mesa_id = ANY($1)
         AND fecha = $2`,
      [mesasIds, fecha]
    );

    res.json({ bloqueos: bloqueosResult.rows });
  } catch (error) {
    console.error('Error obteniendo bloqueos de mesas:', error);
    next(error);
  }
};

export const obtenerBloqueosPorMesaYFecha = async (req: Request, res: Response, next: NextFunction) => {
  const mesaId = Number(req.params.mesaId);
  const fecha = req.query.fecha as string;

  if (isNaN(mesaId) || !fecha) {
    return res.status(400).json({ mensaje: 'Parámetros inválidos: mesaId y fecha son obligatorios' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM mesa_bloqueos WHERE mesa_id = $1 AND fecha = $2`,
      [mesaId, fecha]
    );

    res.json({ bloqueos: result.rows });
  } catch (error) {
    console.error('Error obteniendo bloqueos por mesa y fecha:', error);
    next(error);
  }
};
