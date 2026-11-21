import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PRODUCTO_REPOSITORY_TOKEN } from '../../../../infrastructure/providers/restaurant.providers.js';
import { ProductoRepositoryPort } from '../../../../application/ports/out/producto.repository.port.js';
import {
  Categoria,
  CrearCategoriaDTO,
  Producto,
  CrearProductoDTO,
  Promocion,
  PromocionItem,
  CrearPromocionDTO,
  Insumo,
  CrearInsumoDTO
} from '../../../../domain/models/producto.model.js';
import { Sucursal } from '../../../../domain/models/sucursal.model.js';

@Component({
  selector: 'app-gestion-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-menu.component.html'
})
export class GestionMenuComponent implements OnInit, OnChanges {
  private productoRepo: ProductoRepositoryPort = inject(PRODUCTO_REPOSITORY_TOKEN);

  @Input() sucursalId: number = 1;
  @Input() perfil: any = null;
  @Input() listaSucursales: Sucursal[] = [];

  // Pestaña activa dentro del módulo
  subPestanaActual: 'platos' | 'menu_dia' | 'promos' | 'categorias' | 'insumos' = 'platos';

  // Datos
  listaProductos: Producto[] = [];
  listaCategorias: Categoria[] = [];
  listaPromociones: Promocion[] = [];
  listaInsumos: Insumo[] = [];

  cargando: boolean = false;
  mensajeExito: string = '';
  mensajeError: string = '';

  // Filtros y Búsqueda
  busquedaPlato: string = '';
  filtroCategoriaId: number | null = null;
  filtroEstadoPlato: 'todos' | 'activos' | 'ocultos' = 'todos';

  busquedaPromo: string = '';
  busquedaInsumo: string = '';

  // Modales
  mostrarModalPlato: boolean = false;
  modoEdicionPlato: boolean = false;
  platoSeleccionadoId: number | null = null;
  sucursalesSeleccionadas: { sucursalId: number; nombre: string; activo: boolean; esMenuDelDia: boolean }[] = [];
  formPlato: CrearProductoDTO = {
    categoriaId: 1,
    nombre: '',
    descripcion: '',
    precio: 0,
    requiereCoccion: true,
    tiempoEstimado: 12,
    imagenUrl: '',
    activo: true,
    esMenuDelDia: false
  };

  mostrarModalPromo: boolean = false;
  modoEdicionPromo: boolean = false;
  promoSeleccionadaId: number | null = null;
  sucursalesSeleccionadasPromo: { sucursalId: number; nombre: string; activo: boolean }[] = [];
  formPromo: CrearPromocionDTO = {
    nombre: '',
    descripcion: '',
    precioPromo: 0,
    precioOriginal: 0,
    descuentoPorcentaje: 0,
    itemsIncluidos: [],
    fechaInicio: '',
    fechaFin: '',
    activo: true,
    destacado: false
  };
  // Ítems temporales en el combo de la promo
  promoItemsSeleccionados: { productoId: number; nombre: string; cantidad: number }[] = [];
  nuevoItemPromoProductoId: number | null = null;
  nuevoItemPromoCantidad: number = 1;

  mostrarModalCategoria: boolean = false;
  modoEdicionCategoria: boolean = false;
  categoriaSeleccionadaId: number | null = null;
  formCategoria: CrearCategoriaDTO = {
    nombre: '',
    descripcion: '',
    esCocina: true,
    ordenVisual: 1,
    activo: true
  };

  mostrarModalInsumo: boolean = false;
  modoEdicionInsumo: boolean = false;
  insumoSeleccionadoId: number | null = null;
  formInsumo: CrearInsumoDTO = {
    nombre: '',
    unidadMedida: 'kg',
    stock: 0,
    stockMinimo: 5,
    activo: true
  };

  mostrarModalConfirmacionEliminar: boolean = false;
  itemAEliminar: { tipo: 'plato' | 'promo' | 'categoria'; id: number; nombre: string } | null = null;

