import { Observable } from 'rxjs';
import { ProductoRepositoryPort } from '../out/producto.repository.port.js';
import { Categoria } from '../../../domain/models/producto.model.js';

export class GetCategoriasUseCase {
  constructor(private productoRepo: ProductoRepositoryPort) {}

  execute(sucursalId?: number): Observable<Categoria[]> {
    return this.productoRepo.getCategorias(sucursalId);
  }
}
