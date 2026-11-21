export interface Mesa {
    id: number;
    sucursalId: number;
    numero: number;
    capacidad: number;
    estado: string;
    posX?: number | null;
    posY?: number | null;
    clienteNombre?: string | null;
    total?: number | null;
    mesero?: string | null;
}
