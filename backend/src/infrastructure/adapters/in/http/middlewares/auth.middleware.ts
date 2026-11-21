import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        nombre: string;
        email?: string | null;
        rolId: number;
        rolNombre: string;
        sucursalId: number;
        sucursalNombre?: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Acceso denegado. No se proporcionó un token de sesión'
        });
        return;
    }

    try {
        const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
        const decoded = jwt.verify(token, jwtSecret) as any;

        req.user = {
            id: decoded.id,
            nombre: decoded.nombre,
            email: decoded.email,
            rolId: decoded.rolId,
            rolNombre: decoded.rolNombre,
            sucursalId: decoded.sucursalId,
            sucursalNombre: decoded.sucursalNombre
        };

        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};

export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
        const decoded = jwt.verify(token, jwtSecret) as any;

        req.user = {
            id: decoded.id,
            nombre: decoded.nombre,
            email: decoded.email,
            rolId: decoded.rolId,
            rolNombre: decoded.rolNombre,
            sucursalId: decoded.sucursalId,
            sucursalNombre: decoded.sucursalNombre
        };
    } catch (error) {
        // Token no válido en ruta opcional, continuar sin req.user
    }

    next();
};

export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }

        const userRole = (req.user.rolNombre || '').toLowerCase().trim();
        const superRoles = ['dueño', 'superadmin', 'administrador general', 'admin general'];
        const isAllowed = superRoles.includes(userRole) || 
                          allowedRoles.some(r => r.toLowerCase().trim() === userRole);

        if (isAllowed) {
            return next();
        }

        res.status(403).json({
            success: false,
            message: 'No tienes permisos para realizar esta acción'
        });
    };
};
