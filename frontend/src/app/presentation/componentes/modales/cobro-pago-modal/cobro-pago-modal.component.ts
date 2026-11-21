import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcesarPagoUseCase } from '../../../../application/ports/in/procesar-pago.use-case.js';
import { Pedido, DetallePedido } from '../../../../domain/models/pedido.model.js';

/**
 * ==============================================================================
 * MODAL: COBRO Y LIQUIDACIÓN (ROL CAJERO Y ADMIN)
 * Adaptador de Entrada (Driving Adapter) que gestiona el tipo de comprobante,
 * método de pago, cálculo de vuelto en efectivo y liquidación de mesas.
 * ==============================================================================
 */
@Component({
  selector: 'app-cobro-pago-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cobro-pago-modal.component.html'
})
export class CobroPagoModalComponent implements OnChanges {
  // Caso de uso (Input Port)
  private procesarPagoUseCase = inject(ProcesarPagoUseCase);

  @Input() estaAbierto: boolean = false;
  @Input() pedido: Pedido | null = null;
  @Input() perfil: any = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() pagoProcesado = new EventEmitter<void>();
  @Output() abrirAnularPedido = new EventEmitter<Pedido>();

  // Estado del Formulario de Cobro
  tipoComprobante: 'BOLETA' | 'FACTURA' | 'TICKET' = 'BOLETA';
  facturaRuc: string = '';
  facturaRazonSocial: string = '';
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'TRANSFERENCIA' = 'EFECTIVO';
  efectivoRecibido: number = 0;
  referenciaPago: string = '';
  estaProcesandoPago: boolean = false;
  errorPago: string = '';
  exitoPago: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estaAbierto'] && this.estaAbierto && this.pedido) {
      this.inicializarModal();
    }
  }

  inicializarModal(): void {
    this.tipoComprobante = 'BOLETA';
    this.facturaRuc = '';
    this.facturaRazonSocial = '';
    this.metodoPago = 'EFECTIVO';
    this.efectivoRecibido = this.pedido?.total || 0;
    this.referenciaPago = '';
    this.errorPago = '';
    this.exitoPago = '';
    this.estaProcesandoPago = false;
  }

  get vueltoEfectivo(): number {
    const total = this.pedido?.total || 0;
    if (this.efectivoRecibido > total) {
      return Number((this.efectivoRecibido - total).toFixed(2));
    }
    return 0;
  }

  establecerTipoComprobante(tipo: 'BOLETA' | 'FACTURA' | 'TICKET'): void {
    this.tipoComprobante = tipo;
  }

  establecerMetodoPago(metodo: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'TRANSFERENCIA'): void {
    this.metodoPago = metodo;
  }

  establecerMontoExacto(): void {
    this.efectivoRecibido = this.pedido?.total || 0;
  }

  agregarEfectivo(monto: number): void {
    const actual = Number(this.efectivoRecibido) || 0;
    this.efectivoRecibido = Number((actual + monto).toFixed(2));
  }

  puedeAnularPedido(): boolean {
    const rol = this.perfil?.rolNombre;
    return rol === 'Administrador' || rol === 'Dueño' || rol === 'SuperAdmin';
  }

  estaComandaCompletamenteServida(pedido: Pedido | null): boolean {
    if (!pedido || !pedido.detalles || pedido.detalles.length === 0) return false;
    return pedido.detalles.every((item) => {
      if (item.requiereCoccion) {
        return item.checkCocina === true && item.checkMesero === true;
      }
      return item.checkMesero === true;
    });
  }

  obtenerItemsPendientes(pedido: Pedido | null): DetallePedido[] {
    if (!pedido || !pedido.detalles) return [];
    return pedido.detalles.filter((item) => {
      if (item.requiereCoccion) {
        return !item.checkCocina || !item.checkMesero;
      }
      return !item.checkMesero;
    });
  }

  alCerrar(): void {
    this.cerrar.emit();
  }

  alAnular(): void {
    if (this.pedido) {
      this.abrirAnularPedido.emit(this.pedido);
    }
  }

  confirmarPago(): void {
    if (!this.pedido) return;

    if (!this.estaComandaCompletamenteServida(this.pedido)) {
      this.errorPago = 'No se puede cobrar: aún hay productos pendientes de entrega a la mesa.';
      return;
    }

    if (this.tipoComprobante === 'FACTURA') {
      if (!this.facturaRuc || this.facturaRuc.trim().length !== 11) {
        this.errorPago = 'Debe ingresar un RUC válido de 11 dígitos para emitir Factura.';
        return;
      }
      if (!this.facturaRazonSocial || this.facturaRazonSocial.trim().length < 3) {
        this.errorPago = 'Debe ingresar la Razón Social de la empresa para emitir Factura.';
        return;
      }
    }

    if (this.metodoPago === 'EFECTIVO' && this.efectivoRecibido < this.pedido.total) {
      this.errorPago = 'El efectivo recibido no cubre el total de la comanda.';
      return;
    }

    this.estaProcesandoPago = true;
    this.errorPago = '';
    this.exitoPago = '';

    const ref = this.referenciaPago.trim() || null;

    this.procesarPagoUseCase.execute(
      this.pedido.id,
      this.metodoPago,
      Number(this.pedido.total),
      ref
    ).subscribe({
      next: (ok: boolean) => {
        this.estaProcesandoPago = false;
        if (ok) {
          this.exitoPago = '¡Pago registrado exitosamente! La mesa ha sido liberada.';
          this.pagoProcesado.emit();
          setTimeout(() => {
            this.alCerrar();
          }, 900);
        } else {
          this.errorPago = 'Error al procesar el pago.';
        }
      },
      error: (err: any) => {
        this.estaProcesandoPago = false;
        this.errorPago = err.error?.message || err.message || 'Error al procesar el pago.';
      }
    });
  }
}
