import { Request, Response, NextFunction } from 'express';
import db from '../config/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/tags - Lista completa de tags
export const obtenerTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query('SELECT * FROM tags ORDER BY nombre ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// GET /api/tags/categorias - Agrupado por categoría y subcategoría
export const obtenerTagsPorCategoria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query('SELECT nombre, categoria, subcategoria FROM tags ORDER BY categoria, subcategoria, nombre');
    const agrupados: Record<string, Record<string, string[]>> = {};

    result.rows.forEach(({ nombre, categoria, subcategoria }) => {
      if (!agrupados[categoria]) agrupados[categoria] = {};
      if (!agrupados[categoria][subcategoria]) agrupados[categoria][subcategoria] = [];
      agrupados[categoria][subcategoria].push(nombre);
    });

    res.status(200).json(agrupados);
  } catch (error) {
    next(error);
  }
};

// POST /api/tags
export const crearTag = async (req: Request, res: Response, next: NextFunction) => {
  const { nombre, categoria, subcategoria } = req.body;

  if (!nombre || typeof nombre !== 'string' || !categoria || !subcategoria) {
    return res.status(400).json({ message: 'Nombre, categoría y subcategoría son requeridos.' });
  }

  try {
    const id = uuidv4();
    const result = await db.query(
      'INSERT INTO tags (id, nombre, categoria, subcategoria) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, nombre.trim(), categoria.trim(), subcategoria.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tags/:id
export const eliminarTag = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM tags WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Tag no encontrado.' });
    }

    res.status(200).json({ message: 'Tag eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};
