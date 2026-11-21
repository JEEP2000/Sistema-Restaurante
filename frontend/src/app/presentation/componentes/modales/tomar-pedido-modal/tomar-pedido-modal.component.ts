import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetCategoriasUseCase } from '../../../../application/ports/in/get-categorias.use-case.js';
import { GetProductosUseCase } from '../../../../application/ports/in/get-productos.use-case.js';
import { CrearPedidoUseCase } from '../../../../application/ports/in/crear-pedido.use-case.js';
import { Mesa } from '../../../../domain/models/mesa.model.js';
import { Categoria, Producto } from '../../../../domain/models/producto.model.js';
import { CrearPedidoDTO } from '../../../../domain/models/pedido.model.js';

/**
 * ==============================================================================
 * MODAL: TOMAR PEDIDO (ROL MESERO)
 * Adaptador de Entrada (Driving Adapter) que gestiona el catálogo de platos,
 * armado de carrito de comanda y despacho inicial hacia la cocina.
 * ==============================================================================
 */
@Component({
  selector: 'app-tomar-pedido-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tomar-pedido-modal.component.html'
})
export class TomarPedidoModalComponent implements OnChanges {
  // Casos de Uso (Input Ports)
  private getCategoriasUseCase = inject(GetCategoriasUseCase);
  private getProductosUseCase = inject(GetProductosUseCase);
  private crearPedidoUseCase = inject(CrearPedidoUseCase);

  @Input() estaAbierto: boolean = false;
  @Input() mesa: Mesa | null = null;
  @Input() sucursalId: number = 1;
  @Input() sucursalNombre: string = '';
  @Input() nombreSucursal: string = '';

  @Output() cerrar = new EventEmitter<void>();
  @Output() pedidoCreado = new EventEmitter<void>();

  nombreCliente: string = '';
  categorias: Categoria[] = [];
  productos: Producto[] = [];
  categoriaSeleccionadaId: number | null = null;
  busquedaProducto: string = '';
  carritoPedido: { producto: Producto; cantidad: number; modificacion: string }[] = [];
  estaEnviandoPedido: boolean = false;
  errorPedido: string = '';
  exitoPedido: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estaAbierto'] && this.estaAbierto) {
      this.inicializarModal();
    }
  }

  inicializarModal(): void {
    this.nombreCliente = '';
    this.carritoPedido = [];
    this.busquedaProducto = '';
    this.categoriaSeleccionadaId = null;
    this.errorPedido = '';
    this.exitoPedido = '';
    this.estaEnviandoPedido = false;
    this.cargarCatalogo();
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

  get productosFiltrados(): Producto[] {
    let lista = this.productos;
    if (this.categoriaSeleccionadaId !== null) {
      lista = lista.filter((p) => p.categoriaId === this.categoriaSeleccionadaId);
    }
    if (this.busquedaProducto && this.busquedaProducto.trim()) {
      const q = this.busquedaProducto.toLowerCase().trim();
      lista = lista.filter(
        (p) => p.nombre.toLowerCase().includes(q) || (p.descripcion && p.descripcion.toLowerCase().includes(q))
      );
    }
    return lista;
  }

  seleccionarCategoria(catId: number | null): void {
    this.categoriaSeleccionadaId = catId;
  }

  agregarAlCarrito(prod: Producto): void {
    const existente = this.carritoPedido.find((item) => item.producto.id === prod.id);
    if (existente) {
      existente.cantidad++;
    } else {
      this.carritoPedido.push({
        producto: prod,
        cantidad: 1,
        modificacion: ''
      });
    }
  }

  actualizarCantidadCarrito(index: number, delta: number): void {
    if (this.carritoPedido[index]) {
      this.carritoPedido[index].cantidad += delta;
      if (this.carritoPedido[index].cantidad <= 0) {
        this.carritoPedido.splice(index, 1);
      }
    }
  }

  eliminarDelCarrito(index: number): void {
    this.carritoPedido.splice(index, 1);
  }

  get totalCarrito(): number {
    return this.carritoPedido.reduce((suma, item) => suma + item.producto.precio * item.cantidad, 0);
  }

  get cantidadItemsCarrito(): number {
    return this.carritoPedido.reduce((suma, item) => suma + item.cantidad, 0);
  }

  alCerrar(): void {
    this.cerrar.emit();
  }

  enviarPedido(): void {
    if (!this.mesa) return;

    if (this.carritoPedido.length === 0) {
      this.errorPedido = 'Debe agregar al menos un producto a la comanda.';
      return;
    }

    this.estaEnviandoPedido = true;
    this.errorPedido = '';
    this.exitoPedido = '';

    const payload: CrearPedidoDTO = {
      sucursalId: Number(this.mesa.sucursalId || this.sucursalId || 1),
      mesaId: Number(this.mesa.id),
      clienteNombre: this.nombreCliente.trim() || 'Comensal',
      items: this.carritoPedido.map((item) => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
        modificacion: item.modificacion.trim() || null
      }))
    };

    this.crearPedidoUseCase.execute(payload).subscribe({
      next: (pedido) => {
        this.estaEnviandoPedido = false;
        if (pedido && pedido.id) {
          this.exitoPedido = '¡Comanda enviada a cocina exitosamente!';
          this.pedidoCreado.emit();
          setTimeout(() => {
            this.alCerrar();
          }, 800);
        } else {
          this.errorPedido = 'Error al enviar la comanda a cocina.';
        }
      },
      error: (err: any) => {
        this.estaEnviandoPedido = false;
        this.errorPedido = err.error?.message || err.message || 'Error al registrar comanda.';
      }
    });
  }
}
