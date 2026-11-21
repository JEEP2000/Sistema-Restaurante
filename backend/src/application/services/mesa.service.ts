import type { MesaRepositoryPort } from '../ports/out/mesa-repository.port.js';
import type { MesaUseCase } from '../ports/in/mesa.use-case.js';
import type { Mesa } from '../../domain/models/mesa.model.js';

export class MesaService implements MesaUseCase {
    constructor(private mesaRepository: MesaRepositoryPort) {}

    async getMesas(sucursalId?: number): Promise<Mesa[]> {
        return await this.mesaRepository.getAll(sucursalId);
    }

    async crearMesa(mesaData: { sucursalId: number; numero: number; capacidad: number; posX?: number | null; posY?: number | null }): Promise<Mesa> {
        if (!mesaData.sucursalId || mesaData.sucursalId <= 0) {
            throw new Error('La sucursal es obligatoria para registrar una mesa');
        }
        if (!mesaData.numero || mesaData.numero <= 0) {
            throw new Error('El número de mesa debe ser un número entero positivo mayor a 0');
        }
        if (!mesaData.capacidad || mesaData.capacidad <= 0) {
            throw new Error('La capacidad de la mesa debe ser al menos de 1 persona');
        }

        const existing = await this.mesaRepository.findByNumero(mesaData.sucursalId, mesaData.numero);
        if (existing && existing.activo) {
            throw new Error(`Ya existe una mesa activa con el número ${mesaData.numero} en esta sucursal`);
        }

        return await this.mesaRepository.create(mesaData);
    }
}
