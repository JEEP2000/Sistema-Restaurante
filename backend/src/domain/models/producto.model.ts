export interface Categoria {
    id: number;
    sucursalId: number;
    nombre: string;
    descripcion?: string | null;
    esCocina?: boolean;
    horaInicio?: string | null;
    horaFin?: string | null;
    ordenVisual: number;
    activo: boolean;
}

export interface CrearCategoriaDTO {
    sucursalId?: number;
    nombre: string;
    descripcion?: string | null;
    esCocina?: boolean;
    ordenVisual?: number;
    activo?: boolean;
}

export interface ProductoDisponibilidadSucursal {
    sucursalId: number;
    sucursalNombre?: string;
    activo: boolean;
    esMenuDelDia: boolean;
    precio?: number | null;
}

export interface Producto {
    id: number;
    sucursalId: number;
    categoriaId: number;
    categoriaNombre?: string;
    nombre: string;
    descripcion?: string | null;
    precio: number;
    requiereCoccion: boolean;
    tiempoEstimado?: number | null;
    imagenUrl?: string | null;
    activo: boolean;
    esMenuDelDia: boolean;
    disponibilidad?: ProductoDisponibilidadSucursal[];
}

export interface CrearProductoDTO {
    sucursalId?: number;
    categoriaId: number;
    nombre: string;
    descripcion?: string | null;
    precio: number;
    requiereCoccion?: boolean;
    tiempoEstimado?: number | null;
    imagenUrl?: string | null;
    activo?: boolean;
    esMenuDelDia?: boolean;
    sucursalesDisponibles?: ProductoDisponibilidadSucursal[] | number[];
}

export interface PromocionItem {
    productoId: number;
    nombre: string;
    cantidad: number;
}

export interface PromocionDisponibilidadSucursal {
    sucursalId: number;
    sucursalNombre?: string;
    activo: boolean;
}

export interface Promocion {
    id: number;
    sucursalId: number;
    nombre: string;
    descripcion?: string | null | undefined;
    precioPromo: number;
    precioOriginal?: number | null | undefined;
    descuentoPorcentaje?: number | null | undefined;
    itemsIncluidos?: string | PromocionItem[] | null | undefined;
    fechaInicio?: string | null | undefined;
    fechaFin?: string | null | undefined;
    activo: boolean;
    destacado: boolean;
    fechaCreacion?: string | undefined;
    disponibilidad?: PromocionDisponibilidadSucursal[];
}

export interface CrearPromocionDTO {
    sucursalId?: number;
    nombre: string;
    descripcion?: string | null;
    precioPromo: number;
    precioOriginal?: number | null;
    descuentoPorcentaje?: number | null;
    itemsIncluidos?: string | PromocionItem[] | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    activo?: boolean;
    destacado?: boolean;
    sucursalesDisponibles?: PromocionDisponibilidadSucursal[] | number[];
}

export interface Insumo {
    id: number;
    sucursalId: number;
    nombre: string;
    unidadMedida: string;
    stock: number;
    stockMinimo: number;
    activo: boolean;
}

export interface CrearInsumoDTO {
    sucursalId?: number;
    nombre: string;
    unidadMedida: string;
    stock: number;
    stockMinimo?: number;
    activo?: boolean;
}
