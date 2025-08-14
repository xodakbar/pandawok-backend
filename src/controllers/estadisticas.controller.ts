import { Request, Response } from 'express';
import pool from '../config/db';
import { EstadisticasResumen } from '../types/Estadisticas';

// Utilidad para parsear y tipar resultados
const parseResumen = (row: any): EstadisticasResumen => ({
  reservasTotales: parseInt(row.reservas_totales, 10),
  comensalesTotales: parseInt(row.comensales_totales, 10),
});

// GET /api/estadisticas/resumen
export const getResumenBasico = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS reservas_totales,
        COALESCE(SUM(cantidad_personas), 0) AS comensales_totales
      FROM reservas
      WHERE estado != 'cancelada';
    `);

    const resumen = parseResumen(result.rows[0]);

    res.status(200).json(resumen);
  } catch (error) {
    console.error('Error al obtener resumen de estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// GET /api/estadisticas/resumen?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export const getResumenPorFecha = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Faltan parámetros de fecha' });
  }

  // Validación básica del formato de fecha
  const fechaInicio = new Date(startDate as string);
  const fechaFin = new Date(endDate as string);

  if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
    return res.status(400).json({ error: 'Formato de fecha inválido' });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) AS reservas_totales,
        COALESCE(SUM(cantidad_personas), 0) AS comensales_totales
      FROM reservas
      WHERE estado != 'cancelada'
        AND fecha_reserva BETWEEN $1 AND $2;
      `,
      [startDate, endDate]
    );

    const resumen = parseResumen(result.rows[0]);

    res.status(200).json(resumen);
  } catch (error) {
    console.error('Error resumen por fecha:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas filtradas' });
  }
};

export const getWalkInResumenBasico = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS walkins_totales,
        COALESCE(SUM(cantidad_personas), 0) AS personas_totales
      FROM reservas
      WHERE cliente_id IS NULL
        AND estado != 'cancelada';
    `);

    const datos = result.rows[0];

    res.status(200).json({
      walkInsTotales: Number(datos.walkins_totales),
      personasTotales: Number(datos.personas_totales),
    });
  } catch (error) {
    console.error('Error obtener walk-in resumen básico:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas walk-in' });
  }
};

export const getWalkInResumenPorFecha = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Faltan parámetros de fecha' });
  }

  const fechaInicio = new Date(startDate as string);
  const fechaFin = new Date(endDate as string);

  if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
    return res.status(400).json({ error: 'Formato de fecha inválido' });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        COUNT(*) AS walkins_totales,
        COALESCE(SUM(cantidad_personas), 0) AS personas_totales
      FROM reservas
      WHERE cliente_id IS NULL
        AND estado != 'cancelada'
        AND fecha_reserva BETWEEN $1 AND $2;
      `,
      [startDate, endDate]
    );

    const datos = result.rows[0];

    res.status(200).json({
      walkInsTotales: Number(datos.walkins_totales),
      personasTotales: Number(datos.personas_totales),
    });
  } catch (error) {
    console.error('Error obtener walk-in resumen por fecha:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas walk-in filtradas' });
  }
};

export const getListaEsperaResumenBasico = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS espera_total,
        COALESCE(SUM(invitados), 0) AS personas_totales
      FROM lista_espera
      WHERE estado != 'cancelada';
    `);

    const datos = result.rows[0];
    res.status(200).json({
      esperaTotal: Number(datos.espera_total),
      personasTotales: Number(datos.personas_totales),
    });
  } catch (error) {
    console.error('Error obtener lista de espera:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de lista de espera' });
  }
};

export const getListaEsperaResumenPorFecha = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Faltan parámetros de fecha' });
  }

  const fechaInicio = new Date(startDate as string);
  const fechaFin = new Date(endDate as string);

  if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
    return res.status(400).json({ error: 'Formato de fecha inválido' });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) AS espera_total,
        COALESCE(SUM(invitados), 0) AS personas_totales
      FROM lista_espera
      WHERE estado != 'cancelada'
        AND fecha_reserva BETWEEN $1 AND $2;
      `,
      [startDate, endDate]
    );

    const datos = result.rows[0];
    res.status(200).json({
      esperaTotal: Number(datos.espera_total),
      personasTotales: Number(datos.personas_totales),
    });
  } catch (error) {
    console.error('Error obtener lista de espera por fecha:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas filtradas de lista de espera' });
  }
};

