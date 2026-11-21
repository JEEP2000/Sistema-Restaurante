import { InjectionToken, Provider } from '@angular/core';
import { AuthRepositoryPort } from '../../application/ports/out/auth.repository.port.js';
import { TokenStoragePort } from '../../application/ports/out/token.storage.port.js';
import { HttpAuthRepositoryAdapter } from '../adapters/out/http-auth.repository.adapter.js';
import { LocalStorageTokenAdapter } from '../adapters/out/local-storage-token.adapter.js';
import { LoginUseCase } from '../../application/ports/in/login.use-case.js';
import { RegisterUseCase } from '../../application/ports/in/register.use-case.js';
import { GetProfileUseCase } from '../../application/ports/in/get-profile.use-case.js';
import { LogoutUseCase } from '../../application/ports/in/logout.use-case.js';
import { GetStaffUseCase } from '../../application/ports/in/get-staff.use-case.js';
import { UpdateUserUseCase } from '../../application/ports/in/update-user.use-case.js';
import { DeleteUserUseCase } from '../../application/ports/in/delete-user.use-case.js';
import { ResetPasswordUseCase } from '../../application/ports/in/reset-password.use-case.js';
import { GetRolesUseCase } from '../../application/ports/in/get-roles.use-case.js';

// Definir los tokens de inyección
export const AUTH_REPOSITORY_TOKEN = new InjectionToken<AuthRepositoryPort>('AuthRepositoryPort');
export const TOKEN_STORAGE_TOKEN = new InjectionToken<TokenStoragePort>('TokenStoragePort');

// Configuración de proveedores
export const authProviders: Provider[] = [
  // Registrar adaptadores para los puertos
  {
    provide: AUTH_REPOSITORY_TOKEN,
    useClass: HttpAuthRepositoryAdapter
  },
  {
    provide: TOKEN_STORAGE_TOKEN,
    useClass: LocalStorageTokenAdapter
  },
  // Registrar casos de uso inyectando sus dependencias mediante factory
  {
    provide: LoginUseCase,
    useFactory: (authRepo: AuthRepositoryPort, tokenStorage: TokenStoragePort) => {
      return new LoginUseCase(authRepo, tokenStorage);
    },
    deps: [AUTH_REPOSITORY_TOKEN, TOKEN_STORAGE_TOKEN]
  },
  {
    provide: RegisterUseCase,
    useFactory: (authRepo: AuthRepositoryPort) => {
      return new RegisterUseCase(authRepo);
    },
    deps: [AUTH_REPOSITORY_TOKEN]
  },
  {
    provide: GetProfileUseCase,
    useFactory: (authRepo: AuthRepositoryPort) => {
      return new GetProfileUseCase(authRepo);
    },
    deps: [AUTH_REPOSITORY_TOKEN]
  },
  {
    provide: LogoutUseCase,
    useFactory: (authRepo: AuthRepositoryPort, tokenStorage: TokenStoragePort) => {
      return new LogoutUseCase(authRepo, tokenStorage);
    },
    deps: [AUTH_REPOSITORY_TOKEN, TOKEN_STORAGE_TOKEN]
  },
  {
    provide: GetStaffUseCase,
    useFactory: (authRepo: AuthRepositoryPort) => {
      return new GetStaffUseCase(authRepo);
    },
    deps: [AUTH_REPOSITORY_TOKEN]
  },
  {
    provide: UpdateUserUseCase,
    useFactory: (authRepo: AuthRepositoryPort) => {
      return new UpdateUserUseCase(authRepo);
    },
    deps: [AUTH_REPOSITORY_TOKEN]
  },
  {
    provide: DeleteUserUseCase,
    useFactory: (authRepo: AuthRepositoryPort) => {
      return new DeleteUserUseCase(authRepo);
    },
    deps: [AUTH_REPOSITORY_TOKEN]
  },
  {
    provide: ResetPasswordUseCase,
    useFactory: (authRepo: AuthRepositoryPort) => {
      return new ResetPasswordUseCase(authRepo);
    },
    deps: [AUTH_REPOSITORY_TOKEN]
  },
  {
    provide: GetRolesUseCase,
    useFactory: (authRepo: AuthRepositoryPort) => {
      return new GetRolesUseCase(authRepo);
    },
    deps: [AUTH_REPOSITORY_TOKEN]
  }
];

