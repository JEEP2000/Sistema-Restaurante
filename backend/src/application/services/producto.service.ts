import type { ProductoRepositoryPort } from '../ports/out/producto-repository.port.js';
import type { ProductoUseCase } from '../ports/in/producto.use-case.js';
import type {
    Categoria,
    CrearCategoriaDTO,
    Producto,
    CrearProductoDTO,
    Promocion,
    CrearPromocionDTO,
    Insumo,
    CrearInsumoDTO
} from '../../domain/models/producto.model.js';

export class ProductoService implements ProductoUseCase {
    constructor(private productoRepository: ProductoRepositoryPort) {}

    // Categorías
    async getCategorias(sucursalId?: number, incluirInactivas?: boolean): Promise<Categoria[]> {
        return await this.productoRepository.getCategorias(sucursalId, incluirInactivas);
    }

    async crearCategoria(data: CrearCategoriaDTO): Promise<Categoria> {
        return await this.productoRepository.crearCategoria(data);
    }

    async actualizarCategoria(id: number, data: Partial<CrearCategoriaDTO>): Promise<Categoria> {
        return await this.productoRepository.actualizarCategoria(id, data);
    }

    async toggleActivoCategoria(id: number): Promise<{ id: number; activo: boolean }> {
        return await this.productoRepository.toggleActivoCategoria(id);
    }

    // Productos
    async getProductos(sucursalId?: number, categoriaId?: number, incluirInactivos?: boolean, soloMenuDelDia?: boolean): Promise<Producto[]> {
        return await this.productoRepository.getProductos(sucursalId, categoriaId, incluirInactivos, soloMenuDelDia);
    }

    async getProductoById(id: number): Promise<Producto | null> {
        return await this.productoRepository.getProductoById(id);
    }

    async crearProducto(data: CrearProductoDTO): Promise<Producto> {
        return await this.productoRepository.crearProducto(data);
    }

    async actualizarProducto(id: number, data: Partial<CrearProductoDTO>): Promise<Producto> {
        return await this.productoRepository.actualizarProducto(id, data);
    }

    async toggleActivoProducto(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; activo: boolean }> {
        return await this.productoRepository.toggleActivoProducto(id, sucursalId);
    }

    async toggleMenuDelDia(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; esMenuDelDia: boolean }> {
        return await this.productoRepository.toggleMenuDelDia(id, sucursalId);
    }

    async eliminarProducto(id: number): Promise<boolean> {
        return await this.productoRepository.eliminarProducto(id);
    }

    // Promociones
    async getPromociones(sucursalId?: number, incluirInactivas?: boolean): Promise<Promocion[]> {
        return await this.productoRepository.getPromociones(sucursalId, incluirInactivas);
    }

    async getPromocionById(id: number): Promise<Promocion | null> {
        return await this.productoRepository.getPromocionById(id);
    }

    async crearPromocion(data: CrearPromocionDTO): Promise<Promocion> {
        return await this.productoRepository.crearPromocion(data);
    }

    async actualizarPromocion(id: number, data: Partial<CrearPromocionDTO>): Promise<Promocion> {
        return await this.productoRepository.actualizarPromocion(id, data);
    }

    async toggleActivoPromocion(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; activo: boolean }> {
        return await this.productoRepository.toggleActivoPromocion(id, sucursalId);
    }

    async eliminarPromocion(id: number): Promise<boolean> {
        return await this.productoRepository.eliminarPromocion(id);
    }

    // Insumos
    async getInsumos(sucursalId?: number, incluirInactivos?: boolean): Promise<Insumo[]> {
        return await this.productoRepository.getInsumos(sucursalId, incluirInactivos);
    }

    async crearInsumo(data: CrearInsumoDTO): Promise<Insumo> {
        return await this.productoRepository.crearInsumo(data);
    }

    async actualizarInsumo(id: number, data: Partial<CrearInsumoDTO>): Promise<Insumo> {
        return await this.productoRepository.actualizarInsumo(id, data);
    }

    async toggleActivoInsumo(id: number): Promise<{ id: number; activo: boolean }> {
        return await this.productoRepository.toggleActivoInsumo(id);
    }
}
