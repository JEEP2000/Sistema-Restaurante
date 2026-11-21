import { Observable } from 'rxjs';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';
import { User } from '../../../domain/models/user.model.js';

export class GetStaffUseCase {
  constructor(private authRepository: AuthRepositoryPort) {}

  execute(sucursalId?: number): Observable<User[]> {
    return this.authRepository.getStaffBySucursal(sucursalId);
  }
}