export const getFlujoComensalesPorHora = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  try {
    let query = `
      SELECT
        hd.hora_inicio AS hora_reserva,
        COALESCE(SUM(r.cantidad_personas), 0) AS cantidad_personas
      FROM horarios_disponibles hd
      LEFT JOIN reservas r ON r.horario_id = hd.id AND r.estado != 'cancelada'
    `;

    const params: any[] = [];

    if (startDate && endDate) {
      query += ` AND r.fecha_reserva BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    }

    query += `
      GROUP BY hd.hora_inicio
      ORDER BY hd.hora_inicio;
    `;

    const result = await pool.query(query, params);

    const flujo = result.rows.map((row: any) => ({
      hora: row.hora_reserva.slice(0, 5),
      cantidad_personas: Number(row.cantidad_personas),
    }));

    res.status(200).json(flujo);
  } catch (error) {
    console.error('Error obtener flujo de comensales por hora:', error);
    res.status(500).json({ error: 'Error al obtener flujo de comensales' });
  }
};

// GET /api/estadisticas/reservas-por-dia
export const getReservasPorDiaSemana = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(fecha_reserva, 'Day') AS dia,
        COUNT(*) AS cantidad
      FROM reservas
      WHERE estado != 'cancelada'
      GROUP BY dia
      ORDER BY MIN(DATE_PART('dow', fecha_reserva))
    `);

    // ✅ Aquí declaras los días traducidos
    const diasTraducidos: Record<string, string> = {
      Monday: 'Lunes',
      Tuesday: 'Martes',
      Wednesday: 'Miércoles',
      Thursday: 'Jueves',
      Friday: 'Viernes',
      Saturday: 'Sábado',
      Sunday: 'Domingo',
    };

    // ✅ Usas el mapa con seguridad
    const datos = result.rows.map((row: any) => {
      const diaIngles = row.dia.trim();
      const dia = diasTraducidos[diaIngles] || diaIngles; // fallback en caso de error
      return {
        dia,
        cantidad: parseInt(row.cantidad, 10),
      };
    });

    res.status(200).json(datos);
  } catch (error) {
    console.error('Error al obtener reservas por día de la semana:', error);
    res.status(500).json({ error: 'Error al obtener datos de reservas por día' });
  }
};



