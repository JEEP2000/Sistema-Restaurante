import type { Request, Response } from 'express';
import type { MesaUseCase } from '../../../../../application/ports/in/mesa.use-case.js';

export class MesaController {
    constructor(private mesaService: MesaUseCase) {}

    async getMesas(req: any, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : req.user?.sucursalId;
            const mesas = await this.mesaService.getMesas(sucursalId);
            res.json({
                success: true,
                data: mesas
            });
        } catch (error) {
            console.error('Error en MesaController.getMesas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las mesas de la base de datos'
            });
        }
    }

    async crearMesa(req: any, res: Response): Promise<void> {
        try {
            const sucursalId = req.body.sucursalId ? Number(req.body.sucursalId) : req.user?.sucursalId;
            const numero = Number(req.body.numero);
            const capacidad = req.body.capacidad !== undefined ? Number(req.body.capacidad) : 4;
            const posX = req.body.posX ? Number(req.body.posX) : null;
            const posY = req.body.posY ? Number(req.body.posY) : null;

            if (!sucursalId) {
                res.status(400).json({
                    success: false,
                    message: 'Debe especificar una sucursal válida'
                });
                return;
            }

            if (!numero || isNaN(numero) || numero <= 0) {
                res.status(400).json({
                    success: false,
                    message: 'El número de mesa debe ser un número entero mayor a 0'
                });
                return;
            }

            if (!capacidad || isNaN(capacidad) || capacidad <= 0) {
                res.status(400).json({
                    success: false,
                    message: 'La capacidad debe ser de al menos 1 comensal'
                });
                return;
            }

            const nuevaMesa = await this.mesaService.crearMesa({
                sucursalId,
                numero,
                capacidad,
                posX,
                posY
            });

            res.status(201).json({
                success: true,
                message: `Mesa ${numero} creada exitosamente en la base de datos`,
                data: nuevaMesa
            });
        } catch (error: any) {
            console.error('Error en MesaController.crearMesa:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error al crear la mesa en la base de datos'
            });
        }
    }
}
