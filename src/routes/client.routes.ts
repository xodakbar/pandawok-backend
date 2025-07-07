import { Router } from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  exportClientsToExcel,
} from '../controllers/clients.controller';

const router = Router();

// Listar todos los clientes
router.get('/', getAllClients);

// Obtener un cliente por ID
router.get('/:id', getClientById);

// Crear nuevo cliente
router.post('/', createClient);

// Actualizar cliente por ID
router.put('/:id', updateClient);

// Eliminar cliente por ID
router.delete('/:id', deleteClient);

// Exportar clientes a Excel
router.get('/export/excel', exportClientsToExcel);

export default router;
