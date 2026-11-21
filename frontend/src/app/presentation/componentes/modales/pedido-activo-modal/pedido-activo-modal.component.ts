import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetPedidoMesaUseCase } from '../../../../application/ports/in/get-pedido-mesa.use-case.js';
import { GetCategoriasUseCase } from '../../../../application/ports/in/get-categorias.use-case.js';
import { GetProductosUseCase } from '../../../../application/ports/in/get-productos.use-case.js';
import { AgregarItemsPedidoUseCase } from '../../../../application/ports/in/agregar-items-pedido.use-case.js';
import { MarcarBebidaEntregadaUseCase } from '../../../../application/ports/in/marcar-bebida-entregada.use-case.js';
import { MarcarTodoServidoUseCase } from '../../../../application/ports/in/marcar-todo-servido.use-case.js';
import { SolicitarCuentaUseCase } from '../../../../application/ports/in/solicitar-cuenta.use-case.js';
import { Mesa } from '../../../../domain/models/mesa.model.js';
import { Categoria, Producto } from '../../../../domain/models/producto.model.js';
import { Pedido, DetallePedido } from '../../../../domain/models/pedido.model.js';

/**
 * ==============================================================================
 * MODAL: PEDIDO ACTIVO / PRE-CUENTA (ROL MESERO Y ADMIN)
 * Adaptador de Entrada (Driving Adapter) que gestiona la visualización
 * del pedido en curso, marcado de platos/bebidas servidos a la mesa,
 * adición de productos complementarios y solicitud de pre-cuenta a caja.
 * ==============================================================================
 */
@Component({
  selector: 'app-pedido-activo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedido-activo-modal.component.html'
})
export class PedidoActivoModalComponent implements OnChanges {
  // Inyección de Casos de Uso (Input Ports)
  private getPedidoMesaUseCase = inject(GetPedidoMesaUseCase);
  private getCategoriasUseCase = inject(GetCategoriasUseCase);
  private getProductosUseCase = inject(GetProductosUseCase);
  private agregarItemsPedidoUseCase = inject(AgregarItemsPedidoUseCase);
  private marcarBebidaEntregadaUseCase = inject(MarcarBebidaEntregadaUseCase);
  private marcarTodoServidoUseCase = inject(MarcarTodoServidoUseCase);
  private solicitarCuentaUseCase = inject(SolicitarCuentaUseCase);

  // Entradas (Inputs)
  @Input() estaAbierto: boolean = false;
  @Input() mesa: Mesa | null = null;
  @Input() perfil: any = null;
  @Input() sucursalId: number = 1;
  @Input() sucursalNombre: string = '';
  @Input() nombreSucursal: string = '';

  // Salidas (Outputs)
  @Output() cerrar = new EventEmitter<void>();
  @Output() pedidoActualizado = new EventEmitter<void>();
  @Output() abrirAnularPedido = new EventEmitter<Pedido>();

  // Estado del Modal
  pedidoActivo: Pedido | null = null;
  cargandoPedido: boolean = false;
  errorPedidoActivo: string = '';
  exitoPedidoActivo: string = '';
  avisoPedidoActivo: string = '';
  estaActualizandoServidoTodo: boolean = false;

