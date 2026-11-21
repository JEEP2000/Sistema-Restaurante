import { Router } from 'express';
import { connectDatabase } from '../../../../../config/database.js';

const router = Router();

router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Backend funcionando correctamente'
    });
});

router.get('/database', async (req, res) => {
    try {
        const pool = await connectDatabase();
        const result = await pool.request().query('SELECT 1 AS resultado');

        res.json({
            success: true,
            message: 'Conexión y consulta a SQL Server funcionando correctamente',
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al probar la base de datos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al conectar o ejecutar consulta en SQL Server'
        });
    }
});

export default router;
