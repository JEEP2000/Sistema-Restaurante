import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Puertos de Entrada (Casos de Uso de Aplicación en Arquitectura Hexagonal)
import { GetProfileUseCase } from '../../../application/ports/in/get-profile.use-case.js';
import { LogoutUseCase } from '../../../application/ports/in/logout.use-case.js';
import { GetMesasUseCase } from '../../../application/ports/in/get-mesas.use-case.js';
import { GetSucursalesUseCase } from '../../../application/ports/in/get-sucursales.use-case.js';
import { GetDashboardStatsUseCase } from '../../../application/ports/in/get-dashboard-stats.use-case.js';
import { GetPendientesPagoUseCase } from '../../../application/ports/in/get-pendientes-pago.use-case.js';
import { GetActiveTicketsUseCase } from '../../../application/ports/in/get-active-tickets.use-case.js';
import { TOKEN_STORAGE_TOKEN } from '../../../infrastructure/providers/auth.providers.js';

// Modelos del Dominio
import { Mesa } from '../../../domain/models/mesa.model.js';
import { Sucursal } from '../../../domain/models/sucursal.model.js';
import { DashboardStats } from '../../../domain/models/dashboard-stats.model.js';
import { Pedido, VentaHistorialItem } from '../../../domain/models/pedido.model.js';

// Modales Modulares en Español (Adaptadores de Entrada Hexagonales)
import { CrearMesaModalComponent } from '../../componentes/modales/crear-mesa-modal/crear-mesa-modal.component.js';
import { TomarPedidoModalComponent } from '../../componentes/modales/tomar-pedido-modal/tomar-pedido-modal.component.js';
import { PedidoActivoModalComponent } from '../../componentes/modales/pedido-activo-modal/pedido-activo-modal.component.js';
import { CobroPagoModalComponent } from '../../componentes/modales/cobro-pago-modal/cobro-pago-modal.component.js';
import { AnularPedidoModalComponent } from '../../componentes/modales/anular-pedido-modal/anular-pedido-modal.component.js';
import { TicketTermicoModalComponent } from '../../componentes/modales/ticket-termico-modal/ticket-termico-modal.component.js';
import { DetallePedidoModalComponent } from '../../componentes/modales/detalle-pedido-modal/detalle-pedido-modal.component.js';

// Vistas Modulares en Español (Adaptadores de Entrada Hexagonales)
import { AnaliticaResumenComponent } from '../../componentes/vistas/analitica-resumen/analitica-resumen.component.js';
import { MapaMesasComponent } from '../../componentes/vistas/mapa-mesas/mapa-mesas.component.js';
import { CocinaKdsComponent } from '../../componentes/vistas/cocina-kds/cocina-kds.component.js';
import { CajaCobrosComponent } from '../../componentes/vistas/caja-cobros/caja-cobros.component.js';
import { HistorialVentasComponent } from '../../componentes/vistas/historial-ventas/historial-ventas.component.js';
import { GestionPersonalComponent } from '../../componentes/vistas/gestion-personal/gestion-personal.component.js';
import { GestionSucursalesComponent } from '../../componentes/vistas/gestion-sucursales/gestion-sucursales.component.js';
import { GestionMenuComponent } from '../../componentes/vistas/gestion-menu/gestion-menu.component.js';

