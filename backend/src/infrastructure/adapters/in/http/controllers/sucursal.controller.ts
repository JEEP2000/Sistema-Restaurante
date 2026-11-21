import type { Request, Response } from 'express';
import { SucursalService } from '../../../../../application/services/sucursal.service.js';

export class SucursalController {
    constructor(private sucursalService: SucursalService) {}

    async getAll(req: Request, res: Response): Promise<void> {
        try {
            const sucursales = await this.sucursalService.getAll();
            res.json({
                success: true,
                data: sucursales
            });
        } catch (error: any) {
            console.error('Error en SucursalController.getAll:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener sucursales'
            });
        }
    }

    async getById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const sucursal = await this.sucursalService.getById(Number(id));
            if (!sucursal) {
                res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
                return;
            }
            res.json({ success: true, data: sucursal });
        } catch (error: any) {
            console.error('Error en SucursalController.getById:', error);
            res.status(500).json({ success: false, message: error.message || 'Error al obtener sucursal' });
        }
    }

    async create(req: Request, res: Response): Promise<void> {
        try {
            const { nombre, direccion, telefono, correoContacto, horarioApertura, horarioCierre, esDelivery, costoDelivery, activo } = req.body;
            
            if (!nombre || !direccion || !telefono) {
                res.status(400).json({ success: false, message: 'Nombre, dirección y teléfono son obligatorios' });
                return;
            }

            const nuevaSucursal = await this.sucursalService.create({
                empresaId: 1,
                nombre,
                direccion,
                telefono,
                correoContacto: correoContacto || null,
                horarioApertura: horarioApertura || null,
                horarioCierre: horarioCierre || null,
                esDelivery: esDelivery !== undefined ? Boolean(esDelivery) : true,
                costoDelivery: costoDelivery !== undefined ? Number(costoDelivery) : 0,
                activo: activo !== undefined ? Boolean(activo) : true
            });

            res.status(201).json({
                success: true,
                message: 'Sucursal creada exitosamente',
                data: nuevaSucursal
            });
        } catch (error: any) {
            console.error('Error en SucursalController.create:', error);
            res.status(400).json({ success: false, message: error.message || 'Error al crear la sucursal' });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { nombre, direccion, telefono, correoContacto, horarioApertura, horarioCierre, esDelivery, costoDelivery, activo } = req.body;

            const updateData: any = {};
            if (nombre !== undefined) updateData.nombre = nombre;
            if (direccion !== undefined) updateData.direccion = direccion;
            if (telefono !== undefined) updateData.telefono = telefono;
            if (correoContacto !== undefined) updateData.correoContacto = correoContacto;
            if (horarioApertura !== undefined) updateData.horarioApertura = horarioApertura;
            if (horarioCierre !== undefined) updateData.horarioCierre = horarioCierre;
            if (esDelivery !== undefined) updateData.esDelivery = Boolean(esDelivery);
            if (costoDelivery !== undefined) updateData.costoDelivery = Number(costoDelivery);
            if (activo !== undefined) updateData.activo = Boolean(activo);

            const success = await this.sucursalService.update(Number(id), updateData);
            if (success) {
                res.json({ success: true, message: 'Sucursal actualizada exitosamente' });
            } else {
                res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
            }
        } catch (error: any) {
            console.error('Error en SucursalController.update:', error);
            res.status(400).json({ success: false, message: error.message || 'Error al actualizar la sucursal' });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const success = await this.sucursalService.delete(Number(id));
            if (success) {
                res.json({ success: true, message: 'Sucursal eliminada exitosamente' });
            } else {
                res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
            }
        } catch (error: any) {
            console.error('Error en SucursalController.delete:', error);
            // Si hay conflicto de clave foránea
            if (error.number === 547 || (error.message && error.message.includes('REFERENCE constraint'))) {
                // Soft delete
                await this.sucursalService.update(Number(req.params.id), { activo: false });
                res.status(400).json({
                    success: false,
                    message: 'La sucursal tiene datos operativos (mesas, pedidos o personal) y no se puede borrar físicamente. Se ha desactivado (Inactivo) automáticamente.'
                });
                return;
            }
            res.status(400).json({ success: false, message: error.message || 'Error al eliminar la sucursal' });
        }
    }
}
