import 'dotenv/config';
import { connectDatabase } from '../src/config/database.js';

async function migrate() {
    console.log('--- Iniciando migración multi-sede ---');
    const pool = await connectDatabase();

    // 1. Crear tabla dbo.Producto_Sucursales
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Producto_Sucursales')
        BEGIN
            CREATE TABLE dbo.Producto_Sucursales (
                ProductoId INT NOT NULL,
                SucursalId INT NOT NULL,
                Activo BIT NOT NULL DEFAULT 1,
                EsMenuDelDia BIT NOT NULL DEFAULT 0,
                Precio DECIMAL(10,2) NULL,
                CONSTRAINT PK_Producto_Sucursales PRIMARY KEY (ProductoId, SucursalId),
                CONSTRAINT FK_PS_Producto FOREIGN KEY (ProductoId) REFERENCES dbo.Productos(Id) ON DELETE CASCADE,
                CONSTRAINT FK_PS_Sucursal FOREIGN KEY (SucursalId) REFERENCES dbo.Sucursales(Id) ON DELETE CASCADE
            );
            PRINT 'Tabla dbo.Producto_Sucursales creada exitosamente.';
        END
    `);
    console.log('Paso 1: dbo.Producto_Sucursales lista.');

    // 2. Crear tabla dbo.Promocion_Sucursales
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Promocion_Sucursales')
        BEGIN
            CREATE TABLE dbo.Promocion_Sucursales (
                PromocionId INT NOT NULL,
                SucursalId INT NOT NULL,
                Activo BIT NOT NULL DEFAULT 1,
                CONSTRAINT PK_Promocion_Sucursales PRIMARY KEY (PromocionId, SucursalId),
                CONSTRAINT FK_PromoSuc_Promocion FOREIGN KEY (PromocionId) REFERENCES dbo.Promociones(Id) ON DELETE CASCADE,
                CONSTRAINT FK_PromoSuc_Sucursal FOREIGN KEY (SucursalId) REFERENCES dbo.Sucursales(Id) ON DELETE CASCADE
            );
            PRINT 'Tabla dbo.Promocion_Sucursales creada exitosamente.';
        END
    `);
    console.log('Paso 2: dbo.Promocion_Sucursales lista.');

    // 3. Vincular todos los productos existentes con todas las sucursales existentes
    const resProd = await pool.request().query(`
        INSERT INTO dbo.Producto_Sucursales (ProductoId, SucursalId, Activo, EsMenuDelDia, Precio)
        SELECT p.Id, s.Id, p.Activo, COALESCE(p.EsMenuDelDia, 0), p.Precio
        FROM dbo.Productos p
        CROSS JOIN dbo.Sucursales s
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.Producto_Sucursales ps 
            WHERE ps.ProductoId = p.Id AND ps.SucursalId = s.Id
        );
    `);
    console.log('Paso 3: Registros sincronizados en Producto_Sucursales:', resProd.rowsAffected[0] || 0);

    // 4. Vincular todas las promociones existentes con todas las sucursales existentes
    const resPromo = await pool.request().query(`
        INSERT INTO dbo.Promocion_Sucursales (PromocionId, SucursalId, Activo)
        SELECT pr.Id, s.Id, pr.Activo
        FROM dbo.Promociones pr
        CROSS JOIN dbo.Sucursales s
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.Promocion_Sucursales ps 
            WHERE ps.PromocionId = pr.Id AND ps.SucursalId = s.Id
        );
    `);
    console.log('Paso 4: Registros sincronizados en Promocion_Sucursales:', resPromo.rowsAffected[0] || 0);

    console.log('--- Migración multi-sede finalizada con éxito ---');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('Error durante la migración:', err);
    process.exit(1);
});
