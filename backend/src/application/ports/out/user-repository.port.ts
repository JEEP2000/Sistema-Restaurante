import type { User } from '../../../domain/models/user.model.js';

export interface UserRepositoryPort {
    findByEmail(email: string): Promise<User | null>;
    findByName(nombre: string): Promise<User[]>;
    create(user: Omit<User, 'id' | 'activo' | 'fechaCreacion'>): Promise<Omit<User, 'passwordHash'>>;
    getBySucursal(sucursalId: number): Promise<User[]>;
    update(id: number, data: Partial<User>): Promise<boolean>;
    delete(id: number): Promise<boolean>;
}
