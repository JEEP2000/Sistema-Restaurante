import { Observable } from 'rxjs';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';

export class ResetPasswordUseCase {
  constructor(private authRepository: AuthRepositoryPort) {}

  execute(id: number, password: string): Observable<any> {
    return this.authRepository.resetPassword(id, password);
  }
}
