# INFORMACION DEL RESTAURANTE

**1. VISIÓN GENERAL DEL SISTEMA**

Sistema estándar, multi-tenant (vendible a múltiples restaurantes), que unifica la operación de un restaurante mixto (menú diurno, pollería nocturna y platos a la carta). Integra el flujo de atención en sala (mesero/cocina/caja) con un canal de venta online (Delivery) y un backend de gestión (inventario, estadísticas y auditoría).

El sistema es para un restaurante que quiero crear es estándar ya que este proyecto pienso venderlo a diversos restaurantes, el restaurante puede vender menú al medio día y pollo a la brasa en las noches y platos a la carta todo el día hasta que cierra, además vende gaseosa, cervezas, jugos, etc.

---

### **2. ARQUITECTURA Y ÁMBITOS**

- **Multi-sucursal:** Cada restaurante cliente puede tener N sucursales. Los precios, inventarios, mesas y promociones son independientes por sucursal.
- **Roles de usuario:**
    - **Administrador:** Acceso total (configuración, usuarios, reportes, inventario, mapas).
    - **Cajero:** Caja, cierres, gestión de pagos, anulaciones con motivo.
    - **Mesero:** Vista de mesas, toma de pedidos, entrega de platos/bebidas, cobro (solo consulta).
    - **Cocina:** Vista de cola de preparación, temporizador, gestión de inventario (consultas).
    - **Cliente (Web):** Solo para delivery, carrito de compras y seguimiento de pedido.

---

### **3. MODULOS FUNCIONALES (DETALLE POR ÁREA)**

#### **3.1. Gestión de Productos / Menú**

- **Categorías dinámicas:** "Platos a la carta", "Menú del día" (activo solo de 12pm a 3pm), "Pollo a la brasa" (activo solo de 7pm a 11pm), "Bebidas", "Cervezas".
- **Atributos críticos por producto:**
    - `requiere_coccion` (boolean): Define si aparece en pantalla de cocina.
    - `insumos_asociados` (array): Lista de ingredientes y cantidades para descontar del inventario.
    - `precio_venta`, `tiempo_estimado_preparacion`.

#### **3.2. Módulo de Mesas (Mapa Visual)**

- **Vista interactiva (Drag & Drop):** Los administradores pueden arrastrar mesas en un canvas para reubicarlas según la distribución real del local.
- **Estados de la mesa:** Libre (verde), Ocupada (rojo), Reservada (amarillo), En pago (azul).
- **Acción del mesero:** Al hacer clic en una mesa libre → se abre el formulario de pedido (nombre del cliente, selección de ítems).

#### **3.3. Toma de Pedido (Mesero)**

1. El mesero asigna nombre del cliente a la mesa.
2. Agrega ítems. Puede agregar modificaciones (ej. "sin cebolla", "pollo bien cocido").
3. Al enviar, el sistema genera un **Pedido Maestro** con estado `EN_PROCESO`.
4. El pedido se desglosa automáticamente en dos "sub-pedidos" lógicos:
    - **Sub-pedido de Cocina:** Solo ítems con `requiere_coccion = true`.
    - **Sub-pedido de Bebidas/Mesero:** Ítems sin cocción (gaseosas, cervezas).

#### **3.4. Pantalla de Cocina (KDS - Kitchen Display System)**

- **Vista en tiempo real:** Lista de platos pendientes, sin ver el total de la cuenta (solo n° de mesa, nombre del cliente y plato).
- **Flujo del cocinero:**
    1. Selecciona un plato de la lista.
    2. Ingresa su nombre (o selecciona de un listado de cocineros logueados) → el sistema marca "Atendiendo por: [Nombre]" y **inicia el temporizador**.
    3. Al terminar, pulsa **"Listo"**. El sistema detiene el temporizador, calcula el tiempo de preparación (para estadísticas) y envía **notificación push + sonido** al mesero asignado.
- **Check visual:** El plato se pone con fondo verde y se tacha de la cola activa.

#### **3.5. Pantalla de Mesero (Entrega y Gestión de Bebidas)**

- **Vista de pedidos activos** en sus mesas.
- **Entrega de bebidas:** El mesero puede marcar con un check cada bebida/ítem sin cocción en el momento que las sirve. Estos checks son **independientes** de los de cocina.
- **Recepción de alertas:** Cuando el cocinero marca "Listo", el mesero recibe la alerta en su pantalla. Retira el plato y lo entrega. *(No hay botón de "entregado" para platos, solo la confirmación de pago final libera la mesa).*

#### **3.6. Pantalla de Cajero (Pagos y Facturación)**

- **Búsqueda rápida:** El cajero ingresa N° de mesa + Nombre del cliente y visualiza el **pedido completo** (platos + bebidas), incluyendo todos los ítems y modificaciones.
- **Validación previa:** El sistema solo permite pagar si:
    - Los platos de cocina están en "Listo".
    - Las bebidas están marcadas como "Entregadas" por el mesero.