  ngOnInit(): void {
    this.cargarTodo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sucursalId'] && !changes['sucursalId'].firstChange) {
      this.cargarTodo();
    }
  }

  cambiarPestana(pestana: 'platos' | 'menu_dia' | 'promos' | 'categorias' | 'insumos'): void {
    this.subPestanaActual = pestana;
    this.limpiarMensajes();
  }

  limpiarMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
  }

  mostrarToast(mensaje: string, esError: boolean = false): void {
    if (esError) {
      this.mensajeError = mensaje;
      this.mensajeExito = '';
    } else {
      this.mensajeExito = mensaje;
      this.mensajeError = '';
    }
    setTimeout(() => {
      this.mensajeExito = '';
      this.mensajeError = '';
    }, 4000);
  }

  cargarTodo(): void {
    this.cargando = true;
    const sucursal = this.sucursalId || this.perfil?.sucursalId || 1;

    // 1. Cargar Categorías (incluyendo inactivas para gestión)
    this.productoRepo.getCategorias(sucursal, true).subscribe({
      next: (cats) => {
        this.listaCategorias = cats;
        if (this.listaCategorias.length > 0 && !this.formPlato.categoriaId) {
          this.formPlato.categoriaId = this.listaCategorias[0].id;
        }
      },
      error: (err) => console.error('Error al cargar categorías:', err)
    });

    // 2. Cargar Productos (incluyendo inactivos para gestión)
    this.productoRepo.getProductos(sucursal, undefined, true).subscribe({
      next: (prods) => {
        this.listaProductos = prods;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.cargando = false;
      }
    });

    // 3. Cargar Promociones
    this.productoRepo.getPromociones(sucursal, true).subscribe({
      next: (promos) => (this.listaPromociones = promos),
      error: (err) => console.error('Error al cargar promociones:', err)
    });

    // 4. Cargar Insumos
    this.productoRepo.getInsumos(sucursal, true).subscribe({
      next: (ins) => (this.listaInsumos = ins),
      error: (err) => console.error('Error al cargar insumos:', err)
    });
  }

  // =========================================================================
  // GETTERS DE CÁLCULO Y FILTRADO
  // =========================================================================

  get platosFiltrados(): Producto[] {
    let resultado = [...this.listaProductos];

    if (this.filtroCategoriaId !== null) {
      resultado = resultado.filter((p) => p.categoriaId === this.filtroCategoriaId);
    }

    if (this.filtroEstadoPlato === 'activos') {
      resultado = resultado.filter((p) => p.activo === true);
    } else if (this.filtroEstadoPlato === 'ocultos') {
      resultado = resultado.filter((p) => p.activo === false);
    }

    if (this.busquedaPlato.trim()) {
      const q = this.busquedaPlato.toLowerCase().trim();
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.categoriaNombre && p.categoriaNombre.toLowerCase().includes(q)) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(q))
      );
    }

    return resultado;
  }

  get platosMenuDelDia(): Producto[] {
    let resultado = this.listaProductos.filter((p) => p.esMenuDelDia === true);

    if (this.busquedaPlato.trim()) {
      const q = this.busquedaPlato.toLowerCase().trim();
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.categoriaNombre && p.categoriaNombre.toLowerCase().includes(q))
      );
    }

    return resultado;
  }

  get promocionesFiltradas(): Promocion[] {
    if (!this.busquedaPromo.trim()) return this.listaPromociones;
    const q = this.busquedaPromo.toLowerCase().trim();
    return this.listaPromociones.filter(
      (p) => p.nombre.toLowerCase().includes(q) || (p.descripcion && p.descripcion.toLowerCase().includes(q))
    );
  }

  get insumosFiltrados(): Insumo[] {
    if (!this.busquedaInsumo.trim()) return this.listaInsumos;
    const q = this.busquedaInsumo.toLowerCase().trim();
    return this.listaInsumos.filter(
      (i) => i.nombre.toLowerCase().includes(q) || i.unidadMedida.toLowerCase().includes(q)
    );
  }

  get cantidadPlatosTotal(): number {
    return this.listaProductos.length;
  }

  get cantidadPlatosActivos(): number {
    return this.listaProductos.filter((p) => p.activo).length;
  }

  get cantidadMenuDelDia(): number {
    return this.listaProductos.filter((p) => p.esMenuDelDia).length;
  }

  get cantidadPromosActivas(): number {
    return this.listaPromociones.filter((p) => p.activo).length;
  }

  get esAdminGlobalODueno(): boolean {
    const rol = (this.perfil?.rolNombre || '').toLowerCase().trim();
    return rol === 'dueño' || rol === 'dueño' || rol === 'superadmin' || rol === 'administrador general' || rol === 'admin general';
  }

  puedeModificarSede(targetSucursalId: number): boolean {
    if (this.esAdminGlobalODueno) return true;
    const miSede = Number(this.sucursalId || this.perfil?.sucursalId || 1);
    return Number(targetSucursalId) === miSede;
  }

  getNombreSucursalActual(): string {
    if (this.perfil?.sucursalNombre) return this.perfil.sucursalNombre;
    const miSede = Number(this.sucursalId || this.perfil?.sucursalId || 1);
    const suc = this.listaSucursales.find(s => Number(s.id) === miSede);
    return suc?.nombre || `Sede #${miSede}`;
  }

  getTextoSedes(item: { disponibilidad?: { sucursalNombre?: string; activo: boolean }[] }): string {
    if (!item.disponibilidad || item.disponibilidad.length === 0) return 'Todas las sedes';
    const total = item.disponibilidad.length;
    const activas = item.disponibilidad.filter(d => d.activo).length;
    if (activas === total) {
      return 'Todas las sedes';
    }
    if (activas === 0) {
      return 'Sin sedes';
    }
    return `${activas}/${total} sedes`;
  }

  getDetalleSedesTooltip(item: { disponibilidad?: { sucursalNombre?: string; activo: boolean }[] }): string {
    if (!item.disponibilidad || item.disponibilidad.length === 0) return 'Habilitado en todas las sedes';
    return item.disponibilidad
      .map(d => `${d.sucursalNombre || 'Sede'}: ${d.activo ? 'Activo' : 'Inactivo'}`)
      .join('\n');
  }

  esTodasLasSedes(item: { disponibilidad?: { sucursalNombre?: string; activo: boolean }[] }): boolean {
    if (!item.disponibilidad || item.disponibilidad.length === 0) return true;
    return item.disponibilidad.every(d => d.activo);
  }

  contarSedesActivas(lista: { activo: boolean }[]): number {
    if (!lista) return 0;
    return lista.filter(s => s.activo).length;
  }

  marcarTodasSedes(valor: boolean, tipo: 'plato' | 'promo'): void {
    if (!this.esAdminGlobalODueno) return;
    if (tipo === 'plato') {
      this.sucursalesSeleccionadas.forEach(s => s.activo = valor);
    } else {
      this.sucursalesSeleccionadasPromo.forEach(s => s.activo = valor);
    }
  }

  // =========================================================================
  // GESTIÓN DE PLATOS / CARTA
  // =========================================================================

  abrirCrearPlato(): void {
    this.modoEdicionPlato = false;
    this.platoSeleccionadoId = null;
    this.formPlato = {
      categoriaId: this.listaCategorias[0]?.id || 1,
      nombre: '',
      descripcion: '',
      precio: 0,
      requiereCoccion: true,
      tiempoEstimado: 12,
      imagenUrl: '',
      activo: true,
      esMenuDelDia: this.subPestanaActual === 'menu_dia'
    };
    this.sucursalesSeleccionadas = (this.listaSucursales && this.listaSucursales.length > 0)
      ? this.listaSucursales.map(s => ({
          sucursalId: Number(s.id || 1),
          nombre: s.nombre,
          activo: true,
          esMenuDelDia: this.subPestanaActual === 'menu_dia'
        }))
      : [{ sucursalId: this.sucursalId || 1, nombre: 'Sede Actual', activo: true, esMenuDelDia: false }];
    this.mostrarModalPlato = true;
  }

  abrirEditarPlato(plato: Producto): void {
    this.modoEdicionPlato = true;
    this.platoSeleccionadoId = plato.id;
    this.formPlato = {
      categoriaId: plato.categoriaId,
      nombre: plato.nombre,
      descripcion: plato.descripcion || '',
      precio: plato.precio,
      requiereCoccion: plato.requiereCoccion,
      tiempoEstimado: plato.tiempoEstimado || 10,
      imagenUrl: plato.imagenUrl || '',
      activo: plato.activo,
      esMenuDelDia: plato.esMenuDelDia
    };
    this.sucursalesSeleccionadas = (this.listaSucursales && this.listaSucursales.length > 0)
      ? this.listaSucursales.map(s => {
          const sId = Number(s.id || 1);
          const match = plato.disponibilidad?.find(d => d.sucursalId === sId);
          return {
            sucursalId: sId,
            nombre: s.nombre,
            activo: match ? match.activo : (sId === plato.sucursalId ? plato.activo : true),
            esMenuDelDia: match ? match.esMenuDelDia : (sId === plato.sucursalId ? Boolean(plato.esMenuDelDia) : false)
          };
        })
      : [{ sucursalId: plato.sucursalId || 1, nombre: 'Sede Actual', activo: plato.activo, esMenuDelDia: Boolean(plato.esMenuDelDia) }];
    this.mostrarModalPlato = true;
  }

  guardarPlato(): void {
    if (!this.formPlato.nombre.trim()) {
      this.mostrarToast('El nombre del plato es obligatorio', true);
      return;
    }
    if (this.formPlato.precio < 0) {
      this.mostrarToast('El precio no puede ser negativo', true);
      return;
    }

    const payload: CrearProductoDTO = {
      ...this.formPlato,
      sucursalId: this.sucursalId || this.perfil?.sucursalId || 1,
      nombre: this.formPlato.nombre.trim(),
      descripcion: this.formPlato.descripcion?.trim() || null,
      imagenUrl: this.formPlato.imagenUrl?.trim() || null,
      sucursalesDisponibles: this.sucursalesSeleccionadas
    };

    if (this.modoEdicionPlato && this.platoSeleccionadoId !== null) {
      this.productoRepo.actualizarProducto(this.platoSeleccionadoId, payload).subscribe({
        next: (actualizado) => {
          this.mostrarToast(`Plato "${actualizado.nombre}" actualizado con éxito`);
          this.mostrarModalPlato = false;
          this.cargarTodo();
        },
        error: (err) => {
          this.mostrarToast(err.error?.message || 'Error al actualizar plato', true);
        }
      });
    } else {
      this.productoRepo.crearProducto(payload).subscribe({
        next: (nuevo) => {
          this.mostrarToast(`Plato "${nuevo.nombre}" registrado en la carta`);
          this.mostrarModalPlato = false;
          this.cargarTodo();
        },
        error: (err) => {
          this.mostrarToast(err.error?.message || 'Error al registrar plato', true);
        }
      });
    }
  }

  alternarActivoPlato(plato: Producto, event: Event): void {
    event.stopPropagation();
    const estadoPrevio = plato.activo;
    plato.activo = !estadoPrevio;

    this.productoRepo.toggleActivoProducto(plato.id, this.sucursalId).subscribe({
      next: (res) => {
        plato.activo = res.activo;
        if (plato.disponibilidad) {
          const d = plato.disponibilidad.find(item => item.sucursalId === (res.sucursalId || this.sucursalId));
          if (d) d.activo = res.activo;
        }
        this.mostrarToast(res.activo ? `"${plato.nombre}" marcado como DISPONIBLE en la sede` : `"${plato.nombre}" marcado como AGOTADO en la sede`);
      },
      error: () => {
        plato.activo = estadoPrevio;
        this.mostrarToast('Error al cambiar disponibilidad del plato', true);
      }
    });
  }

  alternarMenuDelDia(plato: Producto, event: Event): void {
    event.stopPropagation();
    const estadoPrevio = plato.esMenuDelDia;
    plato.esMenuDelDia = !estadoPrevio;

    this.productoRepo.toggleMenuDelDia(plato.id, this.sucursalId).subscribe({
      next: (res) => {
        plato.esMenuDelDia = res.esMenuDelDia;
        if (plato.disponibilidad) {
          const d = plato.disponibilidad.find(item => item.sucursalId === (res.sucursalId || this.sucursalId));
          if (d) d.esMenuDelDia = res.esMenuDelDia;
        }
        this.mostrarToast(
          res.esMenuDelDia ? `⭐ "${plato.nombre}" añadido al Menú del Día de la sede` : `"${plato.nombre}" retirado del Menú del Día de la sede`
        );
      },
      error: () => {
        plato.esMenuDelDia = estadoPrevio;
        this.mostrarToast('Error al actualizar Menú del Día', true);
      }
    });
  }

  solicitarEliminarPlato(plato: Producto, event: Event): void {
    event.stopPropagation();
    this.itemAEliminar = { tipo: 'plato', id: plato.id, nombre: plato.nombre };
    this.mostrarModalConfirmacionEliminar = true;
  }

  // =========================================================================
  // GESTIÓN DE PROMOCIONES Y COMBOS
  // =========================================================================

  abrirCrearPromo(): void {
    this.modoEdicionPromo = false;
    this.promoSeleccionadaId = null;
    this.promoItemsSeleccionados = [];
    this.formPromo = {
      nombre: '',
      descripcion: '',
      precioPromo: 0,
      precioOriginal: 0,
      descuentoPorcentaje: 0,
      itemsIncluidos: [],
      fechaInicio: '',
      fechaFin: '',
      activo: true,
      destacado: false
    };
    this.sucursalesSeleccionadasPromo = (this.listaSucursales && this.listaSucursales.length > 0)
      ? this.listaSucursales.map(s => ({
          sucursalId: Number(s.id || 1),
          nombre: s.nombre,
          activo: true
        }))
      : [{ sucursalId: this.sucursalId || 1, nombre: 'Sede Actual', activo: true }];
    this.nuevoItemPromoProductoId = this.listaProductos[0]?.id || null;
    this.nuevoItemPromoCantidad = 1;
    this.mostrarModalPromo = true;
  }

  abrirEditarPromo(promo: Promocion): void {
    this.modoEdicionPromo = true;
    this.promoSeleccionadaId = promo.id;
    this.promoItemsSeleccionados = [...this.obtenerItemsPromo(promo)];
    this.formPromo = {
      nombre: promo.nombre,
      descripcion: promo.descripcion || '',
      precioPromo: promo.precioPromo,
      precioOriginal: promo.precioOriginal || 0,
      descuentoPorcentaje: promo.descuentoPorcentaje || 0,
      itemsIncluidos: this.promoItemsSeleccionados,
      fechaInicio: promo.fechaInicio || '',
      fechaFin: promo.fechaFin || '',
      activo: promo.activo,
      destacado: promo.destacado
    };
    this.sucursalesSeleccionadasPromo = (this.listaSucursales && this.listaSucursales.length > 0)
      ? this.listaSucursales.map(s => {
          const sId = Number(s.id || 1);
          const match = promo.disponibilidad?.find(d => d.sucursalId === sId);
          return {
            sucursalId: sId,
            nombre: s.nombre,
            activo: match ? match.activo : (sId === promo.sucursalId ? promo.activo : true)
          };
        })
      : [{ sucursalId: promo.sucursalId || 1, nombre: 'Sede Actual', activo: promo.activo }];
    this.nuevoItemPromoProductoId = this.listaProductos[0]?.id || null;
    this.nuevoItemPromoCantidad = 1;
    this.mostrarModalPromo = true;
    this.recalcularPrecioReferencialPromo();
  }

  obtenerItemsPromo(promo: Promocion): PromocionItem[] {
    if (!promo || !promo.itemsIncluidos) return [];
    if (Array.isArray(promo.itemsIncluidos)) return promo.itemsIncluidos;
    if (typeof promo.itemsIncluidos === 'string') {
      try {
        const parsed = JSON.parse(promo.itemsIncluidos);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  agregarItemAComboPromo(): void {
    if (!this.nuevoItemPromoProductoId) return;
    const producto = this.listaProductos.find((p) => p.id === Number(this.nuevoItemPromoProductoId));
    if (!producto) return;

    const existente = this.promoItemsSeleccionados.find((it) => it.productoId === producto.id);
    if (existente) {
      existente.cantidad += Number(this.nuevoItemPromoCantidad) || 1;
    } else {
      this.promoItemsSeleccionados.push({
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: Number(this.nuevoItemPromoCantidad) || 1
      });
    }

    this.recalcularPrecioReferencialPromo();
  }

  quitarItemDeComboPromo(index: number): void {
    this.promoItemsSeleccionados.splice(index, 1);
    this.recalcularPrecioReferencialPromo();
  }

  recalcularPrecioReferencialPromo(): void {
    const totalOriginal = this.promoItemsSeleccionados.reduce((sum, it) => {
      const prod = this.listaProductos.find((p) => p.id === it.productoId);
      return sum + (prod ? Number(prod.precio) * (Number(it.cantidad) || 1) : 0);
    }, 0);

    // Sumar automáticamente del costo/precio de todos los platos que componen el combo
    if (this.promoItemsSeleccionados.length > 0) {
      this.formPromo.precioOriginal = Number(totalOriginal.toFixed(2));
    } else {
      this.formPromo.precioOriginal = 0;
    }

    if (this.formPromo.precioOriginal > 0 && this.formPromo.precioPromo > 0) {
      const ahorro = this.formPromo.precioOriginal - this.formPromo.precioPromo;
      const pct = Math.round((ahorro / this.formPromo.precioOriginal) * 100);
      this.formPromo.descuentoPorcentaje = Math.max(0, pct);
    } else {
      this.formPromo.descuentoPorcentaje = 0;
    }
  }

  guardarPromo(): void {
    if (!this.formPromo.nombre.trim()) {
      this.mostrarToast('El nombre de la promoción es obligatorio', true);
      return;
    }
    if (this.formPromo.precioPromo <= 0) {
      this.mostrarToast('El precio promocional debe ser mayor a 0', true);
      return;
    }

    this.recalcularPrecioReferencialPromo();

    const payload: CrearPromocionDTO = {
      ...this.formPromo,
      sucursalId: this.sucursalId || this.perfil?.sucursalId || 1,
      nombre: this.formPromo.nombre.trim(),
      descripcion: this.formPromo.descripcion?.trim() || null,
      itemsIncluidos: this.promoItemsSeleccionados,
      fechaInicio: this.formPromo.fechaInicio || null,
      fechaFin: this.formPromo.fechaFin || null,
      sucursalesDisponibles: this.sucursalesSeleccionadasPromo
    };

    if (this.modoEdicionPromo && this.promoSeleccionadaId !== null) {
      this.productoRepo.actualizarPromocion(this.promoSeleccionadaId, payload).subscribe({
        next: (actualizada) => {
          this.mostrarToast(`Promoción "${actualizada.nombre}" actualizada con éxito`);
          this.mostrarModalPromo = false;
          this.cargarTodo();
        },
        error: (err) => {
          this.mostrarToast(err.error?.message || 'Error al actualizar promoción', true);
        }
      });
    } else {
      this.productoRepo.crearPromocion(payload).subscribe({
        next: (nueva) => {
          this.mostrarToast(`Promoción "${nueva.nombre}" creada y lista para ofrecerse`);
          this.mostrarModalPromo = false;
          this.cargarTodo();
        },
        error: (err) => {
          this.mostrarToast(err.error?.message || 'Error al crear promoción', true);
        }
      });
    }
  }

  alternarActivoPromo(promo: Promocion, event: Event): void {
    event.stopPropagation();
    const previo = promo.activo;
    promo.activo = !previo;

    this.productoRepo.toggleActivoPromocion(promo.id, this.sucursalId).subscribe({
      next: (res) => {
        promo.activo = res.activo;
        if (promo.disponibilidad) {
          const d = promo.disponibilidad.find(item => item.sucursalId === (res.sucursalId || this.sucursalId));
          if (d) d.activo = res.activo;
        }
        this.mostrarToast(res.activo ? `Promoción "${promo.nombre}" ACTIVADA en la sede` : `Promoción "${promo.nombre}" PAUSADA / OCULTA en la sede`);
      },
      error: () => {
        promo.activo = previo;
        this.mostrarToast('Error al cambiar estado de la promoción', true);
      }
    });
  }

  solicitarEliminarPromo(promo: Promocion, event: Event): void {
    event.stopPropagation();
    this.itemAEliminar = { tipo: 'promo', id: promo.id, nombre: promo.nombre };
    this.mostrarModalConfirmacionEliminar = true;
  }

  // =========================================================================
  // GESTIÓN DE CATEGORÍAS (TIPOS DE PLATO)
  // =========================================================================

  abrirCrearCategoria(): void {
    this.modoEdicionCategoria = false;
    this.categoriaSeleccionadaId = null;
    this.formCategoria = {
      nombre: '',
      descripcion: '',
      esCocina: true,
      ordenVisual: this.listaCategorias.length + 1,
      activo: true
    };
    this.mostrarModalCategoria = true;
  }

  abrirEditarCategoria(cat: Categoria): void {
    this.modoEdicionCategoria = true;
    this.categoriaSeleccionadaId = cat.id;
    this.formCategoria = {
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      esCocina: cat.esCocina ?? true,
      ordenVisual: cat.ordenVisual || 1,
      activo: cat.activo
    };
    this.mostrarModalCategoria = true;
  }

  guardarCategoria(): void {
    if (!this.formCategoria.nombre.trim()) {
      this.mostrarToast('El nombre de la categoría es obligatorio', true);
      return;
    }

    const payload: CrearCategoriaDTO = {
      ...this.formCategoria,
      sucursalId: this.sucursalId || this.perfil?.sucursalId || 1,
      nombre: this.formCategoria.nombre.trim(),
      descripcion: this.formCategoria.descripcion?.trim() || null
    };

    if (this.modoEdicionCategoria && this.categoriaSeleccionadaId !== null) {
      this.productoRepo.actualizarCategoria(this.categoriaSeleccionadaId, payload).subscribe({
        next: (actualizada) => {
          this.mostrarToast(`Categoría "${actualizada.nombre}" actualizada`);
          this.mostrarModalCategoria = false;
          this.cargarTodo();
        },
        error: (err) => this.mostrarToast(err.error?.message || 'Error al actualizar categoría', true)
      });
    } else {
      this.productoRepo.crearCategoria(payload).subscribe({
        next: (nueva) => {
          this.mostrarToast(`Categoría "${nueva.nombre}" registrada`);
          this.mostrarModalCategoria = false;
          this.cargarTodo();
        },
        error: (err) => this.mostrarToast(err.error?.message || 'Error al crear categoría', true)
      });
    }
  }

  alternarActivoCategoria(cat: Categoria, event: Event): void {
    event.stopPropagation();
    const previo = cat.activo;
    cat.activo = !previo;

    this.productoRepo.toggleActivoCategoria(cat.id).subscribe({
      next: (res) => {
        cat.activo = res.activo;
        this.mostrarToast(res.activo ? `Categoría "${cat.nombre}" activada` : `Categoría "${cat.nombre}" ocultada`);
      },
      error: () => {
        cat.activo = previo;
        this.mostrarToast('Error al cambiar visibilidad de la categoría', true);
      }
    });
  }

  // =========================================================================
  // GESTIÓN DE INSUMOS
  // =========================================================================

  abrirCrearInsumo(): void {
    this.modoEdicionInsumo = false;
    this.insumoSeleccionadoId = null;
    this.formInsumo = {
      nombre: '',
      unidadMedida: 'kg',
      stock: 0,
      stockMinimo: 5,
      activo: true
    };
    this.mostrarModalInsumo = true;
  }

  abrirEditarInsumo(ins: Insumo): void {
    this.modoEdicionInsumo = true;
    this.insumoSeleccionadoId = ins.id;
    this.formInsumo = {
      nombre: ins.nombre,
      unidadMedida: ins.unidadMedida,
      stock: ins.stock,
      stockMinimo: ins.stockMinimo,
      activo: ins.activo
    };
    this.mostrarModalInsumo = true;
  }

  guardarInsumo(): void {
    if (!this.formInsumo.nombre.trim()) {
      this.mostrarToast('El nombre del insumo es obligatorio', true);
      return;
    }

    const payload: CrearInsumoDTO = {
      ...this.formInsumo,
      sucursalId: this.sucursalId || this.perfil?.sucursalId || 1,
      nombre: this.formInsumo.nombre.trim(),
      unidadMedida: this.formInsumo.unidadMedida.trim()
    };

    if (this.modoEdicionInsumo && this.insumoSeleccionadoId !== null) {
      this.productoRepo.actualizarInsumo(this.insumoSeleccionadoId, payload).subscribe({
        next: (actualizado) => {
          this.mostrarToast(`Insumo "${actualizado.nombre}" actualizado`);
          this.mostrarModalInsumo = false;
          this.cargarTodo();
        },
        error: (err) => this.mostrarToast(err.error?.message || 'Error al actualizar insumo', true)
      });
    } else {
      this.productoRepo.crearInsumo(payload).subscribe({
        next: (nuevo) => {
          this.mostrarToast(`Insumo "${nuevo.nombre}" registrado`);
          this.mostrarModalInsumo = false;
          this.cargarTodo();
        },
        error: (err) => this.mostrarToast(err.error?.message || 'Error al crear insumo', true)
      });
    }
  }

  alternarActivoInsumo(ins: Insumo, event: Event): void {
    event.stopPropagation();
    const previo = ins.activo;
    ins.activo = !previo;

    this.productoRepo.toggleActivoInsumo(ins.id).subscribe({
      next: (res) => {
        ins.activo = res.activo;
        this.mostrarToast(res.activo ? `Insumo "${ins.nombre}" activado` : `Insumo "${ins.nombre}" pausado / ocultado`);
      },
      error: () => {
        ins.activo = previo;
        this.mostrarToast('Error al cambiar visibilidad del insumo', true);
      }
    });
  }

  // =========================================================================
  // CONFIRMACIÓN DE ELIMINACIÓN GENERAL
  // =========================================================================

  ejecutarEliminacion(): void {
    if (!this.itemAEliminar) return;

    const { tipo, id, nombre } = this.itemAEliminar;

    if (tipo === 'plato') {
      this.productoRepo.eliminarProducto(id).subscribe({
        next: () => {
          this.mostrarToast(`Plato "${nombre}" retirado de la carta`);
          this.mostrarModalConfirmacionEliminar = false;
          this.cargarTodo();
        },
        error: (err) => this.mostrarToast(err.error?.message || 'Error al retirar plato', true)
      });
    } else if (tipo === 'promo') {
      this.productoRepo.eliminarPromocion(id).subscribe({
        next: () => {
          this.mostrarToast(`Promoción "${nombre}" eliminada`);
          this.mostrarModalConfirmacionEliminar = false;
          this.cargarTodo();
        },
        error: (err) => this.mostrarToast(err.error?.message || 'Error al eliminar promoción', true)
      });
    }
  }

  obtenerNombreSucursal(id?: number | null): string {
    if (!id) return 'Todas las Sedes';
    const suc = this.listaSucursales.find((s) => s.id === id);
    return suc?.nombre || `Sede #${id}`;
  }

  obtenerGradienteAvatar(plato: Producto): string {
    const nombre = (plato.nombre || '').toLowerCase();
    const cat = (plato.categoriaNombre || '').toLowerCase();

    if (nombre.includes('pollo') || cat.includes('pollo') || nombre.includes('brasa')) {
      return 'linear-gradient(135deg, #ff7e47 0%, #ea580c 100%)';
    }
    if (nombre.includes('cevic') || nombre.includes('pescad') || nombre.includes('marisc')) {
      return 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)';
    }
    if (nombre.includes('lomo') || nombre.includes('carne') || nombre.includes('bistec') || nombre.includes('parrill')) {
      return 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)';
    }
    if (cat.includes('bebid') || nombre.includes('chicha') || nombre.includes('gaseosa') || nombre.includes('jugo')) {
      return 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)';
    }
    if (cat.includes('cervez') || nombre.includes('pilsen') || nombre.includes('cusqueña') || nombre.includes('trago')) {
      return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    }
    return 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
  }

  obtenerClaseCategoria(categoriaNombre?: string): string {
    if (!categoriaNombre) return 'cat-badge-default';
    const c = categoriaNombre.toLowerCase();
    if (c.includes('pollo')) return 'cat-badge-pollo';
    if (c.includes('bebid')) return 'cat-badge-bebida';
    if (c.includes('cervez') || c.includes('bar') || c.includes('licor')) return 'cat-badge-cerveza';
    if (c.includes('carta') || c.includes('crioll')) return 'cat-badge-carta';
    if (c.includes('guarni') || c.includes('entrad')) return 'cat-badge-guarnicion';
    return 'cat-badge-default';
  }

  obtenerIconoCategoria(categoriaNombre?: string): string {
    if (!categoriaNombre) return '🍽️';
    const c = categoriaNombre.toLowerCase();
    if (c.includes('pollo')) return '🍗';
    if (c.includes('bebid')) return '🍹';
    if (c.includes('cervez') || c.includes('bar')) return '🍺';
    if (c.includes('carta')) return '🍲';
    if (c.includes('guarni')) return '🍟';
    return '🍽️';
  }
}
