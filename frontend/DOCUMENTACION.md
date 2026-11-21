# Documentación Técnica: Arquitectura y Construcción Paso a Paso

Este documento explica de forma exhaustiva la estructura del frontend del restaurante, los patrones de diseño aplicados y la secuencia exacta en que se crearon los componentes del sistema.

---

## 🏛️ 1. Estructura y Arquitectura (Arquitectura Hexagonal)

Hemos implementado **Arquitectura Hexagonal (Puertos y Adaptadores)** para separar claramente las reglas de negocio de la tecnología o framework utilizado (Angular). Esto permite que el dominio central sea totalmente reutilizable, comprobable y desacoplado.

La aplicación se organiza en tres capas principales:

```text
src/app/
├── core/                               # 1. CAPA DE DOMINIO (LÓGICA PURA)
│   ├── models/                         # Modelos y entidades de negocio
│   ├── ports/                          # Puertos: Interfaces abstractas de entrada y salida
│   └── use-cases/                      # Casos de Uso: Acciones directas del negocio
│
├── infrastructure/                     # 2. CAPA DE INFRAESTRUCTURA (ADAPTADORES SECUNDARIOS)
│   ├── adapters/                       # Adaptadores concretos (Http, LocalStorage)
│   └── providers/                      # Proveedores de inyección para conectar Puertos a Adaptadores
│
└── presentation/                       # 3. CAPA DE PRESENTACIÓN (ADAPTADORES PRIMARIOS)
    ├── components/                     # Componentes compartidos
    ├── guards/                         # Vigilantes de acceso a rutas
    ├── interceptors/                   # Interceptores de peticiones HTTP
    └── pages/                          # Vistas completas (Login, Register, Dashboard)
```

---

## 🎨 2. Patrones de Diseño Aplicados

Para lograr un sistema desacoplado, escalable y robusto, implementamos los siguientes patrones:

1. **Inversión de Dependencias (Dependency Inversion Principle - DIP)**: Las clases de dominio (Casos de Uso) no dependen directamente del cliente HTTP de Angular ni del objeto `window.localStorage`. Dependen de interfaces abstractas (**Ports**). A nivel de infraestructura, configuramos la inyección para asociar dichas interfaces a sus implementaciones (**Adapters**).
2. **Patrón Repositorio (Repository Pattern)**: El puerto `AuthRepositoryPort` abstrae el origen de los datos de autenticación, ocultando si se consumen mediante llamadas REST API, GraphQL o simulación en memoria.
3. **Patrón Estrategia (Strategy Pattern)**: Las implementaciones concretas (`HttpAuthRepositoryAdapter` y `LocalStorageTokenAdapter`) actúan como estrategias intercambiables que implementan las firmas abstractas de los puertos.
4. **Patrón Caso de Uso / Comando (Use Case Pattern)**: Cada flujo de negocio se encapsula en una clase única con una sola responsabilidad (p. ej. `LoginUseCase`), facilitando el mantenimiento y las pruebas unitarias.
5. **Patrón Singleton**: Angular gestiona la inyección de dependencias como instancias únicas (Singletons) a través de sus proveedores de servicios a nivel raíz.
6. **Patrón Interceptor (HTTP Filter/Interceptor)**: `jwtInterceptor` intercepta automáticamente las peticiones de red salientes para inyectar los encabezados de autorización sin repetir lógica en cada servicio.
7. **Patrón Guard / Chain of Responsibility**: `authGuard` decide si se permite continuar con la navegación de una ruta específica analizando de forma secuencial la existencia y vigencia de la sesión.

---

## ⏳ 3. Guía Paso a Paso de la Creación (Orden Cronológico Exacto)

A continuación se detalla la secuencia cronológica exacta de cómo se crearon cada uno de los archivos del frontend:

### Paso 1: Inicialización del Espacio de Trabajo
Ejecutamos la creación del proyecto desde la raíz del frontend usando Angular CLI configurando opciones no interactivas:
* **Comando**: `npx -y @angular/cli new frontend --directory . --style css --routing true --ssr false --standalone true --package-manager npm --defaults`
* **Resultado**: Se crearon los archivos de configuración (`angular.json`, `package.json`, `tsconfig.json`) y el esqueleto base del proyecto.

### Paso 2: Definición de Entidades de Dominio
Antes de conectarnos a servicios o UI, creamos los modelos puros de TypeScript que representan los datos del restaurante:
1. `src/app/core/models/user.model.ts`: Interfaz del usuario (`User`) que mapea sus propiedades (sucursal, rol, nombre, etc.) coincidiendo con la base de datos SQL Server del backend.
2. `src/app/core/models/auth.model.ts`: Estructuras de respuesta para las peticiones (`LoginResponse`, `RegisterResponse`, `ProfileResponse`).

