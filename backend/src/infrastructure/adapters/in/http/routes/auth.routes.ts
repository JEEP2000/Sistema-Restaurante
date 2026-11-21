import { Router } from 'express';
import { authController } from '../../../../container.js';
import { authenticateToken, authorizeRoles, optionalAuthenticateToken } from '../middlewares/auth.middleware.js';
import { connectDatabase } from '../../../../../config/database.js';

const router = Router();

// POST /api/auth/register
router.post('/register', optionalAuthenticateToken, authController.register.bind(authController));

// POST /api/auth/login
router.post('/login', authController.login.bind(authController));

// GET /api/auth/roles (Devuelve roles directamente desde la BD en tiempo real)
router.get('/roles', async (_req, res, next) => {
    try {
        const pool = await connectDatabase();
        const result = await pool.request().query('SELECT Id as id, Nombre as nombre, Descripcion as descripcion FROM dbo.Roles ORDER BY Id ASC');
        res.json({
            success: true,
            roles: result.recordset
        });
    } catch (error) {
        next(error);
    }
});


// GET /api/auth/profile (Ruta Protegida)
router.get('/profile', authenticateToken, async (req: any, res) => {
    try {
        if (req.user && !req.user.sucursalNombre && req.user.sucursalId) {
            const pool = await connectDatabase();
            const sucResult = await pool.request()
                .input('id', req.user.sucursalId)
                .query('SELECT Nombre as nombre FROM dbo.Sucursales WHERE Id = @id');
            if (sucResult.recordset.length > 0) {
                req.user.sucursalNombre = sucResult.recordset[0].nombre;
            }
        }
    } catch (e) {
        console.warn('Error al enriquecer perfil con sucursalNombre:', e);
    }

    res.json({
        success: true,
        message: 'Acceso concedido a tu perfil',
        user: req.user
    });
});

// GET /api/auth/users-by-sucursal (Protegida, Cocina y Administración)
router.get('/users-by-sucursal', authenticateToken, authorizeRoles('Administrador', 'Administrador General', 'Dueño', 'SuperAdmin', 'Cocinero'), authController.getUsersBySucursal.bind(authController));

// PUT /api/auth/users/:id (Protegida, solo Administrador)
router.put('/users/:id', authenticateToken, authorizeRoles('Administrador'), authController.updateUser.bind(authController));

// DELETE /api/auth/users/:id (Protegida, solo Administrador)
router.delete('/users/:id', authenticateToken, authorizeRoles('Administrador'), authController.deleteUser.bind(authController));

// PATCH /api/auth/users/:id/reset-password (Protegida, solo Administrador)
router.patch('/users/:id/reset-password', authenticateToken, authorizeRoles('Administrador'), authController.resetPassword.bind(authController));

// POST /api/auth/logout (Ruta Protegida para revocar sesión)
router.post('/logout', authenticateToken, authController.logout.bind(authController));

export default router;
