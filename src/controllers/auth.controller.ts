import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';

export const loginUser = async (req: Request, res: Response) => {
    const { correo_electronico, contrasena } = req.body;

    if (!correo_electronico || !contrasena) {
        return res.status(400).json({ message: 'Correo electrónico y contraseña son requeridos.' });
    }

    try {
        // Buscar usuario por correo
        const userResult = await pool.query(
            'SELECT id, nombre_usuario, apellido_usuario, correo_electronico, contrasena_hash, rol FROM usuarios WHERE correo_electronico = $1',
            [correo_electronico]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const user = userResult.rows[0];

        // Comparar contraseña
        const isMatch = await bcrypt.compare(contrasena, user.contrasena_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Generar token JWT (payload puede contener datos útiles)
        const token = jwt.sign(
            {
                id: user.id,
                nombre_usuario: user.nombre_usuario,
                correo_electronico: user.correo_electronico,
                rol: user.rol,
            },
            JWT_SECRET,
            { expiresIn: '8h' } // puedes ajustar expiración
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre_usuario: user.nombre_usuario,
                correo_electronico: user.correo_electronico,
                rol: user.rol,
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
