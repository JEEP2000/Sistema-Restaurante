import { Observable } from 'rxjs';
import { LoginResponse, RegisterResponse, ProfileResponse } from '../../../domain/models/auth.model.js';
import { User } from '../../../domain/models/user.model.js';

export interface AuthRepositoryPort {
  login(nombre: string, password: string): Observable<LoginResponse>;
  register(user: Omit<User, 'id' | 'activo' | 'fechaCreacion'> & { password?: string }): Observable<RegisterResponse>;
  getProfile(): Observable<ProfileResponse>;
  logout(): Observable<any>;
  getStaffBySucursal(sucursalId?: number): Observable<User[]>;
  updateUser(id: number, user: Partial<User>): Observable<any>;
  deleteUser(id: number): Observable<any>;
  resetPassword(id: number, password: string): Observable<any>;
  getRoles(): Observable<{ id: number; nombre: string; descripcion?: string }[]>;
}

