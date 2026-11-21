import { Component, EventEmitter, Input, Output, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetEstadisticasAvanzadasUseCase } from '../../../../application/ports/in/get-estadisticas-avanzadas.use-case.js';
import { GetDashboardStatsUseCase } from '../../../../application/ports/in/get-dashboard-stats.use-case.js';
import { EstadisticasAvanzadas } from '../../../../domain/models/pedido.model.js';
import { DashboardStats } from '../../../../domain/models/dashboard-stats.model.js';

/**
 * ==============================================================================
 * VISTA: PANEL DE ANÁLISIS Y RESUMEN GENERAL (ANALÍTICA)
 * Adaptador de Entrada (Driving Adapter) que presenta métricas de ventas,
 * comandas, métodos de pago, auditoría de anulaciones y ranking de platos.
 * ==============================================================================
 */
@Component({
  selector: 'app-analitica-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analitica-resumen.component.html'
})
export class AnaliticaResumenComponent implements OnInit, OnChanges {
  // Inyección de dependencias de Casos de Uso
  private getEstadisticasAvanzadasUseCase = inject(GetEstadisticasAvanzadasUseCase);
  private getDashboardStatsUseCase = inject(GetDashboardStatsUseCase);

  /** Identificador de la sucursal activa */
  @Input() sucursalId: number = 1;
  /** Datos del perfil de usuario autenticado */
  @Input() perfil: any = null;
  /** Estadísticas globales rápidas del día */
  @Input() estadisticas: DashboardStats = {
    totalMesas: 0,
    mesasOcupadas: 0,
    mesasAtendidasHoy: 0,
    comandasActivas: 0,
    comandasTotalesHoy: 0,
    ventasHoy: 0
  };

  /** Emisor de eventos para navegación entre pestañas */
  @Output() navegarA = new EventEmitter<string>();

  // Estado interno del panel analítico
  datosAnalitica: EstadisticasAvanzadas | null = null;
  cargandoAnalitica: boolean = false;
  filtroPeriodo: string = 'hoy';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';

  ngOnInit(): void {
    this.cargarDatosAnalitica();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sucursalId'] && !changes['sucursalId'].firstChange) {
      this.cargarDatosAnalitica();
    }
  }

  /**
   * Carga las estadísticas analíticas avanzadas aplicando el filtro temporal
   */
  cargarDatosAnalitica(): void {
    this.cargandoAnalitica = true;
    let fechaInicio: string | undefined = undefined;
    let fechaFin: string | undefined = undefined;
    const ahora = new Date();

    if (this.filtroPeriodo === 'hoy') {
      fechaInicio = this.formatearFechaIso(ahora);
      fechaFin = this.formatearFechaIso(ahora);
    } else if (this.filtroPeriodo === 'ayer') {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      fechaInicio = this.formatearFechaIso(ayer);
      fechaFin = this.formatearFechaIso(ayer);
    } else if (this.filtroPeriodo === 'semana') {
      const sem = new Date();
      sem.setDate(sem.getDate() - 7);
      fechaInicio = this.formatearFechaIso(sem);
      fechaFin = this.formatearFechaIso(ahora);
    } else if (this.filtroPeriodo === 'mes') {
      const mesInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fechaInicio = this.formatearFechaIso(mesInicio);
      fechaFin = this.formatearFechaIso(ahora);
    } else if (this.filtroPeriodo === 'personalizado') {
      fechaInicio = this.filtroFechaInicio || undefined;
      fechaFin = this.filtroFechaFin || undefined;
    }

    const sucursalObjetivo = this.sucursalId || this.perfil?.sucursalId || undefined;

    this.getEstadisticasAvanzadasUseCase.execute(sucursalObjetivo, fechaInicio, fechaFin).subscribe({
      next: (datos) => {
        this.datosAnalitica = datos;
        this.cargandoAnalitica = false;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas analíticas:', err);
        this.cargandoAnalitica = false;
      }
    });

    // Refrescar simultáneamente los contadores en vivo del día
    this.getDashboardStatsUseCase.execute(sucursalObjetivo).subscribe({
      next: (estadisticasActualizadas) => {
        this.estadisticas = estadisticasActualizadas;
      },
      error: (err) => console.error('Error al refrescar contadores:', err)
    });
  }

  alCambiarFiltroPeriodo(filtro: string): void {
    this.filtroPeriodo = filtro;
    this.cargarDatosAnalitica();
  }

  obtenerMaximoVentasPeriodo(): number {
    if (!this.datosAnalitica?.ventasPorPeriodo || this.datosAnalitica.ventasPorPeriodo.length === 0) return 1;
    const max = Math.max(...this.datosAnalitica.ventasPorPeriodo.map((p) => p.total));
    return max > 0 ? max : 1;
  }

  obtenerPorcentajeAlturaBarra(total: number): number {
    const max = this.obtenerMaximoVentasPeriodo();
    if (max <= 0) return 4;
    const pct = Math.round((total / max) * 100);
    return Math.max(pct, 4);
  }

  solicitarNavegacion(vista: string): void {
    this.navegarA.emit(vista);
  }

  private formatearFechaIso(d: Date): string {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
