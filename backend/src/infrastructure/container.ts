import { SqlServerUserRepositoryAdapter } from './adapters/out/db/sql-user-repository.adapter.js';
import { SqlServerMesaRepositoryAdapter } from './adapters/out/db/sql-mesa-repository.adapter.js';
import { SqlServerPedidoRepositoryAdapter } from './adapters/out/db/sql-pedido-repository.adapter.js';
import { SqlServerSucursalRepositoryAdapter } from './adapters/out/db/sql-sucursal-repository.adapter.js';
import { SqlServerProductoRepositoryAdapter } from './adapters/out/db/sql-producto-repository.adapter.js';

import { AuthService } from '../application/services/auth.service.js';
import { MesaService } from '../application/services/mesa.service.js';
import { PedidoService } from '../application/services/pedido.service.js';
import { SucursalService } from '../application/services/sucursal.service.js';
import { ProductoService } from '../application/services/producto.service.js';

import { AuthController } from './adapters/in/http/controllers/auth.controller.js';
import { MesaController } from './adapters/in/http/controllers/mesa.controller.js';
import { PedidoController } from './adapters/in/http/controllers/pedido.controller.js';
import { SucursalController } from './adapters/in/http/controllers/sucursal.controller.js';
import { ProductoController } from './adapters/in/http/controllers/producto.controller.js';

// Instanciar Adaptadores Secundarios (Driven Adapters)
const userRepository = new SqlServerUserRepositoryAdapter();
const mesaRepository = new SqlServerMesaRepositoryAdapter();
const pedidoRepository = new SqlServerPedidoRepositoryAdapter();
const sucursalRepository = new SqlServerSucursalRepositoryAdapter();
const productoRepository = new SqlServerProductoRepositoryAdapter();

// Instanciar Servicios (Inyección de Puertos de Salida)
export const authService = new AuthService(userRepository);
export const mesaService = new MesaService(mesaRepository);
export const pedidoService = new PedidoService(pedidoRepository);
export const sucursalService = new SucursalService(sucursalRepository);
export const productoService = new ProductoService(productoRepository);

// Instanciar Adaptadores Primarios (Driving Adapters, Inyección de Puertos de Entrada)
export const authController = new AuthController(authService);
export const mesaController = new MesaController(mesaService);
export const pedidoController = new PedidoController(pedidoService);
export const sucursalController = new SucursalController(sucursalService);
export const productoController = new ProductoController(productoService);
