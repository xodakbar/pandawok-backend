import { Request, Response } from 'express';
import pool from '../config/db';

// Crear nueva entrada en lista de espera
export const createWaitingEntry = async (req: Request, res: Response) => {
  const {
    fecha_reserva,
    invitados,
    nombre,
    apellido,
    telefono,
    email,
    membership_id,
    client_tags,
    reservation_tags,
    notas,
  } = req.body;

  if (!fecha_reserva || !invitados || !nombre || !apellido) {
    return res.status(400).json({
      error: 'Los campos fecha_reserva, invitados, nombre y apellido son obligatorios',
    });
  }

  try {
    const clientTagsArr = Array.isArray(client_tags) ? client_tags : [];
    const reservationTagsArr = Array.isArray(reservation_tags) ? reservation_tags : [];

    const result = await pool.query(
      `INSERT INTO lista_espera 
      (fecha_reserva, invitados, nombre, apellido, telefono, email, membership_id, client_tags, reservation_tags, notas, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, 'pendiente')
      RETURNING *`,
      [
        fecha_reserva,
        invitados,
        nombre,
        apellido,
        telefono || null,
        email || null,
        membership_id || null,
        clientTagsArr,
        reservationTagsArr,
        notas || null,
      ]
    );

    res.status(201).json({
      success: true,
      entry: result.rows[0],
    });
  } catch (error) {
    console.error('Error al crear entrada lista de espera:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todas las entradas activas (estado = 'pendiente')
export const getWaitingList = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM lista_espera WHERE estado = 'pendiente' ORDER BY fecha_reserva ASC`
    );
    res.json({
      success: true,
      entries: result.rows,
    });
  } catch (error) {
    console.error('Error al obtener lista de espera:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar entrada por ID
export const updateWaitingEntry = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    fecha_reserva,
    invitados,
    nombre,
    apellido,
    telefono,
    email,
    membership_id,
    client_tags,
    reservation_tags,
    notas,
    estado,
  } = req.body;

  if (!fecha_reserva || !invitados || !nombre || !apellido) {
    return res.status(400).json({
      error: 'Los campos fecha_reserva, invitados, nombre y apellido son obligatorios',
    });
  }

  const estadosValidos = ['pendiente', 'asignada', 'cancelada'];
  if (estado && !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  try {
    const clientTagsArr = Array.isArray(client_tags) ? client_tags : [];
    const reservationTagsArr = Array.isArray(reservation_tags) ? reservation_tags : [];

    const result = await pool.query(
      `UPDATE lista_espera
       SET fecha_reserva = $1, invitados = $2, nombre = $3, apellido = $4,
           telefono = $5, email = $6, membership_id = $7, client_tags = $8,
           reservation_tags = $9, notas = $10, estado = COALESCE($11, estado)
       WHERE id = $12
       RETURNING *`,
      [
        fecha_reserva,
        invitados,
        nombre,
        apellido,
        telefono || null,
        email || null,
        membership_id || null,
        clientTagsArr,
        reservationTagsArr,
        notas || null,
        estado || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    res.json({
      success: true,
      entry: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar entrada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar entrada por ID
export const deleteWaitingEntry = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM lista_espera WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    res.json({
      success: true,
      message: 'Entrada eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
