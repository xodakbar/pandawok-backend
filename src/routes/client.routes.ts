import express from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  exportClientsToExcel
} from '../controllers/clients.controller';

const router = express.Router();

router.get('/', getAllClients);

// Coloca primero la ruta específica antes de la dinámica
router.get('/export/excel', exportClientsToExcel);

router.get('/:id', getClientById);

router.post('/', createClient);

router.put('/:id', updateClient);

router.delete('/:id', deleteClient);

export default router;
