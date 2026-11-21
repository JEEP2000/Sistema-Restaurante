import { Observable } from 'rxjs';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';
import { User } from '../../../domain/models/user.model.js';

export class UpdateUserUseCase {
  constructor(private authRepository: AuthRepositoryPort) {}

  execute(id: number, user: Partial<User>): Observable<any> {
    return this.authRepository.updateUser(id, user);
  }
}
