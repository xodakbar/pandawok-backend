import { Request, Response } from 'express';
import pool from '../config/db'; // asumiendo que tienes la conexión

export const getHorariosDisponibles = async (req: Request, res: Response) => {
  const { mesa_id, fecha } = req.query;

  if (!mesa_id || !fecha) {
    return res.status(400).json({ error: 'Faltan parámetros mesa_id o fecha' });
  }

  try {
    const query = `
      SELECT hd.id, hd.hora_inicio, hd.hora_fin
      FROM horarios_disponibles hd
      WHERE hd.esta_activo = true
      AND hd.id NOT IN (
        SELECT r.horario_id
        FROM reservas r
        WHERE r.mesa_id = $1
          AND r.fecha_reserva = $2
      )
      ORDER BY hd.hora_inicio;
    `;

    const result = await pool.query(query, [mesa_id, fecha]);
    return res.json({ success: true, horarios: result.rows });
  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
};
