import { InjectionToken, Provider } from '@angular/core';
import { MesaRepositoryPort } from '../../application/ports/out/mesa.repository.port.js';
import { KitchenRepositoryPort } from '../../application/ports/out/kitchen.repository.port.js';
import { DashboardStatsRepositoryPort } from '../../application/ports/out/dashboard-stats.repository.port.js';
import { ProductoRepositoryPort } from '../../application/ports/out/producto.repository.port.js';
import { PedidoRepositoryPort } from '../../application/ports/out/pedido.repository.port.js';

import { HttpMesaRepositoryAdapter } from '../adapters/out/http-mesa.repository.adapter.js';
import { HttpKitchenRepositoryAdapter } from '../adapters/out/http-kitchen.repository.adapter.js';
import { HttpDashboardStatsRepositoryAdapter } from '../adapters/out/http-dashboard-stats.repository.adapter.js';
import { HttpProductoRepositoryAdapter } from '../adapters/out/http-producto.repository.adapter.js';
import { HttpPedidoRepositoryAdapter } from '../adapters/out/http-pedido.repository.adapter.js';

import { GetMesasUseCase } from '../../application/ports/in/get-mesas.use-case.js';
import { CrearMesaUseCase } from '../../application/ports/in/crear-mesa.use-case.js';
import { GetActiveTicketsUseCase } from '../../application/ports/in/get-active-tickets.use-case.js';
import { IniciarCocinaUseCase } from '../../application/ports/in/iniciar-cocina.use-case.js';
import { MarkTicketReadyUseCase } from '../../application/ports/in/mark-ticket-ready.use-case.js';
import { ToggleItemReadyUseCase } from '../../application/ports/in/toggle-item-ready.use-case.js';
import { GetDashboardStatsUseCase } from '../../application/ports/in/get-dashboard-stats.use-case.js';
import { GetCategoriasUseCase } from '../../application/ports/in/get-categorias.use-case.js';
import { GetProductosUseCase } from '../../application/ports/in/get-productos.use-case.js';
import { CrearPedidoUseCase } from '../../application/ports/in/crear-pedido.use-case.js';
import { GetPedidoMesaUseCase } from '../../application/ports/in/get-pedido-mesa.use-case.js';
import { MarcarBebidaEntregadaUseCase } from '../../application/ports/in/marcar-bebida-entregada.use-case.js';
import { SolicitarCuentaUseCase } from '../../application/ports/in/solicitar-cuenta.use-case.js';
import { AgregarItemsPedidoUseCase } from '../../application/ports/in/agregar-items-pedido.use-case.js';
import { GetPendientesPagoUseCase } from '../../application/ports/in/get-pendientes-pago.use-case.js';
import { ProcesarPagoUseCase } from '../../application/ports/in/procesar-pago.use-case.js';
import { CancelarPedidoUseCase } from '../../application/ports/in/cancelar-pedido.use-case.js';
import { MarcarTodoServidoUseCase } from '../../application/ports/in/marcar-todo-servido.use-case.js';
import { GetHistorialVentasUseCase } from '../../application/ports/in/get-historial-ventas.use-case.js';
import { GetEstadisticasAvanzadasUseCase } from '../../application/ports/in/get-estadisticas-avanzadas.use-case.js';

export const MESA_REPOSITORY_TOKEN = new InjectionToken<MesaRepositoryPort>('MesaRepositoryPort');
export const KITCHEN_REPOSITORY_TOKEN = new InjectionToken<KitchenRepositoryPort>('KitchenRepositoryPort');
export const DASHBOARD_STATS_REPOSITORY_TOKEN = new InjectionToken<DashboardStatsRepositoryPort>('DashboardStatsRepositoryPort');
export const PRODUCTO_REPOSITORY_TOKEN = new InjectionToken<ProductoRepositoryPort>('ProductoRepositoryPort');
export const PEDIDO_REPOSITORY_TOKEN = new InjectionToken<PedidoRepositoryPort>('PedidoRepositoryPort');

