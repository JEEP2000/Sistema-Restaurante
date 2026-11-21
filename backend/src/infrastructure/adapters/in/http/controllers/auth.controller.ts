import type { Request, Response } from 'express';
import type { AuthUseCase } from '../../../../../application/ports/in/auth.use-case.js';

export class AuthController {
    constructor(private authService: AuthUseCase) {}

    async register(req: any, res: Response): Promise<void> {
        try {
            let { sucursalId, rolId, nombre, apellido, email, password, telefono } = req.body;

            if (!rolId || !nombre || !apellido || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Por favor, complete todos los campos obligatorios'
                });
                return;
            }

            const targetRolId = Number(rolId);
            const currentUser = req.user;

            if (currentUser) {
                if (currentUser.rolNombre === 'Administrador') {
                    // El administrador de sede NO puede crear administradores ni dueños
                    if (targetRolId === 1 || targetRolId === 5) {
                        res.status(403).json({
                            success: false,
                            message: 'Solo el Administrador General o Dueño tiene permisos para crear Administradores o Dueños'
                        });
                        return;
                    }
                    // La sucursal se fija a la sede del administrador
                    sucursalId = currentUser.sucursalId;
                } else if (currentUser.rolNombre === 'Dueño' || currentUser.rolNombre === 'SuperAdmin') {
                    // El Dueño puede elegir la sucursal y cualquier rol
                    if (!sucursalId) {
                        sucursalId = currentUser.sucursalId || 1;
                    }
                } else {
                    res.status(403).json({
                        success: false,
                        message: 'No tienes permisos para registrar nuevos usuarios'
                    });
                    return;
                }
            } else {
                // Registro sin token (público): Prohibir creación de Admin/Dueño si ya hay usuarios
                if (targetRolId === 1 || targetRolId === 5) {
                    const existingStaff = await this.authService.getStaffBySucursal(Number(sucursalId) || 1);
                    if (existingStaff && existingStaff.length > 0) {
                        res.status(403).json({
                            success: false,
                            message: 'Solo el Administrador General o Dueño puede crear nuevos Administradores.'
                        });
                        return;
                    }
                }
            }

            if (!sucursalId) {
                sucursalId = 1;
            }

            const createdUser = await this.authService.register({
                sucursalId: Number(sucursalId),
                rolId: targetRolId,
                nombre,
                apellido,
                email,
                password,
                telefono
            });

            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                user: createdUser
            });
        } catch (error: any) {
            console.error('Error en AuthController.register:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error al registrar el usuario'
            });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { nombre, password } = req.body;

            if (!nombre || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Por favor ingrese nombre de usuario y contraseña'
                });
                return;
            }

            const result = await this.authService.login(nombre, password);

            res.json({
                success: true,
                message: 'Inicio de sesión exitoso',
                ...result
            });
        } catch (error: any) {
            console.error('Error en AuthController.login:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Error interno del servidor al iniciar sesión'
            });
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        try {
            res.json({
                success: true,
                message: 'Sesión cerrada correctamente en el servidor'
            });
        } catch (error) {
            console.error('Error en AuthController.logout:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al cerrar sesión'
            });
        }
    }

    async getUsersBySucursal(req: any, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : req.user?.sucursalId;
            if (!sucursalId) {
                res.status(400).json({
                    success: false,
                    message: 'No se pudo identificar la sucursal'
                });
                return;
            }

            const staff = await this.authService.getStaffBySucursal(sucursalId);
            res.json({
                success: true,
                data: staff
            });
        } catch (error: any) {
            console.error('Error en AuthController.getUsersBySucursal:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error interno del servidor al obtener el personal de la sucursal'
            });
        }
    }

    async updateUser(req: any, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { nombre, apellido, email, telefono, rolId, activo } = req.body;

            if (!nombre || !apellido || !rolId) {
                res.status(400).json({ success: false, message: 'Nombre, apellido y rol son requeridos' });
                return;
            }

            const updateData: any = {
                nombre,
                apellido,
                email,
                telefono,
                rolId: Number(rolId)
            };
            if (activo !== undefined) {
                updateData.activo = (activo === true || activo === 'true' || Number(activo) === 1);
            }

            const success = await this.authService.updateUser(Number(id), updateData);

            if (success) {
                res.json({ success: true, message: 'Usuario actualizado exitosamente' });
            } else {
                res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }
        } catch (error: any) {
            console.error('Error en AuthController.updateUser:', error);
            res.status(400).json({ success: false, message: error.message || 'Error interno al actualizar el usuario' });
        }
    }

    async deleteUser(req: any, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const currentUserId = req.user?.id;

            const success = await this.authService.deleteUser(Number(id), Number(currentUserId));

            if (success) {
                res.json({ success: true, message: 'Usuario eliminado exitosamente' });
            } else {
                res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }
        } catch (error: any) {
            console.error('Error en AuthController.deleteUser:', error);
            res.status(400).json({ success: false, message: error.message || 'Error interno al eliminar el usuario' });
        }
    }

    async resetPassword(req: any, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { password } = req.body;

            const success = await this.authService.resetPassword(Number(id), password);

            if (success) {
                res.json({ success: true, message: 'Contraseña restablecida exitosamente' });
            } else {
                res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }
        } catch (error: any) {
            console.error('Error en AuthController.resetPassword:', error);
            res.status(400).json({ success: false, message: error.message || 'Error interno al restablecer la contraseña' });
        }
    }
}
