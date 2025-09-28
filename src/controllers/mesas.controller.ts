import { Request, Response } from 'express';
import pool from '../config/db';

// Obtener mesas activas de un salón (con posiciones incluidas)
export const getMesasPorSalon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { salon_id } = req.params;
    const salonId = Number(salon_id);

    console.log(`🔍 [MESAS] Solicitud de mesas para salón ID: ${salonId}`);
    console.log(`📅 [MESAS] Timestamp: ${new Date().toISOString()}`);
    console.log(`🌐 [MESAS] IP Cliente: ${req.ip || req.connection.remoteAddress}`);

    if (isNaN(salonId)) {
      console.log(`❌ [MESAS] ID de salón inválido: ${salon_id}`);
      res.status(400).json({ message: 'ID de salón inválido' });
      return;
    }

    // CAMBIO: Evitar el CAST problemático, usar ORDER BY simple
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
      ORDER BY numero_mesa
    `;

    const { rows } = await pool.query(query, [salonId]);

    console.log(`✅ [MESAS] Encontradas ${rows.length} mesas activas en salón ${salonId}`);
    console.log(`📋 [MESAS] Mesas encontradas:`, rows.map(m => `Mesa ${m.numero_mesa} (ID: ${m.id})`).join(', '));

    res.json(rows);
  } catch (error) {
    console.error('❌ [MESAS] Error obteniendo mesas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
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

// Agregar una nueva mesa con validación de unicidad
export const agregarMesa = async (req: Request, res: Response): Promise<void> => {
  const { salon_id, numero_mesa, tipo_mesa, tamanio, capacidad, esta_activa, posX, posY } = req.body;

  // Validaciones básicas
  if (
    typeof salon_id !== 'number' ||
    typeof numero_mesa !== 'string' ||
    typeof tipo_mesa !== 'string' ||
    typeof tamanio !== 'string' ||
    typeof capacidad !== 'number' ||
    typeof esta_activa !== 'boolean' ||
    typeof posX !== 'number' ||
    typeof posY !== 'number'
  ) {
    res.status(400).json({ message: 'Datos inválidos o incompletos para crear mesa' });
    return;
  }

  try {
    // Validar que no exista una mesa con el mismo numero_mesa en el mismo salon_id
    const checkQuery = `SELECT id FROM mesas WHERE salon_id = $1 AND numero_mesa = $2`;
    const { rows: existingRows } = await pool.query(checkQuery, [salon_id, numero_mesa]);

    if (existingRows.length > 0) {
      res.status(400).json({ message: `Ya existe una mesa con el número ${numero_mesa} en este salón.` });
      return;
    }

    const insertQuery = `
      INSERT INTO mesas 
      (salon_id, numero_mesa, tipo_mesa, tamanio, capacidad, esta_activa, posx, posy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, salon_id, numero_mesa, tipo_mesa, tamanio, capacidad, esta_activa, posx AS "posX", posy AS "posY"
    `;

    const values = [salon_id, numero_mesa, tipo_mesa, tamanio, capacidad, esta_activa, posX, posY];

    const { rows } = await pool.query(insertQuery, values);

    res.status(201).json({ message: 'Mesa creada exitosamente', mesa: rows[0] });
  } catch (error) {
    console.error('Error creando mesa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar una mesa por id
export const eliminarMesa = async (req: Request, res: Response): Promise<void> => {
  const mesaId = Number(req.params.id);

  if (isNaN(mesaId)) {
    res.status(400).json({ message: 'ID de mesa inválido' });
    return;
  }

  try {
    const query = 'DELETE FROM mesas WHERE id = $1 RETURNING id';

    const { rows } = await pool.query(query, [mesaId]);

    if (rows.length === 0) {
      res.status(404).json({ message: 'Mesa no encontrada' });
    } else {
      res.json({ message: 'Mesa eliminada correctamente' });
    }
  } catch (error) {
    console.error('Error eliminando mesa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
