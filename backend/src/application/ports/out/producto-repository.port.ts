import type {
    Categoria,
    CrearCategoriaDTO,
    Producto,
    CrearProductoDTO,
    Promocion,
    CrearPromocionDTO,
    Insumo,
    CrearInsumoDTO
} from '../../../domain/models/producto.model.js';

export interface ProductoRepositoryPort {
    // Categorías (Tipos de plato)
    getCategorias(sucursalId?: number, incluirInactivas?: boolean): Promise<Categoria[]>;
    crearCategoria(data: CrearCategoriaDTO): Promise<Categoria>;
    actualizarCategoria(id: number, data: Partial<CrearCategoriaDTO>): Promise<Categoria>;
    toggleActivoCategoria(id: number): Promise<{ id: number; activo: boolean }>;

    // Productos / Platos / Carta
    getProductos(sucursalId?: number, categoriaId?: number, incluirInactivos?: boolean, soloMenuDelDia?: boolean): Promise<Producto[]>;
    getProductoById(id: number): Promise<Producto | null>;
    crearProducto(data: CrearProductoDTO): Promise<Producto>;
    actualizarProducto(id: number, data: Partial<CrearProductoDTO>): Promise<Producto>;
    toggleActivoProducto(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; activo: boolean }>;
    toggleMenuDelDia(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; esMenuDelDia: boolean }>;
    eliminarProducto(id: number): Promise<boolean>;

    // Promociones
    getPromociones(sucursalId?: number, incluirInactivas?: boolean): Promise<Promocion[]>;
    getPromocionById(id: number): Promise<Promocion | null>;
    crearPromocion(data: CrearPromocionDTO): Promise<Promocion>;
    actualizarPromocion(id: number, data: Partial<CrearPromocionDTO>): Promise<Promocion>;
    toggleActivoPromocion(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; activo: boolean }>;
    eliminarPromocion(id: number): Promise<boolean>;

    // Insumos
    getInsumos(sucursalId?: number, incluirInactivos?: boolean): Promise<Insumo[]>;
    crearInsumo(data: CrearInsumoDTO): Promise<Insumo>;
    actualizarInsumo(id: number, data: Partial<CrearInsumoDTO>): Promise<Insumo>;
    toggleActivoInsumo(id: number): Promise<{ id: number; activo: boolean }>;
}
