import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoginUseCase } from '../../../application/ports/in/login.use-case.js';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  nombre = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private loginUseCase: LoginUseCase,
    private router: Router
  ) { }

  onSubmit() {
    if (!this.nombre || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.loginUseCase.execute(this.nombre, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = '¡Ingreso exitoso! Redirigiendo...';
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1200);
        } else {
          this.errorMessage = response.message || 'Error al iniciar sesión';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Credenciales incorrectas o error al conectar con el servidor';
      }
    });
  }
}
