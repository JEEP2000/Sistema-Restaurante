import { Observable } from 'rxjs';
import {
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
  // Categorías
  getCategorias(sucursalId?: number, incluirInactivas?: boolean): Observable<Categoria[]>;
  crearCategoria(data: CrearCategoriaDTO): Observable<Categoria>;
  actualizarCategoria(id: number, data: Partial<CrearCategoriaDTO>): Observable<Categoria>;
  toggleActivoCategoria(id: number): Observable<{ id: number; activo: boolean }>;

  // Productos / Platos
  getProductos(sucursalId?: number, categoriaId?: number, incluirInactivos?: boolean, soloMenuDelDia?: boolean): Observable<Producto[]>;
  crearProducto(data: CrearProductoDTO): Observable<Producto>;
  actualizarProducto(id: number, data: Partial<CrearProductoDTO>): Observable<Producto>;
  toggleActivoProducto(id: number, sucursalId?: number): Observable<{ id: number; sucursalId?: number; activo: boolean }>;
  toggleMenuDelDia(id: number, sucursalId?: number): Observable<{ id: number; sucursalId?: number; esMenuDelDia: boolean }>;
  eliminarProducto(id: number): Observable<boolean>;

  // Promociones
  getPromociones(sucursalId?: number, incluirInactivas?: boolean): Observable<Promocion[]>;
  crearPromocion(data: CrearPromocionDTO): Observable<Promocion>;
  actualizarPromocion(id: number, data: Partial<CrearPromocionDTO>): Observable<Promocion>;
  toggleActivoPromocion(id: number, sucursalId?: number): Observable<{ id: number; sucursalId?: number; activo: boolean }>;
  eliminarPromocion(id: number): Observable<boolean>;

  // Insumos
  getInsumos(sucursalId?: number, incluirInactivos?: boolean): Observable<Insumo[]>;
  crearInsumo(data: CrearInsumoDTO): Observable<Insumo>;
  actualizarInsumo(id: number, data: Partial<CrearInsumoDTO>): Observable<Insumo>;
  toggleActivoInsumo(id: number): Observable<{ id: number; activo: boolean }>;
}