  // Estado de adición de productos adicionales
  mostrarAgregarMas: boolean = false;
  categorias: Categoria[] = [];
  productos: Producto[] = [];
  categoriaExtraId: number | null = null;
  busquedaProductoExtra: string = '';
  carritoExtra: { producto: Producto; cantidad: number; modificacion: string }[] = [];
  estaAgregandoItems: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estaAbierto'] && this.estaAbierto && this.mesa) {
      this.inicializarModal();
    }
  }

  /**
   * Inicializa los datos y carga la comanda activa de la mesa seleccionada.
   */
  inicializarModal(): void {
    this.errorPedidoActivo = '';
    this.exitoPedidoActivo = '';
    this.avisoPedidoActivo = '';
    this.mostrarAgregarMas = false;
    this.carritoExtra = [];
    this.busquedaProductoExtra = '';
    this.categoriaExtraId = null;
    this.cargarPedidoActivo();
  }

  cargarPedidoActivo(): void {
    if (!this.mesa) return;
    this.cargandoPedido = true;
    this.getPedidoMesaUseCase.execute(this.mesa.id).subscribe({
      next: (pedido) => {
        this.cargandoPedido = false;
        this.pedidoActivo = pedido;
      },
      error: (err: any) => {
        this.cargandoPedido = false;
        this.errorPedidoActivo = err.error?.message || err.message || 'Error al cargar comanda activa.';
      }
    });
  }

  cargarCatalogo(): void {
    const sucursalDestino = this.mesa?.sucursalId || this.sucursalId || undefined;
    this.getCategoriasUseCase.execute(sucursalDestino).subscribe({
      next: (cats) => (this.categorias = cats),
      error: (err) => console.error('Error al cargar categorías:', err)
    });

    this.getProductosUseCase.execute(sucursalDestino).subscribe({
      next: (prods) => (this.productos = prods),
      error: (err) => console.error('Error al cargar productos:', err)
    });
  }

  /**
   * Agrupa los ítems del pedido por su categoría para una visualización clara.
   */
  get categoriasDelPedido(): { categoriaNombre: string; items: DetallePedido[] }[] {
    if (!this.pedidoActivo || !this.pedidoActivo.detalles) return [];
    const grupos: { [cat: string]: DetallePedido[] } = {};
    for (const item of this.pedidoActivo.detalles) {
      const cat = item.categoriaNombre || (item.requiereCoccion ? 'Cocina' : 'Bebidas y Despacho');
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(item);
    }
    return Object.keys(grupos).map((cat) => ({ categoriaNombre: cat, items: grupos[cat] }));
  }

  // --- Permisos de Rol ---
  puedeModificarPedido(): boolean {
    const rol = this.perfil?.rolNombre;
    return rol === 'Mesero' || rol === 'Administrador' || rol === 'Dueño' || rol === 'SuperAdmin';
  }

  puedeMarcarServido(): boolean {
    const rol = this.perfil?.rolNombre;
    return rol === 'Mesero' || rol === 'Administrador' || rol === 'Dueño' || rol === 'SuperAdmin';
  }

  puedeAnularPedido(): boolean {
    const rol = this.perfil?.rolNombre;
    return rol === 'Mesero' || rol === 'Cajero' || rol === 'Administrador' || rol === 'Administrador General' || rol === 'Dueño' || rol === 'SuperAdmin';
  }

  // --- Validaciones de Estado de Comanda ---
  estanListosPlatosCocina(pedido: Pedido | null): boolean {
    if (!pedido || !pedido.detalles || pedido.detalles.length === 0) return true;
    return pedido.detalles
      .filter((item) => item.requiereCoccion)
      .every((item) => item.checkCocina === true);
  }

  estanEntregadosProductosDirectos(pedido: Pedido | null): boolean {
    if (!pedido || !pedido.detalles || pedido.detalles.length === 0) return true;
    return pedido.detalles
      .filter((item) => !item.requiereCoccion)
      .every((item) => item.checkMesero === true);
  }

  puedeMarcarComandaServida(pedido: Pedido | null): boolean {
    if (!pedido || !pedido.detalles || pedido.detalles.length === 0) return false;
    return this.estanListosPlatosCocina(pedido) && this.estanEntregadosProductosDirectos(pedido);
  }

  estaComandaCompletamenteServida(pedido: Pedido | null): boolean {
    if (!pedido || !pedido.detalles || pedido.detalles.length === 0) return false;
    return pedido.detalles.every((item) => {
      if (item.requiereCoccion) {
        return item.checkCocina === true && item.checkMesero === true;
      }
      return item.checkMesero === true;
    });
  }

  /**
   * Cambia el estado entregado de un ítem directo (bebidas, postres listos).
   */
  alternarItemServido(item: DetallePedido): void {
    if (!this.puedeMarcarServido() || !item.id) return;
    const nuevoEstado = !item.checkMesero;
    this.errorPedidoActivo = '';
    this.avisoPedidoActivo = '';
    this.marcarBebidaEntregadaUseCase.execute(item.id).subscribe({
      next: (ok: boolean) => {
        if (ok) {
          item.checkMesero = nuevoEstado;
          this.pedidoActualizado.emit();
        }
      },
      error: (err: any) => {
        this.errorPedidoActivo = err.error?.message || err.message || 'Error al actualizar estado del producto.';
      }
    });
  }

  /**
   * Marca toda la comanda como servida a la mesa o muestra aviso si ya está servida.
   */
  alternarComandaCompletaServida(): void {
    if (!this.pedidoActivo) return;
    if (!this.puedeMarcarServido()) return;
    if (this.estaActualizandoServidoTodo) return;

    this.errorPedidoActivo = '';

    const estaCompleta = this.estaComandaCompletamenteServida(this.pedidoActivo);

    // Si ya está marcada como servida a la mesa y se hace clic en el botón de abajo
    if (estaCompleta) {
      this.errorPedidoActivo = '';
      this.avisoPedidoActivo = 'Esta comanda ya está marcada como servida a la mesa. Para modificar el estado de entrega de las bebidas, desmárquelas directamente en su respectivo botón arriba.';
      setTimeout(() => {
        if (this.avisoPedidoActivo.includes('ya está marcada como servida')) {
          this.avisoPedidoActivo = '';
        }
      }, 5000);
      return;
    }

    if (!this.puedeMarcarComandaServida(this.pedidoActivo)) {
      if (!this.estanListosPlatosCocina(this.pedidoActivo)) {
        this.errorPedidoActivo = 'No se puede confirmar la entrega: la cocina aún tiene platos en preparación.';
      } else {
        this.errorPedidoActivo = 'Marque las bebidas y productos directos como "Entregado" arriba antes de confirmar la comanda.';
      }
      return;
    }

    this.estaActualizandoServidoTodo = true;
    this.avisoPedidoActivo = '';
    this.errorPedidoActivo = '';

    this.marcarTodoServidoUseCase.execute(this.pedidoActivo.id, true).subscribe({
      next: (ok: boolean) => {
        this.estaActualizandoServidoTodo = false;
        if (ok) {
          this.exitoPedidoActivo = '¡Comanda marcada como servida a la mesa!';
          setTimeout(() => { this.exitoPedidoActivo = ''; }, 3500);
          this.cargarPedidoActivo();
          this.pedidoActualizado.emit();
        } else {
          this.errorPedidoActivo = 'Error al marcar comanda como servida.';
        }
      },
      error: (err: any) => {
        this.estaActualizandoServidoTodo = false;
        this.errorPedidoActivo = err.error?.message || err.message || 'Error al actualizar comanda.';
      }
    });
  }

  // --- Adición de Productos Adicionales ---
  alternarMenuAdicional(): void {
    this.mostrarAgregarMas = !this.mostrarAgregarMas;
    if (this.mostrarAgregarMas && this.productos.length === 0) {
      const sucursalDestino = this.mesa?.sucursalId || this.sucursalId || undefined;
      this.getCategoriasUseCase.execute(sucursalDestino).subscribe({
        next: (cats) => (this.categorias = cats)
      });
      this.getProductosUseCase.execute(sucursalDestino).subscribe({
        next: (prods) => (this.productos = prods)
      });
    }
  }

  seleccionarCategoriaExtra(catId: number | null): void {
    this.categoriaExtraId = catId;
  }

  get productosExtraFiltrados(): Producto[] {
    let lista = this.productos;
    if (this.categoriaExtraId !== null) {
      lista = lista.filter((p) => p.categoriaId === this.categoriaExtraId);
    }
    if (this.busquedaProductoExtra && this.busquedaProductoExtra.trim()) {
      const q = this.busquedaProductoExtra.toLowerCase().trim();
      lista = lista.filter(
        (p) => p.nombre.toLowerCase().includes(q) || (p.descripcion && p.descripcion.toLowerCase().includes(q))
      );
    }
    return lista;
  }

  agregarAlCarritoExtra(prod: Producto): void {
    const existente = this.carritoExtra.find((item) => item.producto.id === prod.id);
    if (existente) {
      existente.cantidad++;
    } else {
      this.carritoExtra.push({ producto: prod, cantidad: 1, modificacion: '' });
    }
  }

  actualizarCantidadExtra(idx: number, delta: number): void {
    if (this.carritoExtra[idx]) {
      this.carritoExtra[idx].cantidad += delta;
      if (this.carritoExtra[idx].cantidad <= 0) {
        this.carritoExtra.splice(idx, 1);
      }
    }
  }

  eliminarDelCarritoExtra(idx: number): void {
    this.carritoExtra.splice(idx, 1);
  }

  get totalCarritoExtra(): number {
    return this.carritoExtra.reduce((suma, item) => suma + item.producto.precio * item.cantidad, 0);
  }

  enviarItemsAdicionales(): void {
    if (!this.pedidoActivo) return;
    if (this.carritoExtra.length === 0) {
      this.errorPedidoActivo = 'Agregue al menos un producto adicional.';
      return;
    }

    this.estaAgregandoItems = true;
    this.errorPedidoActivo = '';

    const items = this.carritoExtra.map((item) => ({
      productoId: item.producto.id,
      cantidad: item.cantidad,
      modificacion: item.modificacion.trim() || null
    }));

    this.agregarItemsPedidoUseCase.execute(this.pedidoActivo.id, items).subscribe({
      next: (ok: boolean) => {
        this.estaAgregandoItems = false;
        if (ok) {
          this.exitoPedidoActivo = '¡Productos adicionales agregados con éxito!';
          this.carritoExtra = [];
          this.mostrarAgregarMas = false;
          this.cargarPedidoActivo();
          this.pedidoActualizado.emit();
        } else {
          this.errorPedidoActivo = 'Error al agregar productos adicionales.';
        }
      },
      error: (err: any) => {
        this.estaAgregandoItems = false;
        this.errorPedidoActivo = err.error?.message || err.message || 'Error al enviar adicionales.';
      }
    });
  }

  // --- Precuenta y Solicitud a Caja ---
  estaPrecuentaBloqueada(): boolean {
    if (!this.pedidoActivo) return true;
    return !this.estaComandaCompletamenteServida(this.pedidoActivo);
  }

  obtenerTextoBotonPrecuenta(): string {
    if (this.mesa?.estado === 'enpago') {
      return 'Pre-cuenta ya enviada a Caja';
    }
    return 'Solicitar Pre-cuenta a Caja';
  }

  solicitarPrecuenta(mesaId?: number): void {
    if (!mesaId || !this.pedidoActivo) return;
    if (this.estaPrecuentaBloqueada()) return;

    this.solicitarCuentaUseCase.execute(mesaId).subscribe({
      next: (ok: boolean) => {
        if (ok) {
          this.exitoPedidoActivo = 'Pre-cuenta enviada a Caja exitosamente.';
          this.pedidoActualizado.emit();
          setTimeout(() => {
            this.alCerrar();
          }, 800);
        } else {
          this.errorPedidoActivo = 'Error al solicitar pre-cuenta.';
        }
      },
      error: (err: any) => {
        this.errorPedidoActivo = err.error?.message || err.message || 'Error al solicitar pre-cuenta a caja.';
      }
    });
  }

  abrirModalAnular(): void {
    if (this.pedidoActivo) {
      this.abrirAnularPedido.emit(this.pedidoActivo);
    }
  }

  alCerrar(): void {
    this.cerrar.emit();
  }
}
