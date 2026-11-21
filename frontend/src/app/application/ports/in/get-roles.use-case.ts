import { Observable } from 'rxjs';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';

export class GetRolesUseCase {
  constructor(private authRepository: AuthRepositoryPort) {}

  execute(): Observable<{ id: number; nombre: string; descripcion?: string }[]> {
    return this.authRepository.getRoles();
  }
}
