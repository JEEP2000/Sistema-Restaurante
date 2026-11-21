import { Observable } from 'rxjs';
import { ProductoRepositoryPort } from '../out/producto.repository.port.js';
import { Producto } from '../../../domain/models/producto.model.js';

export class GetProductosUseCase {
  constructor(private productoRepo: ProductoRepositoryPort) {}

  execute(sucursalId?: number, categoriaId?: number): Observable<Producto[]> {
    return this.productoRepo.getProductos(sucursalId, categoriaId);
  }
}
