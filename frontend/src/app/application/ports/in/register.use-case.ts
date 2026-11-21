import { Observable } from 'rxjs';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';
import { RegisterResponse } from '../../../domain/models/auth.model.js';
import { User } from '../../../domain/models/user.model.js';

export class RegisterUseCase {
  constructor(private authRepository: AuthRepositoryPort) {}

  execute(user: Omit<User, 'id' | 'activo' | 'fechaCreacion'> & { password?: string }): Observable<RegisterResponse> {
    return this.authRepository.register(user);
  }
}
