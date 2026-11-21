import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { UserRepositoryPort } from '../ports/out/user-repository.port.js';
import type { User } from '../../domain/models/user.model.js';
import type { AuthUseCase } from '../ports/in/auth.use-case.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

export class AuthService implements AuthUseCase {
    constructor(private userRepository: UserRepositoryPort) {}

    async login(nombre: string, password: string) {
        const candidates = await this.userRepository.findByName(nombre);
        
        if (candidates.length === 0) {
            throw new Error('Credenciales inválidas');
        }

        let authenticatedUser: User | null = null;
        for (const candidate of candidates) {
            const match = await bcrypt.compare(password, candidate.passwordHash);
            if (match) {
                authenticatedUser = candidate;
                break;
            }
        }

        if (!authenticatedUser) {
            throw new Error('Credenciales inválidas');
        }

        const token = jwt.sign(
            {
                id: authenticatedUser.id,
                nombre: authenticatedUser.nombre,
                email: authenticatedUser.email,
                rolId: authenticatedUser.rolId,
                rolNombre: authenticatedUser.rolNombre,
                sucursalId: authenticatedUser.sucursalId,
                sucursalNombre: authenticatedUser.sucursalNombre
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return {
            token,
            user: {
                id: authenticatedUser.id as number,
                rolId: authenticatedUser.rolId,
                nombre: authenticatedUser.nombre,
                apellido: authenticatedUser.apellido,
                email: authenticatedUser.email,
                rolNombre: authenticatedUser.rolNombre as string,
                sucursalId: authenticatedUser.sucursalId,
                sucursalNombre: authenticatedUser.sucursalNombre
            }
        };
    }

    async register(user: Omit<User, 'id' | 'activo' | 'fechaCreacion' | 'passwordHash'> & { password?: string }) {
        if (!user.password || user.password.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }

        if (user.email) {
            const existingByEmail = await this.userRepository.findByEmail(user.email);
            if (existingByEmail) {
                throw new Error('El correo electrónico ya está registrado');
            }
        }

        const existingByName = await this.userRepository.findByName(user.nombre);
        if (existingByName.length > 0) {
            throw new Error('El nombre de usuario ya está registrado');
        }

        const passwordHash = await bcrypt.hash(user.password, 10);
        
        return await this.userRepository.create({
            sucursalId: user.sucursalId,
            rolId: user.rolId,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            passwordHash,
            telefono: user.telefono || null
        });
    }

    async getStaffBySucursal(sucursalId: number) {
        return await this.userRepository.getBySucursal(sucursalId);
    }

    async updateUser(id: number, data: Partial<User>) {
        if (data.email) {
            const existing = await this.userRepository.findByEmail(data.email);
            if (existing && existing.id !== id) {
                throw new Error('El correo electrónico ya está registrado en otra cuenta');
            }
        }
        return await this.userRepository.update(id, data);
    }

    async deleteUser(id: number, currentUserId: number) {
        if (id === currentUserId) {
            throw new Error('No puedes eliminar tu propia cuenta de administrador');
        }
        try {
            return await this.userRepository.delete(id);
        } catch (error: any) {
            // Error 547 es el código de SQL Server para conflictos de llave foránea (REFERENCE constraint)
            if (error.number === 547 || (error.message && (error.message.includes('REFERENCE constraint') || error.message.includes('foreign key')))) {
                await this.userRepository.update(id, { activo: false });
                throw new Error('El empleado tiene historial de transacciones (pedidos/cierres) y no puede ser eliminado físicamente. Su estado ha sido cambiado a "Inactivo" automáticamente para conservar el historial del restaurante.');
            }
            throw error;
        }
    }

    async resetPassword(id: number, password: string) {
        if (!password || password.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        return await this.userRepository.update(id, { passwordHash });
    }
}
