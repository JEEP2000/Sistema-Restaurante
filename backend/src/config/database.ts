// Conexión a la base de datos en SQL Server optimizada para alta concurrencia
import sql from 'mssql';

const dbConfig: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT) || 1433,
    pool: {
        max: Number(process.env.DB_POOL_MAX) || 50,      // Permite hasta 50 consultas simultáneas sin cuellos de botella
        min: Number(process.env.DB_POOL_MIN) || 5,       // Conexiones en espera activas para respuestas instantáneas
        idleTimeoutMillis: 30000,                         // Cierra conexiones inactivas tras 30 segundos
        acquireTimeoutMillis: 15000                       // Tiempo máximo de espera para obtener conexión libre
    },
    connectionTimeout: 15000,                            // 15 segundos para handshake inicial
    requestTimeout: 30000,                               // 30 segundos por consulta compleja
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    }
};

let pool: sql.ConnectionPool | null = null;

export const connectDatabase = async (): Promise<sql.ConnectionPool> => {
    // Si ya existe un pool activo y conectado, reutilizarlo de inmediato
    if (pool && pool.connected) {
        return pool;
    }

    try {
        if (!pool || !pool.connected) {
            pool = await sql.connect(dbConfig);
            
            // Auto-reconexión robusta ante caídas o reinicios del servidor SQL
            pool.on('error', (err) => {
                console.error('[DATABASE POOL ERROR] Conexión interrumpida en SQL Server:', err);
                pool = null; // Fuerza reconexión limpia en la próxima consulta
            });

            console.log('Conexión a SQL Server establecida correctamente (Pool concurrente 5-50 conexiones)');
        }
        return pool;
    } catch (error) {
        console.error('Error al conectar con SQL Server:', error);
        pool = null;
        throw error;
    }
};