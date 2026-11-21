import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pedido } from '../../../../domain/models/pedido.model.js';

/**
 * ==============================================================================
 * MODAL: PRE-CUENTA TICKET TÉRMICO
 * Adaptador de Entrada (Driving Adapter) que formatea y renderiza la tirilla
 * térmica de pre-cuenta con desglose de subtotal, IGV y opción de impresión.
 * ==============================================================================
 */
@Component({
  selector: 'app-ticket-termico-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-termico-modal.component.html'
})
export class TicketTermicoModalComponent {
  /** Bandera de visibilidad del modal */
  @Input() estaAbierto: boolean = false;
  /** Datos del pedido activo para imprimir */
  @Input() pedido: Pedido | null = null;
  /** Nombre de la sucursal actual */
  @Input() sucursalNombre: string = '';
  /** Nombre comercial de la empresa desde BD */
  @Input() empresaNombre: string = '';
  /** RUC fiscal de la empresa desde BD */
  @Input() ruc: string = '';
  /** Dirección física de la sucursal */
  @Input() sucursalDireccion: string = '';
  /** Perfil del usuario en sesión */
  @Input() perfil: any = null;


  /** Evento para cerrar el modal */
  @Output() cerrar = new EventEmitter<void>();

  alCerrar(): void {
    this.cerrar.emit();
  }

  imprimirTicket(): void {
    window.print();
  }
}
