import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';
import { TokenStoragePort } from '../out/token.storage.port.js';

export class LogoutUseCase {
  constructor(
    private authRepository: AuthRepositoryPort,
    private tokenStorage: TokenStoragePort
  ) {}

  execute(): Observable<any> {
    return this.authRepository.logout().pipe(
      tap(() => {
        this.tokenStorage.removeToken();
      })
    );
  }
}
