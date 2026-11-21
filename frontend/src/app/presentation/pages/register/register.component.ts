import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RegisterUseCase } from '../../../application/ports/in/register.use-case.js';
import { GetSucursalesUseCase } from '../../../application/ports/in/get-sucursales.use-case.js';
import { GetRolesUseCase } from '../../../application/ports/in/get-roles.use-case.js';
import { Sucursal } from '../../../domain/models/sucursal.model.js';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  private registerUseCase = inject(RegisterUseCase);
  private getSucursalesUseCase = inject(GetSucursalesUseCase);
  private getRolesUseCase = inject(GetRolesUseCase);
  private router = inject(Router);

  user = {
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
    rolId: 1,
    sucursalId: 1
  };

  roles: { id: number; nombre: string }[] = [];
  sucursales: Sucursal[] = [];

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit() {
    // Cargar roles dinámicamente desde la base de datos
    this.getRolesUseCase.execute().subscribe({
      next: (data) => {
        this.roles = data;
        if (this.roles.length > 0) {
          // Preseleccionar preferentemente Dueño o el primer rol disponible
          const dueno = this.roles.find(r => r.nombre.toLowerCase().includes('dueño') || r.nombre.toLowerCase().includes('admin'));
          this.user.rolId = dueno ? dueno.id : this.roles[0].id;
        }
      },
      error: (err) => {
        console.error('Error al cargar roles desde la base de datos:', err);
      }
    });

    // Cargar sucursales dinámicamente desde la base de datos
    this.getSucursalesUseCase.execute().subscribe({
      next: (data) => {
        this.sucursales = data.filter(s => s.activo !== false);
        if (this.sucursales.length > 0 && this.sucursales[0].id) {
          this.user.sucursalId = this.sucursales[0].id;
        }
      },
      error: (err) => {
        console.error('Error al cargar sucursales:', err);
        this.errorMessage = 'No se pudieron cargar las sucursales desde la base de datos.';
      }
    });
  }


  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      ...this.user,
      rolId: Number(this.user.rolId),
      sucursalId: Number(this.user.sucursalId)
    };

    this.registerUseCase.execute(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = '¡Registro exitoso! Redirigiendo a Login...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        } else {
          this.errorMessage = response.message || 'Error al registrar';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error en la conexión con el servidor o correo ya registrado';
      }
    });
  }
}
