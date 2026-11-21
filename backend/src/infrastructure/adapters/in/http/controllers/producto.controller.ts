import type { Response } from 'express';
import type { ProductoUseCase } from '../../../../../application/ports/in/producto.use-case.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export class ProductoController {
    constructor(private productoService: ProductoUseCase) {}

    // =========================================================================
    // CATEGORÍAS (TIPOS DE PLATO)
    // =========================================================================

    async getCategorias(req: AuthRequest, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : req.user?.sucursalId;
            const incluirInactivas = req.query.incluirInactivas === 'true';
            const categorias = await this.productoService.getCategorias(sucursalId, incluirInactivas);
            res.json({
                success: true,
                data: categorias
            });
        } catch (error) {
            console.error('Error en ProductoController.getCategorias:', error);
            res.status(500).json({ success: false, message: 'Error al obtener las categorías' });
        }
    }

    async crearCategoria(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { nombre, descripcion, esCocina, ordenVisual, activo } = req.body;
            if (!nombre || !nombre.trim()) {
                res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio' });
                return;
            }

            const sucursalId = req.body.sucursalId ? Number(req.body.sucursalId) : (req.user?.sucursalId || 1);
            const nueva = await this.productoService.crearCategoria({
                sucursalId,
                nombre,
                descripcion,
                esCocina,
                ordenVisual: ordenVisual !== undefined ? Number(ordenVisual) : 1,
                activo: activo !== undefined ? Boolean(activo) : true
            });

            res.status(201).json({
                success: true,
                data: nueva,
                message: 'Tipo de plato / Categoría creada exitosamente'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.crearCategoria:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al crear categoría' });
        }
    }

    async actualizarCategoria(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const data = req.body;
            const actualizada = await this.productoService.actualizarCategoria(Number(id), data);
            res.json({
                success: true,
                data: actualizada,
                message: 'Categoría actualizada exitosamente'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.actualizarCategoria:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al actualizar categoría' });
        }
    }

    async toggleActivoCategoria(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const resultado = await this.productoService.toggleActivoCategoria(Number(id));
            res.json({
                success: true,
                data: resultado,
                message: resultado.activo ? 'Categoría activada' : 'Categoría ocultada'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.toggleActivoCategoria:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al cambiar estado de categoría' });
        }
    }

    // =========================================================================
    // PRODUCTOS / PLATOS / MENÚ DEL DÍA
    // =========================================================================

    async getProductos(req: AuthRequest, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : req.user?.sucursalId;
            const categoriaId = req.query.categoriaId ? Number(req.query.categoriaId) : undefined;
            const incluirInactivos = req.query.incluirInactivos === 'true';
            const soloMenuDelDia = req.query.soloMenuDelDia === 'true';

            const productos = await this.productoService.getProductos(sucursalId, categoriaId, incluirInactivos, soloMenuDelDia);
            res.json({
                success: true,
                data: productos
            });
        } catch (error) {
            console.error('Error en ProductoController.getProductos:', error);
            res.status(500).json({ success: false, message: 'Error al obtener los productos' });
        }
    }

    async getProductoById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const producto = await this.productoService.getProductoById(Number(id));
            if (!producto) {
                res.status(404).json({ success: false, message: 'Producto no encontrado' });
                return;
            }
            res.json({ success: true, data: producto });
        } catch (error) {
            console.error('Error en ProductoController.getProductoById:', error);
            res.status(500).json({ success: false, message: 'Error al obtener el producto' });
        }
    }

    async crearProducto(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { nombre, categoriaId, precio, descripcion, requiereCoccion, tiempoEstimado, imagenUrl, activo, esMenuDelDia } = req.body;
            if (!nombre || !nombre.trim() || categoriaId === undefined || precio === undefined) {
                res.status(400).json({ success: false, message: 'Nombre, categoría y precio son obligatorios' });
                return;
            }

            const sucursalId = req.body.sucursalId ? Number(req.body.sucursalId) : (req.user?.sucursalId || 1);
            const nuevo = await this.productoService.crearProducto({
                sucursalId,
                categoriaId: Number(categoriaId),
                nombre: nombre.trim(),
                descripcion: descripcion?.trim() || null,
                precio: Number(precio),
                requiereCoccion: requiereCoccion !== undefined ? Boolean(requiereCoccion) : true,
                tiempoEstimado: tiempoEstimado !== undefined && tiempoEstimado !== null ? Number(tiempoEstimado) : 10,
                imagenUrl: imagenUrl?.trim() || null,
                activo: activo !== undefined ? Boolean(activo) : true,
                esMenuDelDia: esMenuDelDia !== undefined ? Boolean(esMenuDelDia) : false
            });

            res.status(201).json({
                success: true,
                data: nuevo,
                message: 'Plato registrado con éxito en la carta'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.crearProducto:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al crear producto' });
        }
    }

    async actualizarProducto(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const data = { ...req.body };
            const rol = (req.user?.rolNombre || '').toLowerCase().trim();
            const esGlobal = ['dueño', 'dueño', 'superadmin', 'administrador general', 'admin general'].includes(rol);

            // Si es un administrador local, restringir la sincronización únicamente a su sede asignada
            if (!esGlobal && req.user?.sucursalId && data.sucursalesDisponibles && Array.isArray(data.sucursalesDisponibles)) {
                data.sucursalesDisponibles = data.sucursalesDisponibles.filter((item: any) => {
                    const sId = typeof item === 'number' ? item : item.sucursalId;
                    return Number(sId) === Number(req.user?.sucursalId);
                });
            }

            const actualizado = await this.productoService.actualizarProducto(Number(id), data);
            res.json({
                success: true,
                data: actualizado,
                message: 'Plato actualizado con éxito'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.actualizarProducto:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al actualizar producto' });
        }
    }

    async toggleActivoProducto(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const rol = (req.user?.rolNombre || '').toLowerCase().trim();
            const esGlobal = ['dueño', 'dueño', 'superadmin', 'administrador general', 'admin general'].includes(rol);
            // Si no es admin global, se fuerza sucursalId a la sede asignada del usuario autenticado
            const sucursalId = (!esGlobal && req.user?.sucursalId)
                ? req.user.sucursalId
                : (req.query.sucursalId ? Number(req.query.sucursalId) : (req.body?.sucursalId ? Number(req.body.sucursalId) : req.user?.sucursalId));
            const resultado = await this.productoService.toggleActivoProducto(Number(id), sucursalId);
            res.json({
                success: true,
                data: resultado,
                message: resultado.activo ? 'Plato visible en la carta de la sede' : 'Plato ocultado de la carta de la sede'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.toggleActivoProducto:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al cambiar visibilidad' });
        }
    }

    async toggleMenuDelDia(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const rol = (req.user?.rolNombre || '').toLowerCase().trim();
            const esGlobal = ['dueño', 'dueño', 'superadmin', 'administrador general', 'admin general'].includes(rol);
            // Si no es admin global, se fuerza sucursalId a la sede asignada del usuario autenticado
            const sucursalId = (!esGlobal && req.user?.sucursalId)
                ? req.user.sucursalId
                : (req.query.sucursalId ? Number(req.query.sucursalId) : (req.body?.sucursalId ? Number(req.body.sucursalId) : req.user?.sucursalId));
            const resultado = await this.productoService.toggleMenuDelDia(Number(id), sucursalId);
            res.json({
                success: true,
                data: resultado,
                message: resultado.esMenuDelDia 
                    ? '⭐ Plato añadido al Menú del Día de la sede' 
                    : 'Plato retirado del Menú del Día de la sede'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.toggleMenuDelDia:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al cambiar Menú del Día' });
        }
    }

    async eliminarProducto(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const ok = await this.productoService.eliminarProducto(Number(id));
            res.json({
                success: ok,
                message: ok ? 'Plato retirado de la carta' : 'No se pudo retirar el plato'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.eliminarProducto:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al eliminar producto' });
        }
    }

    // =========================================================================
    // PROMOCIONES Y COMBOS
    // =========================================================================

    async getPromociones(req: AuthRequest, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : req.user?.sucursalId;
            const incluirInactivas = req.query.incluirInactivas === 'true';
            const promos = await this.productoService.getPromociones(sucursalId, incluirInactivas);
            res.json({
                success: true,
                data: promos
            });
        } catch (error) {
            console.error('Error en ProductoController.getPromociones:', error);
            res.status(500).json({ success: false, message: 'Error al obtener las promociones' });
        }
    }

    async getPromocionById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const promo = await this.productoService.getPromocionById(Number(id));
            if (!promo) {
                res.status(404).json({ success: false, message: 'Promoción no encontrada' });
                return;
            }
            res.json({ success: true, data: promo });
        } catch (error) {
            console.error('Error en ProductoController.getPromocionById:', error);
            res.status(500).json({ success: false, message: 'Error al obtener la promoción' });
        }
    }

    async crearPromocion(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { nombre, precioPromo, descripcion, precioOriginal, descuentoPorcentaje, itemsIncluidos, fechaInicio, fechaFin, activo, destacado } = req.body;
            if (!nombre || !nombre.trim() || precioPromo === undefined) {
                res.status(400).json({ success: false, message: 'El nombre y precio promocional son obligatorios' });
                return;
            }

            const sucursalId = req.body.sucursalId ? Number(req.body.sucursalId) : (req.user?.sucursalId || 1);
            const nueva = await this.productoService.crearPromocion({
                sucursalId,
                nombre: nombre.trim(),
                descripcion: descripcion?.trim() || null,
                precioPromo: Number(precioPromo),
                precioOriginal: precioOriginal !== undefined && precioOriginal !== null ? Number(precioOriginal) : null,
                descuentoPorcentaje: descuentoPorcentaje !== undefined && descuentoPorcentaje !== null ? Number(descuentoPorcentaje) : null,
                itemsIncluidos: itemsIncluidos || null,
                fechaInicio: fechaInicio || null,
                fechaFin: fechaFin || null,
                activo: activo !== undefined ? Boolean(activo) : true,
                destacado: destacado !== undefined ? Boolean(destacado) : false
            });

            res.status(201).json({
                success: true,
                data: nueva,
                message: 'Promoción creada exitosamente'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.crearPromocion:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al crear promoción' });
        }
    }

    async actualizarPromocion(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const data = { ...req.body };
            const rol = (req.user?.rolNombre || '').toLowerCase().trim();
            const esGlobal = ['dueño', 'dueño', 'superadmin', 'administrador general', 'admin general'].includes(rol);

            // Si es un administrador local, restringir la sincronización únicamente a su sede asignada
            if (!esGlobal && req.user?.sucursalId && data.sucursalesDisponibles && Array.isArray(data.sucursalesDisponibles)) {
                data.sucursalesDisponibles = data.sucursalesDisponibles.filter((item: any) => {
                    const sId = typeof item === 'number' ? item : item.sucursalId;
                    return Number(sId) === Number(req.user?.sucursalId);
                });
            }

            const actualizada = await this.productoService.actualizarPromocion(Number(id), data);
            res.json({
                success: true,
                data: actualizada,
                message: 'Promoción actualizada con éxito'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.actualizarPromocion:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al actualizar promoción' });
        }
    }

    async toggleActivoPromocion(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const rol = (req.user?.rolNombre || '').toLowerCase().trim();
            const esGlobal = ['dueño', 'dueño', 'superadmin', 'administrador general', 'admin general'].includes(rol);
            // Si no es admin global, se fuerza sucursalId a la sede asignada del usuario autenticado
            const sucursalId = (!esGlobal && req.user?.sucursalId)
                ? req.user.sucursalId
                : (req.query.sucursalId ? Number(req.query.sucursalId) : (req.body?.sucursalId ? Number(req.body.sucursalId) : req.user?.sucursalId));
            const resultado = await this.productoService.toggleActivoPromocion(Number(id), sucursalId);
            res.json({
                success: true,
                data: resultado,
                message: resultado.activo ? 'Promoción visible y activa en la sede' : 'Promoción pausada / oculta en la sede'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.toggleActivoPromocion:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al cambiar estado de promoción' });
        }
    }

    async eliminarPromocion(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const ok = await this.productoService.eliminarPromocion(Number(id));
            res.json({
                success: ok,
                message: ok ? 'Promoción eliminada con éxito' : 'No se pudo eliminar la promoción'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.eliminarPromocion:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al eliminar promoción' });
        }
    }

    // =========================================================================
    // INSUMOS / INGREDIENTES
    // =========================================================================

    async getInsumos(req: AuthRequest, res: Response): Promise<void> {
        try {
            const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : req.user?.sucursalId;
            const incluirInactivos = req.query.incluirInactivos === 'true';
            const insumos = await this.productoService.getInsumos(sucursalId, incluirInactivos);
            res.json({
                success: true,
                data: insumos
            });
        } catch (error) {
            console.error('Error en ProductoController.getInsumos:', error);
            res.status(500).json({ success: false, message: 'Error al obtener los insumos' });
        }
    }

    async crearInsumo(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { nombre, unidadMedida, stock, stockMinimo, activo } = req.body;
            if (!nombre || !nombre.trim() || !unidadMedida || !unidadMedida.trim()) {
                res.status(400).json({ success: false, message: 'Nombre y unidad de medida son requeridos' });
                return;
            }

            const sucursalId = req.body.sucursalId ? Number(req.body.sucursalId) : (req.user?.sucursalId || 1);
            const nuevo = await this.productoService.crearInsumo({
                sucursalId,
                nombre: nombre.trim(),
                unidadMedida: unidadMedida.trim(),
                stock: stock !== undefined ? Number(stock) : 0,
                stockMinimo: stockMinimo !== undefined ? Number(stockMinimo) : 5,
                activo: activo !== undefined ? Boolean(activo) : true
            });

            res.status(201).json({
                success: true,
                data: nuevo,
                message: 'Insumo registrado con éxito'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.crearInsumo:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al crear insumo' });
        }
    }

    async actualizarInsumo(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const data = req.body;
            const actualizado = await this.productoService.actualizarInsumo(Number(id), data);
            res.json({
                success: true,
                data: actualizado,
                message: 'Insumo actualizado con éxito'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.actualizarInsumo:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al actualizar insumo' });
        }
    }

    async toggleActivoInsumo(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const resultado = await this.productoService.toggleActivoInsumo(Number(id));
            res.json({
                success: true,
                data: resultado,
                message: resultado.activo ? 'Insumo activado' : 'Insumo ocultado / pausado'
            });
        } catch (error: any) {
            console.error('Error en ProductoController.toggleActivoInsumo:', error);
            res.status(500).json({ success: false, message: error?.message || 'Error al cambiar estado de insumo' });
        }
    }
}
