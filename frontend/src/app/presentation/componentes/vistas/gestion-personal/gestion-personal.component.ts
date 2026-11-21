import { Component, Input, OnInit, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetStaffUseCase } from '../../../../application/ports/in/get-staff.use-case.js';
import { RegisterUseCase } from '../../../../application/ports/in/register.use-case.js';
import { UpdateUserUseCase } from '../../../../application/ports/in/update-user.use-case.js';
import { DeleteUserUseCase } from '../../../../application/ports/in/delete-user.use-case.js';
import { ResetPasswordUseCase } from '../../../../application/ports/in/reset-password.use-case.js';
import { GetRolesUseCase } from '../../../../application/ports/in/get-roles.use-case.js';
import { User } from '../../../../domain/models/user.model.js';
import { Sucursal } from '../../../../domain/models/sucursal.model.js';

/**
 * ==============================================================================
 * VISTA: GESTIÓN DE PERSONAL / EMPLEADOS DE LA SEDE
 * Adaptador de Entrada (Driving Adapter) que gestiona el listado de personal,
 * contratación/registro, edición de roles, reseteo de claves y bajas.
 * ==============================================================================
 */
@Component({
  selector: 'app-gestion-personal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-personal.component.html'
})
export class GestionPersonalComponent implements OnInit, OnChanges {
  // Casos de Uso (Input Ports)
  private getStaffUseCase = inject(GetStaffUseCase);
  private registerUseCase = inject(RegisterUseCase);
  private updateUserUseCase = inject(UpdateUserUseCase);
  private deleteUserUseCase = inject(DeleteUserUseCase);
  private resetPasswordUseCase = inject(ResetPasswordUseCase);
  private getRolesUseCase = inject(GetRolesUseCase);

  /** Identificador de la sucursal activa */
  @Input() sucursalId: number = 1;
  /** Perfil del usuario autenticado */
  @Input() perfil: any = null;
  /** Listado de sucursales disponibles */
  @Input() listaSucursales: Sucursal[] = [];

  listaPersonal: User[] = [];
  listaRoles: { id: number; nombre: string }[] = [];
  cargandoPersonal: boolean = false;


  // Modales
  mostrarModalCrearPersonal: boolean = false;
  mostrarModalEditar: boolean = false;
  mostrarModalEliminar: boolean = false;
  mostrarModalReset: boolean = false;

  usuarioSeleccionado: User | null = null;
  modalError: string = '';
  modalSuccess: string = '';
  nuevoPasswordReset: string = '';

  nuevoPersonal = {
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
    rolId: 3,
    sucursalId: 1
  };

