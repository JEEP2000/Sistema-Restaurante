import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CancelarPedidoUseCase } from '../../../../application/ports/in/cancelar-pedido.use-case.js';
import { Pedido } from '../../../../domain/models/pedido.model.js';
import { Mesa } from '../../../../domain/models/mesa.model.js';

/**
 * ==============================================================================
 * MODAL: ANULACIÓN DE COMANDA (ROL ADMIN Y DUEÑO)
 * Adaptador de Entrada (Driving Adapter) que gestiona la anulación
 * de comandas con motivo de auditoría y liberación inmediata de la mesa.
 * ==============================================================================
 */
@Component({
  selector: 'app-anular-pedido-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './anular-pedido-modal.component.html'
})
export class AnularPedidoModalComponent implements OnChanges {
  // Caso de Uso (Input Port)
  private cancelarPedidoUseCase = inject(CancelarPedidoUseCase);

  @Input() estaAbierto: boolean = false;
  @Input() pedido: Pedido | null = null;
  @Input() mesa: Mesa | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() pedidoAnulado = new EventEmitter<void>();

  motivoAnulacion: string = 'Cliente canceló / se retiró';
  detalleAnulacion: string = '';
  estaAnulandoPedido: boolean = false;
  errorAnulacion: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estaAbierto'] && this.estaAbierto) {
      this.inicializarModal();
    }
  }

  inicializarModal(): void {
    this.motivoAnulacion = 'Cliente canceló / se retiró';
    this.detalleAnulacion = '';
    this.errorAnulacion = '';
    this.estaAnulandoPedido = false;
  }

  alCerrar(): void {
    this.cerrar.emit();
  }

  confirmarAnulacion(): void {
    if (!this.pedido) return;

    this.estaAnulandoPedido = true;
    this.errorAnulacion = '';

    const motivo = this.motivoAnulacion;
    const detalle = this.detalleAnulacion.trim() || null;

    this.cancelarPedidoUseCase.execute(this.pedido.id, motivo, detalle).subscribe({
      next: (res: { success: boolean; message: string }) => {
        this.estaAnulandoPedido = false;
        if (res.success) {
          this.pedidoAnulado.emit();
          this.alCerrar();
        } else {
          this.errorAnulacion = res.message || 'Error al anular la comanda.';
        }
      },
      error: (err: any) => {
        this.estaAnulandoPedido = false;
        this.errorAnulacion = err.error?.message || err.message || 'Error al anular la comanda.';
      }
    });
  }
}