export const restaurantProviders: Provider[] = [
  {
    provide: MESA_REPOSITORY_TOKEN,
    useClass: HttpMesaRepositoryAdapter
  },
  {
    provide: KITCHEN_REPOSITORY_TOKEN,
    useClass: HttpKitchenRepositoryAdapter
  },
  {
    provide: DASHBOARD_STATS_REPOSITORY_TOKEN,
    useClass: HttpDashboardStatsRepositoryAdapter
  },
  {
    provide: PRODUCTO_REPOSITORY_TOKEN,
    useClass: HttpProductoRepositoryAdapter
  },
  {
    provide: PEDIDO_REPOSITORY_TOKEN,
    useClass: HttpPedidoRepositoryAdapter
  },
  {
    provide: GetMesasUseCase,
    useFactory: (mesaRepo: MesaRepositoryPort) => new GetMesasUseCase(mesaRepo),
    deps: [MESA_REPOSITORY_TOKEN]
  },
  {
    provide: CrearMesaUseCase,
    useFactory: (mesaRepo: MesaRepositoryPort) => new CrearMesaUseCase(mesaRepo),
    deps: [MESA_REPOSITORY_TOKEN]
  },
  {
    provide: GetActiveTicketsUseCase,
    useFactory: (kitchenRepo: KitchenRepositoryPort) => new GetActiveTicketsUseCase(kitchenRepo),
    deps: [KITCHEN_REPOSITORY_TOKEN]
  },
  {
    provide: IniciarCocinaUseCase,
    useFactory: (kitchenRepo: KitchenRepositoryPort) => new IniciarCocinaUseCase(kitchenRepo),
    deps: [KITCHEN_REPOSITORY_TOKEN]
  },
  {
    provide: MarkTicketReadyUseCase,
    useFactory: (kitchenRepo: KitchenRepositoryPort) => new MarkTicketReadyUseCase(kitchenRepo),
    deps: [KITCHEN_REPOSITORY_TOKEN]
  },
  {
    provide: ToggleItemReadyUseCase,
    useFactory: (kitchenRepo: KitchenRepositoryPort) => new ToggleItemReadyUseCase(kitchenRepo),
    deps: [KITCHEN_REPOSITORY_TOKEN]
  },
  {
    provide: GetDashboardStatsUseCase,
    useFactory: (statsRepo: DashboardStatsRepositoryPort) => new GetDashboardStatsUseCase(statsRepo),
    deps: [DASHBOARD_STATS_REPOSITORY_TOKEN]
  },
  {
    provide: GetCategoriasUseCase,
    useFactory: (productoRepo: ProductoRepositoryPort) => new GetCategoriasUseCase(productoRepo),
    deps: [PRODUCTO_REPOSITORY_TOKEN]
  },
  {
    provide: GetProductosUseCase,
    useFactory: (productoRepo: ProductoRepositoryPort) => new GetProductosUseCase(productoRepo),
    deps: [PRODUCTO_REPOSITORY_TOKEN]
  },
  {
    provide: CrearPedidoUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new CrearPedidoUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: GetPedidoMesaUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new GetPedidoMesaUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: MarcarBebidaEntregadaUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new MarcarBebidaEntregadaUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: SolicitarCuentaUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new SolicitarCuentaUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: AgregarItemsPedidoUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new AgregarItemsPedidoUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: GetPendientesPagoUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new GetPendientesPagoUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: ProcesarPagoUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new ProcesarPagoUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: CancelarPedidoUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new CancelarPedidoUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: MarcarTodoServidoUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new MarcarTodoServidoUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: GetHistorialVentasUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new GetHistorialVentasUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  },
  {
    provide: GetEstadisticasAvanzadasUseCase,
    useFactory: (pedidoRepo: PedidoRepositoryPort) => new GetEstadisticasAvanzadasUseCase(pedidoRepo),
    deps: [PEDIDO_REPOSITORY_TOKEN]
  }
];

