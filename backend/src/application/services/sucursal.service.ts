import type { SucursalRepositoryPort } from '../ports/out/sucursal-repository.port.js';
import type { Sucursal } from '../../domain/models/sucursal.model.js';

export class SucursalService {
    constructor(private sucursalRepository: SucursalRepositoryPort) {}

    async getAll(): Promise<Sucursal[]> {
        return await this.sucursalRepository.getAll();
    }

    async getById(id: number): Promise<Sucursal | null> {
        return await this.sucursalRepository.getById(id);
    }

    async create(sucursalData: Omit<Sucursal, 'id'>): Promise<Sucursal> {
        if (!sucursalData.nombre || !sucursalData.direccion || !sucursalData.telefono) {
            throw new Error('Nombre, dirección y teléfono son requeridos para la sucursal');
        }
        return await this.sucursalRepository.create(sucursalData);
    }

    async update(id: number, data: Partial<Sucursal>): Promise<boolean> {
        return await this.sucursalRepository.update(id, data);
    }

    async delete(id: number): Promise<boolean> {
        return await this.sucursalRepository.delete(id);
    }
}
