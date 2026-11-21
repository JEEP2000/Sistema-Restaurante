import { Component, Input, OnInit, OnDestroy, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetActiveTicketsUseCase } from '../../../../application/ports/in/get-active-tickets.use-case.js';
import { IniciarCocinaUseCase } from '../../../../application/ports/in/iniciar-cocina.use-case.js';
import { MarkTicketReadyUseCase } from '../../../../application/ports/in/mark-ticket-ready.use-case.js';
import { ToggleItemReadyUseCase } from '../../../../application/ports/in/toggle-item-ready.use-case.js';
import { GetStaffUseCase } from '../../../../application/ports/in/get-staff.use-case.js';
import { KitchenTicket, KitchenItem } from '../../../../domain/models/kitchen.model.js';
import { Sucursal } from '../../../../domain/models/sucursal.model.js';
import { User } from '../../../../domain/models/user.model.js';

/**
 * ==============================================================================
 * VISTA: PANTALLA DE COCINA (KDS - KITCHEN DISPLAY SYSTEM)
 * Pantalla única directa de cocina:
 * - Sin pantallas de bienvenida ni paneles de bloqueo.
 * - En cada comanda: selector con SOLO usuarios de rol 'Cocinero' + botón 'Iniciar'.
 * - El tiempo corre únicamente a partir del clic en 'Iniciar'.
 * - Botón 'Listo' para marcar el plato terminado y avisar al mesero.
 * ==============================================================================
 */
@Component({
  selector: 'app-cocina-kds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cocina-kds.component.html'
})
export class CocinaKdsComponent implements OnInit, OnDestroy, OnChanges {
  // Casos de Uso (Input Ports)
  private getActiveTicketsUseCase = inject(GetActiveTicketsUseCase);
  private iniciarCocinaUseCase = inject(IniciarCocinaUseCase);
  private markTicketReadyUseCase = inject(MarkTicketReadyUseCase);
  private toggleItemReadyUseCase = inject(ToggleItemReadyUseCase);
  private getStaffUseCase = inject(GetStaffUseCase);

  /** Identificador de la sucursal activa */
  @Input() sucursalId: number = 1;
  /** Perfil del usuario autenticado */
  @Input() perfil: any = null;
  /** Listado de sucursales registradas */
  @Input() listaSucursales: Sucursal[] = [];

  // Estado reactivo de las comandas
  ticketsCocina: KitchenTicket[] = [];
  filtroCocina: 'all' | 'unstarted' | 'pending' | 'ready' = 'all';
  busquedaCocina: string = '';
  ordenCocina: 'fifo' | 'lifo' = 'fifo';
  sonidoHabilitado: boolean = true;
  estaActualizando: boolean = false;
  horaActualString: string = '';
  contadorTicketsPrevio: number = 0;

  // Personal con rol Cocinero
  listaCocineros: User[] = [];
  cocineroSeleccionadoNombre: string = '';
  cargandoCocineros: boolean = false;

  private relojTimer: any = null;
  private pollingCocinaTimer: any = null;
  private peticionEnCurso: boolean = false;

  ngOnInit(): void {
    this.iniciarReloj();
    this.cargarListaCocineros();
    this.cargarTicketsCocina(false);

    // Polling en tiempo real suave cada 6 segundos
    this.pollingCocinaTimer = setInterval(() => {
      this.cargarTicketsCocina(true);
    }, 6000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sucursalId'] && !changes['sucursalId'].firstChange) {
      this.cargarListaCocineros();
      this.cargarTicketsCocina(false);
    }
  }

  ngOnDestroy(): void {
    if (this.relojTimer) clearInterval(this.relojTimer);
    if (this.pollingCocinaTimer) clearInterval(this.pollingCocinaTimer);
  }

