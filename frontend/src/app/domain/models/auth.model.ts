import { User } from './user.model.js';

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Omit<User, 'passwordHash' | 'telefono' | 'activo' | 'fechaCreacion'>;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: Omit<User, 'passwordHash'>;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    email: string;
    rolId: number;
    rolNombre: string;
    sucursalId: number;
    iat?: number;
    exp?: number;
  };
}
