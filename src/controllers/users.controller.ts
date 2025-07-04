// backend/src/controllers/users.controller.ts
import { Request, Response } from 'express';
import pool from '../config/db'; // Asumo que db.ts está en config/db.ts
import bcrypt from 'bcryptjs';

// GET /api/users
export const getUsers = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT id, nombre_usuario, apellido_usuario, correo_electronico, rol FROM usuarios');
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener usuarios:', err);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuarios.' });
    }
};

// POST /api/users
export const createUser = async (req: Request, res: Response) => {
    const { nombre_usuario, apellido_usuario, correo_electronico, contrasena, rol } = req.body;

    if (!nombre_usuario || !apellido_usuario || !correo_electronico || !contrasena || !rol) {
        return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }

    try {
        // 1. Verificar si el correo o nombre de usuario ya existen
        const existingUser = await pool.query(
            'SELECT id FROM usuarios WHERE correo_electronico = $1 OR nombre_usuario = $2',
            [correo_electronico, nombre_usuario]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'El correo electrónico o nombre de usuario ya está registrado.' });
        }

        // 2. Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const contrasena_hash = await bcrypt.hash(contrasena, salt);

        // 3. Insertar el nuevo usuario en la base de datos
        const newUser = await pool.query(
            'INSERT INTO usuarios (nombre_usuario, apellido_usuario, correo_electronico, contrasena_hash, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre_usuario, apellido_usuario, correo_electronico, rol',
            [nombre_usuario, apellido_usuario, correo_electronico, contrasena_hash, rol]
        );

        res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser.rows[0] });

    } catch (err) {
        console.error('Error al crear usuario:', err);
        if ((err as any).code === '23514') { // Código de error para check_violation
            return res.status(400).json({ message: 'El rol especificado no es válido. Los roles permitidos son: administrador, jefe, anfitrion.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear usuario.' });
    }
};

// PUT /api/users/:id (o PATCH)
export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre_usuario, apellido_usuario, correo_electronico, rol } = req.body;
    // No se actualiza la contraseña directamente desde aquí, se necesitaría un endpoint separado para eso

    if (!nombre_usuario || !apellido_usuario || !correo_electronico || !rol) {
        return res.status(400).json({ message: 'Todos los campos son requeridos para la actualización.' });
    }

    try {
        // Opcional: Verificar si el nuevo correo o nombre de usuario ya existe en otro usuario
        const existingUser = await pool.query(
            'SELECT id FROM usuarios WHERE (correo_electronico = $1 OR nombre_usuario = $2) AND id != $3',
            [correo_electronico, nombre_usuario, id]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'El correo electrónico o nombre de usuario ya está en uso por otro usuario.' });
        }

        const result = await pool.query(
            'UPDATE usuarios SET nombre_usuario = $1, apellido_usuario = $2, correo_electronico = $3, rol = $4 WHERE id = $5 RETURNING id, nombre_usuario, apellido_usuario, correo_electronico, rol',
            [nombre_usuario, apellido_usuario, correo_electronico, rol, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.json({ message: 'Usuario actualizado exitosamente', user: result.rows[0] });

    } catch (err) {
        console.error('Error al actualizar usuario:', err);
        if ((err as any).code === '23514') { // Código de error para check_violation
            return res.status(400).json({ message: 'El rol especificado no es válido. Los roles permitidos son: administrador, jefe, anfitrion.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al actualizar usuario.' });
    }
};

// DELETE /api/users/:id (Opcional: para eliminar usuarios)
export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado para eliminar.' });
        }

        res.json({ message: 'Usuario eliminado exitosamente', id: id });

    } catch (err) {
        console.error('Error al eliminar usuario:', err);
        res.status(500).json({ message: 'Error interno del servidor al eliminar usuario.' });
    }
};

