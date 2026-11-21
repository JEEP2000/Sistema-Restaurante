import sql from 'mssql';
import { connectDatabase } from '../../../../config/database.js';
import type { ProductoRepositoryPort } from '../../../../application/ports/out/producto-repository.port.js';
import type {
    Categoria,
    CrearCategoriaDTO,
    Producto,
    CrearProductoDTO,
    ProductoDisponibilidadSucursal,
    Promocion,
    CrearPromocionDTO,
    PromocionDisponibilidadSucursal,
    Insumo,
    CrearInsumoDTO
} from '../../../../domain/models/producto.model.js';

export class SqlServerProductoRepositoryAdapter implements ProductoRepositoryPort {

    // =========================================================================
    // CATEGORÍAS (TIPOS DE PLATO)
    // =========================================================================

    async getCategorias(sucursalId?: number, incluirInactivas?: boolean): Promise<Categoria[]> {
        const pool = await connectDatabase();
        const request = pool.request();
        let query = `
            SELECT 
                Id as id, 
                SucursalId as sucursalId, 
                Nombre as nombre, 
                Descripcion as descripcion, 
                EsCocina as esCocina,
                HoraInicio as horaInicio, 
                HoraFin as horaFin, 
                OrdenVisual as ordenVisual, 
                Activo as activo
            FROM dbo.Categorias
            WHERE 1 = 1
        `;

        if (!incluirInactivas) {
            query += ' AND Activo = 1';
        }

        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            request.input('sucursalId', sql.Int, sucursalId);
            query += ' AND (SucursalId = @sucursalId OR SucursalId = 1)';
        }

