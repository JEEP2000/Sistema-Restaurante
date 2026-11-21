import type { Sucursal } from '../../../domain/models/sucursal.model.js';

export interface SucursalRepositoryPort {
    getAll(): Promise<Sucursal[]>;
    getById(id: number): Promise<Sucursal | null>;
    create(sucursal: Omit<Sucursal, 'id'>): Promise<Sucursal>;
    update(id: number, data: Partial<Sucursal>): Promise<boolean>;
    delete(id: number): Promise<boolean>;
}
