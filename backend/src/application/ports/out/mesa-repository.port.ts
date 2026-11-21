import type { Mesa } from '../../../domain/models/mesa.model.js';

export interface MesaRepositoryPort {
    getAll(sucursalId?: number): Promise<Mesa[]>;
    findByNumero(sucursalId: number, numero: number): Promise<any | null>;
    create(mesa: { sucursalId: number; numero: number; capacidad: number; posX?: number | null; posY?: number | null }): Promise<Mesa>;
}