  iniciarReloj(): void {
    const actualizar = () => {
      const ahora = new Date();
      this.horaActualString = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    actualizar();
    this.relojTimer = setInterval(actualizar, 1000);
  }

  /**
   * Carga únicamente los usuarios con rol 'Cocinero'
   */
  cargarListaCocineros(): void {
    this.cargandoCocineros = true;
    this.getStaffUseCase.execute(this.sucursalId || undefined).subscribe({
      next: (usuarios) => {
        // Filtrar estrictamente usuarios con rol 'Cocinero' (o rolId = 4)
        const soloCocineros = usuarios.filter(u =>
          u.activo !== false &&
          (u.rolNombre?.trim().toLowerCase() === 'cocinero' || u.rolId === 4)
        );

        // Si no hubiera usuarios con rol Cocinero registrados, usar como fallback activos
        this.listaCocineros = soloCocineros.length > 0 ? soloCocineros : usuarios.filter(u => u.activo !== false);

        // Preseleccionar el primer cocinero por defecto
        if (this.listaCocineros.length > 0) {
          if (!this.cocineroSeleccionadoNombre || !this.listaCocineros.some(c => c.nombre === this.cocineroSeleccionadoNombre)) {
            this.cocineroSeleccionadoNombre = this.listaCocineros[0].nombre;
          }
        }

        // Asignar el cocinero predeterminado a las comandas por iniciar
        this.ticketsCocina.forEach(t => {
          if (!t.fechaInicioCocina && (!t.cocineroSeleccionadoNombre || !this.listaCocineros.some(c => c.nombre === t.cocineroSeleccionadoNombre))) {
            t.cocineroSeleccionadoNombre = this.cocineroSeleccionadoNombre || (this.listaCocineros[0]?.nombre || '');
          }
        });

        this.cargandoCocineros = false;
      },
      error: (err) => {
        console.error('Error al cargar lista de cocineros:', err);
        this.cargandoCocineros = false;
      }
    });
  }

  reproducirAlertaSonora(): void {
    if (!this.sonidoHabilitado) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(293.66, ctx.currentTime);
      osc2.frequency.setValueAtTime(440, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio chime no pudo reproducirse:', e);
    }
  }

  /**
   * Carga comandas de cocina activas y calcula tiempo transcurrido desde la fecha de inicio
   */
  cargarTicketsCocina(silencioso: boolean = false): void {
    if (this.peticionEnCurso && silencioso) return;
    this.peticionEnCurso = true;
    if (!silencioso) this.estaActualizando = true;

    this.getActiveTicketsUseCase.execute().subscribe({
      next: (tickets) => {
        this.peticionEnCurso = false;
        if (this.contadorTicketsPrevio > 0 && tickets.length > this.contadorTicketsPrevio) {
          this.reproducirAlertaSonora();
        }
        this.contadorTicketsPrevio = tickets.length;

        // Preservar cocinero seleccionado previamente en la UI por pedido
        const mapaCocineros = new Map<number, string>();
        this.ticketsCocina.forEach(t => {
          if (t.cocineroSeleccionadoNombre) {
            mapaCocineros.set(t.pedidoId, t.cocineroSeleccionadoNombre);
          }
        });

        tickets.forEach(ticket => {
          // El tiempo viene calculado exactamente desde SQL Server (DATEDIFF en el mismo huso horario)
          if (!ticket.fechaInicioCocina) {
            ticket.tiempo = 0;
            ticket._iniciadoAtMs = null;
          } else {
            const existente = this.ticketsCocina.find(t => t.pedidoId === ticket.pedidoId);
            if (existente) {
              if (existente._iniciadoAtMs) {
                ticket._iniciadoAtMs = existente._iniciadoAtMs;
              }
              // Si todos los platos ya estaban listos localmente, preservar el tiempo congelado
              if (existente.platosListos === existente.totalPlatos && ticket.platosListos === ticket.totalPlatos) {
                ticket.tiempo = existente.tiempo;
              }
            } else {
              ticket._iniciadoAtMs = Date.now() - (ticket.tiempo * 60000);
            }
          }

          ticket.cocineroSeleccionadoNombre =
            mapaCocineros.get(ticket.pedidoId) ||
            ticket.cocineroNombre ||
            this.cocineroSeleccionadoNombre ||
            (this.listaCocineros[0]?.nombre || '');
        });

        this.ticketsCocina = tickets;
        this.estaActualizando = false;
      },
      error: (err) => {
        this.peticionEnCurso = false;
        console.error('Error al cargar comandas de cocina:', err);
        this.estaActualizando = false;
      }
    });
  }

  /** Recalcula minutos transcurridos en vivo para las comandas en preparación */
  recalcularTiemposActivos(): void {
    // Sincronizar con el servidor cada intervalo
    this.cargarTicketsCocina(true);
  }

  /**
   * Acción del botón "Iniciar":
   * Guarda el cocinero seleccionado, registra la fecha de inicio en BD y arranca el contador.
   */
  empezarPreparacion(ticket: KitchenTicket): void {
    const nombre = ticket.cocineroSeleccionadoNombre || this.cocineroSeleccionadoNombre || (this.listaCocineros[0]?.nombre || 'Cocinero');
    const cocineroObj = this.listaCocineros.find(u => u.nombre === nombre);
    const cocineroId = cocineroObj?.id;

    ticket.cocineroNombre = nombre;
    ticket.fechaInicioCocina = new Date().toISOString();
    ticket.tiempo = 0;
    ticket._iniciadoAtMs = Date.now();

    this.iniciarCocinaUseCase.execute(ticket.pedidoId, cocineroId, nombre).subscribe({
      next: () => {
        this.cargarTicketsCocina(true);
      },
      error: (err) => {
        console.error('Error al iniciar preparación en cocina:', err);
      }
    });
  }

  /**
   * Acción del botón "Listo":
   * Marca toda la comanda como lista para que el mesero la recoja y la sirva.
   */
  marcarTicketCompletoListo(ticket: KitchenTicket): void {
    if (!ticket.fechaInicioCocina) {
      return;
    }

    const nombreCocinero = ticket.cocineroNombre || ticket.cocineroSeleccionadoNombre || this.cocineroSeleccionadoNombre || 'Cocinero';
    const cocineroId = this.listaCocineros.find(u => u.nombre === nombreCocinero)?.id;

    this.markTicketReadyUseCase.execute(ticket.pedidoId, cocineroId).subscribe({
      next: () => {
        ticket.items.forEach((it) => {
          it.checkCocina = true;
          it.cantidadLista = it.cantidad;
          it.cocineroNombre = it.cocineroNombre || nombreCocinero;
          it.fechaCheckCocina = it.fechaCheckCocina || new Date().toISOString();
          if (it.segundosDemorados === undefined || it.segundosDemorados === null) {
            it.segundosDemorados = ticket._iniciadoAtMs ? Math.max(0, Math.floor((Date.now() - ticket._iniciadoAtMs) / 1000)) : (ticket.tiempo || 0) * 60;
          }
        });
        ticket.platosListos = ticket.totalPlatos;
        this.recalcularEstadoTicket(ticket);
        this.cargarTicketsCocina(true);
      },
      error: (err: any) => {
        console.error('Error al marcar ticket como listo:', err);
      }
    });
  }

  alternarPlatoCocina(ticket: KitchenTicket, item: KitchenItem): void {
    if (!ticket.fechaInicioCocina) {
      return; // Bloqueado: Primero debe presionar Iniciar
    }

    if (item.cantidad > 1) {
      const actual = item.cantidadLista ?? (item.checkCocina ? item.cantidad : 0);
      const destino = actual < item.cantidad ? actual + 1 : 0;
      this.avanzarPlatosCocina(ticket, item, destino - actual, destino);
    } else {
      const previoCheck = item.checkCocina;
      const previoLista = item.cantidadLista ?? 0;
      const destino = previoCheck ? 0 : 1;

      item.checkCocina = !previoCheck;
      item.cantidadLista = destino;
      if (item.checkCocina) {
        item.cocineroNombre = ticket.cocineroNombre || ticket.cocineroSeleccionadoNombre || this.cocineroSeleccionadoNombre || 'Cocinero';
        item.fechaCheckCocina = new Date().toISOString();
        if (ticket._iniciadoAtMs) {
          item.segundosDemorados = Math.max(0, Math.floor((Date.now() - ticket._iniciadoAtMs) / 1000));
        } else {
          item.segundosDemorados = Math.max(0, (ticket.tiempo || 0) * 60);
        }
      } else {
        item.cocineroNombre = null;
        item.fechaCheckCocina = null;
        item.segundosDemorados = null;
      }
      this.recalcularEstadoTicket(ticket);

      const cocineroId = this.listaCocineros.find(u => u.nombre === item.cocineroNombre)?.id;
      this.toggleItemReadyUseCase.execute(item.detalleId, destino, cocineroId).subscribe({
        next: (res: any) => {
          item.checkCocina = res.checkCocina;
          item.cantidadLista = res.cantidadLista;
          if (res.segundosDemorados !== undefined && res.segundosDemorados !== null) {
            item.segundosDemorados = res.segundosDemorados;
          }
          if (res.fechaCheckCocina) {
            item.fechaCheckCocina = res.fechaCheckCocina;
          }
          this.recalcularEstadoTicket(ticket);
        },
        error: (err: any) => {
          console.error('Error al cambiar estado del plato:', err);
          item.checkCocina = previoCheck;
          item.cantidadLista = previoLista;
          this.recalcularEstadoTicket(ticket);
        }
      });
    }
  }

  avanzarPlatosCocina(ticket: KitchenTicket, item: KitchenItem, delta: number, destinoExplicito?: number): void {
    if (!ticket.fechaInicioCocina) {
      return; // Bloqueado: Primero debe presionar Iniciar
    }

    const actual = item.cantidadLista ?? (item.checkCocina ? item.cantidad : 0);
    const destino = destinoExplicito !== undefined ? destinoExplicito : Math.max(0, Math.min(item.cantidad, actual + delta));
    if (destino === actual && destinoExplicito === undefined) return;

    const previoCheck = item.checkCocina;
    const previoLista = actual;

    item.cantidadLista = destino;
    item.checkCocina = destino >= item.cantidad;
    if (destino > 0) {
      item.cocineroNombre = ticket.cocineroNombre || ticket.cocineroSeleccionadoNombre || this.cocineroSeleccionadoNombre || 'Cocinero';
      item.fechaCheckCocina = item.fechaCheckCocina || new Date().toISOString();
      if (item.checkCocina && (item.segundosDemorados === undefined || item.segundosDemorados === null)) {
        if (ticket._iniciadoAtMs) {
          item.segundosDemorados = Math.max(0, Math.floor((Date.now() - ticket._iniciadoAtMs) / 1000));
        } else {
          item.segundosDemorados = Math.max(0, (ticket.tiempo || 0) * 60);
        }
      }
    } else {
      item.cocineroNombre = null;
      item.fechaCheckCocina = null;
      item.segundosDemorados = null;
    }
    this.recalcularEstadoTicket(ticket);

    const cocineroId = this.listaCocineros.find(u => u.nombre === item.cocineroNombre)?.id;
    this.toggleItemReadyUseCase.execute(item.detalleId, destino, cocineroId).subscribe({
      next: (res: any) => {
        item.checkCocina = res.checkCocina;
        item.cantidadLista = res.cantidadLista;
        if (res.segundosDemorados !== undefined && res.segundosDemorados !== null) {
          item.segundosDemorados = res.segundosDemorados;
        }
        if (res.fechaCheckCocina) {
          item.fechaCheckCocina = res.fechaCheckCocina;
        }
        this.recalcularEstadoTicket(ticket);
      },
      error: (err: any) => {
        console.error('Error al actualizar platos preparados:', err);
        item.checkCocina = previoCheck;
        item.cantidadLista = previoLista;
        this.recalcularEstadoTicket(ticket);
      }
    });
  }

  recalcularEstadoTicket(ticket: KitchenTicket): void {
    ticket.platosListos = ticket.items.reduce(
      (sum, it) => sum + (it.cantidadLista ?? (it.checkCocina ? it.cantidad : 0)),
      0
    );

    // Si todos los platos están listos, congelar el tiempo del ticket de inmediato
    if (ticket.totalPlatos > 0 && ticket.platosListos === ticket.totalPlatos) {
      if (ticket._iniciadoAtMs) {
        ticket.tiempo = Math.max(0, Math.floor((Date.now() - ticket._iniciadoAtMs) / 60000));
      }
    }
  }

  formatearTiempoTicket(minutos: number, ticket?: KitchenTicket): string {
    // Si la comanda ya está 100% lista y duró menos de 1 minuto, mostrar los segundos demorados
    if (ticket && ticket.platosListos === ticket.totalPlatos && (!minutos || minutos <= 0)) {
      const maxSeg = Math.max(0, ...ticket.items.map(i => i.segundosDemorados || 0));
      if (maxSeg > 0 && maxSeg < 60) {
        return `${maxSeg} seg`;
      }
    }
    if (!minutos || minutos <= 0) return '0 min';
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return `${horas}h ${minutos % 60}m`;
  }

  formatearSegundosDemorados(diffSegundos: number): string {
    if (diffSegundos === null || diffSegundos === undefined || isNaN(diffSegundos) || diffSegundos < 0) {
      return '< 1 min';
    }
    // Salvaguarda: Eliminar desfase de 5 horas (18000s) por huso horario UTC vs hora local
    if (diffSegundos >= 17900 && diffSegundos <= 18600) {
      diffSegundos = Math.max(0, diffSegundos - 18000);
    }
    if (diffSegundos < 60) {
      return diffSegundos <= 0 ? '< 1 min' : `${diffSegundos} seg`;
    }
    const minutos = Math.floor(diffSegundos / 60);
    if (minutos < 60) {
      return `${minutos} min`;
    }
    const horas = Math.floor(minutos / 60);
    const minRest = minutos % 60;
    return `${horas}h ${minRest}m`;
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

  get cantidadPlatosPendientes(): number {
    return this.ticketsCocina.reduce((sum, t) => {
      const pendientesEnTicket = t.items.reduce((s, it) => {
        const listos = it.cantidadLista ?? (it.checkCocina ? it.cantidad : 0);
        return s + Math.max(0, it.cantidad - listos);
      }, 0);
      return sum + pendientesEnTicket;
    }, 0);
  }

  get cantidadPlatosListos(): number {
    return this.ticketsCocina.reduce((sum, t) => {
      const listosEnTicket = t.items.reduce((s, it) => {
        return s + (it.cantidadLista ?? (it.checkCocina ? it.cantidad : 0));
      }, 0);
      return sum + listosEnTicket;
    }, 0);
  }

  get cantidadTicketsPorIniciar(): number {
    return this.ticketsCocina.filter((t) => !t.fechaInicioCocina && t.platosListos < t.totalPlatos).length;
  }

  get cantidadTicketsEnPreparacion(): number {
    return this.ticketsCocina.filter((t) => !!t.fechaInicioCocina && t.platosListos < t.totalPlatos).length;
  }

  get cantidadTicketsListos(): number {
    return this.ticketsCocina.filter((t) => t.items.length > 0 && t.platosListos === t.totalPlatos).length;
  }

  get ticketsCocinaFiltrados(): KitchenTicket[] {
    let resultado = [...this.ticketsCocina];

    if (this.filtroCocina === 'unstarted') {
      resultado = resultado.filter((t) => !t.fechaInicioCocina && t.platosListos < t.totalPlatos);
    } else if (this.filtroCocina === 'pending') {
      resultado = resultado.filter((t) => !!t.fechaInicioCocina && t.platosListos < t.totalPlatos);
    } else if (this.filtroCocina === 'ready') {
      resultado = resultado.filter((t) => t.items.length > 0 && t.platosListos === t.totalPlatos);
    }

    if (this.busquedaCocina.trim()) {
      const term = this.busquedaCocina.trim().toLowerCase();
      resultado = resultado.filter(
        (t) =>
          t.mesa.toString().includes(term) ||
          (t.clienteNombre && t.clienteNombre.toLowerCase().includes(term)) ||
          (t.meseroNombre && t.meseroNombre.toLowerCase().includes(term)) ||
          (t.cocineroNombre && t.cocineroNombre.toLowerCase().includes(term)) ||
          t.pedidoId.toString().includes(term) ||
          t.items.some((it) => it.nombre.toLowerCase().includes(term))
      );
    }

    if (this.ordenCocina === 'lifo') {
      resultado.reverse();
    }

    return resultado;
  }

  trackByPedidoId(_index: number, ticket: KitchenTicket): number {
    return ticket.pedidoId;
  }

  trackByDetalleId(_index: number, item: KitchenItem): number {
    return item.detalleId;
  }

  /**
   * Calcula el tiempo transcurrido desde que se dio clic en 'Iniciar'
   * hasta que se marcó el plato como cocinado ('Cocinar').
   */
  calcularTiempoDemoradoItem(ticket: KitchenTicket, item: KitchenItem): string {
    // 1. Si ya tenemos segundos demorados calculados en memoria o desde BD
    if (item.segundosDemorados !== undefined && item.segundosDemorados !== null) {
      return this.formatearSegundosDemorados(item.segundosDemorados);
    }

    // 2. Si el plato está marcado como listo y tenemos _iniciadoAtMs local
    if ((item.checkCocina || (item.cantidadLista || 0) > 0) && ticket._iniciadoAtMs) {
      const seg = Math.max(0, Math.floor((Date.now() - ticket._iniciadoAtMs) / 1000));
      item.segundosDemorados = seg;
      return this.formatearSegundosDemorados(seg);
    }

    // 3. Fallback con fechas ISO
    if (item.fechaCheckCocina && ticket.fechaInicioCocina) {
      const inicio = new Date(ticket.fechaInicioCocina).getTime();
      const fin = new Date(item.fechaCheckCocina).getTime();

      if (!isNaN(inicio) && !isNaN(fin) && fin >= inicio) {
        let diffSegundos = Math.max(0, Math.floor((fin - inicio) / 1000));
        // Salvaguarda si viene con desfase de 5 horas por UTC
        if (diffSegundos >= 17900 && diffSegundos <= 18600) {
          diffSegundos = Math.max(0, diffSegundos - 18000);
        }
        item.segundosDemorados = diffSegundos;
        return this.formatearSegundosDemorados(diffSegundos);
      }
    }

    return '< 1 min';
  }
}
