import { Observable } from 'rxjs';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';

export class DeleteUserUseCase {
  constructor(private authRepository: AuthRepositoryPort) {}

  execute(id: number): Observable<any> {
    return this.authRepository.deleteUser(id);
  }
}
