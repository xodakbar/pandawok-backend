import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';
import { Client } from '../types/Client';
import * as XLSX from 'xlsx';

type ApiResponse<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
  }
};

export const getAllClients = async (
  req: Request,
  res: Response<ApiResponse<Client[]>>,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await pool.query<Client>(`
      SELECT * FROM clientes ORDER BY nombre, apellido
    `);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<Client>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Client>(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const createClient = async (
  req: Request<{}, {}, Partial<Client>>,
  res: Response<ApiResponse<Client>>,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      nombre,
      apellido,
      correo_electronico,
      telefono,
      es_frecuente = false,
      en_lista_negra = false,
      notas = '',
      tags = [],
      visitas = 0,
      ultima_visita = null,
      gasto_total = 0,
      gasto_por_visita = 0
    } = req.body;

    if (!nombre || !apellido || !correo_electronico || !telefono) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios',
      });
      return;
    }

    const result = await pool.query<Client>(
      `INSERT INTO clientes (
        nombre, apellido, correo_electronico, telefono,
        es_frecuente, en_lista_negra, notas, tags,
        visitas, ultima_visita, gasto_total, gasto_por_visita,
        fecha_creacion, fecha_actualizacion
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        NOW(), NOW()
      ) RETURNING *`,
      [
        nombre.trim(),
        apellido.trim(),
        correo_electronico.trim().toLowerCase(),
        telefono.trim(),
        es_frecuente,
        en_lista_negra,
        notas,
        tags,
        visitas,
        ultima_visita,
        gasto_total,
        gasto_por_visita
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    next(error);
  }
};

export const updateClient = async (
  req: Request<{ id: string }, {}, Partial<Client>>,
  res: Response<ApiResponse<Client>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const client = await pool.query<Client>('SELECT * FROM clientes WHERE id = $1', [id]);

    if (client.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      return;
    }

    const {
      nombre,
      apellido,
      correo_electronico,
      telefono,
      es_frecuente,
      en_lista_negra,
      notas,
      tags,
      visitas,
      ultima_visita,
      gasto_total,
      gasto_por_visita
    } = req.body;

    const result = await pool.query<Client>(
      `UPDATE clientes SET
        nombre = COALESCE($1, nombre),
        apellido = COALESCE($2, apellido),
        correo_electronico = COALESCE($3, correo_electronico),
        telefono = COALESCE($4, telefono),
        es_frecuente = COALESCE($5, es_frecuente),
        en_lista_negra = COALESCE($6, en_lista_negra),
        notas = COALESCE($7, notas),
        tags = COALESCE($8, tags),
        visitas = COALESCE($9, visitas),
        ultima_visita = COALESCE($10, ultima_visita),
        gasto_total = COALESCE($11, gasto_total),
        gasto_por_visita = COALESCE($12, gasto_por_visita),
        fecha_actualizacion = NOW()
      WHERE id = $13
      RETURNING *`,
      [
        nombre?.trim() ?? null,
        apellido?.trim() ?? null,
        correo_electronico?.trim().toLowerCase() ?? null,
        telefono?.trim() ?? null,
        es_frecuente ?? null,
        en_lista_negra ?? null,
        notas ?? null,
        tags ?? null,
        visitas ?? null,
        ultima_visita ?? null,
        gasto_total ?? null,
        gasto_por_visita ?? null,
        id
      ]
    );

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;

  try {
    await pool.query('BEGIN');

    // Eliminar reservas asociadas primero para evitar violación de FK
    await pool.query('DELETE FROM reservas WHERE cliente_id = $1', [id]);

    // Luego eliminar el cliente
    const result = await pool.query(
      'DELETE FROM clientes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      await pool.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      return;
    }

    await pool.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
};

export const exportClientsToExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY nombre, apellido');
    const clients = result.rows;

    const dataForSheet = clients.map(client => ({
      'ID': client.id,
      'Nombre': client.nombre,
      'Apellido': client.apellido,
      'Correo Electrónico': client.correo_electronico,
      'Teléfono': client.telefono,
      'Frecuente': client.es_frecuente ? 'Sí' : 'No',
      'Lista Negra': client.en_lista_negra ? 'Sí' : 'No',
      'Notas': client.notas,
      'Tags': client.tags?.join(', ') ?? '',
      'Visitas': client.visitas,
      'Última Visita': client.ultima_visita,
      'Gasto Total': client.gasto_total,
      'Gasto/Visita': client.gasto_por_visita,
      'Fecha Creación': new Date(client.fecha_creacion).toLocaleString('es-CL'),
      'Fecha Actualización': new Date(client.fecha_actualizacion).toLocaleString('es-CL'),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

    const buf = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    });

    res.setHeader('Content-Disposition', 'attachment; filename=clientes_pandawok.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (error) {
    next(error);
  }
};
