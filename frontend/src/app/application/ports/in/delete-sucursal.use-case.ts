import { Observable } from 'rxjs';
import { SucursalRepositoryPort } from '../out/sucursal.repository.port.js';

export class DeleteSucursalUseCase {
  constructor(private sucursalRepository: SucursalRepositoryPort) {}

  execute(id: number): Observable<any> {
    return this.sucursalRepository.delete(id);
  }
}
