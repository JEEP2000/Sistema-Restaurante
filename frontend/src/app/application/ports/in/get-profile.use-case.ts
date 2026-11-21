import { Observable } from 'rxjs';
import { AuthRepositoryPort } from '../out/auth.repository.port.js';
import { ProfileResponse } from '../../../domain/models/auth.model.js';

export class GetProfileUseCase {
  constructor(private authRepository: AuthRepositoryPort) {}

  execute(): Observable<ProfileResponse> {
    return this.authRepository.getProfile();
  }
}
