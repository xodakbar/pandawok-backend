import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';
import moment from 'moment-timezone';

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

    // Validar que la fecha y hora de inicio no sean anteriores al momento actual en Chile
    const nowChile = moment.tz('America/Santiago');
    const bloqueoFechaHoraInicio = moment.tz(`${fecha}T${hora_inicio}`, 'YYYY-MM-DDTHH:mm', 'America/Santiago');

    if (bloqueoFechaHoraInicio.isBefore(nowChile)) {
      return res.status(400).json({ mensaje: 'No puedes bloquear una mesa en fecha y hora pasada.' });
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


export const obtenerBloqueosPorMesaYFecha = async (req: Request, res: Response, next?: NextFunction) => {
  try {
    const { mesaId } = req.params;
    const { fecha } = req.query;

    // Log detallado de la petición
    console.log('=== CONSULTA BLOQUEOS POR MESA ===');
    console.log('Mesa ID:', mesaId);
    console.log('Fecha solicitada:', fecha);
    console.log('Query completo:', req.query);
    console.log('Params completo:', req.params);
    console.log('Timestamp:', new Date().toISOString());

    if (!fecha) {
      console.log('❌ Error: Fecha no proporcionada para bloqueos');
      return res.status(400).json({
        success: false,
        message: 'La fecha es requerida'
      });
    }

    const query = `
      SELECT * FROM mesa_bloqueos 
      WHERE mesa_id = $1 AND DATE(fecha) = $2
      ORDER BY hora_inicio ASC
    `;

    console.log('🔒 Ejecutando query SQL para bloqueos:', query);
    console.log('🔒 Parámetros:', [mesaId, fecha]);

    const result = await pool.query(query, [mesaId, fecha]);
    const bloqueos = result.rows as any[];

    console.log('✅ Bloqueos encontrados:', bloqueos.length);
    if (bloqueos.length > 0) {
      console.log('🔒 Primer bloqueo como ejemplo:', JSON.stringify(bloqueos[0], null, 2));
    }

    res.json({
      success: true,
      bloqueos: bloqueos
    });

  } catch (error) {
    console.error('💥 Error en obtenerBloqueosPorMesaYFecha:', error);
    console.error('💥 Stack trace:', (error as Error).stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};


export const desbloquearBloqueoMesa = async (req: Request, res: Response, next: NextFunction) => {
  const bloqueoId = req.params.id;

  try {
    // Intentar borrar o actualizar el bloqueo para desbloquearlo
    const result = await pool.query('DELETE FROM mesa_bloqueos WHERE id = $1 RETURNING *', [bloqueoId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Bloqueo no encontrado' });
    }

    res.json({ mensaje: 'Mesa desbloqueada correctamente', bloqueo: result.rows[0] });
  } catch (error) {
    console.error('Error en desbloquearBloqueoMesa:', error);
    next(error);
  }
};

export const obtenerTodosLosBloqueos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await pool.query(
      'SELECT * FROM mesa_bloqueos ORDER BY fecha DESC, hora_inicio ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener todos los bloqueos:', error);
    next(error);
  }
};
