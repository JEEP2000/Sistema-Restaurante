import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrearMesaUseCase } from '../../../../application/ports/in/crear-mesa.use-case.js';
import { Mesa } from '../../../../domain/models/mesa.model.js';
import { Sucursal } from '../../../../domain/models/sucursal.model.js';

/**
 * ==============================================================================
 * MODAL: AGREGAR NUEVA MESA (ADMINISTRADOR / DUEÑO)
 * Adaptador de Entrada (Driving Adapter) en Arquitectura Hexagonal.
 * Conecta la interfaz de usuario directamente con el caso de uso `CrearMesaUseCase`.
 * ==============================================================================
 */
@Component({
  selector: 'app-crear-mesa-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-mesa-modal.component.html'
})
export class CrearMesaModalComponent implements OnChanges {
  // Inyección de Caso de Uso (Input Port)
  private crearMesaUseCase = inject(CrearMesaUseCase);

  // Propiedades de Entrada (Inputs)
  @Input() estaAbierto: boolean = false;
  @Input() sucursalId: number = 1;
  @Input() listaSucursales: Sucursal[] = [];
  @Input() mesas: Mesa[] = [];
  @Input() perfil: any = null;

  // Eventos de Salida (Outputs)
  @Output() cerrar = new EventEmitter<void>();
  @Output() mesaCreada = new EventEmitter<Mesa>();

  // Estado del Formulario
  nuevoNumeroMesa: number | null = null;
  nuevaCapacidadMesa: number = 4;
  nuevaSucursalMesaId: number | null = null;
  estaCreandoMesa: boolean = false;
  errorModal: string = '';
  exitoModal: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estaAbierto'] && this.estaAbierto) {
      this.inicializarFormulario();
    }
  }

  /**
   * Inicializa los valores por defecto del formulario al abrir el modal.
   */
  inicializarFormulario(): void {
    const maxNumero = (this.mesas || []).reduce((max, m) => Math.max(max, m.numero || 0), 0);
    this.nuevoNumeroMesa = maxNumero > 0 ? maxNumero + 1 : ((this.mesas?.length || 0) + 1);
    this.nuevaCapacidadMesa = 4;
    this.nuevaSucursalMesaId = this.sucursalId || this.perfil?.sucursalId || (this.listaSucursales[0]?.id ?? 1);
    this.errorModal = '';
    this.exitoModal = '';
    this.estaCreandoMesa = false;
  }

  /**
   * Selecciona una capacidad rápida de comensales (2, 4, 6, 8 personas).
   */
  establecerCapacidad(capacidad: number): void {
    this.nuevaCapacidadMesa = capacidad;
  }

  /**
   * Ajusta la capacidad mediante botones de incremento / decremento (+ / -).
   */
  ajustarCapacidad(delta: number): void {
    const actual = Number(this.nuevaCapacidadMesa) || 4;
    this.nuevaCapacidadMesa = Math.max(1, Math.min(50, actual + delta));
  }

  /**
   * Cierra el modal y emite el evento al componente padre.
   */
  alCerrar(): void {
    this.cerrar.emit();
  }

  /**
   * Envía la solicitud al caso de uso para persistir la mesa en la base de datos.
   */
  guardarMesa(): void {
    if (!this.nuevoNumeroMesa || this.nuevoNumeroMesa <= 0) {
      this.errorModal = 'Por favor ingresa un número de mesa válido mayor a 0.';
      return;
    }

    if (!this.nuevaCapacidadMesa || this.nuevaCapacidadMesa <= 0) {
      this.errorModal = 'La capacidad debe ser de al menos 1 comensal.';
      return;
    }

    const sucursalDestino = this.nuevaSucursalMesaId || this.sucursalId || this.perfil?.sucursalId || 1;

    this.estaCreandoMesa = true;
    this.errorModal = '';
    this.exitoModal = '';

    this.crearMesaUseCase.execute({
      sucursalId: Number(sucursalDestino),
      numero: Number(this.nuevoNumeroMesa),
      capacidad: Number(this.nuevaCapacidadMesa)
    }).subscribe({
      next: (respuesta) => {
        this.estaCreandoMesa = false;
        if (respuesta.success) {
          this.exitoModal = `¡Mesa ${this.nuevoNumeroMesa} creada exitosamente!`;
          this.mesaCreada.emit(respuesta.data);
          setTimeout(() => {
            this.alCerrar();
          }, 900);
        } else {
          this.errorModal = respuesta.message || 'Error al crear la mesa.';
        }
      },
      error: (error: any) => {
        this.estaCreandoMesa = false;
        this.errorModal = error.error?.message || error.message || 'Error al registrar la nueva mesa en la base de datos.';
      }
    });
  }
}