        query += ' ORDER BY OrdenVisual ASC, Nombre ASC';
        const result = await request.query(query);
        return result.recordset.map((r: any) => ({
            id: Number(r.id),
            sucursalId: Number(r.sucursalId),
            nombre: r.nombre,
            descripcion: r.descripcion,
            esCocina: Boolean(r.esCocina),
            horaInicio: r.horaInicio ? String(r.horaInicio) : null,
            horaFin: r.horaFin ? String(r.horaFin) : null,
            ordenVisual: Number(r.ordenVisual ?? 0),
            activo: Boolean(r.activo)
        }));
    }

    async crearCategoria(data: CrearCategoriaDTO): Promise<Categoria> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('sucursalId', sql.Int, data.sucursalId || 1)
            .input('nombre', sql.NVarChar(100), data.nombre.trim())
            .input('descripcion', sql.NVarChar(255), data.descripcion?.trim() || null)
            .input('esCocina', sql.Bit, data.esCocina ?? true)
            .input('ordenVisual', sql.Int, data.ordenVisual ?? 1)
            .input('activo', sql.Bit, data.activo ?? true)
            .query(`
                DECLARE @InsertedId INT;
                IF COLUMNPROPERTY(OBJECT_ID('dbo.Categorias'), 'Id', 'IsIdentity') = 1
                BEGIN
                    INSERT INTO dbo.Categorias (SucursalId, Nombre, Descripcion, EsCocina, OrdenVisual, Activo)
                    OUTPUT INSERTED.Id
                    VALUES (@sucursalId, @nombre, @descripcion, @esCocina, @ordenVisual, @activo);
                END
                ELSE
                BEGIN
                    SET @InsertedId = (SELECT COALESCE(MAX(Id), 0) + 1 FROM dbo.Categorias);
                    INSERT INTO dbo.Categorias (Id, SucursalId, Nombre, Descripcion, EsCocina, OrdenVisual, Activo)
                    VALUES (@InsertedId, @sucursalId, @nombre, @descripcion, @esCocina, @ordenVisual, @activo);
                    SELECT @InsertedId as Id;
                END
            `);

        const newId = Number(result.recordset[0]?.Id || result.recordset[0]?.id);
        const cats = await this.getCategorias(data.sucursalId, true);
        return cats.find(c => c.id === newId) || {
            id: newId,
            sucursalId: data.sucursalId || 1,
            nombre: data.nombre,
            descripcion: data.descripcion || null,
            esCocina: data.esCocina ?? true,
            ordenVisual: data.ordenVisual ?? 1,
            activo: data.activo ?? true
        };
    }

    async actualizarCategoria(id: number, data: Partial<CrearCategoriaDTO>): Promise<Categoria> {
        const pool = await connectDatabase();
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar(100), data.nombre?.trim() || null)
            .input('descripcion', sql.NVarChar(255), data.descripcion !== undefined ? (data.descripcion?.trim() || null) : null)
            .input('esCocina', sql.Bit, data.esCocina !== undefined ? data.esCocina : null)
            .input('ordenVisual', sql.Int, data.ordenVisual !== undefined ? data.ordenVisual : null)
            .input('activo', sql.Bit, data.activo !== undefined ? data.activo : null)
            .query(`
                UPDATE dbo.Categorias
                SET Nombre = COALESCE(@nombre, Nombre),
                    Descripcion = CASE WHEN @descripcion IS NOT NULL THEN @descripcion ELSE Descripcion END,
                    EsCocina = COALESCE(@esCocina, EsCocina),
                    OrdenVisual = COALESCE(@ordenVisual, OrdenVisual),
                    Activo = COALESCE(@activo, Activo)
                WHERE Id = @id;
            `);

        const cats = await this.getCategorias(undefined, true);
        const updated = cats.find(c => c.id === id);
        if (!updated) throw new Error('Categoría no encontrada tras actualizar');
        return updated;
    }

    async toggleActivoCategoria(id: number): Promise<{ id: number; activo: boolean }> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE dbo.Categorias
                SET Activo = CASE WHEN Activo = 1 THEN 0 ELSE 1 END
                OUTPUT INSERTED.Activo
                WHERE Id = @id;
            `);

        const nuevoActivo = Boolean(result.recordset[0]?.Activo);
        return { id, activo: nuevoActivo };
    }

    // =========================================================================
    // PRODUCTOS / PLATOS / CARTA / MENÚ DEL DÍA
    // =========================================================================

    async getProductos(sucursalId?: number, categoriaId?: number, incluirInactivos?: boolean, soloMenuDelDia?: boolean): Promise<Producto[]> {
        const pool = await connectDatabase();
        const request = pool.request();
        let query = `
            SELECT 
                p.Id as id, 
                p.SucursalId as sucursalId, 
                p.CategoriaId as categoriaId, 
                c.Nombre as categoriaNombre,
                p.Nombre as nombre, 
                p.Descripcion as descripcion, 
                COALESCE(ps.Precio, p.Precio) as precio, 
                COALESCE(p.RequiereCoccion, c.EsCocina, 1) as requiereCoccion, 
                p.TiempoEstimado as tiempoEstimado, 
                p.ImagenUrl as imagenUrl, 
                COALESCE(ps.Activo, p.Activo) as activo,
                COALESCE(ps.EsMenuDelDia, p.EsMenuDelDia, 0) as esMenuDelDia
            FROM dbo.Productos p
            LEFT JOIN dbo.Categorias c ON p.CategoriaId = c.Id
        `;

        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            request.input('sucursalId', sql.Int, sucursalId);
            query += ` LEFT JOIN dbo.Producto_Sucursales ps ON ps.ProductoId = p.Id AND ps.SucursalId = @sucursalId WHERE 1 = 1`;
        } else {
            query += ` LEFT JOIN dbo.Producto_Sucursales ps ON ps.ProductoId = p.Id AND ps.SucursalId = p.SucursalId WHERE 1 = 1`;
        }

        if (!incluirInactivos) {
            query += ' AND COALESCE(ps.Activo, p.Activo) = 1';
        }

        if (soloMenuDelDia) {
            query += ' AND COALESCE(ps.EsMenuDelDia, p.EsMenuDelDia, 0) = 1';
        }

        if (categoriaId !== undefined && !isNaN(categoriaId)) {
            request.input('categoriaId', sql.Int, categoriaId);
            query += ' AND p.CategoriaId = @categoriaId';
        }

        query += ' ORDER BY c.OrdenVisual ASC, p.Nombre ASC';
        const result = await request.query(query);

        // Consultar disponibilidad por sede para cada plato
        const dispRes = await pool.request().query(`
            SELECT ps.ProductoId, ps.SucursalId, s.Nombre as sucursalNombre, ps.Activo, ps.EsMenuDelDia, ps.Precio
            FROM dbo.Producto_Sucursales ps
            INNER JOIN dbo.Sucursales s ON s.Id = ps.SucursalId
        `);
        const dispMap = new Map<number, ProductoDisponibilidadSucursal[]>();
        for (const row of dispRes.recordset) {
            const pId = Number(row.ProductoId);
            if (!dispMap.has(pId)) dispMap.set(pId, []);
            dispMap.get(pId)!.push({
                sucursalId: Number(row.SucursalId),
                sucursalNombre: row.sucursalNombre,
                activo: Boolean(row.Activo),
                esMenuDelDia: Boolean(row.EsMenuDelDia),
                precio: row.Precio !== null && row.Precio !== undefined ? Number(row.Precio) : null
            });
        }

        return result.recordset.map((r: any) => ({
            id: Number(r.id),
            sucursalId: (sucursalId !== undefined && !isNaN(sucursalId)) ? sucursalId : Number(r.sucursalId),
            categoriaId: Number(r.categoriaId),
            categoriaNombre: r.categoriaNombre || 'Sin Categoría',
            nombre: r.nombre,
            descripcion: r.descripcion || null,
            precio: Number(r.precio),
            requiereCoccion: Boolean(r.requiereCoccion),
            tiempoEstimado: r.tiempoEstimado !== null && r.tiempoEstimado !== undefined ? Number(r.tiempoEstimado) : null,
            imagenUrl: r.imagenUrl || null,
            activo: Boolean(r.activo),
            esMenuDelDia: Boolean(r.esMenuDelDia),
            disponibilidad: dispMap.get(Number(r.id)) || []
        }));
    }

    async getProductoById(id: number): Promise<Producto | null> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    p.Id as id, 
                    p.SucursalId as sucursalId, 
                    p.CategoriaId as categoriaId, 
                    c.Nombre as categoriaNombre,
                    p.Nombre as nombre, 
                    p.Descripcion as descripcion, 
                    p.Precio as precio, 
                    COALESCE(p.RequiereCoccion, c.EsCocina, 1) as requiereCoccion, 
                    p.TiempoEstimado as tiempoEstimado, 
                    p.ImagenUrl as imagenUrl, 
                    p.Activo as activo,
                    COALESCE(p.EsMenuDelDia, 0) as esMenuDelDia
                FROM dbo.Productos p
                LEFT JOIN dbo.Categorias c ON p.CategoriaId = c.Id
                WHERE p.Id = @id
            `);

        if (result.recordset.length === 0) {
            return null;
        }

        const dispRes = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT ps.ProductoId, ps.SucursalId, s.Nombre as sucursalNombre, ps.Activo, ps.EsMenuDelDia, ps.Precio
                FROM dbo.Producto_Sucursales ps
                INNER JOIN dbo.Sucursales s ON s.Id = ps.SucursalId
                WHERE ps.ProductoId = @id
            `);

        const disponibilidad: ProductoDisponibilidadSucursal[] = dispRes.recordset.map((r: any) => ({
            sucursalId: Number(r.SucursalId),
            sucursalNombre: r.sucursalNombre,
            activo: Boolean(r.Activo),
            esMenuDelDia: Boolean(r.EsMenuDelDia),
            precio: r.Precio !== null && r.Precio !== undefined ? Number(r.Precio) : null
        }));

        const r = result.recordset[0];
        return {
            id: Number(r.id),
            sucursalId: Number(r.sucursalId),
            categoriaId: Number(r.categoriaId),
            categoriaNombre: r.categoriaNombre || 'Sin Categoría',
            nombre: r.nombre,
            descripcion: r.descripcion || null,
            precio: Number(r.precio),
            requiereCoccion: Boolean(r.requiereCoccion),
            tiempoEstimado: r.tiempoEstimado !== null && r.tiempoEstimado !== undefined ? Number(r.tiempoEstimado) : null,
            imagenUrl: r.imagenUrl || null,
            activo: Boolean(r.activo),
            esMenuDelDia: Boolean(r.esMenuDelDia),
            disponibilidad
        };
    }

    async crearProducto(data: CrearProductoDTO): Promise<Producto> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('sucursalId', sql.Int, data.sucursalId || 1)
            .input('categoriaId', sql.Int, data.categoriaId)
            .input('nombre', sql.NVarChar(100), data.nombre.trim())
            .input('descripcion', sql.NVarChar(255), data.descripcion?.trim() || null)
            .input('precio', sql.Decimal(10, 2), data.precio)
            .input('requiereCoccion', sql.Bit, data.requiereCoccion ?? true)
            .input('tiempoEstimado', sql.Int, data.tiempoEstimado ?? 10)
            .input('imagenUrl', sql.NVarChar(255), data.imagenUrl || null)
            .input('activo', sql.Bit, data.activo ?? true)
            .input('esMenuDelDia', sql.Bit, data.esMenuDelDia ?? false)
            .query(`
                DECLARE @InsertedId INT;
                IF COLUMNPROPERTY(OBJECT_ID('dbo.Productos'), 'Id', 'IsIdentity') = 1
                BEGIN
                    INSERT INTO dbo.Productos 
                        (SucursalId, CategoriaId, Nombre, Descripcion, Precio, RequiereCoccion, TiempoEstimado, ImagenUrl, Activo, EsMenuDelDia)
                    OUTPUT INSERTED.Id
                    VALUES 
                        (@sucursalId, @categoriaId, @nombre, @descripcion, @precio, @requiereCoccion, @tiempoEstimado, @imagenUrl, @activo, @esMenuDelDia);
                END
                ELSE
                BEGIN
                    SET @InsertedId = (SELECT COALESCE(MAX(Id), -1) + 1 FROM dbo.Productos);
                    INSERT INTO dbo.Productos 
                        (Id, SucursalId, CategoriaId, Nombre, Descripcion, Precio, RequiereCoccion, TiempoEstimado, ImagenUrl, Activo, EsMenuDelDia)
                    VALUES 
                        (@InsertedId, @sucursalId, @categoriaId, @nombre, @descripcion, @precio, @requiereCoccion, @tiempoEstimado, @imagenUrl, @activo, @esMenuDelDia);
                    SELECT @InsertedId as Id;
                END
            `);

        const newId = Number(result.recordset[0]?.Id || result.recordset[0]?.id);

        // Sincronizar en dbo.Producto_Sucursales
        if (data.sucursalesDisponibles && Array.isArray(data.sucursalesDisponibles) && data.sucursalesDisponibles.length > 0) {
            for (const item of data.sucursalesDisponibles) {
                const sId = typeof item === 'number' ? item : item.sucursalId;
                const act = typeof item === 'object' && item.activo !== undefined ? item.activo : (data.activo ?? true);
                const mDia = typeof item === 'object' && item.esMenuDelDia !== undefined ? item.esMenuDelDia : (data.esMenuDelDia ?? false);
                const prc = typeof item === 'object' && item.precio !== undefined ? item.precio : data.precio;
                await pool.request()
                    .input('pId', sql.Int, newId)
                    .input('sId', sql.Int, sId)
                    .input('act', sql.Bit, act)
                    .input('mDia', sql.Bit, mDia)
                    .input('prc', sql.Decimal(10, 2), prc)
                    .query(`
                        INSERT INTO dbo.Producto_Sucursales (ProductoId, SucursalId, Activo, EsMenuDelDia, Precio)
                        VALUES (@pId, @sId, @act, @mDia, @prc)
                    `);
            }
        } else {
            // Por defecto, vincular a todas las sedes existentes para que esté disponible en el catálogo
            await pool.request()
                .input('pId', sql.Int, newId)
                .input('act', sql.Bit, data.activo ?? true)
                .input('mDia', sql.Bit, data.esMenuDelDia ?? false)
                .input('prc', sql.Decimal(10, 2), data.precio)
                .query(`
                    INSERT INTO dbo.Producto_Sucursales (ProductoId, SucursalId, Activo, EsMenuDelDia, Precio)
                    SELECT @pId, Id, @act, @mDia, @prc FROM dbo.Sucursales
                `);
        }

        const created = await this.getProductoById(newId);
        if (!created) throw new Error('Error al recuperar producto creado');
        return created;
    }

    async actualizarProducto(id: number, data: Partial<CrearProductoDTO>): Promise<Producto> {
        const pool = await connectDatabase();
        await pool.request()
            .input('id', sql.Int, id)
            .input('categoriaId', sql.Int, data.categoriaId !== undefined ? data.categoriaId : null)
            .input('nombre', sql.NVarChar(100), data.nombre?.trim() || null)
            .input('descripcion', sql.NVarChar(255), data.descripcion !== undefined ? (data.descripcion?.trim() || null) : null)
            .input('precio', sql.Decimal(10, 2), data.precio !== undefined ? data.precio : null)
            .input('requiereCoccion', sql.Bit, data.requiereCoccion !== undefined ? data.requiereCoccion : null)
            .input('tiempoEstimado', sql.Int, data.tiempoEstimado !== undefined ? data.tiempoEstimado : null)
            .input('imagenUrl', sql.NVarChar(255), data.imagenUrl !== undefined ? data.imagenUrl : null)
            .input('activo', sql.Bit, data.activo !== undefined ? data.activo : null)
            .input('esMenuDelDia', sql.Bit, data.esMenuDelDia !== undefined ? data.esMenuDelDia : null)
            .query(`
                UPDATE dbo.Productos
                SET CategoriaId = COALESCE(@categoriaId, CategoriaId),
                    Nombre = COALESCE(@nombre, Nombre),
                    Descripcion = CASE WHEN @descripcion IS NOT NULL THEN @descripcion ELSE Descripcion END,
                    Precio = COALESCE(@precio, Precio),
                    RequiereCoccion = COALESCE(@requiereCoccion, RequiereCoccion),
                    TiempoEstimado = COALESCE(@tiempoEstimado, TiempoEstimado),
                    ImagenUrl = CASE WHEN @imagenUrl IS NOT NULL THEN @imagenUrl ELSE ImagenUrl END,
                    Activo = COALESCE(@activo, Activo),
                    EsMenuDelDia = COALESCE(@esMenuDelDia, EsMenuDelDia)
                WHERE Id = @id;
            `);

        // Sincronizar sucursales si fueron especificadas
        if (data.sucursalesDisponibles && Array.isArray(data.sucursalesDisponibles)) {
            for (const item of data.sucursalesDisponibles) {
                const sId = typeof item === 'number' ? item : item.sucursalId;
                const act = typeof item === 'object' && item.activo !== undefined ? item.activo : true;
                const mDia = typeof item === 'object' && item.esMenuDelDia !== undefined ? item.esMenuDelDia : false;
                const prc = typeof item === 'object' && item.precio !== undefined ? item.precio : null;

                await pool.request()
                    .input('pId', sql.Int, id)
                    .input('sId', sql.Int, sId)
                    .input('act', sql.Bit, act)
                    .input('mDia', sql.Bit, mDia)
                    .input('prc', sql.Decimal(10, 2), prc)
                    .query(`
                        IF EXISTS (SELECT 1 FROM dbo.Producto_Sucursales WHERE ProductoId = @pId AND SucursalId = @sId)
                        BEGIN
                            UPDATE dbo.Producto_Sucursales
                            SET Activo = @act,
                                EsMenuDelDia = @mDia,
                                Precio = COALESCE(@prc, Precio)
                            WHERE ProductoId = @pId AND SucursalId = @sId;
                        END
                        ELSE
                        BEGIN
                            INSERT INTO dbo.Producto_Sucursales (ProductoId, SucursalId, Activo, EsMenuDelDia, Precio)
                            VALUES (@pId, @sId, @act, @mDia, @prc);
                        END
                    `);
            }
        }

        const updated = await this.getProductoById(id);
        if (!updated) throw new Error('Producto no encontrado tras actualizar');
        return updated;
    }

    async toggleActivoProducto(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; activo: boolean }> {
        const pool = await connectDatabase();
        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .input('sucursalId', sql.Int, sucursalId)
                .query(`
                    IF EXISTS (SELECT 1 FROM dbo.Producto_Sucursales WHERE ProductoId = @id AND SucursalId = @sucursalId)
                    BEGIN
                        UPDATE dbo.Producto_Sucursales
                        SET Activo = CASE WHEN Activo = 1 THEN 0 ELSE 1 END
                        OUTPUT INSERTED.Activo
                        WHERE ProductoId = @id AND SucursalId = @sucursalId;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.Producto_Sucursales (ProductoId, SucursalId, Activo, EsMenuDelDia, Precio)
                        OUTPUT INSERTED.Activo
                        SELECT @id, @sucursalId, 0, COALESCE(EsMenuDelDia, 0), Precio
                        FROM dbo.Productos WHERE Id = @id;
                    END
                `);

            const nuevoActivo = Boolean(result.recordset[0]?.Activo);
            return { id, sucursalId, activo: nuevoActivo };
        } else {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    UPDATE dbo.Productos
                    SET Activo = CASE WHEN Activo = 1 THEN 0 ELSE 1 END
                    OUTPUT INSERTED.Activo
                    WHERE Id = @id;
                `);

            const nuevoActivo = Boolean(result.recordset[0]?.Activo);
            return { id, activo: nuevoActivo };
        }
    }

    async toggleMenuDelDia(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; esMenuDelDia: boolean }> {
        const pool = await connectDatabase();
        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .input('sucursalId', sql.Int, sucursalId)
                .query(`
                    IF EXISTS (SELECT 1 FROM dbo.Producto_Sucursales WHERE ProductoId = @id AND SucursalId = @sucursalId)
                    BEGIN
                        UPDATE dbo.Producto_Sucursales
                        SET EsMenuDelDia = CASE WHEN EsMenuDelDia = 1 THEN 0 ELSE 1 END
                        OUTPUT INSERTED.EsMenuDelDia
                        WHERE ProductoId = @id AND SucursalId = @sucursalId;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.Producto_Sucursales (ProductoId, SucursalId, Activo, EsMenuDelDia, Precio)
                        OUTPUT INSERTED.EsMenuDelDia
                        SELECT @id, @sucursalId, Activo, 1, Precio
                        FROM dbo.Productos WHERE Id = @id;
                    END
                `);

            const nuevoEstado = Boolean(result.recordset[0]?.EsMenuDelDia);
            return { id, sucursalId, esMenuDelDia: nuevoEstado };
        } else {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    UPDATE dbo.Productos
                    SET EsMenuDelDia = CASE WHEN EsMenuDelDia = 1 THEN 0 ELSE 1 END
                    OUTPUT INSERTED.EsMenuDelDia
                    WHERE Id = @id;
                `);

            const nuevoEstado = Boolean(result.recordset[0]?.EsMenuDelDia);
            return { id, esMenuDelDia: nuevoEstado };
        }
    }

    async eliminarProducto(id: number): Promise<boolean> {
        const pool = await connectDatabase();
        // Soft delete para preservar integridad referencial de comandas y ventas previas
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE dbo.Productos
                SET Activo = 0, EsMenuDelDia = 0
                WHERE Id = @id;
            `);

        return (result.rowsAffected[0] ?? 0) > 0;
    }

    // =========================================================================
    // PROMOCIONES Y COMBOS
    // =========================================================================

    async getPromociones(sucursalId?: number, incluirInactivas?: boolean): Promise<Promocion[]> {
        const pool = await connectDatabase();
        const request = pool.request();
        let query = `
            SELECT 
                pr.Id as id,
                pr.SucursalId as sucursalId,
                pr.Nombre as nombre,
                pr.Descripcion as descripcion,
                pr.PrecioPromo as precioPromo,
                pr.PrecioOriginal as precioOriginal,
                pr.DescuentoPorcentaje as descuentoPorcentaje,
                pr.ItemsIncluidos as itemsIncluidos,
                pr.FechaInicio as fechaInicio,
                pr.FechaFin as fechaFin,
                COALESCE(ps.Activo, pr.Activo) as activo,
                pr.Destacado as destacado,
                pr.FechaCreacion as fechaCreacion
            FROM dbo.Promociones pr
        `;

        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            request.input('sucursalId', sql.Int, sucursalId);
            query += ` LEFT JOIN dbo.Promocion_Sucursales ps ON ps.PromocionId = pr.Id AND ps.SucursalId = @sucursalId WHERE 1 = 1`;
        } else {
            query += ` LEFT JOIN dbo.Promocion_Sucursales ps ON ps.PromocionId = pr.Id AND ps.SucursalId = pr.SucursalId WHERE 1 = 1`;
        }

        if (!incluirInactivas) {
            query += ' AND COALESCE(ps.Activo, pr.Activo) = 1';
        }

        query += ' ORDER BY pr.Destacado DESC, pr.Id DESC';
        const result = await request.query(query);

        // Cargar disponibilidades por sucursal
        const dispRes = await pool.request().query(`
            SELECT ps.PromocionId, ps.SucursalId, s.Nombre as sucursalNombre, ps.Activo
            FROM dbo.Promocion_Sucursales ps
            INNER JOIN dbo.Sucursales s ON s.Id = ps.SucursalId
        `);
        const dispMap = new Map<number, PromocionDisponibilidadSucursal[]>();
        for (const row of dispRes.recordset) {
            const pId = Number(row.PromocionId);
            if (!dispMap.has(pId)) dispMap.set(pId, []);
            dispMap.get(pId)!.push({
                sucursalId: Number(row.SucursalId),
                sucursalNombre: row.sucursalNombre,
                activo: Boolean(row.Activo)
            });
        }

        return result.recordset.map((r: any) => {
            let parsedItems = null;
            if (r.itemsIncluidos) {
                try {
                    parsedItems = typeof r.itemsIncluidos === 'string' ? JSON.parse(r.itemsIncluidos) : r.itemsIncluidos;
                } catch {
                    parsedItems = r.itemsIncluidos;
                }
            }

            return {
                id: Number(r.id),
                sucursalId: (sucursalId !== undefined && !isNaN(sucursalId)) ? sucursalId : Number(r.sucursalId),
                nombre: r.nombre,
                descripcion: r.descripcion || null,
                precioPromo: Number(r.precioPromo),
                precioOriginal: r.precioOriginal !== null && r.precioOriginal !== undefined ? Number(r.precioOriginal) : null,
                descuentoPorcentaje: r.descuentoPorcentaje !== null && r.descuentoPorcentaje !== undefined ? Number(r.descuentoPorcentaje) : null,
                itemsIncluidos: parsedItems,
                fechaInicio: r.fechaInicio ? (new Date(r.fechaInicio).toISOString().split('T')[0] || null) : null,
                fechaFin: r.fechaFin ? (new Date(r.fechaFin).toISOString().split('T')[0] || null) : null,
                activo: Boolean(r.activo),
                destacado: Boolean(r.destacado),
                fechaCreacion: r.fechaCreacion ? new Date(r.fechaCreacion).toISOString() : new Date().toISOString(),
                disponibilidad: dispMap.get(Number(r.id)) || []
            };
        });
    }

    async getPromocionById(id: number): Promise<Promocion | null> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT * FROM dbo.Promociones WHERE Id = @id`);

        if (result.recordset.length === 0) return null;
        const promos = await this.getPromociones(undefined, true);
        return promos.find(p => p.id === id) || null;
    }

    async crearPromocion(data: CrearPromocionDTO): Promise<Promocion> {
        const pool = await connectDatabase();
        const itemsJson = typeof data.itemsIncluidos === 'object' ? JSON.stringify(data.itemsIncluidos) : (data.itemsIncluidos || null);

        const result = await pool.request()
            .input('sucursalId', sql.Int, data.sucursalId || 1)
            .input('nombre', sql.NVarChar(150), data.nombre.trim())
            .input('descripcion', sql.NVarChar(500), data.descripcion?.trim() || null)
            .input('precioPromo', sql.Decimal(10, 2), data.precioPromo)
            .input('precioOriginal', sql.Decimal(10, 2), data.precioOriginal !== undefined ? data.precioOriginal : null)
            .input('descuentoPorcentaje', sql.Int, data.descuentoPorcentaje !== undefined ? data.descuentoPorcentaje : null)
            .input('itemsIncluidos', sql.NVarChar(sql.MAX), itemsJson)
            .input('fechaInicio', sql.Date, data.fechaInicio || null)
            .input('fechaFin', sql.Date, data.fechaFin || null)
            .input('activo', sql.Bit, data.activo ?? true)
            .input('destacado', sql.Bit, data.destacado ?? false)
            .query(`
                INSERT INTO dbo.Promociones 
                    (SucursalId, Nombre, Descripcion, PrecioPromo, PrecioOriginal, DescuentoPorcentaje, ItemsIncluidos, FechaInicio, FechaFin, Activo, Destacado)
                OUTPUT INSERTED.Id
                VALUES 
                    (@sucursalId, @nombre, @descripcion, @precioPromo, @precioOriginal, @descuentoPorcentaje, @itemsIncluidos, @fechaInicio, @fechaFin, @activo, @destacado);
            `);

        const newId = Number(result.recordset[0]?.Id || result.recordset[0]?.id);

        // Sincronizar en dbo.Promocion_Sucursales
        if (data.sucursalesDisponibles && Array.isArray(data.sucursalesDisponibles) && data.sucursalesDisponibles.length > 0) {
            for (const item of data.sucursalesDisponibles) {
                const sId = typeof item === 'number' ? item : item.sucursalId;
                const act = typeof item === 'object' && item.activo !== undefined ? item.activo : (data.activo ?? true);
                await pool.request()
                    .input('pId', sql.Int, newId)
                    .input('sId', sql.Int, sId)
                    .input('act', sql.Bit, act)
                    .query(`
                        INSERT INTO dbo.Promocion_Sucursales (PromocionId, SucursalId, Activo)
                        VALUES (@pId, @sId, @act)
                    `);
            }
        } else {
            await pool.request()
                .input('pId', sql.Int, newId)
                .input('act', sql.Bit, data.activo ?? true)
                .query(`
                    INSERT INTO dbo.Promocion_Sucursales (PromocionId, SucursalId, Activo)
                    SELECT @pId, Id, @act FROM dbo.Sucursales
                `);
        }

        const created = await this.getPromocionById(newId);
        if (!created) throw new Error('Error al recuperar promoción creada');
        return created;
    }

    async actualizarPromocion(id: number, data: Partial<CrearPromocionDTO>): Promise<Promocion> {
        const pool = await connectDatabase();
        const itemsJson = data.itemsIncluidos !== undefined 
            ? (typeof data.itemsIncluidos === 'object' ? JSON.stringify(data.itemsIncluidos) : (data.itemsIncluidos || null))
            : null;

        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar(150), data.nombre?.trim() || null)
            .input('descripcion', sql.NVarChar(500), data.descripcion !== undefined ? (data.descripcion?.trim() || null) : null)
            .input('precioPromo', sql.Decimal(10, 2), data.precioPromo !== undefined ? data.precioPromo : null)
            .input('precioOriginal', sql.Decimal(10, 2), data.precioOriginal !== undefined ? data.precioOriginal : null)
            .input('descuentoPorcentaje', sql.Int, data.descuentoPorcentaje !== undefined ? data.descuentoPorcentaje : null)
            .input('itemsIncluidos', sql.NVarChar(sql.MAX), itemsJson)
            .input('fechaInicio', sql.Date, data.fechaInicio !== undefined ? (data.fechaInicio || null) : null)
            .input('fechaFin', sql.Date, data.fechaFin !== undefined ? (data.fechaFin || null) : null)
            .input('activo', sql.Bit, data.activo !== undefined ? data.activo : null)
            .input('destacado', sql.Bit, data.destacado !== undefined ? data.destacado : null)
            .query(`
                UPDATE dbo.Promociones
                SET Nombre = COALESCE(@nombre, Nombre),
                    Descripcion = CASE WHEN @descripcion IS NOT NULL THEN @descripcion ELSE Descripcion END,
                    PrecioPromo = COALESCE(@precioPromo, PrecioPromo),
                    PrecioOriginal = CASE WHEN @precioOriginal IS NOT NULL THEN @precioOriginal ELSE PrecioOriginal END,
                    DescuentoPorcentaje = CASE WHEN @descuentoPorcentaje IS NOT NULL THEN @descuentoPorcentaje ELSE DescuentoPorcentaje END,
                    ItemsIncluidos = CASE WHEN @itemsIncluidos IS NOT NULL THEN @itemsIncluidos ELSE ItemsIncluidos END,
                    FechaInicio = CASE WHEN @fechaInicio IS NOT NULL THEN @fechaInicio ELSE FechaInicio END,
                    FechaFin = CASE WHEN @fechaFin IS NOT NULL THEN @fechaFin ELSE FechaFin END,
                    Activo = COALESCE(@activo, Activo),
                    Destacado = COALESCE(@destacado, Destacado)
                WHERE Id = @id;
            `);

        // Sincronizar sucursales si fueron especificadas
        if (data.sucursalesDisponibles && Array.isArray(data.sucursalesDisponibles)) {
            for (const item of data.sucursalesDisponibles) {
                const sId = typeof item === 'number' ? item : item.sucursalId;
                const act = typeof item === 'object' && item.activo !== undefined ? item.activo : true;

                await pool.request()
                    .input('pId', sql.Int, id)
                    .input('sId', sql.Int, sId)
                    .input('act', sql.Bit, act)
                    .query(`
                        IF EXISTS (SELECT 1 FROM dbo.Promocion_Sucursales WHERE PromocionId = @pId AND SucursalId = @sId)
                        BEGIN
                            UPDATE dbo.Promocion_Sucursales
                            SET Activo = @act
                            WHERE PromocionId = @pId AND SucursalId = @sId;
                        END
                        ELSE
                        BEGIN
                            INSERT INTO dbo.Promocion_Sucursales (PromocionId, SucursalId, Activo)
                            VALUES (@pId, @sId, @act);
                        END
                    `);
            }
        }

        const updated = await this.getPromocionById(id);
        if (!updated) throw new Error('Promoción no encontrada tras actualizar');
        return updated;
    }

    async toggleActivoPromocion(id: number, sucursalId?: number): Promise<{ id: number; sucursalId?: number; activo: boolean }> {
        const pool = await connectDatabase();
        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .input('sucursalId', sql.Int, sucursalId)
                .query(`
                    IF EXISTS (SELECT 1 FROM dbo.Promocion_Sucursales WHERE PromocionId = @id AND SucursalId = @sucursalId)
                    BEGIN
                        UPDATE dbo.Promocion_Sucursales
                        SET Activo = CASE WHEN Activo = 1 THEN 0 ELSE 1 END
                        OUTPUT INSERTED.Activo
                        WHERE PromocionId = @id AND SucursalId = @sucursalId;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.Promocion_Sucursales (PromocionId, SucursalId, Activo)
                        OUTPUT INSERTED.Activo
                        SELECT @id, @sucursalId, 0
                        FROM dbo.Promociones WHERE Id = @id;
                    END
                `);

            const nuevoActivo = Boolean(result.recordset[0]?.Activo);
            return { id, sucursalId, activo: nuevoActivo };
        } else {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    UPDATE dbo.Promociones
                    SET Activo = CASE WHEN Activo = 1 THEN 0 ELSE 1 END
                    OUTPUT INSERTED.Activo
                    WHERE Id = @id;
                `);

            const nuevoActivo = Boolean(result.recordset[0]?.Activo);
            return { id, activo: nuevoActivo };
        }
    }

    async eliminarPromocion(id: number): Promise<boolean> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM dbo.Promociones WHERE Id = @id;`);

        return (result.rowsAffected[0] ?? 0) > 0;
    }

    // =========================================================================
    // INSUMOS / INGREDIENTES
    // =========================================================================

    async getInsumos(sucursalId?: number, incluirInactivos?: boolean): Promise<Insumo[]> {
        const pool = await connectDatabase();
        const request = pool.request();
        let query = `
            SELECT 
                Id as id,
                SucursalId as sucursalId,
                Nombre as nombre,
                UnidadMedida as unidadMedida,
                Stock as stock,
                StockMinimo as stockMinimo,
                Activo as activo
            FROM dbo.Insumos
            WHERE 1 = 1
        `;

        if (!incluirInactivos) {
            query += ' AND Activo = 1';
        }

        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            request.input('sucursalId', sql.Int, sucursalId);
            query += ' AND (SucursalId = @sucursalId OR SucursalId = 1)';
        }

        query += ' ORDER BY Nombre ASC';
        const result = await request.query(query);

        return result.recordset.map((r: any) => ({
            id: Number(r.id),
            sucursalId: Number(r.sucursalId),
            nombre: r.nombre,
            unidadMedida: r.unidadMedida || 'und',
            stock: Number(r.stock ?? 0),
            stockMinimo: Number(r.stockMinimo ?? 0),
            activo: Boolean(r.activo)
        }));
    }

    async crearInsumo(data: CrearInsumoDTO): Promise<Insumo> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('sucursalId', sql.Int, data.sucursalId || 1)
            .input('nombre', sql.NVarChar(100), data.nombre.trim())
            .input('unidadMedida', sql.NVarChar(50), data.unidadMedida.trim())
            .input('stock', sql.Decimal(10, 2), data.stock ?? 0)
            .input('stockMinimo', sql.Decimal(10, 2), data.stockMinimo ?? 5)
            .input('activo', sql.Bit, data.activo ?? true)
            .query(`
                DECLARE @InsertedId INT;
                IF COLUMNPROPERTY(OBJECT_ID('dbo.Insumos'), 'Id', 'IsIdentity') = 1
                BEGIN
                    INSERT INTO dbo.Insumos (SucursalId, Nombre, UnidadMedida, Stock, StockMinimo, Activo)
                    OUTPUT INSERTED.Id
                    VALUES (@sucursalId, @nombre, @unidadMedida, @stock, @stockMinimo, @activo);
                END
                ELSE
                BEGIN
                    SET @InsertedId = (SELECT COALESCE(MAX(Id), 0) + 1 FROM dbo.Insumos);
                    INSERT INTO dbo.Insumos (Id, SucursalId, Nombre, UnidadMedida, Stock, StockMinimo, Activo)
                    VALUES (@InsertedId, @sucursalId, @nombre, @unidadMedida, @stock, @stockMinimo, @activo);
                    SELECT @InsertedId as Id;
                END
            `);

        const newId = Number(result.recordset[0]?.Id || result.recordset[0]?.id);
        const ins = await this.getInsumos(data.sucursalId, true);
        return ins.find(i => i.id === newId) || {
            id: newId,
            sucursalId: data.sucursalId || 1,
            nombre: data.nombre,
            unidadMedida: data.unidadMedida,
            stock: data.stock,
            stockMinimo: data.stockMinimo ?? 5,
            activo: data.activo ?? true
        };
    }

    async actualizarInsumo(id: number, data: Partial<CrearInsumoDTO>): Promise<Insumo> {
        const pool = await connectDatabase();
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar(100), data.nombre?.trim() || null)
            .input('unidadMedida', sql.NVarChar(50), data.unidadMedida?.trim() || null)
            .input('stock', sql.Decimal(10, 2), data.stock !== undefined ? data.stock : null)
            .input('stockMinimo', sql.Decimal(10, 2), data.stockMinimo !== undefined ? data.stockMinimo : null)
            .input('activo', sql.Bit, data.activo !== undefined ? data.activo : null)
            .query(`
                UPDATE dbo.Insumos
                SET Nombre = COALESCE(@nombre, Nombre),
                    UnidadMedida = COALESCE(@unidadMedida, UnidadMedida),
                    Stock = COALESCE(@stock, Stock),
                    StockMinimo = COALESCE(@stockMinimo, StockMinimo),
                    Activo = COALESCE(@activo, Activo)
                WHERE Id = @id;
            `);

        const ins = await this.getInsumos(undefined, true);
        const updated = ins.find(i => i.id === id);
        if (!updated) throw new Error('Insumo no encontrado tras actualizar');
        return updated;
    }

    async toggleActivoInsumo(id: number): Promise<{ id: number; activo: boolean }> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE dbo.Insumos
                SET Activo = CASE WHEN Activo = 1 THEN 0 ELSE 1 END
                OUTPUT INSERTED.Activo
                WHERE Id = @id;
            `);

        const nuevoActivo = Boolean(result.recordset[0]?.Activo);
        return { id, activo: nuevoActivo };
    }
}
