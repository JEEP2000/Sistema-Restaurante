export interface Sucursal {
  id?: number;
  empresaId: number;
  nombre: string;
  direccion: string;
  telefono: string;
  correoContacto?: string | null;
  horarioApertura?: string | null;
  horarioCierre?: string | null;
  esDelivery?: boolean;
  costoDelivery?: number | null;
  activo?: boolean;
  empresaNombre?: string;
  ruc?: string;
}

