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

router.get('/:id', getClientById);

router.post('/', createClient);

router.put('/:id', updateClient);

router.delete('/:id', deleteClient);

router.get('/export/excel', exportClientsToExcel);

export default router;
