import type { User } from '../../../domain/models/user.model.js';

export interface AuthUseCase {
    login(nombre: string, password: string): Promise<{ token: string; user: Omit<User, 'passwordHash' | 'activo' | 'fechaCreacion'> }>;
    register(user: Omit<User, 'id' | 'activo' | 'fechaCreacion' | 'passwordHash'> & { password?: string }): Promise<Omit<User, 'passwordHash'>>;
    getStaffBySucursal(sucursalId: number): Promise<User[]>;
    updateUser(id: number, data: Partial<User>): Promise<boolean>;
    deleteUser(id: number, currentUserId: number): Promise<boolean>;
    resetPassword(id: number, password: string): Promise<boolean>;
}
