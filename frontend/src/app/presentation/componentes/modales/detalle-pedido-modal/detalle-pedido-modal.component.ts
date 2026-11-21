import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VentaHistorialItem } from '../../../../domain/models/pedido.model.js';

/**
 * ==============================================================================
 * MODAL: DETALLE AUDITABLE DE PEDIDO / VENTA
 * Adaptador de Entrada (Driving Adapter) que presenta el desglose
 * completo de ítems, observaciones, mesa y cobro de una comanda histórica.
 * ==============================================================================
 */
@Component({
  selector: 'app-detalle-pedido-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-pedido-modal.component.html'
})
export class DetallePedidoModalComponent {
  /** Bandera de visibilidad del modal */
  @Input() estaAbierto: boolean = false;
  /** Registro de venta / comanda seleccionada */
  @Input() venta: VentaHistorialItem | null = null;

  /** Evento emitido al solicitar cerrar el modal */
  @Output() cerrar = new EventEmitter<void>();

  alCerrar(): void {
    this.cerrar.emit();
  }
}
