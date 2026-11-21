import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';
import { TokenStoragePort } from '../out/token.storage.port.js';
import { LoginResponse } from '../../../domain/models/auth.model.js';

export class LoginUseCase {
  constructor(
    private authRepository: AuthRepositoryPort,
    private tokenStorage: TokenStoragePort
  ) {}

  execute(nombre: string, password: string): Observable<LoginResponse> {
    return this.authRepository.login(nombre, password).pipe(
      tap((response: LoginResponse) => {
        if (response.success && response.token) {
          this.tokenStorage.saveToken(response.token);
        }
      })
    );
  }
}
