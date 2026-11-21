export interface DetallePedido {
  id?: number;
  pedidoId?: number;
  productoId: number;
  productoNombre?: string;
  categoriaId?: number;
  categoriaNombre?: string;
  cantidad: number;
  cantidadLista?: number;
  precioUnitario: number;
  subtotal?: number;
  modificacion?: string | null;
  requiereCoccion?: boolean;
  checkCocina?: boolean;
  checkMesero?: boolean;
  cocineroId?: number | null;
  cocineroNombre?: string | null;
}

export interface Pedido {
  id: number;
  sucursalId: number;
  mesaId?: number | null;
  mesaNumero?: number;
  usuarioMeseroId: number;
  meseroNombre?: string;
  clienteNombre: string;
  esDelivery?: boolean;
  direccionEntrega?: string | null;
  total: number;
  estado: 'EN_PROCESO' | 'LISTO' | 'PENDIENTE_PAGO' | 'PAGADO' | 'ANULADO';
  fechaCreacion?: Date;
  detalles?: DetallePedido[];
}

export interface CrearPedidoDTO {
  sucursalId: number;
  mesaId: number;
  usuarioMeseroId?: number;
  clienteNombre: string;
  items: {
    productoId: number;
    cantidad: number;
    modificacion?: string | null;
  }[];
}

export interface VentaHistorialItem {
  pedidoId: number;
  sucursalId: number;
  sucursalNombre?: string;
  mesaId?: number | null;
  mesaNumero?: number;
  usuarioMeseroId?: number;
  meseroNombre?: string;
  clienteNombre?: string;
  esDelivery?: boolean;
  direccionEntrega?: string | null;
  total: number;
  estado: string;
  fechaCreacion: string | Date;
  fechaActualizacion?: string | Date;
  pagoId?: number;
  montoPagado: number;
  metodoPago: string;
  referenciaPago?: string | null;
  fechaPago: string | Date;
  detalles: DetallePedido[];
}

export interface EstadisticasAvanzadas {
  totalVentas: number;
  totalComandas: number;
  totalPagos: number;
  totalAnulados: number;
  totalMesasAtendidas: number;
  montoAnulado: number;
  ticketPromedio: number;
  tasaEfectividad: number;
  ventasPorPeriodo: {
    etiqueta: string;
    total: number;
    comandas: number;
  }[];
  comandasPorEstado: {
    estado: string;
    label: string;
    count: number;
    porcentaje: number;
    monto: number;
    color: string;
  }[];
  pagosPorMetodo: {
    metodo: string;
    total: number;
    count: number;
    porcentaje: number;
    color: string;
  }[];
  anulacionesPorMotivo: {
    motivo: string;
    count: number;
    porcentaje: number;
    monto: number;
  }[];
  topProductos: {
    productoId: number;
    nombre: string;
    categoria: string;
    cantidad: number;
    total: number;
  }[];
}

export interface HistorialVentasResumen {
  totalVentas: number;
  totalOrdenes: number;
  ticketPromedio: number;
  ventasPorMetodo: { metodo: string; total: number; count: number }[];
  ventas: VentaHistorialItem[];
}


