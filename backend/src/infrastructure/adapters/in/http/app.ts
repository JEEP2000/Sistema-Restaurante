import cors from 'cors';
import express from 'express';

// Importe de rutas de adaptadores primarios
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import mesaRoutes from './routes/mesa.routes.js';
import pedidoRoutes from './routes/pedido.routes.js';
import sucursalRoutes from './routes/sucursal.routes.js';
import productoRoutes from './routes/producto.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Registro de Rutas
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/sucursales', sucursalRoutes);
app.use('/api/productos', productoRoutes);

// Middleware centralizado de manejo de errores para alta disponibilidad
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[HTTP Error] ${req.method} ${req.url}:`, err?.message || err);
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = typeof err.status === 'number' ? err.status : 500;
    res.status(statusCode).json({
        success: false,
        mensaje: err.message || 'Error interno del servidor',
        codigo: err.code || 'INTERNAL_ERROR'
    });
});

export default app;

