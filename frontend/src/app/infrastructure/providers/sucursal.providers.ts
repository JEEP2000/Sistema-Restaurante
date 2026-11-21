import { InjectionToken, Provider } from '@angular/core';
import { SucursalRepositoryPort } from '../../application/ports/out/sucursal.repository.port.js';
import { HttpSucursalRepositoryAdapter } from '../adapters/out/http-sucursal.repository.adapter.js';
import { GetSucursalesUseCase } from '../../application/ports/in/get-sucursales.use-case.js';
import { CreateSucursalUseCase } from '../../application/ports/in/create-sucursal.use-case.js';
import { UpdateSucursalUseCase } from '../../application/ports/in/update-sucursal.use-case.js';
import { DeleteSucursalUseCase } from '../../application/ports/in/delete-sucursal.use-case.js';

export const SUCURSAL_REPOSITORY_TOKEN = new InjectionToken<SucursalRepositoryPort>('SucursalRepositoryPort');

export const sucursalProviders: Provider[] = [
  {
    provide: SUCURSAL_REPOSITORY_TOKEN,
    useClass: HttpSucursalRepositoryAdapter
  },
  {
    provide: GetSucursalesUseCase,
    useFactory: (repo: SucursalRepositoryPort) => new GetSucursalesUseCase(repo),
    deps: [SUCURSAL_REPOSITORY_TOKEN]
  },
  {
    provide: CreateSucursalUseCase,
    useFactory: (repo: SucursalRepositoryPort) => new CreateSucursalUseCase(repo),
    deps: [SUCURSAL_REPOSITORY_TOKEN]
  },
  {
    provide: UpdateSucursalUseCase,
    useFactory: (repo: SucursalRepositoryPort) => new UpdateSucursalUseCase(repo),
    deps: [SUCURSAL_REPOSITORY_TOKEN]
  },
  {
    provide: DeleteSucursalUseCase,
    useFactory: (repo: SucursalRepositoryPort) => new DeleteSucursalUseCase(repo),
    deps: [SUCURSAL_REPOSITORY_TOKEN]
  }
];
