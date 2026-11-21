import { Observable } from 'rxjs';
import { SucursalRepositoryPort } from '../out/sucursal.repository.port.js';
import { Sucursal } from '../../../domain/models/sucursal.model.js';

export class GetSucursalesUseCase {
  constructor(private sucursalRepository: SucursalRepositoryPort) {}

  execute(): Observable<Sucursal[]> {
    return this.sucursalRepository.getAll();
  }
}
