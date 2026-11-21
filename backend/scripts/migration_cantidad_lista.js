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
    console.log('Connected to SQL Server.');

    const checkCol = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Detalles_Pedido' AND COLUMN_NAME = 'CantidadLista'
    `);

    if (checkCol.recordset.length === 0) {
      console.log('Adding column CantidadLista to Detalles_Pedido...');
      await pool.request().query(`
        ALTER TABLE dbo.Detalles_Pedido 
        ADD CantidadLista INT NOT NULL CONSTRAINT DF_DetallesPedido_CantidadLista DEFAULT 0;
      `);
      console.log('Column added successfully.');
    } else {
      console.log('Column CantidadLista already exists.');
    }

    // Sync CantidadLista with CheckCocina
    await pool.request().query(`
      UPDATE dbo.Detalles_Pedido 
      SET CantidadLista = CASE WHEN CheckCocina = 1 THEN Cantidad ELSE 0 END
      WHERE CantidadLista IS NULL OR (CheckCocina = 1 AND CantidadLista = 0);
    `);
    console.log('Synced CantidadLista with CheckCocina.');

    const sample = await pool.request().query(`
      SELECT TOP 10 Id, PedidoId, ProductoId, Cantidad, CantidadLista, CheckCocina 
      FROM dbo.Detalles_Pedido
      ORDER BY Id DESC
    `);
    console.log('Sample rows:', sample.recordset);

    await pool.close();
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