### Paso 3: Declaración de Puertos (Interfaces Abstractas)
Establecimos los contratos que el dominio necesita para interactuar con el exterior:
3. `src/app/core/ports/auth.repository.port.ts`: Define las firmas obligatorias de comunicación HTTP (`login`, `register`, `getProfile`).
4. `src/app/core/ports/token.storage.port.ts`: Define las firmas para manipulación del almacenamiento de credenciales (`saveToken`, `getToken`, `removeToken`, `isAuthenticated`).

### Paso 4: Construcción de Casos de Uso (Lógica de Negocio)
Escribimos las clases de orquestación pura:
5. `src/app/core/use-cases/login.use-case.ts`: Ejecuta la llamada al repositorio y, si la respuesta es exitosa, delega al almacenamiento local guardar el token recibido.
6. `src/app/core/use-cases/register.use-case.ts`: Delega al puerto de repositorio la inserción de nuevos usuarios.
7. `src/app/core/use-cases/get-profile.use-case.ts`: Solicita los datos del perfil activo.

### Paso 5: Implementación de Adaptadores (Infraestructura)
Tradujimos los puertos a tecnologías reales de comunicación e interactividad:
8. `src/app/infrastructure/adapters/http-auth.repository.adapter.ts`: Implementa `AuthRepositoryPort` consumiendo el servicio `HttpClient` de Angular para apuntar al backend en `http://localhost:3000/api/auth`.
9. `src/app/infrastructure/adapters/local-storage-token.adapter.ts`: Implementa `TokenStoragePort` interactuando con el `localStorage` del navegador y decodificando la fecha de expiración del JWT en Base64.

### Paso 6: Configuración del Cableado de Dependencias
10. `src/app/infrastructure/providers/auth.providers.ts`: Creamos los tokens de inyección (`InjectionToken`) que asocian en tiempo de ejecución las interfaces de los puertos con los adaptadores concretos e instancian los casos de uso mediante fábricas (`useFactory`).

### Paso 7: Seguridad y Middleware en Frontend
11. `src/app/presentation/interceptors/jwt.interceptor.ts`: Interceptor HTTP funcional que inyecta de forma dinámica el encabezado `Authorization: Bearer <token>` a cada petición REST.
12. `src/app/presentation/guards/auth.guard.ts`: Guardia de ruta que lee el token para decidir el acceso al Dashboard, redirigiendo a la pantalla de Login en caso de no autenticación o expiración.

### Paso 8: Creación de Componentes de Página (UI)
Desarrollamos los componentes standalone utilizando directivas del framework:
13. `src/app/presentation/pages/login/login.component.ts`: Vista del Login con validaciones en tiempo real para ingresar a la plataforma.
14. `src/app/presentation/pages/register/register.component.ts`: Formulario de registro adaptado con desplegables que simulan los roles y sucursales configuradas en el servidor Express.
15. `src/app/presentation/pages/dashboard/dashboard.component.ts`: El panel administrativo interactivo principal con múltiples sub-vistas (Resumen, Mesas y Tickets de cocina), filtrado dinámico de acciones y menú adaptativo según el rol recuperado de la API.

### Paso 9: Enrutamiento y Limpieza del Bootstrapper
16. `src/app/app.routes.ts`: Configura el enrutamiento y aplica el `authGuard` a la ruta `/dashboard`.
17. `src/app/app.component.html`: Se limpió todo el boilerplate por defecto de Angular CLI, dejando únicamente el selector `<router-outlet></router-outlet>`.

### Paso 10: Sistema de Diseño Global en CSS Vanilla
18. `src/styles.css`: Creación del sistema de diseño visual con variables CSS globales en HSL, importación de fuentes estéticas tipográficas, clases utilitarias de Glassmorphism (difuminado y transparencias), adaptabilidad móvil completa y animaciones para transiciones fluidas.
19. `src/index.html`: Configuración de metadatos SEO y etiquetas de título representativas de la aplicación.

### Paso 11: Cableado Final de Inicialización de Angular
20. `src/app/app.config.ts`: Modificamos la configuración de inicio para incorporar el `provideHttpClient` con interceptores y el listado de proveedores (`authProviders`).

### Paso 12: Proceso de Verificación
21. Realizamos una compilación de validación local mediante el comando `npx ng build` para garantizar la resolución sin errores de tipado o imports.
22. Iniciamos el servidor en segundo plano con `npm start` exponiendo el proyecto en `http://localhost:4200`.
