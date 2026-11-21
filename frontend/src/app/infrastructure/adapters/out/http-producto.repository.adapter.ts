import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductoRepositoryPort } from '../../../application/ports/out/producto.repository.port.js';
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

@Injectable()
export class HttpProductoRepositoryAdapter implements ProductoRepositoryPort {
  private apiUrl = 'http://localhost:3000/api/productos';

  constructor(private http: HttpClient) {}

  // =========================================================================
  // CATEGORÍAS
  // =========================================================================
  getCategorias(sucursalId?: number, incluirInactivas?: boolean): Observable<Categoria[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId.toString());
    if (incluirInactivas) params = params.set('incluirInactivas', 'true');

    return this.http.get<{ success: boolean; data: Categoria[] }>(`${this.apiUrl}/categorias`, { params }).pipe(
      map(res => res.data)
    );
  }

  crearCategoria(data: CrearCategoriaDTO): Observable<Categoria> {
    return this.http.post<{ success: boolean; data: Categoria }>(`${this.apiUrl}/categorias`, data).pipe(
      map(res => res.data)
    );
  }

  actualizarCategoria(id: number, data: Partial<CrearCategoriaDTO>): Observable<Categoria> {
    return this.http.put<{ success: boolean; data: Categoria }>(`${this.apiUrl}/categorias/${id}`, data).pipe(
      map(res => res.data)
    );
  }

  toggleActivoCategoria(id: number): Observable<{ id: number; activo: boolean }> {
    return this.http.patch<{ success: boolean; data: { id: number; activo: boolean } }>(`${this.apiUrl}/categorias/${id}/toggle-activo`, {}).pipe(
      map(res => res.data)
    );
  }

  // =========================================================================
  // PRODUCTOS / PLATOS / MENÚ DEL DÍA
  // =========================================================================
  getProductos(sucursalId?: number, categoriaId?: number, incluirInactivos?: boolean, soloMenuDelDia?: boolean): Observable<Producto[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId.toString());
    if (categoriaId) params = params.set('categoriaId', categoriaId.toString());
    if (incluirInactivos) params = params.set('incluirInactivos', 'true');
    if (soloMenuDelDia) params = params.set('soloMenuDelDia', 'true');

    return this.http.get<{ success: boolean; data: Producto[] }>(this.apiUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  crearProducto(data: CrearProductoDTO): Observable<Producto> {
    return this.http.post<{ success: boolean; data: Producto }>(this.apiUrl, data).pipe(
      map(res => res.data)
    );
  }

  actualizarProducto(id: number, data: Partial<CrearProductoDTO>): Observable<Producto> {
    return this.http.put<{ success: boolean; data: Producto }>(`${this.apiUrl}/${id}`, data).pipe(
      map(res => res.data)
    );
  }

  toggleActivoProducto(id: number, sucursalId?: number): Observable<{ id: number; sucursalId?: number; activo: boolean }> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId.toString());
    return this.http.patch<{ success: boolean; data: { id: number; sucursalId?: number; activo: boolean } }>(`${this.apiUrl}/${id}/toggle-activo`, {}, { params }).pipe(
      map(res => res.data)
    );
  }

  toggleMenuDelDia(id: number, sucursalId?: number): Observable<{ id: number; sucursalId?: number; esMenuDelDia: boolean }> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId.toString());
    return this.http.patch<{ success: boolean; data: { id: number; sucursalId?: number; esMenuDelDia: boolean } }>(`${this.apiUrl}/${id}/toggle-menu-del-dia`, {}, { params }).pipe(
      map(res => res.data)
    );
  }

  eliminarProducto(id: number): Observable<boolean> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.success)
    );
  }

  // =========================================================================
  // PROMOCIONES Y COMBOS
  // =========================================================================
  getPromociones(sucursalId?: number, incluirInactivas?: boolean): Observable<Promocion[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId.toString());
    if (incluirInactivas) params = params.set('incluirInactivas', 'true');

    return this.http.get<{ success: boolean; data: Promocion[] }>(`${this.apiUrl}/promociones`, { params }).pipe(
      map(res => res.data)
    );
  }

  crearPromocion(data: CrearPromocionDTO): Observable<Promocion> {
    return this.http.post<{ success: boolean; data: Promocion }>(`${this.apiUrl}/promociones`, data).pipe(
      map(res => res.data)
    );
  }

  actualizarPromocion(id: number, data: Partial<CrearPromocionDTO>): Observable<Promocion> {
    return this.http.put<{ success: boolean; data: Promocion }>(`${this.apiUrl}/promociones/${id}`, data).pipe(
      map(res => res.data)
    );
  }

  toggleActivoPromocion(id: number, sucursalId?: number): Observable<{ id: number; sucursalId?: number; activo: boolean }> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId.toString());
    return this.http.patch<{ success: boolean; data: { id: number; sucursalId?: number; activo: boolean } }>(`${this.apiUrl}/promociones/${id}/toggle-activo`, {}, { params }).pipe(
      map(res => res.data)
    );
  }

  eliminarPromocion(id: number): Observable<boolean> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/promociones/${id}`).pipe(
      map(res => res.success)
    );
  }

  // =========================================================================
  // INSUMOS
  // =========================================================================
  getInsumos(sucursalId?: number, incluirInactivos?: boolean): Observable<Insumo[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId.toString());
    if (incluirInactivos) params = params.set('incluirInactivos', 'true');

    return this.http.get<{ success: boolean; data: Insumo[] }>(`${this.apiUrl}/insumos`, { params }).pipe(
      map(res => res.data)
    );
  }

  crearInsumo(data: CrearInsumoDTO): Observable<Insumo> {
    return this.http.post<{ success: boolean; data: Insumo }>(`${this.apiUrl}/insumos`, data).pipe(
      map(res => res.data)
    );
  }

  actualizarInsumo(id: number, data: Partial<CrearInsumoDTO>): Observable<Insumo> {
    return this.http.put<{ success: boolean; data: Insumo }>(`${this.apiUrl}/insumos/${id}`, data).pipe(
      map(res => res.data)
    );
  }

  toggleActivoInsumo(id: number): Observable<{ id: number; activo: boolean }> {
    return this.http.patch<{ success: boolean; data: { id: number; activo: boolean } }>(`${this.apiUrl}/insumos/${id}/toggle-activo`, {}).pipe(
      map(res => res.data)
    );
  }
}