- **Métodos de pago:**
    - **Efectivo:** Cajero ingresa monto recibido → sistema calcula vuelto → pulsa "Pagar" → pedido cambia a `PAGADO`.
    - **Tarjeta (Pasarela PayPal):** Se genera un link de pago o se integra el lector. **Crítico:** El sistema **NO** marca como pagado hasta recibir el webhook de confirmación de PayPal. Si el webhook falla, el pedido queda en `PENDIENTE_DE_PAGO`.
- **Post-pago:** Al marcar `PAGADO`, la mesa se libera automáticamente y se actualiza en el mapa del mesero.

---

### **4. MÓDULO DELIVERY (Sistema Web para Cliente)**

- **Carrito de compras:** Cliente selecciona productos (respetando horarios de menú/pollo).
- **Cálculo de envío:** Según distancia o tarifa fija por sucursal.
- **Medio de pago:** Solo con tarjeta (PayPal/Stripe) por adelantado.
- **Integración interna:** Al confirmar el pago, el pedido cae en la **misma cola de cocina** y en la **pantalla del cajero** (como pedido "Delivery" en lugar de mesa). El mesero no interviene; el repartidor (o el mismo sistema) gestiona la entrega.

---

### **5. MÓDULO DE INVENTARIO**

- **Visible para:** Administrador y Cocinero (este último solo consulta).
- **Descuento automático:** Cuando un mesero o cliente web envía un pedido a cocina, el sistema **descuenta en tiempo real** los insumos asociados a cada plato.
- **Alertas de stock:**
    - **Stock bajo (umbral 15%):** Notificación amarilla en pantalla.
    - **Stock agotado (0):** Notificación roja y **bloquea** la venta del producto en el menú (tanto para mesero como para web).
- **Ajustes manuales:** El administrador puede hacer ingresos o ajustes por merma/rotura, quedando registrados en bitácora.

---

### **6. MÓDULO DE DASHBOARD Y ESTADÍSTICAS**

- **Reporte de ventas:** Diario, semanal, mensual, por sucursal.
- **Top de platos más vendidos** (con filtro por categoría).
- **Heatmap de ventas:** Días y horas de mayor facturación.
- **Rendimiento de personal:**
    - Meseros: Cantidad de clientes atendidos y facturación generada por mesa.
    - Cocineros: Tiempo promedio de preparación por plato y cantidad de platos preparados.
- **Gráficos interactivos** con descarga en Excel/PDF.

---

### **7. AUDITORÍA Y ANULACIONES (CON MOTIVO)**

- **Anulación de pedidos:** Solo disponible para **Administrador** o **Cajero con permiso especial**.
- **Motivos obligatorios:** (Cliente canceló, Error de ingreso del mesero, Producto en mal estado, Ensayo/Prueba).
- **Bitácora de auditoría:** Al anular, el sistema **NO elimina** el pedido de la BD. Solo cambia `estado = 'ANULADO'` y registra en una tabla `auditoria_anulaciones`:
    - `usuario_que_anula`, `fecha_hora`, `motivo`, `detalle_adicional` (texto libre), `monto_original`, `mesa_asociada`.
- **Trazabilidad total:** Cualquier administrador puede consultar el historial de anulaciones por fecha/usuario.

---

### **8. MÓDULO DE CIERRE DE CAJA (Z-READ / ARQUEO)**

Este módulo es **obligatorio** para que el cajero pueda finalizar su turno.

- **Acceso:** Solo el cajero logueado (o admin) puede iniciar un cierre.
- **Proceso:**
    1. El cajero selecciona "Iniciar Cierre de Turno".
    2. El sistema calcula automáticamente:
        - `Total de ventas en efectivo` (según pedidos pagados en efectivo en ese turno).
        - `Total de ventas con tarjeta`.
        - `Total de propinas` (si aplica).
        - `Total de anulaciones` en el turno.
    3. **Conteo físico:** El cajero debe ingresar el monto en efectivo que tiene físicamente en la caja (contado manual).
    4. El sistema compara el `efectivo esperado` vs `efectivo contado` y muestra una **diferencia (sobrante/faltante)**.
    5. Para finalizar, el cajero debe firmar digitalmente (o ingresar su contraseña) y el sistema:
        - Imprime el reporte de cierre (en ticket o PDF).
        - Cierra el turno (no permite nuevas ventas con ese usuario hasta que un admin reabra la caja o inicie otro turno).
        - Guarda el arqueo en tabla `cierres_caja` para auditoría.

---

### **9. NOTIFICACIONES Y TEMPORIZADOR (TIEMPO REAL)**

- **Tecnología:** WebSockets (Socket.io) para evitar recargas de página.
- **Eventos con Push + Sonido:**
    - Cocinero: Pedido nuevo asignado.
    - Mesero: Plato listo para retirar.
    - Cajero: Pago confirmado por webhook (tarjeta) o pago en efectivo realizado.
- **Temporizador de cocina:** Inicia cuando el cocinero pulsa "Atendiendo por". Se visualiza en la misma tarjeta del plato (en minutos/segundos). Sirve para calcular KPIs de eficiencia.