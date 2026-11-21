export interface User {
    id?: number;
    sucursalId: number;
    rolId: number;
    nombre: string;
    apellido: string;
    email: string;
    passwordHash: string;
    telefono?: string | null;
    activo?: boolean;
    fechaCreacion?: Date;
    rolNombre?: string | undefined;
    sucursalNombre?: string | undefined;
}
