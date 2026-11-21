import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthRepositoryPort } from '../../../application/ports/out/auth.repository.port.js';
import { LoginResponse, RegisterResponse, ProfileResponse } from '../../../domain/models/auth.model.js';
import { User } from '../../../domain/models/user.model.js';

@Injectable()
export class HttpAuthRepositoryAdapter implements AuthRepositoryPort {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  login(nombre: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { nombre, password });
  }

  register(user: Omit<User, 'id' | 'activo' | 'fechaCreacion'> & { password?: string }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, user);
  }

  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/profile`);
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/logout`, {});
  }

  getStaffBySucursal(sucursalId?: number): Observable<User[]> {
    let url = `${this.apiUrl}/users-by-sucursal`;
    if (sucursalId) {
      url += `?sucursalId=${sucursalId}`;
    }
    return this.http.get<{ success: boolean; data: User[] }>(url).pipe(
      map(response => response.data)
    );
  }

  updateUser(id: number, user: Partial<User>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${id}`, user);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${id}`);
  }

  resetPassword(id: number, password: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/users/${id}/reset-password`, { password });
  }

  getRoles(): Observable<{ id: number; nombre: string; descripcion?: string }[]> {
    return this.http.get<{ success: boolean; roles: { id: number; nombre: string; descripcion?: string }[] }>(`${this.apiUrl}/roles`).pipe(
      map(res => res.roles || [])
    );
  }
}

