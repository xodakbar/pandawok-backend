import { Request, Response } from 'express';
import pool from '../config/db';

// Obtener mesas activas de un salón (con posiciones incluidas)
export const getMesasPorSalon = async (req: Request, res: Response): Promise<void> => {
  const salonId = Number(req.params.id);

  if (isNaN(salonId)) {
    res.status(400).json({ message: 'ID de salón inválido' });
    return;
  }

  try {
    const query = `
      SELECT 
        id, 
        salon_id, 
        numero_mesa, 
        tipo_mesa, 
        tamanio, 
        capacidad, 
        esta_activa,
        posx AS "posX",
        posy AS "posY"
      FROM mesas
      WHERE salon_id = $1 AND esta_activa = true
      ORDER BY CAST(numero_mesa AS INTEGER)
    `;

    const { rows } = await pool.query(query, [salonId]);

    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo mesas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar posición de una mesa específica
export const actualizarPosicionMesa = async (req: Request, res: Response): Promise<void> => {
  const mesaId = Number(req.params.id);
  const { posX, posY } = req.body;

  if (
    isNaN(mesaId) ||
    typeof posX !== 'number' ||
    typeof posY !== 'number' ||
    Number.isNaN(posX) ||
    Number.isNaN(posY)
  ) {
    res.status(400).json({ message: 'Datos inválidos: posX y posY deben ser números' });
    return;
  }

  try {
    const query = `
      UPDATE mesas
      SET posx = $1, posy = $2
      WHERE id = $3
      RETURNING id, salon_id, numero_mesa, tipo_mesa, tamanio, capacidad, esta_activa, posx AS "posX", posy AS "posY"
    `;

    const { rows } = await pool.query(query, [posX, posY, mesaId]);

    if (rows.length === 0) {
      res.status(404).json({ message: 'Mesa no encontrada' });
    } else {
      res.json({ message: 'Posición actualizada', mesa: rows[0] });
    }
  } catch (error) {
    console.error('Error actualizando posición de mesa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
