import { Router } from 'express';
import { sucursalController } from '../../../../container.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/sucursales (Público o para usuarios autenticados para poblar selectores)
router.get('/', sucursalController.getAll.bind(sucursalController));

// GET /api/sucursales/:id
router.get('/:id', sucursalController.getById.bind(sucursalController));

// POST /api/sucursales (Solo Dueño / SuperAdmin)
router.post('/', authenticateToken, authorizeRoles('Dueño'), sucursalController.create.bind(sucursalController));

// PUT /api/sucursales/:id (Solo Dueño / SuperAdmin)
router.put('/:id', authenticateToken, authorizeRoles('Dueño'), sucursalController.update.bind(sucursalController));

// DELETE /api/sucursales/:id (Solo Dueño / SuperAdmin)
router.delete('/:id', authenticateToken, authorizeRoles('Dueño'), sucursalController.delete.bind(sucursalController));

export default router;
