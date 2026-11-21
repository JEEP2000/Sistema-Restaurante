import { Router } from 'express';
import { mesaController } from '../../../../container.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/mesas
router.get('/', authenticateToken, mesaController.getMesas.bind(mesaController));

// POST /api/mesas (Administrador, Administrador General, Dueño, SuperAdmin)
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador', 'Administrador General', 'Dueño', 'SuperAdmin'),
    mesaController.crearMesa.bind(mesaController)
);

export default router;

