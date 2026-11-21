import { Observable } from 'rxjs';
import { SucursalRepositoryPort } from '../out/sucursal.repository.port.js';
import { Sucursal } from '../../../domain/models/sucursal.model.js';

export class CreateSucursalUseCase {
  constructor(private sucursalRepository: SucursalRepositoryPort) {}

  execute(sucursal: Omit<Sucursal, 'id'>): Observable<any> {
    return this.sucursalRepository.create(sucursal);
  }
}
