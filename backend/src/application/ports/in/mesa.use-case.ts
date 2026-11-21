import type { Mesa } from '../../../domain/models/mesa.model.js';

export interface MesaUseCase {
    getMesas(sucursalId?: number): Promise<Mesa[]>;
    crearMesa(mesa: { sucursalId: number; numero: number; capacidad: number; posX?: number | null; posY?: number | null }): Promise<Mesa>;
}
