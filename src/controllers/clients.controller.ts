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

// ...existing code...

export const importClients = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const clients = req.body;
    console.log('Starting import with', clients.length, 'clients');

    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const client_data of clients) {
      console.log('Processing client:', client_data.nombre, client_data.apellido, 'Correo:', client_data.correo_electronico);

      // Verificar si el cliente ya existe (por correo o teléfono)
      const existingClient = await client.query(
        'SELECT id FROM clientes WHERE correo_electronico = $1 OR telefono = $2',
        [client_data.correo_electronico, client_data.telefono]
      );

      console.log('Existing client check result:', existingClient.rows.length > 0 ? 'Found' : 'Not found');

      if (existingClient.rows.length > 0) {
        // Actualizar cliente existente
        const id = existingClient.rows[0].id;
        console.log('Updating client ID:', id);
        await client.query(
          `UPDATE clientes 
           SET nombre = $1, 
               apellido = $2, 
               correo_electronico = $3, 
               telefono = $4,
               visitas = $5, 
               ultima_visita = $6, 
               gasto_total = $7, 
               gasto_por_visita = $8, 
               notas = $9,
               tags = $10,
               fecha_creacion = $11,
               fecha_actualizacion = NOW()
           WHERE id = $12`,
          [
            client_data.nombre,
            client_data.apellido,
            client_data.correo_electronico,
            client_data.telefono,
            client_data.visitas || 0,
            client_data.ultima_visita,
            client_data.gasto_total || 0,
            client_data.gasto_por_visita || 0,
            client_data.notas || '',
            client_data.tags || [],
            client_data.fecha_creacion,
            id
          ]
        );
        updatedCount++;
        console.log('Updated client successfully');
      } else {
        // Insertar nuevo cliente
        console.log('Inserting new client');
        const result = await client.query(
          `INSERT INTO clientes 
           (nombre, apellido, correo_electronico, telefono,
            visitas, ultima_visita, tags,
            gasto_total, gasto_por_visita,
            notas, fecha_creacion, fecha_actualizacion)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           RETURNING id`,
          [
            client_data.nombre,
            client_data.apellido,
            client_data.correo_electronico,
            client_data.telefono,
            client_data.visitas || 0,
            client_data.ultima_visita,
            client_data.tags || [],
            client_data.gasto_total || 0,
            client_data.gasto_por_visita || 0,
            client_data.notas || '',
            client_data.fecha_creacion
          ]
        );
        insertedCount++;
        console.log('Inserted new client with ID:', result.rows[0].id);
      }
    }

    await client.query('COMMIT');
    console.log('Import completed successfully. Inserted:', insertedCount, 'Updated:', updatedCount);
    
    res.json({
      success: true,
      message: `Importación exitosa: ${insertedCount} clientes nuevos, ${updatedCount} actualizados`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en importación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la importación: ' + (error as Error).message
    });
  } finally {
    client.release();
  }
};

export const buscarClientes = async (
  req: Request,
  res: Response<ApiResponse<Client[]>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      busqueda, 
      es_frecuente, 
      en_lista_negra, 
      nivel_membresia,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = `
      SELECT * FROM clientes
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filtro de búsqueda por texto (nombre, apellido, correo, teléfono)
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      query += ` AND (
        LOWER(nombre) LIKE LOWER($${paramIndex}) OR 
        LOWER(apellido) LIKE LOWER($${paramIndex}) OR 
        LOWER(correo_electronico) LIKE LOWER($${paramIndex}) OR 
        telefono LIKE $${paramIndex}
      )`;
      queryParams.push(`%${busqueda.trim()}%`);
      paramIndex++;
    }

    // Filtro por cliente frecuente
    if (es_frecuente !== undefined) {
      query += ` AND es_frecuente = $${paramIndex}`;
      queryParams.push(es_frecuente === 'true');
      paramIndex++;
    }

    // Filtro por lista negra
    if (en_lista_negra !== undefined) {
      query += ` AND en_lista_negra = $${paramIndex}`;
      queryParams.push(en_lista_negra === 'true');
      paramIndex++;
    }

    // Filtro por nivel de membresía
    if (nivel_membresia && typeof nivel_membresia === 'string') {
      query += ` AND LOWER(nivel_membresia) = LOWER($${paramIndex})`;
      queryParams.push(nivel_membresia);
      paramIndex++;
    }

    // Contar el total de resultados antes de aplicar paginación
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Agregar ordenamiento y paginación
    query += ` ORDER BY nombre, apellido`;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limitNum, offset);

    const result = await pool.query<Client>(query, queryParams);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ...existing code...
