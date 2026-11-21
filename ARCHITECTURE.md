# 🏛️ ARQUITECTURA, PRINCIPIOS, MÉTODOS Y NORMAS DEL PROYECTO

> **⚠️ AVISO OBLIGATORIO PARA CUALQUIER AGENTE DE IA O DESARROLLADOR:**  
> Este documento contiene la **especificación arquitectónica oficial y estricta** de este repositorio.  
> Antes de realizar cualquier cambio, agregar una característica o refactorizar código, **DEBES LEER Y CUMPLIR** todas las normas, patrones y restricciones aquí descritas.  
> **Queda estrictamente prohibido** inventar arquitecturas alternativas, mezclar capas, colocar lógica de negocio en la interfaz, consumir la base de datos o APIs directamente sin pasar por puertos/adaptadores, o degradar la visualización de escritorio al hacer adaptaciones responsivas.

---

## 📑 Tabla de Contenidos
1. [Visión General del Sistema y Stack Tecnológico](#1-visión-general-del-sistema-y-stack-tecnológico)
2. [Arquitectura Hexagonal (Puertos y Adaptadores)](#2-arquitectura-hexagonal-puertos-y-adaptadores)
   - [Estructura de Capas](#estructura-de-capas)
   - [Flujo de Información Unidireccional](#flujo-de-información-unidireccional)
   - [Estructura en Backend](#estructura-en-backend)
   - [Estructura en Frontend](#estructura-en-frontend)
3. [Principios SOLID Aplicados](#3-principios-solid-aplicados)
4. [Patrones de Diseño y Métodos de Ingeniería](#4-patrones-de-diseño-y-métodos-de-ingeniería)
5. [Normas de Base de Datos y Persistencia (SQL Server)](#5-normas-de-base-de-datos-y-persistencia-sql-server)
6. [Normas de Frontend (Angular 17+ & UI/UX)](#6-normas-de-frontend-angular-17-uiux)
7. [Normas de Responsividad (Regla de Oro PC vs Móvil)](#7-normas-de-responsividad-regla-de-oro-pc-vs-móvil)
8. [Seguridad y Control de Acceso Basado en Roles (RBAC)](#8-seguridad-y-control-de-acceso-basado-en-roles-rbac)
9. [Directorio de Rutas y Archivos Clave](#9-directorio-de-rutas-y-archivos-clave)
10. [🚫 Los 10 Mandamientos: Lo que NUNCA debes hacer](#10--los-10-mandamientos-lo-que-nunca-debes-hacer)

---

## 1. Visión General del Sistema y Stack Tecnológico

El proyecto es un **Sistema Integral de Gestión de Restaurante Multi-Sede**, diseñado para operar con alta concurrencia en tiempo real (meseros, cocina, caja y administración).

### Stack Técnico:
* **Frontend:**
  * **Framework:** Angular 17+ con **Standalone Components** (sin `NgModule`).
  * **Lenguaje:** TypeScript estricto.
  * **Estilos:** Vanilla CSS puro centralizado en `src/styles.css` con variables CSS globales, Glassmorphism oscuro y diseño ultra-responsivo.
  * **Estado y Reactividad:** RxJS (`Observable`, `Subject`, `BehaviorSubject`) e inyección moderna con `inject()`.
* **Backend:**
  * **Entorno:** Node.js con Express y TypeScript.
  * **Comunicación en Tiempo Real:** Socket.IO / WebSockets para cocina, comandas y alertas de caja.
  * **Seguridad:** JSON Web Tokens (JWT) y bcrypt para contraseñas.
* **Base de Datos:**
  * **Motor:** Microsoft SQL Server (Transact-SQL).
  * **Driver:** `mssql` con Connection Pool de alta concurrencia (5 a 50 conexiones simultáneas), consultas 100% parametrizadas y transacciones atómicas.

---

## 2. Arquitectura Hexagonal (Puertos y Adaptadores)

Tanto el **Backend** como el **Frontend** implementan rigurosamente la **Arquitectura Hexagonal (Clean Architecture / Ports & Adapters)**.

```
       PRESENTACIÓN / HTTP CLIENT (Driving Adapters)
                           │
                           ▼
          PUERTOS DE ENTRADA (ports/in - Use Cases)
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │        CAPA DE APLICACIÓN            │
        │   (Servicios y Casos de Uso)        │
        │                  │                   │
        │                  ▼                   │
        │          CAPA DE DOMINIO             │
        │    (Entidades, Modelos, DTOs)        │
        └──────────────────────────────────────┘
                           │
                           ▼
          PUERTOS DE SALIDA (ports/out - Repository Interfaces)
                           │
                           ▼
       INFRAESTRUCTURA / DB / APIs (Driven Adapters)
```

### Estructura de Capas:

### 1. Capa de Dominio (`domain/`):
* **Responsabilidad:** Modela la realidad del restaurante (entidades, tipos, valores de negocio).
* **Regla estricta:** Es **100% pura y agnóstica**. No importa nada de Angular, Express, SQL Server, HTTP ni librerías de terceros.
* **Ubicaciones:**
  * Backend: `backend/src/domain/models/`
  * Frontend: `frontend/src/app/domain/models/`

### 2. Capa de Aplicación (`application/`):
* **Responsabilidad:** Contiene los casos de uso y la lógica de negocio. Orquesta qué debe ocurrir cuando un usuario o evento ejecuta una acción.
* **Componentes:**
  * **Puertos de Entrada (`ports/in/`):** Interfaces o clases abstractas que declaran las operaciones que el exterior puede invocar (ej. `CrearPedidoUseCase`, `GetMesasUseCase`).
  * **Puertos de Salida (`ports/out/`):** Interfaces abstractas que declaran qué necesita la aplicación del exterior para persistir o consultar datos (ej. `MesaRepositoryPort`, `PedidoRepositoryPort`).
  * **Servicios de Aplicación (`services/`):** Implementan o coordinan los casos de uso inyectando los puertos de salida en su constructor.
* **Regla estricta:** La aplicación solo conoce al Dominio y a sus propios Puertos. Jamás conoce bases de datos, librerías HTTP o frameworks UI.

### 3. Capa de Infraestructura (`infrastructure/`):
* **Responsabilidad:** Comunica la aplicación con el mundo exterior (bases de datos, frameworks, redes).
* **Componentes:**
  * **Adaptadores de Entrada (`adapters/in/`):** Adaptadores conductores (Driving). Controladores Express (`auth.controller.ts`, `mesa.controller.ts`), rutas HTTP, listeners de WebSockets.
  * **Adaptadores de Salida (`adapters/out/`):** Adaptadores conducidos (Driven). Implementan los puertos `ports/out`. Ejemplos: `sql-pedido-repository.adapter.ts` en backend (ejecuta T-SQL en SQL Server) o `http-pedido.repository.adapter.ts` en frontend (ejecuta llamadas `HttpClient`).
  * **Contenedor / Inyección de Dependencias (Composition Root):**
    * Backend: `backend/src/infrastructure/container.ts` ensambla las instancias de adaptadores y las inyecta en los servicios y controladores.
    * Frontend: `frontend/src/app/infrastructure/providers/` utiliza `InjectionToken` y arrays de `Provider` para vincular cada `Port` con su `Adapter`.

### 4. Capa de Presentación (`presentation/` - Exclusiva del Frontend):
* **Responsabilidad:** Interfaz gráfica de usuario en Angular.
* **Componentes:**
  * Páginas (`pages/`): `login`, `register`, `dashboard`.
  * Modales (`componentes/modales/`): `tomar-pedido-modal`, `pedido-activo-modal`, `cobro-modal`, `crear-mesa-modal`, etc.
  * Guardias (`guards/`): `auth.guard.ts`.
  * Interceptores (`interceptors/`): `jwt.interceptor.ts`.
* **Regla estricta:** Los componentes de Angular **NUNCA consumen `HttpClient` directamente ni hacen fetch a URLs**. Siempre inyectan los **Casos de Uso (`ports/in`)** a través de `inject(NombreCasoDeUso)`.

---

## 3. Principios SOLID Aplicados

Cualquier cambio de código debe honrar estos 5 principios:

1. **S - Single Responsibility Principle (Responsabilidad Única):**
   * Cada caso de uso tiene **un solo propósito de negocio** (ejemplo: `MarcarBebidaEntregadaUseCase` solo marca la entrega de una bebida; no procesa pagos ni calcula estadísticas).
   * Cada componente o controlador solo gestiona su vista o su endpoint respectivo.
2. **O - Open/Closed Principle (Abierto/Cerrado):**
   * El sistema está abierto a la extensión y cerrado a la modificación mediante **Puertos**.
   * Si en el futuro se migra de SQL Server a PostgreSQL, o de `HttpClient` a GraphQL, **no se toca una sola línea del dominio ni de los casos de uso**; únicamente se añade un nuevo adaptador en `infrastructure/adapters/out/`.
3. **L - Liskov Substitution Principle (Sustitución de Liskov):**
   * Cualquier adaptador que implemente `PedidoRepositoryPort` puede sustituir a cualquier otro sin que la aplicación falle ni detecte diferencias en el contrato.
4. **I - Interface Segregation Principle (Segregación de Interfaces):**
   * En lugar de un repositorio gigante `RestaurantRepositoryPort`, existen puertos específicos y atómicos: `MesaRepositoryPort`, `PedidoRepositoryPort`, `KitchenRepositoryPort`, `ProductoRepositoryPort`, `SucursalRepositoryPort`.
5. **D - Dependency Inversion Principle (Inversión de Dependencias):**
   * Los módulos de alto nivel (Dominio y Aplicación) **no dependen** de los de bajo nivel (Infraestructura / Frameworks). Ambos dependen de **abstracciones (Puertos)**.
   * La inyección de dependencias se centraliza en `container.ts` (Backend) y en los providers de Angular (Frontend).

---

## 4. Patrones de Diseño y Métodos de Ingeniería

* **Ports & Adapters Pattern:** Aislamiento total del núcleo del negocio.
* **Repository Pattern:** Abstracción del acceso a datos. La aplicación interactúa con colecciones conceptuales de entidades sin importar la sintaxis SQL subyacente.
* **DTO (Data Transfer Object):** Los datos que entran o salen del sistema se validan y encapsulan en interfaces DTO (ejemplo: `CrearPedidoDTO`, `ProcesarPagoDTO`), desacoplando el esquema de la base de datos de la interfaz de usuario.
* **Composition Root Pattern:** La instanciación de dependencias se hace en un único punto controlado (`container.ts` y `app.config.ts`), evitando el uso de `new` descontrolado en controladores o componentes.
* **HTTP Interceptor Pattern:** `jwtInterceptor` adjunta automáticamente el token Bearer en los encabezados HTTP sin duplicar código en cada servicio.
* **Guards / Route Protection:** `authGuard` valida tokens JWT y redirige a `/login` si la sesión no es válida.
* **Multi-Branch Isolation (Multi-Sede):** Toda consulta y operación de mesas, pedidos o productos debe estar filtrada explícitamente por `sucursalId`.

---

## 5. Normas de Base de Datos y Persistencia (SQL Server)

* **Motor:** Microsoft SQL Server.
* **Configuración del Pool (`backend/src/config/database.ts`):**
  * Pool de 5 a 50 conexiones concurrentes (`DB_POOL_MIN=5`, `DB_POOL_MAX=50`).
  * `idleTimeoutMillis: 30000`, `acquireTimeoutMillis: 15000`.
  * Manejador de evento `pool.on('error')` con auto-reconexión limpia ante interrupciones.
* **Consultas Parametrizadas Obligatorias:**
  * **PROHIBIDO** concatenar cadenas SQL directamente (`query = "SELECT * FROM ... WHERE id = " + id`).
  * **OBLIGATORIO** usar `request.input('paramName', sql.Tipo, valor)` para prevenir ataques de Inyección SQL.
* **Transacciones Atómicas (`sql.Transaction`):**
  * Toda operación que afecte múltiples tablas de forma coordinada (ej. crear cabecera de pedido + insertar detalles de pedido + cambiar estado de mesa a 'Ocupada') **debe ejecutarse dentro de una transacción con `transaction.begin()`, `transaction.commit()` y `transaction.rollback()` en el bloque `catch`**.

---

## 6. Normas de Frontend (Angular 17+ & UI/UX)

* **Standalone Components:**
  * Todo componente se declara con `standalone: true`.
  * Se declaran sus dependencias explícitas en `imports: [CommonModule, FormsModule, ...]`.
  * **PROHIBIDO** crear o usar módulos `NgModule`.
* **Inyección de Casos de Uso:**
  * Los componentes obtienen sus casos de uso mediante la función `inject()`:
    ```typescript
    private getMesasUseCase = inject(GetMesasUseCase);
    private crearPedidoUseCase = inject(CrearPedidoUseCase);
    ```
* **Sistema de Diseño y Estilos (`styles.css`):**
  * Todos los estilos residen en `frontend/src/styles.css`.
  * Usar la paleta de colores CSS Tokens definidos al inicio del archivo:
    * `--primary`: `#ff7e47` (Naranja vibrante de acción principal).
    * `--bg-dark`: `#0e0b1c` (Fondo general ultra oscuro).
    * `--card-bg`: `#171428` (Fondo de tarjetas y modales).
    * `--color-success`: `#10b981` / `--color-danger`: `#ef4444`.
  * **PROHIBIDO** instalar o usar TailwindCSS ni librerías de estilos pesadas que choquen con el diseño existente.

---

## 7. Normas de Responsividad (Regla de Oro: PC vs Móvil)

> **⚠️ REGLA CARDINAL DE RESPONSIVIDAD:**  
> **"Hacer que el sistema sea responsive NO significa encoger las cosas en PC."**  
> Cuando un usuario usa una computadora de escritorio o laptop, la interfaz debe sentirse espaciosa, amplia, ergonómica y cómoda. Al volver de una vista móvil a PC, la pantalla de PC **NUNCA DEBE REDUCIRSE NI DEGRADARSE**.

### Comportamiento por Dispositivo:
1. **En Pantallas de PC y Laptops (> 768px / 992px):**
   * Ancho generoso y espacioso (ej. modales de 940px a 1160px de ancho).
   * Padding interior estándar de 24px.
   * Filas de productos en una sola línea completa: Badge de cantidad y nombre del plato a la izquierda, estado de cocina/entrega y precio al extremo derecho.
   * Botones de acción alineados lado a lado (`Cerrar` a la izquierda, `Anular / Confirmar` a la derecha).
2. **En Pantallas Móviles y Tablets (≤ 768px):**
   * El modal utiliza el 100% del ancho de la pantalla (`width: 100%`) con padding de overlay reducido a `10px` para aprovechar el espacio táctil.
   * **Reflow fluido en 2 niveles para filas de items (`active-item-row`):**
     * **Nivel 1:** Cantidad `[ 1x ]` + Nombre del plato a todo el ancho (sin cortar nombres largos ni chocar con badges).
     * **Nivel 2:** Badge de estado (`Listo en cocina` / `✓ Entregado`) a la izquierda + Precio (`$25.00`) a la derecha, **100% dentro de la tarjeta**.
   * Botones del pie y de pre-cuenta se apilan verticalmente a ancho completo (`width: 100%`) facilitando el tap con el pulgar.
   * Menú lateral (`sidebar`) se convierte en un cajón deslizante off-canvas accionado por botón hamburguesa con backdrop oscuro.

---

## 8. Seguridad y Control de Acceso Basado en Roles (RBAC)

El sistema maneja 4 roles principales con permisos diferenciados:
1. **ADMINISTRADOR:** Acceso total (reportes, estadísticas, gestión de personal, sucursales, anulación de comandas, configuración).
2. **MESERO:** Visualización del plano de mesas, toma de pedidos, adición de platos a comandas activas, marcado de bebidas servidas, solicitud de pre-cuenta a caja.
3. **COCINERO (KITCHEN):** Vista exclusiva de comandas de cocina (`KITCHEN TICKET`), marcado de platos "En preparación" y "Listo en cocina". Modo solo lectura en cobros y mesas.
4. **CAJERO (CASHIER):** Bandeja de pedidos pendientes de cobro, procesamiento de pagos (Efectivo, Tarjeta, Yape/Plin), emisión de comprobantes (Boleta, Factura, Ticket) y liberación de mesas.

* **Frontend:** Control condicional en plantillas HTML (`*ngIf="puedeModificarPedido()"`, `*ngIf="puedeCobrar()"`).
* **Backend:** Validación de token mediante `auth.middleware.ts` y verificación de roles autorizados mediante `role.middleware.ts`.

---

## 9. Directorio de Rutas y Archivos Clave

```text
Restaurante/
├── AGENTS.md                                   # ESTE ARCHIVO (Directrices maestras)
├── ARCHITECTURE.md                             # Especificación técnica general
├── Creacion de BD Restaurante y Componentes.sql # Script SQL oficial de base de datos
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts                     # Pool concurrente SQL Server (5-50 conexiones)
│   │   ├── domain/
│   │   │   └── models/                         # Modelos puros: mesa, pedido, producto, user
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── in/                         # Interfaces de Casos de Uso
│   │   │   │   └── out/                        # Interfaces de Repositorios (Puertos)
│   │   │   └── services/                       # Servicios de lógica de negocio
│   │   ├── infrastructure/
│   │   │   ├── adapters/
│   │   │   │   ├── in/http/controllers/        # Controladores Express
│   │   │   │   └── out/db/                     # Adaptadores SQL Server con consultas T-SQL
│   │   │   └── container.ts                    # Composition Root (Inyección de dependencias)
│   │   └── server.ts                           # Arranque de Express y WebSockets
│
└── frontend/
    └── src/
        ├── styles.css                          # Sistema de diseño global Vanilla CSS
        └── app/
            ├── app.config.ts                   # Inyección global de HttpClient y Providers
            ├── app.routes.ts                   # Rutas protegidas con AuthGuard
            ├── domain/models/                  # Entidades TypeScript del frontend
            ├── application/
            │   └── ports/
            │       ├── in/                     # Casos de uso atómicos (1 archivo por acción)
            │       └── out/                    # Puertos de repositorios (Interfaces abstractas)
            ├── infrastructure/
            │   ├── adapters/out/               # Implementaciones HTTP con HttpClient
            │   └── providers/                  # InjectionTokens y cableado Angular
            └── presentation/
                ├── guards/                     # AuthGuard para control de sesión
                ├── interceptors/               # JwtInterceptor para token en cabeceras
                ├── pages/dashboard/            # Dashboard administrativo y operativo
                └── componentes/modales/        # Modales especializados desacoplados
```

---

## 10. 🚫 Los 10 Mandamientos: Lo que NUNCA debes hacer

1. **NUNCA consumas `HttpClient` directamente en un componente de Angular.** Debes llamar siempre a un Caso de Uso (`ports/in`).
2. **NUNCA escribas consultas SQL dentro de controladores o servicios en el backend.** Toda sentencia SQL pertenece exclusivamente a un adaptador en `infrastructure/adapters/out/db/`.
3. **NUNCA concatenes valores en consultas SQL.** Usa siempre parámetros tipados con `request.input()`.
4. **NUNCA rompas la vista de PC al hacer adaptaciones móviles.** Utiliza siempre Media Queries (`@media (max-width: 768px)`) para que los estilos móviles solo apliquen en pantallas pequeñas y la PC mantenga su diseño espacioso.
5. **NUNCA uses datos estáticos (hardcoded) para información que deba venir de la base de datos.** Mesas, categorías, productos, roles, precios y pedidos deben fluir dinámicamente desde SQL Server.
6. **NUNCA importes clases de `infrastructure` o `presentation` dentro de `domain`.** El Dominio debe permanecer 100% puro y desacoplado.
7. **NUNCA crees módulos `NgModule`.** En este proyecto todos los componentes de Angular son Standalone (`standalone: true`).
8. **NUNCA instales frameworks de CSS externos (Tailwind, Bootstrap, Material) sin autorización explícita.** Todo el diseño está unificado y optimizado en `src/styles.css`.
9. **NUNCA omitas el filtro de `sucursalId`.** Este sistema es multi-sede; omitir la sucursal provocará fuga o mezcla de datos entre restaurantes.
10. **NUNCA ejecutes operaciones transaccionales complejas sin `sql.Transaction`.** Si una parte de la comanda falla, todo debe revertirse limpiamente con `rollback()`.