/**
 * ==============================================================================
 * COMPONENTE DASHBOARD (SHELL Y LAYOUT PRINCIPAL)
 * Arquitectura Hexagonal - Adaptador Primario / Conductor (Driving Adapter).
 * Coordina la autenticación, navegación entre vistas, sincronización en vivo
 * y apertura de modales de negocio.
 * ==============================================================================
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // Modales modulares en español
    CrearMesaModalComponent,
    TomarPedidoModalComponent,
    PedidoActivoModalComponent,
    CobroPagoModalComponent,
    AnularPedidoModalComponent,
    TicketTermicoModalComponent,
    DetallePedidoModalComponent,
    // Vistas modulares en español
    AnaliticaResumenComponent,
    MapaMesasComponent,
    CocinaKdsComponent,
    CajaCobrosComponent,
    HistorialVentasComponent,
    GestionPersonalComponent,
    GestionSucursalesComponent,
    GestionMenuComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Inyecciones de Dependencia (Casos de Uso e Infraestructura)
  private getProfileUseCase = inject(GetProfileUseCase);
  private logoutUseCase = inject(LogoutUseCase);
  private getMesasUseCase = inject(GetMesasUseCase);
  private getSucursalesUseCase = inject(GetSucursalesUseCase);
  private getDashboardStatsUseCase = inject(GetDashboardStatsUseCase);
  private getPendientesPagoUseCase = inject(GetPendientesPagoUseCase);
  private getActiveTicketsUseCase = inject(GetActiveTicketsUseCase);
  private tokenStorage = inject(TOKEN_STORAGE_TOKEN);
  private router = inject(Router);

  // Perfil del Usuario y Estado de Navegación
  perfil: any = null;
  vistaActual: string = 'tables';
  menuMovilAbierto: boolean = false;
  sucursalSeleccionadaId: number = 1;
  listaSucursales: Sucursal[] = [];


  // Datos Globales del Salón y Contadores de Barra Lateral
  mesas: Mesa[] = [];
  cantidadPendientesPago: number = 0;
  cantidadPlatosPendientesCocina: number = 0;
  estadisticas: DashboardStats = {
    totalMesas: 0,
    mesasOcupadas: 0,
    mesasAtendidasHoy: 0,
    comandasActivas: 0,
    comandasTotalesHoy: 0,
    ventasHoy: 0
  };

  // Visibilidad y Datos de los Modales
  mostrarModalCrearMesa: boolean = false;
  mostrarModalTomarPedido: boolean = false;
  mostrarModalPedidoActivo: boolean = false;
  mostrarModalCobro: boolean = false;
  mostrarModalAnularPedido: boolean = false;
  mostrarModalPreTicket: boolean = false;

  mesaSeleccionada: Mesa | null = null;
  pedidoParaCobro: Pedido | null = null;
  pedidoParaAnular: Pedido | null = null;
  pedidoParaTicket: Pedido | null = null;
  ventaDetalleSeleccionada: VentaHistorialItem | null = null;

  private temporizadorPolling: any = null;

  ngOnInit(): void {
    this.cargarPerfil();
  }

  ngOnDestroy(): void {
    if (this.temporizadorPolling) {
      clearInterval(this.temporizadorPolling);
    }
  }

  /**
   * Carga el perfil del usuario autenticado y ajusta la vista inicial según su rol.
   */
  cargarPerfil(): void {
    this.getProfileUseCase.execute().subscribe({
      next: (response) => {
        if (response.success && response.user) {
          this.perfil = response.user;
          this.sucursalSeleccionadaId = this.perfil.sucursalId || 1;

          // Definir vista por defecto según rol
          if (this.puedeVerResumen()) {
            this.vistaActual = 'general';
          } else if (this.perfil.rolNombre === 'Cocinero') {
            this.vistaActual = 'kitchen';
          } else if (this.perfil.rolNombre === 'Cajero') {
            this.vistaActual = 'caja';
          } else {
            this.vistaActual = 'tables';
          }

          this.cargarSucursales();
          this.cargarDatosGlobales();

          // Polling suave cada 15 segundos para sincronizar contadores globales de la barra lateral
          this.temporizadorPolling = setInterval(() => {
            this.refrescarInsigniasGlobales();
          }, 15000);
        } else {
          this.cerrarSesion();
        }
      },
      error: () => {
        this.cerrarSesion();
      }
    });
  }

  cargarSucursales(): void {
    this.getSucursalesUseCase.execute().subscribe({
      next: (data) => {
        this.listaSucursales = data;
      },
      error: (err) => console.error('Error al cargar sucursales:', err)
    });
  }

  alCambiarSucursal(nuevoId: any): void {
    this.sucursalSeleccionadaId = Number(nuevoId);
    this.cargarDatosGlobales();
  }

  /**
   * Carga los datos globales requeridos por la vista y las insignias
   */
  cargarDatosGlobales(): void {
    const sucursalTarget = this.sucursalSeleccionadaId || undefined;

    // Mesas del salón
    this.getMesasUseCase.execute(sucursalTarget).subscribe({
      next: (mesasList) => {
        this.mesas = mesasList.map((mesa) => ({
          ...mesa,
          total: mesa.total ? '$' + Number(mesa.total).toFixed(2) : null
        }));
      },
      error: (err) => console.error('Error al cargar mesas:', err)
    });

    // Estadísticas
    if (this.puedeVerResumen()) {
      this.getDashboardStatsUseCase.execute(sucursalTarget).subscribe({
        next: (data) => (this.estadisticas = data),
        error: (err) => console.error('Error al cargar stats:', err)
      });
    }

    this.refrescarInsigniasGlobales();
  }

  refrescarInsigniasGlobales(): void {
    const sucursalTarget = this.sucursalSeleccionadaId || undefined;

    // Contador de Caja
    if (this.puedeVerCaja()) {
      this.getPendientesPagoUseCase.execute(sucursalTarget).subscribe({
        next: (orders) => (this.cantidadPendientesPago = orders.length),
        error: (err) => console.error('Error al refrescar pagos pendientes:', err)
      });
    }

    // Contador de Cocina
    if (this.puedeVerCocina()) {
      this.getActiveTicketsUseCase.execute().subscribe({
        next: (tickets) => {
          this.cantidadPlatosPendientesCocina = tickets.reduce((sum, t) => {
            const pendingInTicket = t.items.reduce((s, it) => {
              const ready = it.cantidadLista ?? (it.checkCocina ? it.cantidad : 0);
              return s + Math.max(0, it.cantidad - ready);
            }, 0);
            return sum + pendingInTicket;
          }, 0);
        },
        error: (err) => console.error('Error al refrescar cocina:', err)
      });
    }
  }

  // --- Navegación y Permisos de Vistas ---
  establecerVista(vista: string): void {
    if (vista === 'general' && !this.puedeVerResumen()) return;
    if (vista === 'personal' && !this.puedeGestionarPersonal()) return;
    if (vista === 'sucursales' && !this.puedeGestionarSucursales()) return;
    if (vista === 'menu' && !this.puedeGestionarMenu()) return;
    if (vista === 'kitchen' && !this.puedeVerCocina()) return;
    if (vista === 'caja' && !this.puedeVerCaja()) return;
    if (vista === 'ventas' && !this.puedeVerVentas()) return;

    this.vistaActual = vista;
    this.cerrarMenuMovil();
    this.cargarDatosGlobales();
  }

  toggleMenuMovil(): void {
    this.menuMovilAbierto = !this.menuMovilAbierto;
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto = false;
  }


  puedeVerResumen(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  puedeGestionarMenu(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  puedeGestionarPersonal(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  puedeGestionarSucursales(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  puedeVerCocina(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'cocinero' || 
           rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'superadmin';
  }

  puedeVerCaja(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'cajero' || 
           rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'superadmin';
  }

  puedeVerVentas(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'mesero' || 
           rol === 'cocinero' || 
           rol === 'cajero' || 
           rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  puedeVerKpisFinancieros(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'administrador' || 
           rol === 'administrador general' || 
           rol === 'admin general' || 
           rol === 'dueño' || 
           rol === 'due\u00f1o' || 
           rol === 'superadmin';
  }

  obtenerClaseRol(rolNombre?: string): string {
    if (!rolNombre) return 'empleado';
    const lower = rolNombre.toLowerCase();
    if (lower.includes('dueño') || lower.includes('dueñ') || lower.includes('dueno') || lower.includes('superadmin')) {
      return 'dueño';
    }
    return lower;
  }

  obtenerNombreSucursal(id?: number | null): string {
    if (!id) return 'Todas las Sedes';
    if (this.perfil && this.perfil.sucursalId === id && this.perfil.sucursalNombre) {
      return this.perfil.sucursalNombre;
    }
    const encontrada = this.listaSucursales.find((s) => s.id === id);
    if (encontrada && encontrada.nombre) return encontrada.nombre;
    if (this.perfil?.sucursalNombre && (!id || this.perfil.sucursalId === id)) {
      return this.perfil.sucursalNombre;
    }
    return `Sucursal #${id}`;
  }

  obtenerSucursalActiva(id?: number | null): Sucursal | undefined {
    const targetId = id || this.sucursalSeleccionadaId || this.perfil?.sucursalId;
    return this.listaSucursales.find((s) => s.id === targetId);
  }


  // --- Orquestación y Apertura de Modales ---
  alSeleccionarMesa(mesa: Mesa): void {
    this.mesaSeleccionada = mesa;
    const estado = (mesa.estado || '').toLowerCase();
    if (estado === 'libre') {
      const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
      const puedeModificar = rol === 'mesero' || rol === 'administrador' || rol === 'administrador general' || rol === 'dueño' || rol === 'superadmin';
      if (puedeModificar) {
        this.mostrarModalTomarPedido = true;
      }
    } else {
      this.mostrarModalPedidoActivo = true;
    }
  }

  abrirModalCrearMesa(): void {
    this.mostrarModalCrearMesa = true;
  }

  abrirModalCobro(pedido: Pedido): void {
    this.pedidoParaCobro = pedido;
    this.mostrarModalCobro = true;
  }

  abrirModalPreTicket(pedido: Pedido): void {
    this.pedidoParaTicket = pedido;
    this.mostrarModalPreTicket = true;
  }

  abrirModalAnularPedido(pedido: Pedido): void {
    this.pedidoParaAnular = pedido;
    this.mostrarModalAnularPedido = true;
  }

  alVerDetalleVenta(venta: VentaHistorialItem): void {
    this.ventaDetalleSeleccionada = venta;
  }

  alCrearMesa(mesa: Mesa): void {
    this.cargarDatosGlobales();
  }

  alCrearPedido(): void {
    this.mostrarModalTomarPedido = false;
    this.cargarDatosGlobales();
  }

  alActualizarPedido(): void {
    this.cargarDatosGlobales();
  }

  alProcesarPago(): void {
    this.mostrarModalCobro = false;
    this.cargarDatosGlobales();
  }

  alAnularPedido(): void {
    this.mostrarModalAnularPedido = false;
    this.mostrarModalPedidoActivo = false;
    this.mostrarModalCobro = false;
    this.cargarDatosGlobales();
  }

  cerrarSesion(): void {
    if (this.temporizadorPolling) {
      clearInterval(this.temporizadorPolling);
      this.temporizadorPolling = null;
    }
    this.logoutUseCase.execute().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        this.tokenStorage.removeToken();
        this.router.navigate(['/login']);
      }
    });
  }
}
