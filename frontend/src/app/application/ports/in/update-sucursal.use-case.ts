import { Observable } from 'rxjs';
import { SucursalRepositoryPort } from '../out/sucursal.repository.port.js';
import { Sucursal } from '../../../domain/models/sucursal.model.js';

export class UpdateSucursalUseCase {
  constructor(private sucursalRepository: SucursalRepositoryPort) {}

  execute(id: number, data: Partial<Sucursal>): Observable<any> {
    return this.sucursalRepository.update(id, data);
  }
}
