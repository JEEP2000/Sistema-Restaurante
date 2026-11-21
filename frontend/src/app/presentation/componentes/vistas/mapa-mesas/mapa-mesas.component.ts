import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Mesa } from '../../../../domain/models/mesa.model.js';

/**
 * ==============================================================================
 * VISTA: MAPA DE MESAS Y SALÓN
 * Adaptador de Entrada (Driving Adapter) que presenta la distribución
 * de mesas, filtros por estado (libre, ocupada, en pago) y apertura de comandas.
 * ==============================================================================
 */
@Component({
  selector: 'app-mapa-mesas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa-mesas.component.html'
})
export class MapaMesasComponent {
  /** Listado de mesas de la sucursal */
  @Input() mesas: Mesa[] = [];
  /** Perfil del usuario autenticado */
  @Input() perfil: any = null;
  /** Identificador de la sucursal activa */
  @Input() sucursalId: number = 1;

  /** Evento emitido al hacer clic en una tarjeta de mesa */
  @Output() seleccionarMesa = new EventEmitter<Mesa>();
  /** Evento emitido para abrir el modal de creación de mesa */
  @Output() abrirCrearMesa = new EventEmitter<void>();

  filtroMesa: 'todas' | 'libre' | 'ocupada' | 'enpago' = 'todas';

  establecerFiltro(filtro: 'todas' | 'libre' | 'ocupada' | 'enpago'): void {
    this.filtroMesa = filtro;
  }

  get mesasFiltradas(): Mesa[] {
    if (this.filtroMesa === 'todas') {
      return this.mesas;
    }
    return this.mesas.filter((t) => (t.estado || '').toLowerCase() === this.filtroMesa);
  }

  puedeGestionarMesas(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  puedeModificarPedido(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'mesero' || 
           rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  alSeleccionarMesa(mesa: Mesa): void {
    this.seleccionarMesa.emit(mesa);
  }

  alAbrirCrearMesa(): void {
    this.abrirCrearMesa.emit();
  }
}