export const getReservasPorGrupo = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  try {
    const params: any[] = [];
    let whereClause = `WHERE estado != 'cancelada'`;

    if (startDate && endDate) {
      whereClause += ` AND fecha_reserva BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    }

    const query = `
    SELECT
      CASE 
        WHEN cantidad_personas = 1 THEN '1'
        WHEN cantidad_personas = 2 THEN '2'
        WHEN cantidad_personas = 3 THEN '3'
        WHEN cantidad_personas = 4 THEN '4'
        WHEN cantidad_personas = 5 THEN '5'
        WHEN cantidad_personas = 6 THEN '6'
        WHEN cantidad_personas = 7 THEN '7'
        ELSE '8+'
      END AS grupo,
      COUNT(*) AS cantidad
    FROM reservas
    ${whereClause}
    GROUP BY
      CASE 
        WHEN cantidad_personas = 1 THEN '1'
        WHEN cantidad_personas = 2 THEN '2'
        WHEN cantidad_personas = 3 THEN '3'
        WHEN cantidad_personas = 4 THEN '4'
        WHEN cantidad_personas = 5 THEN '5'
        WHEN cantidad_personas = 6 THEN '6'
        WHEN cantidad_personas = 7 THEN '7'
        ELSE '8+'
      END
    ORDER BY 
      CASE 
        WHEN
          CASE 
            WHEN cantidad_personas = 1 THEN '1'
            WHEN cantidad_personas = 2 THEN '2'
            WHEN cantidad_personas = 3 THEN '3'
            WHEN cantidad_personas = 4 THEN '4'
            WHEN cantidad_personas = 5 THEN '5'
            WHEN cantidad_personas = 6 THEN '6'
            WHEN cantidad_personas = 7 THEN '7'
            ELSE '8+'
          END = '1' THEN 1
        WHEN
          CASE 
            WHEN cantidad_personas = 1 THEN '1'
            WHEN cantidad_personas = 2 THEN '2'
            WHEN cantidad_personas = 3 THEN '3'
            WHEN cantidad_personas = 4 THEN '4'
            WHEN cantidad_personas = 5 THEN '5'
            WHEN cantidad_personas = 6 THEN '6'
            WHEN cantidad_personas = 7 THEN '7'
            ELSE '8+'
          END = '2' THEN 2
        WHEN
          CASE 
            WHEN cantidad_personas = 1 THEN '1'
            WHEN cantidad_personas = 2 THEN '2'
            WHEN cantidad_personas = 3 THEN '3'
            WHEN cantidad_personas = 4 THEN '4'
            WHEN cantidad_personas = 5 THEN '5'
            WHEN cantidad_personas = 6 THEN '6'
            WHEN cantidad_personas = 7 THEN '7'
            ELSE '8+'
          END = '3' THEN 3
        WHEN
          CASE 
            WHEN cantidad_personas = 1 THEN '1'
            WHEN cantidad_personas = 2 THEN '2'
            WHEN cantidad_personas = 3 THEN '3'
            WHEN cantidad_personas = 4 THEN '4'
            WHEN cantidad_personas = 5 THEN '5'
            WHEN cantidad_personas = 6 THEN '6'
            WHEN cantidad_personas = 7 THEN '7'
            ELSE '8+'
          END = '4' THEN 4
        WHEN
          CASE 
            WHEN cantidad_personas = 1 THEN '1'
            WHEN cantidad_personas = 2 THEN '2'
            WHEN cantidad_personas = 3 THEN '3'
            WHEN cantidad_personas = 4 THEN '4'
            WHEN cantidad_personas = 5 THEN '5'
            WHEN cantidad_personas = 6 THEN '6'
            WHEN cantidad_personas = 7 THEN '7'
            ELSE '8+'
          END = '5' THEN 5
        WHEN
          CASE 
            WHEN cantidad_personas = 1 THEN '1'
            WHEN cantidad_personas = 2 THEN '2'
            WHEN cantidad_personas = 3 THEN '3'
            WHEN cantidad_personas = 4 THEN '4'
            WHEN cantidad_personas = 5 THEN '5'
            WHEN cantidad_personas = 6 THEN '6'
            WHEN cantidad_personas = 7 THEN '7'
            ELSE '8+'
          END = '6' THEN 6
        WHEN
          CASE 
            WHEN cantidad_personas = 1 THEN '1'
            WHEN cantidad_personas = 2 THEN '2'
            WHEN cantidad_personas = 3 THEN '3'
            WHEN cantidad_personas = 4 THEN '4'
            WHEN cantidad_personas = 5 THEN '5'
            WHEN cantidad_personas = 6 THEN '6'
            WHEN cantidad_personas = 7 THEN '7'
            ELSE '8+'
          END = '7' THEN 7
        ELSE 8
      END;
  `;


    const result = await pool.query(query, params);

    const datos = result.rows.map((row: any) => ({
      grupo: row.grupo,
      cantidad: Number(row.cantidad),
    }));

    res.status(200).json(datos);
  } catch (error) {
    console.error('Error al obtener reservas por grupo:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas por grupo' });
  }
};

export const getComensalesPorDiaSemana = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(fecha_reserva, 'Day') AS dia,
        SUM(cantidad_personas) AS cantidad
      FROM reservas
      WHERE estado != 'cancelada'
      GROUP BY dia
      ORDER BY MIN(DATE_PART('dow', fecha_reserva))
    `);

    const diasTraducidos: Record<string, string> = {
      Monday: 'Lunes',
      Tuesday: 'Martes',
      Wednesday: 'Miércoles',
      Thursday: 'Jueves',
      Friday: 'Viernes',
      Saturday: 'Sábado',
      Sunday: 'Domingo',
    };

    const datos = result.rows.map((row: any) => {
      const diaIngles = row.dia.trim();
      const dia = diasTraducidos[diaIngles] || diaIngles;
      return {
        dia,
        cantidad: parseInt(row.cantidad, 10),
      };
    });

    res.status(200).json(datos);
  } catch (error) {
    console.error('Error al obtener comensales por día de la semana:', error);
    res.status(500).json({ error: 'Error al obtener datos de comensales por día' });
  }
};










