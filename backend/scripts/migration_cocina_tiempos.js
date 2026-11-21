import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server.');

    // 1. FechaInicioCocina en Detalles_Pedido
    const c1 = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Detalles_Pedido' AND COLUMN_NAME = 'FechaInicioCocina'
    `);
    if (c1.recordset.length === 0) {
      await pool.request().query(`ALTER TABLE dbo.Detalles_Pedido ADD FechaInicioCocina DATETIME NULL;`);
      console.log('Agregada columna FechaInicioCocina a Detalles_Pedido');
    }

    // 2. CocineroNombre en Detalles_Pedido
    const c2 = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Detalles_Pedido' AND COLUMN_NAME = 'CocineroNombre'
    `);
    if (c2.recordset.length === 0) {
      await pool.request().query(`ALTER TABLE dbo.Detalles_Pedido ADD CocineroNombre NVARCHAR(100) NULL;`);
      console.log('Agregada columna CocineroNombre a Detalles_Pedido');
    }

    // 3. FechaInicioCocina en Pedidos
    const c3 = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Pedidos' AND COLUMN_NAME = 'FechaInicioCocina'
    `);
    if (c3.recordset.length === 0) {
      await pool.request().query(`ALTER TABLE dbo.Pedidos ADD FechaInicioCocina DATETIME NULL;`);
      console.log('Agregada columna FechaInicioCocina a Pedidos');
    }

    // 4. CocineroNombre en Pedidos
    const c4 = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Pedidos' AND COLUMN_NAME = 'CocineroNombre'
    `);
    if (c4.recordset.length === 0) {
      await pool.request().query(`ALTER TABLE dbo.Pedidos ADD CocineroNombre NVARCHAR(100) NULL;`);
      console.log('Agregada columna CocineroNombre a Pedidos');
    }

    console.log('Migración completada con éxito.');
    await pool.close();
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  }
}

run();
