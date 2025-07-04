import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config();

export const pool = new Pool({
  // tu configuración de conexión
});
export const getUsers = async (req: Request, res: Response) => {
  const apiKey = process.env.SUPABASE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'SUPABASE_API_KEY no está definida.' });
  }

  try {
    const response = await fetch(
      'https://gdbckvrxahmxabjrsilo.supabase.co/rest/v1/usuarios',
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al consultar Supabase:', errorText);
      return res.status(500).json({ message: 'Error consultando usuarios en Supabase.' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener usuarios desde Supabase:', error);
    return res.status(500).json({ message: 'Error interno del servidor al obtener usuarios.' });
  }
};
