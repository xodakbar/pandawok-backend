import { Request, Response } from 'express';
import pool from '../config/db';  // Importa pool configurado igual que en reservas

// GET /api/salones
export const getSalones = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, capacidad, es_condicion_especial
      FROM salones
      WHERE esta_activo = true
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      salones: result.rows,
    });
  } catch (error) {
    console.error('Error al obtener salones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al obtener los salones',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
};
