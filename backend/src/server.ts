//cuando ejecutemos el backend 'npm run dev' queremos que el sistemas comience desde aqui 
import 'dotenv/config';

import app from './infrastructure/adapters/in/http/app.js';
import { connectDatabase } from './config/database.js';

const PORT = Number(process.env.PORT) || 3000;

const startServer = async (): Promise<void> => {
    try {
        await connectDatabase();

        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();