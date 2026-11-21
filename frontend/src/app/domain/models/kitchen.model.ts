export interface KitchenItem {
  detalleId: number;
  productoId?: number;
  cantidad: number;
  cantidadLista?: number;
  nombre: string;
  categoriaNombre?: string;
  nota?: string | null;
  checkCocina: boolean;
  cocineroId?: number | null;
  cocineroNombre?: string | null;
  fechaCheckCocina?: string | null;
  segundosDemorados?: number | null;
}

export interface KitchenTicket {
  pedidoId: number;
  mesa: number;
  clienteNombre?: string;
  meseroNombre?: string;
  tiempo: number;
  prioridad: 'normal' | 'media' | 'urgente';
  fechaCreacion: string;
  fechaInicioCocina?: string | null;
  fechaFinCocina?: string | null;
  cocineroNombre?: string | null;
  cocineroSeleccionadoNombre?: string;
  estadoPedido: string;
  esDelivery?: boolean;
  totalPlatos: number;
  platosListos: number;
  items: KitchenItem[];
  _iniciadoAtMs?: number | null;
}
