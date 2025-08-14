import { Router } from 'express';
import * as estadisticasController from '../controllers/estadisticas.controller';

const router = Router();

// Estadísticas generales reservas
router.get('/resumen', (req, res, next) => {
  estadisticasController.getResumenBasico(req, res).catch(next);
});
router.get('/resumen-fecha', (req, res, next) => {
  estadisticasController.getResumenPorFecha(req, res).catch(next);
});

// Estadísticas walk-in
router.get('/walkin/resumen', (req, res, next) => {
  estadisticasController.getWalkInResumenBasico(req, res).catch(next);
});
router.get('/walkin/resumen-fecha', (req, res, next) => {
  estadisticasController.getWalkInResumenPorFecha(req, res).catch(next);
});

// Lista de espera
router.get('/lista-espera/resumen', (req, res, next) => {
  estadisticasController.getListaEsperaResumenBasico(req, res).catch(next);
});
router.get('/lista-espera/resumen-fecha', (req, res, next) => {
  estadisticasController.getListaEsperaResumenPorFecha(req, res).catch(next);
});

// Flujo por hora
router.get('/flujo-hora', (req, res, next) => {
  estadisticasController.getFlujoComensalesPorHora(req, res).catch(next);
});

// Reservas por día de la semana
router.get('/reservas-por-dia', (req, res, next) => {
  estadisticasController.getReservasPorDiaSemana(req, res).catch(next);
});

// ✅ Nueva ruta: Reservas por grupo de personas
router.get('/reservas-por-grupo', (req, res, next) => {
  estadisticasController.getReservasPorGrupo(req, res).catch(next);
});

router.get('/comensales-por-dia', (req, res, next) => {
  estadisticasController.getComensalesPorDiaSemana(req, res).catch(next);
});

export default router;
