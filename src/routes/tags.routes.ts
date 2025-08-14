import express from 'express';
import * as tagsController from '../controllers/tags.controller';

const router = express.Router();

// Listar todos los tags
router.get('/', (req, res, next) => {
  tagsController.obtenerTags(req, res, next).catch(next);
});

// Listar tags agrupados por categoría y subcategoría
router.get('/categorias', (req, res, next) => {
  tagsController.obtenerTagsPorCategoria(req, res, next).catch(next);
});

// Crear nuevo tag
router.post('/', (req, res, next) => {
  tagsController.crearTag(req, res, next).catch(next);
});

// Eliminar tag por ID
router.delete('/:id', (req, res, next) => {
  tagsController.eliminarTag(req, res, next).catch(next);
});

export default router;
