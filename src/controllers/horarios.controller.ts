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



export const updateHorario = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { hora_inicio, hora_fin, esta_activo, duracion_minutos } = req.body;

  console.log('ID:', id); // <-- Agregar para debug
  console.log('Payload:', req.body); // <-- Agregar para debug

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID de horario inválido' });
  }

  if (!hora_inicio || !hora_fin || esta_activo === undefined || !duracion_minutos) {
    return res.status(400).json({ error: 'Faltan datos obligatorios: hora_inicio, hora_fin, esta_activo, duracion_minutos' });
  }

  try {
    const query = `
      UPDATE horarios_disponibles
      SET hora_inicio = $1, hora_fin = $2, esta_activo = $3, duracion_minutos = $4
      WHERE id = $5
      RETURNING *
    `;

    const result = await pool.query(query, [hora_inicio, hora_fin, esta_activo, duracion_minutos, id]);

    console.log('Resultado:', result.rows[0]); // <-- Agregar para debug

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    return res.json({ success: true, horario: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando horario:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
};

// ...existing code...