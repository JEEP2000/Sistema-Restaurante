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
    estadoPedido: string;
    esDelivery?: boolean;
    totalPlatos: number;
    platosListos: number;
    items: KitchenItem[];
}

export interface DashboardStats {
    ventasHoy: number;
    comandasActivas: number;
    comandasTotalesHoy: number;
    mesasOcupadas: number;
    totalMesas: number;
    mesasAtendidasHoy: number;
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
    usuarioMeseroId: number;
    clienteNombre: string;
    items: {
        productoId: number;
        cantidad: number;
        modificacion?: string | null;
    }[];
}

export interface ProcesarPagoDTO {
    pedidoId: number;
    metodo: string;
    monto: number;
    referenciaExterna?: string | null;
}

export interface VentaHistorialItem {
    pedidoId: number;
    sucursalId: number;
    sucursalNombre?: string | undefined;
    mesaId?: number | null | undefined;
    mesaNumero?: number | null | undefined;
    usuarioMeseroId?: number | null | undefined;
    meseroNombre?: string | undefined;
    clienteNombre?: string | undefined;
    esDelivery?: boolean;
    direccionEntrega?: string | null | undefined;
    total: number;
    estado: string;
    fechaCreacion: string | Date;
    fechaActualizacion?: string | Date | undefined;
    pagoId?: number | undefined;
    montoPagado: number;
    metodoPago: string;
    referenciaPago?: string | null | undefined;
    fechaPago: string | Date;
    detalles: DetallePedido[];
}

export interface HistorialVentasResumen {
    totalVentas: number;
    totalOrdenes: number;
    ticketPromedio: number;
    ventasPorMetodo: { metodo: string; total: number; count: number }[];
    ventas: VentaHistorialItem[];
}
