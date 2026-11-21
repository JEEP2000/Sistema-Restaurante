# Scripts de Migración e Historial de Base de Datos

Esta carpeta contiene los scripts ejecutados para la evolución del esquema en SQL Server durante el desarrollo.

> [!NOTE]
> Estos scripts son utilitarios de migración que se ejecutaron una sola vez. **No se ejecutan en tiempo de ejecución del servidor web** (`npm run dev`) y no consumen recursos ni afectan la velocidad del sistema. Se preservan con fines de auditoría, trazabilidad e instalación en nuevos entornos.

---

## 📄 Contenido de los Scripts:

### 1. `migration_cantidad_lista.js`
* **Propósito:** Agrega la columna `CantidadLista` a la tabla `dbo.Detalles_Pedido`.
* **Función:** Permite que la cocina despache platos de forma parcial (por ejemplo, si una mesa pide 5 ceviches, el cocinero puede marcar que 3 ya están listos y 2 pendientes).
* **Sincronización:** Inicializa `CantidadLista = Cantidad` para los pedidos ya marcados como listos.

### 2. `migration_cocina_tiempos.js`
* **Propósito:** Agrega columnas de auditoría y métricas de tiempo a `dbo.Detalles_Pedido`:
  - `FechaCheckCocina`: Marca temporal exacta en que el cocinero termina de preparar el plato.
  - `SegundosDemorados`: Tiempo transcurrido en segundos desde la orden hasta el despacho para analítica KDS.

### 3. `migrate-multi-sede.ts`
* **Propósito:** Crea las tablas relacionales `dbo.Producto_Sucursales` y `dbo.Promocion_Sucursales`.
* **Función:** Permite que cada sucursal/sede active, desactive o gestione precios y menú del día de forma independiente sin duplicar el catálogo maestro de platos ni promociones.

---

## 🛠️ Cómo ejecutar una migración en un nuevo servidor:
Si despliegas la base de datos en un nuevo servidor o equipo:
```bash
node scripts/migration_cantidad_lista.js
node scripts/migration_cocina_tiempos.js
npx tsx scripts/migrate-multi-sede.ts
```

