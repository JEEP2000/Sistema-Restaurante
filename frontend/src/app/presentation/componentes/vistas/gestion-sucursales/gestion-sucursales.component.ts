import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetSucursalesUseCase } from '../../../../application/ports/in/get-sucursales.use-case.js';
import { CreateSucursalUseCase } from '../../../../application/ports/in/create-sucursal.use-case.js';
import { UpdateSucursalUseCase } from '../../../../application/ports/in/update-sucursal.use-case.js';
import { DeleteSucursalUseCase } from '../../../../application/ports/in/delete-sucursal.use-case.js';
import { Sucursal } from '../../../../domain/models/sucursal.model.js';

/**
 * ==============================================================================
 * VISTA: GESTIÓN DE SUCURSALES / SEDES (ROL DUEÑO / SUPERADMIN)
 * Adaptador de Entrada (Driving Adapter) que administra las sucursales,
 * direcciones, números de contacto, horarios y configuración de delivery.
 * ==============================================================================
 */
@Component({
  selector: 'app-gestion-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-sucursales.component.html'
})
export class GestionSucursalesComponent implements OnInit {
  // Casos de Uso (Input Ports)
  private getSucursalesUseCase = inject(GetSucursalesUseCase);
  private createSucursalUseCase = inject(CreateSucursalUseCase);
  private updateSucursalUseCase = inject(UpdateSucursalUseCase);
  private deleteSucursalUseCase = inject(DeleteSucursalUseCase);

  /** Lista de sucursales */
  @Input() listaSucursales: Sucursal[] = [];
  /** Perfil del usuario autenticado */
  @Input() perfil: any = null;

  /** Notifica que la lista de sucursales ha cambiado */
  @Output() sucursalesActualizadas = new EventEmitter<void>();

  // Modales
  mostrarModalSucursal: boolean = false;
  mostrarModalEliminarSucursal: boolean = false;
  estaEditandoSucursal: boolean = false;
  sucursalSeleccionada: Sucursal | null = null;
  modalError: string = '';
  modalSuccess: string = '';

  sucursalEnEdicion: any = {
    empresaId: 1,
    nombre: '',
    direccion: '',
    telefono: '',
    correoContacto: '',
    horarioApertura: '10:00',
    horarioCierre: '23:00',
    esDelivery: true,
    costoDelivery: 5,
    activo: true
  };

  ngOnInit(): void {
    this.cargarSucursales();
  }

  cargarSucursales(): void {
    this.getSucursalesUseCase.execute().subscribe({
      next: (data) => {
        this.listaSucursales = data;
        this.sucursalesActualizadas.emit();
      },
      error: (err) => {
        console.error('Error al cargar lista de sucursales:', err);
      }
    });
  }

  abrirModalCrearSucursal(): void {
    this.estaEditandoSucursal = false;
    this.sucursalEnEdicion = {
      empresaId: 1,
      nombre: '',
      direccion: '',
      telefono: '',
      correoContacto: '',
      horarioApertura: '10:00',
      horarioCierre: '23:00',
      esDelivery: true,
      costoDelivery: 5,
      activo: true
    };
    this.modalError = '';
    this.modalSuccess = '';
    this.mostrarModalSucursal = true;
  }

  abrirModalEditarSucursal(sucursal: Sucursal): void {
    this.estaEditandoSucursal = true;
    this.sucursalSeleccionada = sucursal;
    this.sucursalEnEdicion = { ...sucursal };
    this.modalError = '';
    this.modalSuccess = '';
    this.mostrarModalSucursal = true;
  }

  abrirModalEliminarSucursal(sucursal: Sucursal): void {
    this.sucursalSeleccionada = sucursal;
    this.modalError = '';
    this.modalSuccess = '';
    this.mostrarModalEliminarSucursal = true;
  }

  cerrarModales(): void {
    this.mostrarModalSucursal = false;
    this.mostrarModalEliminarSucursal = false;
    this.sucursalSeleccionada = null;
    this.modalError = '';
    this.modalSuccess = '';
    this.cargarSucursales();
  }

  guardarSucursal(): void {
    if (!this.sucursalEnEdicion.nombre || !this.sucursalEnEdicion.direccion || !this.sucursalEnEdicion.telefono) {
      this.modalError = 'Nombre, dirección y teléfono son campos requeridos.';
      return;
    }

    if (this.estaEditandoSucursal && this.sucursalSeleccionada?.id) {
      this.updateSucursalUseCase.execute(this.sucursalSeleccionada.id, this.sucursalEnEdicion).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.modalSuccess = 'Sucursal actualizada exitosamente.';
            setTimeout(() => {
              this.cerrarModales();
            }, 1000);
          } else {
            this.modalError = res.message || 'Error al actualizar sucursal.';
          }
        },
        error: (err: any) => {
          this.modalError = err.error?.message || 'Error al conectar con el servidor.';
        }
      });
    } else {
      this.createSucursalUseCase.execute(this.sucursalEnEdicion as Omit<Sucursal, 'id'>).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.modalSuccess = '¡Sucursal creada exitosamente!';
            setTimeout(() => {
              this.cerrarModales();
            }, 1000);
          } else {
            this.modalError = res.message || 'Error al crear la sucursal.';
          }
        },
        error: (err: any) => {
          this.modalError = err.error?.message || 'Error al conectar con el servidor.';
        }
      });
    }
  }

  confirmarEliminarSucursal(): void {
    if (!this.sucursalSeleccionada?.id) return;

    this.deleteSucursalUseCase.execute(this.sucursalSeleccionada.id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.modalSuccess = 'Sucursal eliminada exitosamente.';
          setTimeout(() => {
            this.cerrarModales();
          }, 1000);
        } else {
          this.modalError = res.message || 'Error al eliminar sucursal.';
        }
      },
      error: (err: any) => {
        this.modalError = err.error?.message || 'Error al eliminar la sucursal.';
      }
    });
  }
}