  usuarioEnEdicion: any = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    rolId: 3,
    activo: true
  };

  ngOnInit(): void {
    this.cargarPersonal();
    this.cargarRoles();
  }

  cargarRoles(): void {
    this.getRolesUseCase.execute().subscribe({
      next: (roles) => {
        this.listaRoles = roles;
      },
      error: (err) => {
        console.error('Error al cargar roles de BD:', err);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sucursalId'] && !changes['sucursalId'].firstChange) {
      this.cargarPersonal();
    }
  }

  cargarPersonal(): void {
    this.cargandoPersonal = true;
    const sucursalObjetivo = this.sucursalId || this.perfil?.sucursalId || undefined;

    this.getStaffUseCase.execute(sucursalObjetivo).subscribe({
      next: (personal: User[]) => {
        this.listaPersonal = personal;
        this.cargandoPersonal = false;
      },
      error: (err: any) => {
        console.error('Error al cargar personal:', err);
        this.cargandoPersonal = false;
      }
    });
  }

  obtenerClaseRol(rolNombre?: string): string {
    if (!rolNombre) return 'empleado';
    const lower = rolNombre.toLowerCase();
    if (lower.includes('dueño') || lower.includes('dueñ') || lower.includes('dueno') || lower.includes('superadmin')) {
      return 'dueño';
    }
    return lower;
  }

  obtenerNombreSucursal(id?: number | null): string {
    if (!id) return 'Todas las Sedes';
    if (this.perfil && this.perfil.sucursalId === id && this.perfil.sucursalNombre) {
      return this.perfil.sucursalNombre;
    }
    const encontrada = this.listaSucursales.find((s) => s.id === id);
    if (encontrada && encontrada.nombre) return encontrada.nombre;
    if (this.perfil?.sucursalNombre && (!id || this.perfil.sucursalId === id)) {
      return this.perfil.sucursalNombre;
    }
    return `Sucursal #${id}`;
  }

  obtenerRolesParaCreacion(): { id: number; nombre: string }[] {
    if (this.listaRoles.length === 0) return [];
    const esDueño = this.perfil?.rolNombre === 'Dueño' || this.perfil?.rolNombre === 'SuperAdmin';
    if (esDueño) {
      return this.listaRoles;
    }
    // Administradores de sede pueden crear roles operativos (cocinero, mesero, cajero)
    return this.listaRoles.filter(r => {
      const nombre = r.nombre.toLowerCase();
      return !nombre.includes('dueño') && !nombre.includes('superadmin');
    });
  }


  abrirModalCrearPersonal(): void {
    this.nuevoPersonal = {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      telefono: '',
      rolId: 3,
      sucursalId: (this.perfil?.rolNombre === 'Dueño' || this.perfil?.rolNombre === 'SuperAdmin')
        ? (this.sucursalId || this.perfil?.sucursalId || 1)
        : (this.perfil?.sucursalId || 1)
    };
    this.modalError = '';
    this.modalSuccess = '';
    this.mostrarModalCrearPersonal = true;
  }

  abrirModalEditar(usuario: User): void {
    this.usuarioSeleccionado = usuario;
    this.usuarioEnEdicion = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      rolId: usuario.rolId,
      activo: usuario.activo
    };
    this.modalError = '';
    this.modalSuccess = '';
    this.mostrarModalEditar = true;
  }

  abrirModalEliminar(usuario: User): void {
    this.usuarioSeleccionado = usuario;
    this.modalError = '';
    this.modalSuccess = '';
    this.mostrarModalEliminar = true;
  }

  abrirModalReset(usuario: User): void {
    this.usuarioSeleccionado = usuario;
    this.nuevoPasswordReset = '';
    this.modalError = '';
    this.modalSuccess = '';
    this.mostrarModalReset = true;
  }

  cerrarModales(): void {
    this.mostrarModalCrearPersonal = false;
    this.mostrarModalEditar = false;
    this.mostrarModalEliminar = false;
    this.mostrarModalReset = false;
    this.usuarioSeleccionado = null;
    this.modalError = '';
    this.modalSuccess = '';
    this.cargarPersonal();
  }

  crearPersonal(): void {
    if (!this.nuevoPersonal.nombre || !this.nuevoPersonal.apellido || !this.nuevoPersonal.password || !this.nuevoPersonal.rolId) {
      this.modalError = 'Por favor complete todos los campos requeridos (Nombre, Apellido, Rol y Contraseña).';
      return;
    }

    if (this.nuevoPersonal.password.length < 4) {
      this.modalError = 'La contraseña debe tener al menos 4 caracteres.';
      return;
    }

    const payload = {
      ...this.nuevoPersonal,
      rolId: Number(this.nuevoPersonal.rolId),
      sucursalId: (this.perfil?.rolNombre === 'Dueño' || this.perfil?.rolNombre === 'SuperAdmin')
        ? Number(this.nuevoPersonal.sucursalId)
        : Number(this.perfil?.sucursalId)
    };

    this.registerUseCase.execute(payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.modalSuccess = '¡Personal registrado exitosamente!';
          setTimeout(() => {
            this.cerrarModales();
          }, 1000);
        } else {
          this.modalError = res.message || 'Error al registrar personal.';
        }
      },
      error: (err: any) => {
        this.modalError = err.error?.message || 'Error al conectar con el servidor.';
      }
    });
  }

  guardarUsuario(): void {
    if (!this.usuarioSeleccionado?.id || !this.usuarioEnEdicion.nombre || !this.usuarioEnEdicion.apellido || !this.usuarioEnEdicion.rolId) {
      this.modalError = 'Por favor complete todos los campos obligatorios.';
      return;
    }

    this.updateUserUseCase.execute(this.usuarioSeleccionado.id, this.usuarioEnEdicion).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.modalSuccess = 'Usuario actualizado exitosamente.';
          setTimeout(() => {
            this.cerrarModales();
          }, 1000);
        } else {
          this.modalError = res.message || 'Error al actualizar usuario.';
        }
      },
      error: (err: any) => {
        this.modalError = err.error?.message || 'Error en la conexión con el servidor.';
      }
    });
  }

  confirmarEliminarUsuario(): void {
    if (!this.usuarioSeleccionado?.id) return;

    this.deleteUserUseCase.execute(this.usuarioSeleccionado.id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.modalSuccess = 'Usuario eliminado exitosamente.';
          setTimeout(() => {
            this.cerrarModales();
          }, 1000);
        } else {
          this.modalError = res.message || 'Error al eliminar usuario.';
        }
      },
      error: (err: any) => {
        this.modalError = err.error?.message || 'Error al eliminar el usuario.';
      }
    });
  }

  confirmarRestablecerPassword(): void {
    if (!this.usuarioSeleccionado?.id || !this.nuevoPasswordReset || this.nuevoPasswordReset.length < 4) {
      this.modalError = 'La contraseña debe tener al menos 4 caracteres.';
      return;
    }

    this.resetPasswordUseCase.execute(this.usuarioSeleccionado.id, this.nuevoPasswordReset).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.modalSuccess = 'Contraseña restablecida exitosamente.';
          setTimeout(() => {
            this.cerrarModales();
          }, 1000);
        } else {
          this.modalError = res.message || 'Error al restablecer la contraseña.';
        }
      },
      error: (err: any) => {
        this.modalError = err.error?.message || 'Error al restablecer la contraseña.';
      }
    });
  }
}
