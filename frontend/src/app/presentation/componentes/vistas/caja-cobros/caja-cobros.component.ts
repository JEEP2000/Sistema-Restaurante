import { Component, EventEmitter, Input, Output, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GetPendientesPagoUseCase } from '../../../../application/ports/in/get-pendientes-pago.use-case.js';
import { Pedido } from '../../../../domain/models/pedido.model.js';

/**
 * ==============================================================================
 * VISTA: BANDEJA DE COBROS Y CAJA
 * Adaptador de Entrada (Driving Adapter) que gestiona la cola de pedidos
 * pendientes de cobro, verificación de entrega de platos y liquidación de mesas.
 * ==============================================================================
 */
@Component({
  selector: 'app-caja-cobros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './caja-cobros.component.html'
})
export class CajaCobrosComponent implements OnInit, OnChanges {
  // Inyección de Caso de Uso
  private getPendientesPagoUseCase = inject(GetPendientesPagoUseCase);

  /** Identificador de la sucursal activa */
  @Input() sucursalId: number = 1;
  /** Perfil del usuario autenticado */
  @Input() perfil: any = null;

  /** Evento emitido al presionar el botón de Cobrar */
  @Output() abrirCobro = new EventEmitter<Pedido>();
  /** Evento emitido al presionar el botón de Pre-cuenta */
  @Output() abrirPreTicket = new EventEmitter<Pedido>();
  /** Evento emitido al presionar el botón de Anular comanda */
  @Output() abrirAnulacion = new EventEmitter<Pedido>();

  pendientesPago: Pedido[] = [];
  cargandoPendientes: boolean = false;

  ngOnInit(): void {
    this.cargarPendientesPago();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sucursalId'] && !changes['sucursalId'].firstChange) {
      this.cargarPendientesPago();
    }
  }

  cargarPendientesPago(): void {
    this.cargandoPendientes = true;
    const sucursalObjetivo = this.sucursalId || this.perfil?.sucursalId || undefined;

    this.getPendientesPagoUseCase.execute(sucursalObjetivo).subscribe({
      next: (pedidos) => {
        this.pendientesPago = pedidos;
        this.cargandoPendientes = false;
      },
      error: (err) => {
        console.error('Error al cargar pendientes de cobro:', err);
        this.cargandoPendientes = false;
      }
    });
  }

  puedeAnularPedido(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  estaPedidoTotalmenteEntregado(pedido: Pedido): boolean {
    if (!pedido || !pedido.detalles || pedido.detalles.length === 0) return false;
    return pedido.detalles.every((item) => {
      if (item.requiereCoccion) {
        return item.checkCocina === true && item.checkMesero === true;
      }
      return item.checkMesero === true;
    });
  }

  obtenerCantidadItemsPendientes(pedido: Pedido): number {
    if (!pedido || !pedido.detalles) return 0;
    return pedido.detalles.filter((item) => {
      if (item.requiereCoccion) {
        return !item.checkCocina || !item.checkMesero;
      }
      return !item.checkMesero;
    }).length;
  }

  alCobrar(pedido: Pedido): void {
    this.abrirCobro.emit(pedido);
  }

  alPreTicket(pedido: Pedido): void {
    this.abrirPreTicket.emit(pedido);
  }

  alAnular(pedido: Pedido): void {
    this.abrirAnulacion.emit(pedido);
  }
}
