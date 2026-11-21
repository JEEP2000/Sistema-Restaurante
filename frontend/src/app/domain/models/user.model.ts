export interface User {
  id?: number;
  sucursalId: number;
  rolId: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  activo?: boolean;
  fechaCreacion?: Date;
  rolNombre?: string; // Virtual property returned in JWT token / database joins
  sucursalNombre?: string; // Virtual property returned in JWT token / database joins
}
