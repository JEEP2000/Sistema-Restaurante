import { Component, EventEmitter, Input, Output, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetHistorialVentasUseCase } from '../../../../application/ports/in/get-historial-ventas.use-case.js';
import { VentaHistorialItem, HistorialVentasResumen } from '../../../../domain/models/pedido.model.js';

/**
 * ==============================================================================
 * VISTA: HISTORIAL DE VENTAS Y AUDITORÍA DE PEDIDOS
 * Adaptador de Entrada (Driving Adapter) que permite filtrar comandas por
 * fechas, estado operativo, método de pago y búsqueda de clientes o meseros.
 * ==============================================================================
 */
@Component({
  selector: 'app-historial-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-ventas.component.html'
})
export class HistorialVentasComponent implements OnInit, OnChanges {
  // Inyección de Caso de Uso
  private getHistorialVentasUseCase = inject(GetHistorialVentasUseCase);

  /** Identificador de la sucursal activa */
  @Input() sucursalId: number = 1;
  /** Perfil del usuario autenticado */
  @Input() perfil: any = null;

  /** Evento emitido al hacer clic en Ver Detalle de una comanda */
  @Output() abrirDetalle = new EventEmitter<VentaHistorialItem>();

  historialVentas: VentaHistorialItem[] = [];
  historialResumen: HistorialVentasResumen | null = null;
  cargandoHistorialVentas: boolean = false;

  filtroFechaVentas: string = 'hoy';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroMetodoPago: string = 'TODOS';
  filtroEstadoVentas: string = 'TODOS';
  busquedaVentas: string = '';

  ngOnInit(): void {
    this.cargarHistorialVentas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sucursalId'] && !changes['sucursalId'].firstChange) {
      this.cargarHistorialVentas();
    }
  }

  puedeVerKpisFinancieros(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  cargarHistorialVentas(): void {
    this.cargandoHistorialVentas = true;
    let fechaInicio: string | undefined = undefined;
    let fechaFin: string | undefined = undefined;
    const ahora = new Date();

    if (this.filtroFechaVentas === 'hoy') {
      fechaInicio = this.formatearFechaIso(ahora);
      fechaFin = this.formatearFechaIso(ahora);
    } else if (this.filtroFechaVentas === 'ayer') {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      fechaInicio = this.formatearFechaIso(ayer);
      fechaFin = this.formatearFechaIso(ayer);
    } else if (this.filtroFechaVentas === 'semana') {
      const sem = new Date();
      sem.setDate(sem.getDate() - 7);
      fechaInicio = this.formatearFechaIso(sem);
      fechaFin = this.formatearFechaIso(ahora);
    } else if (this.filtroFechaVentas === 'mes') {
      const mesInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fechaInicio = this.formatearFechaIso(mesInicio);
      fechaFin = this.formatearFechaIso(ahora);
    } else if (this.filtroFechaVentas === 'personalizado') {
      fechaInicio = this.filtroFechaInicio || undefined;
      fechaFin = this.filtroFechaFin || undefined;
    }

    const sucursalObjetivo = this.sucursalId || this.perfil?.sucursalId || undefined;

    this.getHistorialVentasUseCase.execute(
      sucursalObjetivo,
      fechaInicio,
      fechaFin,
      this.filtroMetodoPago !== 'TODOS' ? this.filtroMetodoPago : undefined,
      this.filtroEstadoVentas !== 'TODOS' ? this.filtroEstadoVentas : undefined
    ).subscribe({
      next: (resumen) => {
        this.historialResumen = resumen;
        this.historialVentas = resumen?.ventas || [];
        this.cargandoHistorialVentas = false;
      },
      error: (err) => {
        console.error('Error al cargar historial de ventas:', err);
        this.cargandoHistorialVentas = false;
      }
    });
  }

  alCambiarFiltroFecha(filtro: string): void {
    this.filtroFechaVentas = filtro;
    this.cargarHistorialVentas();
  }

  alCambiarFiltroMetodo(): void {
    this.cargarHistorialVentas();
  }

  alCambiarFiltroEstado(): void {
    this.cargarHistorialVentas();
  }

  get ventasFiltradas(): VentaHistorialItem[] {
    let list = this.historialVentas;
    if (this.filtroEstadoVentas && this.filtroEstadoVentas !== 'TODOS') {
      list = list.filter((v) => (v.estado || '').toUpperCase() === this.filtroEstadoVentas.toUpperCase());
    }
    if (!this.busquedaVentas || !this.busquedaVentas.trim()) {
      return list;
    }
    const term = this.busquedaVentas.toLowerCase().trim();
    return list.filter(
      (v) =>
        v.pedidoId.toString().includes(term) ||
        (v.estado && v.estado.toLowerCase().includes(term)) ||
        (v.clienteNombre && v.clienteNombre.toLowerCase().includes(term)) ||
        (v.meseroNombre && v.meseroNombre.toLowerCase().includes(term)) ||
        (v.mesaNumero && v.mesaNumero.toString().includes(term)) ||
        (v.metodoPago && v.metodoPago.toLowerCase().includes(term)) ||
        (v.detalles && v.detalles.some((d) => d.productoNombre && d.productoNombre.toLowerCase().includes(term)))
    );
  }

  verDetalleVenta(venta: VentaHistorialItem): void {
    this.abrirDetalle.emit(venta);
  }

  private formatearFechaIso(d: Date): string {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
