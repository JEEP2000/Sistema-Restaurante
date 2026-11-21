import sql from 'mssql';
import { connectDatabase } from '../../../../config/database.js';
import type { PedidoRepositoryPort } from '../../../../application/ports/out/pedido-repository.port.js';
import type { KitchenTicket, KitchenItem, DashboardStats, Pedido, CrearPedidoDTO, ProcesarPagoDTO, HistorialVentasResumen, VentaHistorialItem, DetallePedido, EstadisticasAvanzadas } from '../../../../domain/models/pedido.model.js';

export class SqlServerPedidoRepositoryAdapter implements PedidoRepositoryPort {
    async getActiveKitchenTickets(sucursalId?: number): Promise<KitchenTicket[]> {
        const pool = await connectDatabase();

        const ordersReq = pool.request();
        let queryOrders = `
            SELECT 
                p.Id as pedidoId,
                COALESCE(m.Numero, 0) as mesa,
                p.ClienteNombre as clienteNombre,
                p.FechaCreacion as fechaCreacion,
                p.FechaInicioCocina as fechaInicioCocina,
                p.CocineroNombre as cocineroNombre,
                p.Estado as estadoPedido,
                p.EsDelivery as esDelivery,
                u.Nombre as meseroNombre,
                -- Momento en que se completó el último plato de cocina
                (SELECT MAX(dp_end.FechaCheckCocina) 
                 FROM dbo.Detalles_Pedido dp_end 
                 WHERE dp_end.PedidoId = p.Id AND dp_end.CheckCocina = 1
                ) as fechaFinCocina,
                -- 1 si todos los platos de cocina están listos, 0 si hay pendientes
                CASE WHEN NOT EXISTS (
                    SELECT 1 FROM dbo.Detalles_Pedido dp_chk
                    INNER JOIN dbo.Productos pr_chk ON dp_chk.ProductoId = pr_chk.Id
                    LEFT JOIN dbo.Categorias c_chk ON pr_chk.CategoriaId = c_chk.Id
                    WHERE dp_chk.PedidoId = p.Id 
                      AND COALESCE(pr_chk.RequiereCoccion, c_chk.EsCocina, 1) = 1
                      AND (dp_chk.CheckCocina IS NULL OR dp_chk.CheckCocina = 0)
                ) THEN 1 ELSE 0 END as todosPlatosListos,
                CASE 
                    WHEN p.FechaInicioCocina IS NULL THEN 0
                    -- Si todos los platos de cocina están listos, congelar el tiempo exactamente en la fecha del último plato terminado
                    WHEN NOT EXISTS (
                        SELECT 1 FROM dbo.Detalles_Pedido dp_chk
                        INNER JOIN dbo.Productos pr_chk ON dp_chk.ProductoId = pr_chk.Id
                        LEFT JOIN dbo.Categorias c_chk ON pr_chk.CategoriaId = c_chk.Id
                        WHERE dp_chk.PedidoId = p.Id 
                          AND COALESCE(pr_chk.RequiereCoccion, c_chk.EsCocina, 1) = 1
                          AND (dp_chk.CheckCocina IS NULL OR dp_chk.CheckCocina = 0)
                    ) THEN DATEDIFF(MINUTE, p.FechaInicioCocina, COALESCE((
                        SELECT MAX(dp_end.FechaCheckCocina) 
                        FROM dbo.Detalles_Pedido dp_end 
                        WHERE dp_end.PedidoId = p.Id AND dp_end.CheckCocina = 1
                    ), p.FechaInicioCocina))
                    ELSE DATEDIFF(MINUTE, p.FechaInicioCocina, GETDATE()) 
                END as minutosTranscurridos
            FROM dbo.Pedidos p
            LEFT JOIN dbo.Mesas m ON p.MesaId = m.Id
            LEFT JOIN dbo.Usuarios u ON p.UsuarioMeseroId = u.Id
            WHERE p.Estado IN ('EN_PROCESO', 'LISTO', 'PENDIENTE_PAGO')
        `;

        if (sucursalId) {
            ordersReq.input('sucursalId', sql.Int, sucursalId);
            queryOrders += ` AND p.SucursalId = @sucursalId`;
        }

        queryOrders += ` ORDER BY p.FechaCreacion ASC`;

        const ordersResult = await ordersReq.query(queryOrders);
        const tickets: KitchenTicket[] = [];

        for (const order of ordersResult.recordset) {
            const itemsResult = await pool.request()
                .input('pedidoId', sql.Int, order.pedidoId)
                .query(`
                    SELECT 
                        dp.Id as detalleId,
                        dp.ProductoId as productoId,
                        dp.Cantidad as cantidad,
                        COALESCE(dp.CantidadLista, CASE WHEN dp.CheckCocina = 1 THEN dp.Cantidad ELSE 0 END) as cantidadLista,
                        pr.Nombre as nombre,
                        c.Nombre as categoriaNombre,
                        dp.Modificacion as nota,
                        dp.CheckCocina as checkCocina,
                        dp.CocineroId as cocineroId,
                        u.Nombre as cocineroNombre,
                        dp.FechaCheckCocina as fechaCheckCocina,
                        CASE 
                            WHEN p.FechaInicioCocina IS NOT NULL AND dp.FechaCheckCocina IS NOT NULL 
                            THEN DATEDIFF(SECOND, p.FechaInicioCocina, dp.FechaCheckCocina)
                            ELSE NULL 
                        END as segundosDemorados
                    FROM dbo.Detalles_Pedido dp
                    INNER JOIN dbo.Pedidos p ON dp.PedidoId = p.Id
                    INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                    LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                    LEFT JOIN dbo.Usuarios u ON dp.CocineroId = u.Id
                    WHERE dp.PedidoId = @pedidoId 
                      AND COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 1
                    ORDER BY dp.Id ASC
                `);

            if (itemsResult.recordset.length > 0) {
                // Los minutos transcurridos ya vienen calculados y congelados si corresponde desde SQL Server
                const elapsedMinutes = order.fechaInicioCocina ? Math.max(0, Number(order.minutosTranscurridos || 0)) : 0;

                const items: KitchenItem[] = itemsResult.recordset.map((item: any) => ({
                    detalleId: item.detalleId,
                    productoId: item.productoId,
                    cantidad: item.cantidad,
                    cantidadLista: Number(item.cantidadLista ?? (item.checkCocina ? item.cantidad : 0)),
                    nombre: item.nombre,
                    categoriaNombre: item.categoriaNombre || 'Cocina',
                    nota: item.nota,
                    checkCocina: Boolean(item.checkCocina),
                    cocineroId: item.cocineroId,
                    cocineroNombre: item.cocineroNombre,
                    fechaCheckCocina: item.fechaCheckCocina ? new Date(item.fechaCheckCocina).toISOString() : null,
                    segundosDemorados: item.segundosDemorados !== null && item.segundosDemorados !== undefined ? Number(item.segundosDemorados) : null
                }));

                const totalPlatos = items.reduce((sum, it) => sum + it.cantidad, 0);
                const platosListos = items.reduce((sum, it) => sum + (it.cantidadLista ?? (it.checkCocina ? it.cantidad : 0)), 0);

                let prioridad: 'normal' | 'media' | 'urgente' = 'normal';
                if (order.fechaInicioCocina) {
                    if (elapsedMinutes > 25) {
                        prioridad = 'urgente';
                    } else if (elapsedMinutes > 15) {
                        prioridad = 'media';
                    }
                }

                tickets.push({
                    pedidoId: order.pedidoId,
                    mesa: order.mesa,
                    clienteNombre: order.clienteNombre,
                    meseroNombre: order.meseroNombre,
                    tiempo: elapsedMinutes,
                    prioridad,
                    fechaCreacion: new Date(order.fechaCreacion).toISOString(),
                    fechaInicioCocina: order.fechaInicioCocina ? new Date(order.fechaInicioCocina).toISOString() : null,
                    fechaFinCocina: order.fechaFinCocina ? new Date(order.fechaFinCocina).toISOString() : null,
                    cocineroNombre: order.cocineroNombre || null,
                    estadoPedido: order.estadoPedido,
                    esDelivery: Boolean(order.esDelivery),
                    totalPlatos,
                    platosListos,
                    items
                });
            }
        }

        return tickets;
    }

    async iniciarCocina(pedidoId: number, cocineroId?: number, cocineroNombre?: string): Promise<boolean> {
        const pool = await connectDatabase();
        await pool.request()
            .input('pedidoId', sql.Int, pedidoId)
            .input('cocineroId', sql.Int, cocineroId || null)
            .input('cocineroNombre', sql.NVarChar(100), cocineroNombre || null)
            .query(`
                UPDATE dbo.Pedidos
                SET FechaInicioCocina = GETDATE(),
                    CocineroNombre = COALESCE(@cocineroNombre, CocineroNombre)
                WHERE Id = @pedidoId;

                IF @cocineroNombre IS NOT NULL OR @cocineroId IS NOT NULL
                BEGIN
                    UPDATE dbo.Detalles_Pedido
                    SET CocineroId = COALESCE(@cocineroId, CocineroId),
                        CocineroNombre = COALESCE(@cocineroNombre, CocineroNombre)
                    WHERE PedidoId = @pedidoId AND (CocineroNombre IS NULL OR CocineroNombre = '');
                END
            `);
        return true;
    }

    async markAsReady(pedidoId: number, cocineroId?: number): Promise<boolean> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('pedidoId', sql.Int, pedidoId)
            .input('cocineroId', sql.Int, cocineroId || null)
            .query(`
                UPDATE dp
                SET CheckCocina = 1,
                    CantidadLista = dp.Cantidad,
                    CocineroId = COALESCE(@cocineroId, dp.CocineroId),
                    FechaCheckCocina = GETDATE()
                FROM dbo.Detalles_Pedido dp
                INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                WHERE dp.PedidoId = @pedidoId AND COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 1;

                -- Asegurar que FechaInicioCocina esté registrada al marcar todo listo
                UPDATE dbo.Pedidos
                SET FechaInicioCocina = COALESCE(FechaInicioCocina, GETDATE())
                WHERE Id = @pedidoId;

                -- Si todos los items del pedido (cocina y despacho) estan listos, pasar a LISTO si estaba EN_PROCESO
                IF NOT EXISTS (
                    SELECT 1 
                    FROM dbo.Detalles_Pedido dp2
                    INNER JOIN dbo.Productos pr2 ON dp2.ProductoId = pr2.Id
                    LEFT JOIN dbo.Categorias c2 ON pr2.CategoriaId = c2.Id
                    WHERE dp2.PedidoId = @pedidoId
                      AND (
                          (COALESCE(pr2.RequiereCoccion, c2.EsCocina, 1) = 1 AND dp2.CheckCocina = 0) OR
                          (COALESCE(pr2.RequiereCoccion, c2.EsCocina, 1) = 0 AND dp2.CheckMesero = 0)
                      )
                )
                BEGIN
                    UPDATE dbo.Pedidos 
                    SET Estado = 'LISTO' 
                    WHERE Id = @pedidoId AND Estado = 'EN_PROCESO';
                END
            `);
        return (result.rowsAffected[0] ?? 0) > 0;
    }

    async toggleItemCocina(detalleId: number, cocineroId?: number, cantidadLista?: number): Promise<{ success: boolean; checkCocina: boolean; cantidadLista: number; cantidad: number; detalleId: number; fechaCheckCocina?: string | null; segundosDemorados?: number | null }> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('detalleId', sql.Int, detalleId)
            .input('cocineroId', sql.Int, cocineroId || null)
            .input('targetCantidadLista', sql.Int, cantidadLista !== undefined ? cantidadLista : null)
            .query(`
                DECLARE @CurrentCantidad INT;
                DECLARE @CurrentLista INT;
                DECLARE @PedidoId INT;

                SELECT 
                    @CurrentCantidad = Cantidad,
                    @CurrentLista = COALESCE(CantidadLista, CASE WHEN CheckCocina = 1 THEN Cantidad ELSE 0 END),
                    @PedidoId = PedidoId 
                FROM dbo.Detalles_Pedido 
                WHERE Id = @detalleId;

                IF @CurrentCantidad IS NULL
                BEGIN
                    SELECT 0 as success, 0 as checkCocina, 0 as cantidadLista, 0 as cantidad;
                    RETURN;
                END

                DECLARE @NewLista INT;

                IF @targetCantidadLista IS NOT NULL
                BEGIN
                    SET @NewLista = CASE 
                        WHEN @targetCantidadLista < 0 THEN 0
                        WHEN @targetCantidadLista > @CurrentCantidad THEN @CurrentCantidad
                        ELSE @targetCantidadLista
                    END;
                END
                ELSE
                BEGIN
                    IF @CurrentCantidad = 1
                    BEGIN
                        SET @NewLista = CASE WHEN @CurrentLista = 1 THEN 0 ELSE 1 END;
                    END
                    ELSE
                    BEGIN
                        -- If multiple dishes: step by 1. If reached full, cycling resets to 0.
                        IF @CurrentLista < @CurrentCantidad
                            SET @NewLista = @CurrentLista + 1;
                        ELSE
                            SET @NewLista = 0;
                    END
                END

                DECLARE @NewCheck BIT = CASE WHEN @NewLista >= @CurrentCantidad THEN 1 ELSE 0 END;

                UPDATE dbo.Detalles_Pedido
                SET CantidadLista = @NewLista,
                    CheckCocina = @NewCheck,
                    CocineroId = CASE WHEN @NewLista > 0 THEN COALESCE(@cocineroId, CocineroId) ELSE NULL END,
                    FechaCheckCocina = CASE 
                        WHEN @NewCheck = 1 THEN GETDATE() 
                        WHEN @NewLista > 0 THEN COALESCE(FechaCheckCocina, GETDATE()) 
                        ELSE NULL 
                    END
                WHERE Id = @detalleId;

                -- Registrar fecha de inicio de cocción en el pedido cuando se empieza a preparar
                -- Esto permite que el temporizador cuente desde que el cocinero empezó, no desde la creación
                IF @NewLista > 0
                BEGIN
                    UPDATE dbo.Pedidos
                    SET FechaInicioCocina = COALESCE(FechaInicioCocina, GETDATE())
                    WHERE Id = @PedidoId;
                END
                -- Si se desmarca el único item y no hay otros en progreso, limpiar FechaInicioCocina
                IF @NewLista = 0
                BEGIN
                    UPDATE dbo.Pedidos
                    SET FechaInicioCocina = NULL
                    WHERE Id = @PedidoId
                      AND NOT EXISTS (
                          SELECT 1 FROM dbo.Detalles_Pedido
                          WHERE PedidoId = @PedidoId AND Id <> @detalleId AND COALESCE(CantidadLista, 0) > 0
                      );
                END

                -- Verificar si ahora todo el pedido esta listo
                IF @NewCheck = 1 AND NOT EXISTS (
                    SELECT 1 
                    FROM dbo.Detalles_Pedido dp2
                    INNER JOIN dbo.Productos pr2 ON dp2.ProductoId = pr2.Id
                    LEFT JOIN dbo.Categorias c2 ON pr2.CategoriaId = c2.Id
                    WHERE dp2.PedidoId = @PedidoId
                      AND (
                          (COALESCE(pr2.RequiereCoccion, c2.EsCocina, 1) = 1 AND dp2.CheckCocina = 0) OR
                          (COALESCE(pr2.RequiereCoccion, c2.EsCocina, 1) = 0 AND dp2.CheckMesero = 0)
                      )
                )
                BEGIN
                    UPDATE dbo.Pedidos 
                    SET Estado = 'LISTO' 
                    WHERE Id = @PedidoId AND Estado = 'EN_PROCESO';
                END

                -- Si se desmarca un item y estaba en LISTO, regresar a EN_PROCESO y resetear CheckMesero
                IF @NewCheck = 0
                BEGIN
                    UPDATE dbo.Detalles_Pedido
                    SET CheckMesero = 0
                    WHERE Id = @detalleId;

                    UPDATE dbo.Pedidos
                    SET Estado = 'EN_PROCESO'
                    WHERE Id = @PedidoId AND Estado = 'LISTO';
                END

                SELECT 
                    1 as success, 
                    @NewCheck as checkCocina, 
                    @NewLista as cantidadLista, 
                    @CurrentCantidad as cantidad,
                    (SELECT dp_chk.FechaCheckCocina FROM dbo.Detalles_Pedido dp_chk WHERE dp_chk.Id = @detalleId) as fechaCheckCocina,
                    (SELECT CASE 
                        WHEN p_chk.FechaInicioCocina IS NOT NULL AND dp_chk2.FechaCheckCocina IS NOT NULL
                        THEN DATEDIFF(SECOND, p_chk.FechaInicioCocina, dp_chk2.FechaCheckCocina)
                        ELSE NULL
                     END FROM dbo.Detalles_Pedido dp_chk2 
                     INNER JOIN dbo.Pedidos p_chk ON dp_chk2.PedidoId = p_chk.Id
                     WHERE dp_chk2.Id = @detalleId) as segundosDemorados;
            `);

        const row = result.recordset[0];
        return {
            success: Boolean(row?.success),
            checkCocina: Boolean(row?.checkCocina),
            cantidadLista: Number(row?.cantidadLista ?? 0),
            cantidad: Number(row?.cantidad ?? 0),
            detalleId,
            fechaCheckCocina: row?.fechaCheckCocina ? new Date(row.fechaCheckCocina).toISOString() : null,
            segundosDemorados: row?.segundosDemorados !== null && row?.segundosDemorados !== undefined ? Number(row.segundosDemorados) : null
        };
    }

    async getDashboardStats(sucursalId?: number): Promise<DashboardStats> {
        const pool = await connectDatabase();

        let ventasQuery = `
            SELECT COALESCE(SUM(Total), 0) as ventasHoy
            FROM dbo.Pedidos
            WHERE Estado = 'PAGADO'
              AND CAST(FechaCreacion AS DATE) = CAST(GETDATE() AS DATE)
        `;
        let comandasActivasQuery = `
            SELECT COUNT(*) as comandasActivas
            FROM dbo.Pedidos
            WHERE Estado IN ('EN_PROCESO', 'LISTO', 'PENDIENTE_PAGO')
        `;
        let comandasTotalesHoyQuery = `
            SELECT COUNT(*) as comandasTotalesHoy
            FROM dbo.Pedidos
            WHERE CAST(FechaCreacion AS DATE) = CAST(GETDATE() AS DATE)
        `;
        let mesasOcupadasQuery = `
            SELECT COUNT(*) as mesasOcupadas
            FROM dbo.Mesas
            WHERE Estado = 'Ocupada' AND Activo = 1
        `;
        let totalMesasQuery = `
            SELECT COUNT(*) as totalMesas
            FROM dbo.Mesas
            WHERE Activo = 1
        `;
        let mesasAtendidasHoyQuery = `
            SELECT COUNT(DISTINCT MesaId) as mesasAtendidasHoy
            FROM dbo.Pedidos
            WHERE MesaId IS NOT NULL
              AND CAST(FechaCreacion AS DATE) = CAST(GETDATE() AS DATE)
        `;

        const vReq = pool.request();
        const caReq = pool.request();
        const ctReq = pool.request();
        const moReq = pool.request();
        const tmReq = pool.request();
        const maReq = pool.request();

        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            vReq.input('sucursalId', sql.Int, sucursalId);
            ventasQuery += ' AND SucursalId = @sucursalId';

            caReq.input('sucursalId', sql.Int, sucursalId);
            comandasActivasQuery += ' AND SucursalId = @sucursalId';

            ctReq.input('sucursalId', sql.Int, sucursalId);
            comandasTotalesHoyQuery += ' AND SucursalId = @sucursalId';

            moReq.input('sucursalId', sql.Int, sucursalId);
            mesasOcupadasQuery += ' AND SucursalId = @sucursalId';

            tmReq.input('sucursalId', sql.Int, sucursalId);
            totalMesasQuery += ' AND SucursalId = @sucursalId';

            maReq.input('sucursalId', sql.Int, sucursalId);
            mesasAtendidasHoyQuery += ' AND SucursalId = @sucursalId';
        }

        const [ventasResult, comandasActivasResult, comandasTotalesResult, mesasOcupadasResult, totalMesasResult, mesasAtendidasResult] = await Promise.all([
            vReq.query(ventasQuery),
            caReq.query(comandasActivasQuery),
            ctReq.query(comandasTotalesHoyQuery),
            moReq.query(mesasOcupadasQuery),
            tmReq.query(totalMesasQuery),
            maReq.query(mesasAtendidasHoyQuery)
        ]);

        return {
            ventasHoy: Number(ventasResult.recordset[0]?.ventasHoy || 0),
            comandasActivas: Number(comandasActivasResult.recordset[0]?.comandasActivas || 0),
            comandasTotalesHoy: Number(comandasTotalesResult.recordset[0]?.comandasTotalesHoy || 0),
            mesasOcupadas: Number(mesasOcupadasResult.recordset[0]?.mesasOcupadas || 0),
            totalMesas: Number(totalMesasResult.recordset[0]?.totalMesas || 0),
            mesasAtendidasHoy: Number(mesasAtendidasResult.recordset[0]?.mesasAtendidasHoy || 0)
        };
    }

    async crearPedido(dto: CrearPedidoDTO): Promise<Pedido> {
        const pool = await connectDatabase();

        // 1. Obtener precios de los productos
        const itemsWithPrice: { productoId: number; cantidad: number; precioUnitario: number; modificacion?: string | null }[] = [];
        let totalCalculado = 0;

        for (const item of dto.items) {
            const prodRes = await pool.request()
                .input('prodId', sql.Int, item.productoId)
                .query('SELECT Precio as precio FROM dbo.Productos WHERE Id = @prodId');
            
            const precioUnitario = Number(prodRes.recordset[0]?.precio || 0);
            totalCalculado += precioUnitario * item.cantidad;
            itemsWithPrice.push({
                productoId: item.productoId,
                cantidad: item.cantidad,
                precioUnitario,
                modificacion: item.modificacion || null
            });
        }

        // 2. Insertar pedido maestro
        const orderRes = await pool.request()
            .input('sucursalId', sql.Int, dto.sucursalId)
            .input('mesaId', sql.Int, dto.mesaId)
            .input('usuarioMeseroId', sql.Int, dto.usuarioMeseroId)
            .input('clienteNombre', sql.NVarChar, dto.clienteNombre)
            .input('total', sql.Decimal(10, 2), totalCalculado)
            .query(`
                INSERT INTO dbo.Pedidos (SucursalId, MesaId, UsuarioMeseroId, ClienteNombre, Total, Estado, FechaCreacion)
                OUTPUT INSERTED.Id as id
                VALUES (@sucursalId, @mesaId, @usuarioMeseroId, @clienteNombre, @total, 'EN_PROCESO', GETDATE())
            `);

        const pedidoId = orderRes.recordset[0].id;

        // 3. Consolidar ítems duplicados sumando cantidad e insertar detalles del pedido
        const consolidatedMap = new Map<number, typeof itemsWithPrice[0]>();
        for (const item of itemsWithPrice) {
            if (consolidatedMap.has(item.productoId)) {
                const ex = consolidatedMap.get(item.productoId)!;
                ex.cantidad += item.cantidad;
                if (item.modificacion && item.modificacion.trim()) {
                    ex.modificacion = ex.modificacion ? `${ex.modificacion}, ${item.modificacion.trim()}` : item.modificacion.trim();
                }
            } else {
                consolidatedMap.set(item.productoId, { ...item });
            }
        }

        for (const item of consolidatedMap.values()) {
            await pool.request()
                .input('pedidoId', sql.Int, pedidoId)
                .input('productoId', sql.Int, item.productoId)
                .input('cantidad', sql.Int, item.cantidad)
                .input('precioUnitario', sql.Decimal(10, 2), item.precioUnitario)
                .input('modificacion', sql.NVarChar, item.modificacion)
                .query(`
                    INSERT INTO dbo.Detalles_Pedido (PedidoId, ProductoId, Cantidad, CantidadLista, PrecioUnitario, Modificacion, CheckCocina, CheckMesero)
                    VALUES (@pedidoId, @productoId, @cantidad, 0, @precioUnitario, @modificacion, 0, 0)
                `);
        }

        // 4. Cambiar estado de la mesa a 'Ocupada'
        await pool.request()
            .input('mesaId', sql.Int, dto.mesaId)
            .query("UPDATE dbo.Mesas SET Estado = 'Ocupada' WHERE Id = @mesaId");

        const pedidoCreado = await this.getPedidoActivoPorMesa(dto.mesaId);
        if (!pedidoCreado) {
            throw new Error('Error al recuperar pedido recién creado');
        }
        return pedidoCreado;
    }

    async getPedidoActivoPorMesa(mesaId: number): Promise<Pedido | null> {
        const pool = await connectDatabase();

        const orderRes = await pool.request()
            .input('mesaId', sql.Int, mesaId)
            .query(`
                SELECT TOP 1
                    p.Id as id,
                    p.SucursalId as sucursalId,
                    p.MesaId as mesaId,
                    m.Numero as mesaNumero,
                    p.UsuarioMeseroId as usuarioMeseroId,
                    COALESCE(RTRIM(CONCAT(u.Nombre, ' ', u.Apellido)), u.Nombre, 'Mesero') as meseroNombre,
                    p.ClienteNombre as clienteNombre,
                    p.EsDelivery as esDelivery,
                    p.DireccionEntrega as direccionEntrega,
                    p.Total as total,
                    p.Estado as estado,
                    p.FechaCreacion as fechaCreacion
                FROM dbo.Pedidos p
                INNER JOIN dbo.Mesas m ON p.MesaId = m.Id
                LEFT JOIN dbo.Usuarios u ON p.UsuarioMeseroId = u.Id
                WHERE p.MesaId = @mesaId AND p.Estado IN ('EN_PROCESO', 'LISTO', 'PENDIENTE_PAGO')
                ORDER BY p.FechaCreacion DESC
            `);

        if (orderRes.recordset.length === 0) {
            return null;
        }

        const pedido = orderRes.recordset[0];

        const detailsRes = await pool.request()
            .input('pedidoId', sql.Int, pedido.id)
            .query(`
                SELECT 
                    dp.Id as id,
                    dp.PedidoId as pedidoId,
                    dp.ProductoId as productoId,
                    pr.Nombre as productoNombre,
                    pr.CategoriaId as categoriaId,
                    COALESCE(c.Nombre, 'Varios') as categoriaNombre,
                    dp.Cantidad as cantidad,
                    COALESCE(dp.CantidadLista, CASE WHEN dp.CheckCocina = 1 THEN dp.Cantidad ELSE 0 END) as cantidadLista,
                    dp.PrecioUnitario as precioUnitario,
                    (dp.Cantidad * dp.PrecioUnitario) as subtotal,
                    dp.Modificacion as modificacion,
                    COALESCE(pr.RequiereCoccion, c.EsCocina, 1) as requiereCoccion,
                    dp.CheckCocina as checkCocina,
                    dp.CheckMesero as checkMesero,
                    dp.CocineroId as cocineroId,
                    cu.Nombre + ' ' + cu.Apellido as cocineroNombre
                FROM dbo.Detalles_Pedido dp
                INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                LEFT JOIN dbo.Usuarios cu ON dp.CocineroId = cu.Id
                WHERE dp.PedidoId = @pedidoId
                ORDER BY c.Id ASC, pr.Nombre ASC
            `);

        return {
            ...pedido,
            detalles: detailsRes.recordset
        };
    }

    async marcarBebidaEntregada(detalleId: number): Promise<boolean> {
        const pool = await connectDatabase();
        const res = await pool.request()
            .input('id', sql.Int, detalleId)
            .query(`
                UPDATE dbo.Detalles_Pedido 
                SET CheckMesero = CASE 
                    WHEN COALESCE(dp.CheckMesero, 0) = 1 THEN 0 
                    ELSE 1 
                END 
                FROM dbo.Detalles_Pedido dp
                INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                WHERE dp.Id = @id
                  AND (
                    COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 0 
                    OR dp.CheckCocina = 1
                    OR COALESCE(dp.CheckMesero, 0) = 1
                  );
            `);
        return (res.rowsAffected[0] ?? 0) > 0;
    }

    async solicitarCuenta(mesaId: number): Promise<boolean> {
        const pool = await connectDatabase();

        // 1. Obtener comanda activa de la mesa
        const orderRes = await pool.request()
            .input('mesaId', sql.Int, mesaId)
            .query(`
                SELECT TOP 1 Id, Estado 
                FROM dbo.Pedidos 
                WHERE MesaId = @mesaId AND Estado IN ('EN_PROCESO', 'LISTO')
                ORDER BY FechaCreacion DESC
            `);

        if (orderRes.recordset.length === 0) {
            throw new Error('No se encontró una comanda activa para esta mesa.');
        }

        const pedidoId = orderRes.recordset[0].Id;

        // 2. Verificar que los platos de cocina estén listos y que toda la comanda esté marcada como servida a la mesa
        const pendingCheck = await pool.request()
            .input('pedidoId', sql.Int, pedidoId)
            .query(`
                SELECT COUNT(*) as pendingCount
                FROM dbo.Detalles_Pedido dp
                INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                WHERE dp.PedidoId = @pedidoId
                  AND (
                    (COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 1 AND (dp.CheckCocina IS NULL OR dp.CheckCocina = 0))
                    OR
                    (dp.CheckMesero IS NULL OR dp.CheckMesero = 0)
                  )
            `);

        const pendingCount = pendingCheck.recordset[0]?.pendingCount || 0;
        if (pendingCount > 0) {
            throw new Error(`No se puede solicitar la pre-cuenta: la comida debe estar lista en cocina y marcada como servida a la mesa (${pendingCount} producto(s) pendientes).`);
        }

        // 3. Pasar a EnPago y PENDIENTE_PAGO
        await pool.request()
            .input('mesaId', sql.Int, mesaId)
            .input('pedidoId', sql.Int, pedidoId)
            .query(`
                UPDATE dbo.Mesas SET Estado = 'EnPago' WHERE Id = @mesaId;
                UPDATE dbo.Pedidos SET Estado = 'PENDIENTE_PAGO' WHERE Id = @pedidoId;
            `);
        return true;
    }

    async agregarItems(pedidoId: number, items: { productoId: number; cantidad: number; modificacion?: string | null }[]): Promise<boolean> {
        const pool = await connectDatabase();

        let agregadoTotal = 0;
        for (const item of items) {
            const prodRes = await pool.request()
                .input('prodId', sql.Int, Number(item.productoId))
                .query('SELECT Precio as precio FROM dbo.Productos WHERE Id = @prodId');
            
            const precioUnitario = Number(prodRes.recordset[0]?.precio || 0);
            const cant = Number(item.cantidad);
            agregadoTotal += precioUnitario * cant;

            // Verificar si el producto ya existe en los detalles de este pedido
            const existingRes = await pool.request()
                .input('pedidoId', sql.Int, Number(pedidoId))
                .input('productoId', sql.Int, Number(item.productoId))
                .query(`
                    SELECT TOP 1 Id, Cantidad, Modificacion, CheckCocina, CheckMesero
                    FROM dbo.Detalles_Pedido
                    WHERE PedidoId = @pedidoId AND ProductoId = @productoId
                    ORDER BY Id ASC
                `);

            if (existingRes.recordset.length > 0) {
                const existing = existingRes.recordset[0];
                let nuevaModificacion = existing.Modificacion;
                if (item.modificacion && item.modificacion.trim()) {
                    if (existing.Modificacion && existing.Modificacion.trim()) {
                        if (!existing.Modificacion.includes(item.modificacion.trim())) {
                            nuevaModificacion = `${existing.Modificacion}, ${item.modificacion.trim()}`;
                        }
                    } else {
                        nuevaModificacion = item.modificacion.trim();
                    }
                }

                await pool.request()
                    .input('detalleId', sql.Int, existing.Id)
                    .input('cantidad', sql.Int, cant)
                    .input('modificacion', sql.NVarChar(255), nuevaModificacion || null)
                    .query(`
                        UPDATE dbo.Detalles_Pedido
                        SET Cantidad = Cantidad + @cantidad,
                            Modificacion = @modificacion,
                            CheckCocina = 0,
                            CheckMesero = 0
                        WHERE Id = @detalleId
                    `);
            } else {
                await pool.request()
                    .input('pedidoId', sql.Int, Number(pedidoId))
                    .input('productoId', sql.Int, Number(item.productoId))
                    .input('cantidad', sql.Int, cant)
                    .input('precioUnitario', sql.Decimal(10, 2), precioUnitario)
                    .input('modificacion', sql.NVarChar(255), item.modificacion ? String(item.modificacion) : null)
                    .query(`
                        INSERT INTO dbo.Detalles_Pedido (PedidoId, ProductoId, Cantidad, CantidadLista, PrecioUnitario, Modificacion, CheckCocina, CheckMesero)
                        VALUES (@pedidoId, @productoId, @cantidad, 0, @precioUnitario, @modificacion, 0, 0)
                    `);
            }
        }

        // Actualizar total en Pedido y reactivar comanda si estaba en pago
        await pool.request()
            .input('pedidoId', sql.Int, Number(pedidoId))
            .input('monto', sql.Decimal(10, 2), agregadoTotal)
            .query(`
                UPDATE dbo.Pedidos 
                SET Total = Total + @monto, Estado = 'EN_PROCESO' 
                WHERE Id = @pedidoId;

                UPDATE dbo.Mesas 
                SET Estado = 'Ocupada' 
                WHERE Id = (SELECT MesaId FROM dbo.Pedidos WHERE Id = @pedidoId);
            `);

        return true;
    }

    async getPedidosPendientesPago(sucursalId?: number): Promise<Pedido[]> {
        const pool = await connectDatabase();
        const request = pool.request();
        let query = `
            SELECT 
                p.Id as id,
                p.SucursalId as sucursalId,
                p.MesaId as mesaId,
                m.Numero as mesaNumero,
                p.UsuarioMeseroId as usuarioMeseroId,
                COALESCE(RTRIM(CONCAT(u.Nombre, ' ', u.Apellido)), u.Nombre, 'Mesero') as meseroNombre,
                p.ClienteNombre as clienteNombre,
                p.EsDelivery as esDelivery,
                p.DireccionEntrega as direccionEntrega,
                p.Total as total,
                p.Estado as estado,
                p.FechaCreacion as fechaCreacion,
                p.FechaActualizacion as fechaActualizacion
            FROM dbo.Pedidos p
            INNER JOIN dbo.Mesas m ON p.MesaId = m.Id
            LEFT JOIN dbo.Usuarios u ON p.UsuarioMeseroId = u.Id
            WHERE p.Estado = 'PENDIENTE_PAGO'
        `;

        if (sucursalId !== undefined) {
            request.input('sucursalId', sql.Int, Number(sucursalId));
            query += ' AND p.SucursalId = @sucursalId';
        }

        query += ' ORDER BY p.FechaCreacion ASC';

        const result = await request.query(query);
        const pedidos: Pedido[] = [];

        for (const row of result.recordset) {
            const detailsRes = await pool.request()
                .input('pedidoId', sql.Int, Number(row.id))
                .query(`
                    SELECT 
                        dp.Id as id,
                        dp.PedidoId as pedidoId,
                        dp.ProductoId as productoId,
                        pr.Nombre as productoNombre,
                        pr.CategoriaId as categoriaId,
                        COALESCE(c.Nombre, 'Varios') as categoriaNombre,
                        dp.Cantidad as cantidad,
                        COALESCE(dp.CantidadLista, CASE WHEN dp.CheckCocina = 1 THEN dp.Cantidad ELSE 0 END) as cantidadLista,
                        dp.PrecioUnitario as precioUnitario,
                        (dp.Cantidad * dp.PrecioUnitario) as subtotal,
                        dp.Modificacion as modificacion,
                        COALESCE(pr.RequiereCoccion, c.EsCocina, 1) as requiereCoccion,
                        dp.CheckCocina as checkCocina,
                        dp.CheckMesero as checkMesero
                    FROM dbo.Detalles_Pedido dp
                    INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                    LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                    WHERE dp.PedidoId = @pedidoId
                    ORDER BY c.Id ASC, pr.Nombre ASC
                `);

            pedidos.push({
                ...row,
                detalles: detailsRes.recordset
            });
        }

        return pedidos;
    }

    async procesarPago(dto: ProcesarPagoDTO): Promise<boolean> {
        const pool = await connectDatabase();

        // 0. Validar que todos los productos estén listos / entregados
        const pendingCheck = await pool.request()
            .input('pedidoId', sql.Int, Number(dto.pedidoId))
            .query(`
                SELECT COUNT(*) as pendingCount
                FROM dbo.Detalles_Pedido dp
                INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                WHERE dp.PedidoId = @pedidoId
                  AND (
                    (COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 1 AND (dp.CheckCocina IS NULL OR dp.CheckCocina = 0))
                    OR
                    (COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 0 AND (dp.CheckMesero IS NULL OR dp.CheckMesero = 0))
                  )
            `);

        const pendingCount = pendingCheck.recordset[0]?.pendingCount || 0;
        if (pendingCount > 0) {
            throw new Error(`No se puede realizar el cobro: aún hay ${pendingCount} producto(s) pendientes de entrega o cocción.`);
        }

        // 1. Insertar registro en dbo.Pagos
        await pool.request()
            .input('pedidoId', sql.Int, Number(dto.pedidoId))
            .input('monto', sql.Decimal(10, 2), Number(dto.monto))
            .input('metodo', sql.NVarChar(50), String(dto.metodo))
            .input('referencia', sql.NVarChar(100), dto.referenciaExterna ? String(dto.referenciaExterna) : null)
            .query(`
                INSERT INTO dbo.Pagos (PedidoId, Monto, Metodo, ReferenciaExterna, Estado, Fecha)
                VALUES (@pedidoId, @monto, @metodo, @referencia, 'COMPLETADO', GETDATE());
            `);

        // 2. Actualizar Pedido a PAGADO
        const orderRes = await pool.request()
            .input('pedidoId', sql.Int, Number(dto.pedidoId))
            .query(`
                UPDATE dbo.Pedidos 
                SET Estado = 'PAGADO', FechaActualizacion = GETDATE()
                OUTPUT INSERTED.MesaId as mesaId
                WHERE Id = @pedidoId;
            `);

        const mesaId = orderRes.recordset[0]?.mesaId;

        // 3. Liberar la Mesa
        if (mesaId) {
            await pool.request()
                .input('mesaId', sql.Int, Number(mesaId))
                .query("UPDATE dbo.Mesas SET Estado = 'Libre' WHERE Id = @mesaId");
        }

        return true;
    }

    async cancelarPedido(pedidoId: number, usuarioId: number, motivo: string, detalleAdicional?: string | null): Promise<boolean> {
        const pool = await connectDatabase();
        const result = await pool.request()
            .input('pedidoId', sql.Int, pedidoId)
            .input('usuarioId', sql.Int, usuarioId)
            .input('motivo', sql.NVarChar(200), motivo)
            .input('detalleAdicional', sql.NVarChar(500), detalleAdicional || null)
            .query(`
                DECLARE @MesaId INT;
                DECLARE @MontoOriginal DECIMAL(10,2);
                DECLARE @EstadoActual NVARCHAR(50);

                SELECT @MesaId = MesaId, @MontoOriginal = Total, @EstadoActual = Estado
                FROM dbo.Pedidos
                WHERE Id = @pedidoId;

                IF @EstadoActual IS NULL OR @EstadoActual IN ('PAGADO', 'ANULADO')
                BEGIN
                    SELECT 0 as success;
                    RETURN;
                END

                -- 1. Actualizar estado del pedido a ANULADO
                UPDATE dbo.Pedidos
                SET Estado = 'ANULADO', FechaActualizacion = GETDATE()
                WHERE Id = @pedidoId;

                -- 2. Liberar la mesa asociada
                IF @MesaId IS NOT NULL
                BEGIN
                    UPDATE dbo.Mesas
                    SET Estado = 'Libre'
                    WHERE Id = @MesaId;
                END

                -- 3. Registrar en Auditoria_Anulaciones
                INSERT INTO dbo.Auditoria_Anulaciones 
                    (PedidoId, UsuarioId, Motivo, DetalleAdicional, MontoOriginal, Fecha)
                VALUES 
                    (@pedidoId, @usuarioId, @motivo, @detalleAdicional, @MontoOriginal, GETDATE());

                SELECT 1 as success;
            `);

        return Boolean(result.recordset[0]?.success);
    }

    async marcarTodoServido(pedidoId: number, servido: boolean): Promise<boolean> {
        const pool = await connectDatabase();

        if (servido) {
            // 1. Verificar si hay platos pendientes en cocina
            const pendingKitchen = await pool.request()
                .input('pedidoId', sql.Int, pedidoId)
                .query(`
                    SELECT COUNT(*) as count 
                    FROM dbo.Detalles_Pedido dp
                    INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                    LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                    WHERE dp.PedidoId = @pedidoId 
                      AND COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 1
                      AND (dp.CheckCocina IS NULL OR dp.CheckCocina = 0)
                `);
            const pendingKitchenCount = pendingKitchen.recordset[0]?.count || 0;
            if (pendingKitchenCount > 0) {
                throw new Error(`No se puede marcar como servida: la cocina aún tiene ${pendingKitchenCount} plato(s) en preparación.`);
            }

            // 2. Verificar si hay productos que no requieren preparación sin marcar como entregados
            const pendingDirect = await pool.request()
                .input('pedidoId', sql.Int, pedidoId)
                .query(`
                    SELECT COUNT(*) as count 
                    FROM dbo.Detalles_Pedido dp
                    INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                    LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                    WHERE dp.PedidoId = @pedidoId 
                      AND COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 0
                      AND (dp.CheckMesero IS NULL OR dp.CheckMesero = 0)
                `);
            const pendingDirectCount = pendingDirect.recordset[0]?.count || 0;
            if (pendingDirectCount > 0) {
                throw new Error(`No se puede marcar como servida: aún hay ${pendingDirectCount} producto(s) pendientes de marcar como entregados.`);
            }

            // Marcar todos los ítems como servidos
            const res = await pool.request()
                .input('pedidoId', sql.Int, pedidoId)
                .query(`
                    UPDATE dbo.Detalles_Pedido 
                    SET CheckMesero = 1 
                    WHERE PedidoId = @pedidoId
                `);

            return (res.rowsAffected[0] ?? 0) > 0;
        } else {
            // Desmarcar servido de los platos de cocina (las bebidas que ya se entregaron mantienen su estado entregado)
            const res = await pool.request()
                .input('pedidoId', sql.Int, pedidoId)
                .query(`
                    UPDATE dp
                    SET dp.CheckMesero = 0 
                    FROM dbo.Detalles_Pedido dp
                    INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                    LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                    WHERE dp.PedidoId = @pedidoId
                      AND COALESCE(pr.RequiereCoccion, c.EsCocina, 1) = 1
                `);

            return true;
        }
    }

    async getHistorialVentas(sucursalId?: number, fechaInicio?: string, fechaFin?: string, metodoPago?: string, estado?: string): Promise<HistorialVentasResumen> {
        const pool = await connectDatabase();
        const request = pool.request();
        let query = `
            SELECT 
                p.Id as pedidoId,
                p.SucursalId as sucursalId,
                s.Nombre as sucursalNombre,
                p.MesaId as mesaId,
                m.Numero as mesaNumero,
                p.UsuarioMeseroId as usuarioMeseroId,
                COALESCE(RTRIM(CONCAT(u.Nombre, ' ', u.Apellido)), u.Nombre, 'Mesero') as meseroNombre,
                p.ClienteNombre as clienteNombre,
                p.EsDelivery as esDelivery,
                p.DireccionEntrega as direccionEntrega,
                p.Total as total,
                p.Estado as estado,
                p.FechaCreacion as fechaCreacion,
                p.FechaActualizacion as fechaActualizacion,
                pg.Id as pagoId,
                COALESCE(pg.Monto, p.Total) as montoPagado,
                COALESCE(pg.Metodo, 'EFECTIVO') as metodoPago,
                pg.ReferenciaExterna as referenciaPago,
                COALESCE(pg.Fecha, p.FechaActualizacion, p.FechaCreacion) as fechaPago
            FROM dbo.Pedidos p
            LEFT JOIN dbo.Mesas m ON p.MesaId = m.Id
            LEFT JOIN dbo.Usuarios u ON p.UsuarioMeseroId = u.Id
            LEFT JOIN dbo.Sucursales s ON p.SucursalId = s.Id
            OUTER APPLY (
                SELECT TOP 1 Id, Monto, Metodo, ReferenciaExterna, Fecha 
                FROM dbo.Pagos 
                WHERE PedidoId = p.Id 
                ORDER BY Fecha DESC
            ) pg
            WHERE 1=1
        `;

        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            request.input('sucursalId', sql.Int, Number(sucursalId));
            query += ' AND p.SucursalId = @sucursalId';
        }

        if (fechaInicio) {
            request.input('fechaInicio', sql.VarChar(10), fechaInicio);
            query += ' AND CAST(COALESCE(pg.Fecha, p.FechaActualizacion, p.FechaCreacion) AS DATE) >= @fechaInicio';
        }

        if (fechaFin) {
            request.input('fechaFin', sql.VarChar(10), fechaFin);
            query += ' AND CAST(COALESCE(pg.Fecha, p.FechaActualizacion, p.FechaCreacion) AS DATE) <= @fechaFin';
        }

        if (metodoPago && metodoPago.trim() !== '' && metodoPago.toUpperCase() !== 'TODOS') {
            request.input('metodoPago', sql.NVarChar(50), metodoPago.trim());
            query += ' AND UPPER(COALESCE(pg.Metodo, \'EFECTIVO\')) = UPPER(@metodoPago) AND p.Estado = \'PAGADO\'';
        }

        if (estado && estado.trim() !== '' && estado.toUpperCase() !== 'TODOS') {
            request.input('estado', sql.NVarChar(50), estado.trim());
            query += ' AND UPPER(p.Estado) = UPPER(@estado)';
        }

        query += ' ORDER BY COALESCE(pg.Fecha, p.FechaActualizacion, p.FechaCreacion) DESC, p.Id DESC';

        const result = await request.query(query);
        const rows = result.recordset;

        if (rows.length === 0) {
            return {
                totalVentas: 0,
                totalOrdenes: 0,
                ticketPromedio: 0,
                ventasPorMetodo: [],
                ventas: []
            };
        }

        // Obtener los detalles de los pedidos encontrados
        const pedidoIds = rows.map(r => Number(r.pedidoId)).filter(id => !isNaN(id));
        const detailsMap = new Map<number, DetallePedido[]>();

        if (pedidoIds.length > 0) {
            const detailsRequest = pool.request();
            const detailsRes = await detailsRequest.query(`
                SELECT 
                    dp.Id as id,
                    dp.PedidoId as pedidoId,
                    dp.ProductoId as productoId,
                    pr.Nombre as productoNombre,
                    pr.CategoriaId as categoriaId,
                    COALESCE(c.Nombre, 'Varios') as categoriaNombre,
                    dp.Cantidad as cantidad,
                    dp.PrecioUnitario as precioUnitario,
                    (dp.Cantidad * dp.PrecioUnitario) as subtotal,
                    dp.Modificacion as modificacion
                FROM dbo.Detalles_Pedido dp
                INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
                LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
                WHERE dp.PedidoId IN (${pedidoIds.join(',')})
                ORDER BY dp.PedidoId, c.Id ASC, pr.Nombre ASC
            `);

            for (const d of detailsRes.recordset) {
                const pId = Number(d.pedidoId);
                if (!detailsMap.has(pId)) {
                    detailsMap.set(pId, []);
                }
                detailsMap.get(pId)!.push({
                    id: d.id,
                    pedidoId: d.pedidoId,
                    productoId: d.productoId,
                    productoNombre: d.productoNombre,
                    categoriaId: d.categoriaId,
                    categoriaNombre: d.categoriaNombre,
                    cantidad: Number(d.cantidad),
                    precioUnitario: Number(d.precioUnitario),
                    subtotal: Number(d.subtotal),
                    modificacion: d.modificacion
                });
            }
        }

        let totalVentas = 0;
        let totalOrdenesCobradas = 0;
        const metodoMap = new Map<string, { total: number; count: number }>();

        const ventas: VentaHistorialItem[] = rows.map(r => {
            const isPagado = (r.estado || '').toUpperCase() === 'PAGADO';
            const monto = Number(r.montoPagado || r.total || 0);

            if (isPagado) {
                totalVentas += monto;
                totalOrdenesCobradas += 1;

                const met = (r.metodoPago || 'EFECTIVO').toUpperCase();
                if (!metodoMap.has(met)) {
                    metodoMap.set(met, { total: 0, count: 0 });
                }
                const cur = metodoMap.get(met)!;
                cur.total += monto;
                cur.count += 1;
            }

            return {
                pedidoId: Number(r.pedidoId),
                sucursalId: Number(r.sucursalId),
                sucursalNombre: r.sucursalNombre || undefined,
                mesaId: r.mesaId ? Number(r.mesaId) : null,
                mesaNumero: r.mesaNumero ? Number(r.mesaNumero) : undefined,
                usuarioMeseroId: r.usuarioMeseroId ? Number(r.usuarioMeseroId) : undefined,
                meseroNombre: r.meseroNombre,
                clienteNombre: r.clienteNombre,
                esDelivery: Boolean(r.esDelivery),
                direccionEntrega: r.direccionEntrega,
                total: Number(r.total || 0),
                estado: r.estado,
                fechaCreacion: r.fechaCreacion,
                fechaActualizacion: r.fechaActualizacion,
                pagoId: r.pagoId ? Number(r.pagoId) : undefined,
                montoPagado: isPagado ? monto : 0,
                metodoPago: isPagado ? (r.metodoPago || 'EFECTIVO') : (r.estado === 'ANULADO' ? 'ANULADO' : 'POR COBRAR'),
                referenciaPago: r.referenciaPago,
                fechaPago: r.fechaPago,
                detalles: detailsMap.get(Number(r.pedidoId)) || []
            };
        });

        const ticketPromedio = totalOrdenesCobradas > 0 ? Number((totalVentas / totalOrdenesCobradas).toFixed(2)) : 0;
        const ventasPorMetodo = Array.from(metodoMap.entries()).map(([metodo, data]) => ({
            metodo,
            total: Number(data.total.toFixed(2)),
            count: data.count
        }));

        return {
            totalVentas: Number(totalVentas.toFixed(2)),
            totalOrdenes: totalOrdenesCobradas,
            ticketPromedio,
            ventasPorMetodo,
            ventas
        };
    }

    async getEstadisticasAvanzadas(sucursalId?: number, fechaInicio?: string, fechaFin?: string): Promise<EstadisticasAvanzadas> {
        const pool = await connectDatabase();

        let filterSql = 'WHERE 1=1';
        const req = pool.request();

        if (sucursalId !== undefined && !isNaN(sucursalId)) {
            req.input('sucursalId', sql.Int, Number(sucursalId));
            filterSql += ' AND p.SucursalId = @sucursalId';
        }

        if (fechaInicio) {
            req.input('fechaInicio', sql.VarChar(10), fechaInicio);
            filterSql += ' AND CAST(COALESCE(p.FechaActualizacion, p.FechaCreacion) AS DATE) >= @fechaInicio';
        }

        if (fechaFin) {
            req.input('fechaFin', sql.VarChar(10), fechaFin);
            filterSql += ' AND CAST(COALESCE(p.FechaActualizacion, p.FechaCreacion) AS DATE) <= @fechaFin';
        }

        // 1. Resumen General (Totales)
        const summaryRes = await req.query(`
            SELECT 
                COUNT(*) as totalComandas,
                COALESCE(SUM(CASE WHEN p.Estado = 'PAGADO' THEN p.Total ELSE 0 END), 0) as totalVentas,
                COALESCE(SUM(CASE WHEN p.Estado = 'ANULADO' THEN p.Total ELSE 0 END), 0) as montoAnulado,
                COUNT(CASE WHEN p.Estado = 'PAGADO' THEN 1 END) as totalPagos,
                COUNT(CASE WHEN p.Estado = 'ANULADO' THEN 1 END) as totalAnulados,
                COUNT(CASE WHEN p.MesaId IS NOT NULL THEN 1 END) as totalMesasAtendidas
            FROM dbo.Pedidos p
            ${filterSql}
        `);

        const summary = summaryRes.recordset[0] || {};
        const totalComandas = Number(summary.totalComandas || 0);
        const totalVentas = Number(summary.totalVentas || 0);
        const montoAnulado = Number(summary.montoAnulado || 0);
        const totalPagos = Number(summary.totalPagos || 0);
        const totalAnulados = Number(summary.totalAnulados || 0);
        const totalMesasAtendidas = Number(summary.totalMesasAtendidas || 0);
        const ticketPromedio = totalPagos > 0 ? Number((totalVentas / totalPagos).toFixed(2)) : 0;
        const tasaEfectividad = totalComandas > 0 ? Number(((totalPagos / totalComandas) * 100).toFixed(1)) : 100;

        // 2. Comandas por Estado
        const estadosRes = await req.query(`
            SELECT 
                p.Estado as estado, 
                COUNT(*) as count, 
                COALESCE(SUM(p.Total), 0) as monto
            FROM dbo.Pedidos p
            ${filterSql}
            GROUP BY p.Estado
        `);

        const estadoLabels: Record<string, { label: string; color: string }> = {
            'PAGADO': { label: 'Cobrados', color: '#10b981' },
            'EN_PROCESO': { label: 'En Cocina', color: '#f59e0b' },
            'LISTO': { label: 'Listos para Servir', color: '#06b6d4' },
            'PENDIENTE_PAGO': { label: 'En Caja / Pre-cuenta', color: '#a855f7' },
            'ANULADO': { label: 'Anulados', color: '#ef4444' }
        };

        const comandasPorEstado = estadosRes.recordset.map(r => {
            const est = (r.estado || 'PENDIENTE').toUpperCase();
            const config = estadoLabels[est] || { label: est, color: '#94a3b8' };
            const count = Number(r.count || 0);
            return {
                estado: est,
                label: config.label,
                count,
                porcentaje: totalComandas > 0 ? Number(((count / totalComandas) * 100).toFixed(1)) : 0,
                monto: Number(r.monto || 0),
                color: config.color
            };
        });

        // 3. Pagos por Método
        const pagosRes = await req.query(`
            SELECT 
                COALESCE(pg.Metodo, 'EFECTIVO') as metodo,
                COUNT(*) as count,
                COALESCE(SUM(pg.Monto), 0) as total
            FROM dbo.Pagos pg
            INNER JOIN dbo.Pedidos p ON pg.PedidoId = p.Id
            ${filterSql} AND p.Estado = 'PAGADO'
            GROUP BY COALESCE(pg.Metodo, 'EFECTIVO')
        `);

        const metodoColors: Record<string, string> = {
            'EFECTIVO': '#10b981',
            'TARJETA': '#3b82f6',
            'YAPE': '#a855f7'
        };

        const pagosPorMetodo = pagosRes.recordset.map(r => {
            const met = (r.metodo || 'EFECTIVO').toUpperCase();
            const tot = Number(r.total || 0);
            return {
                metodo: met,
                total: tot,
                count: Number(r.count || 0),
                porcentaje: totalVentas > 0 ? Number(((tot / totalVentas) * 100).toFixed(1)) : 0,
                color: metodoColors[met] || '#ff7e47'
            };
        });

        // 4. Tendencia de Ventas (por Horas si es un solo día o por Días si es histórico o rango)
        const isSingleDay = Boolean(fechaInicio && fechaFin && fechaInicio === fechaFin);
        let ventasPorPeriodo: { etiqueta: string; total: number; comandas: number }[] = [];

        if (isSingleDay) {
            const horasRes = await req.query(`
                SELECT 
                    DATEPART(HOUR, COALESCE(p.FechaActualizacion, p.FechaCreacion)) as hora,
                    COUNT(*) as comandas,
                    COALESCE(SUM(p.Total), 0) as total
                FROM dbo.Pedidos p
                ${filterSql} AND p.Estado = 'PAGADO'
                GROUP BY DATEPART(HOUR, COALESCE(p.FechaActualizacion, p.FechaCreacion))
                ORDER BY hora ASC
            `);

            const horaMap = new Map<number, { total: number; comandas: number }>();
            for (const row of horasRes.recordset) {
                horaMap.set(Number(row.hora), { total: Number(row.total || 0), comandas: Number(row.comandas || 0) });
            }

            for (let h = 8; h <= 23; h++) {
                const data = horaMap.get(h) || { total: 0, comandas: 0 };
                const formattedHour = `${h < 10 ? '0' + h : h}:00`;
                ventasPorPeriodo.push({
                    etiqueta: formattedHour,
                    total: Number(data.total.toFixed(2)),
                    comandas: data.comandas
                });
            }
        } else {
            const diasRes = await req.query(`
                SELECT 
                    CAST(COALESCE(p.FechaActualizacion, p.FechaCreacion) AS DATE) as fecha,
                    COUNT(*) as comandas,
                    COALESCE(SUM(p.Total), 0) as total
                FROM dbo.Pedidos p
                ${filterSql} AND p.Estado = 'PAGADO'
                GROUP BY CAST(COALESCE(p.FechaActualizacion, p.FechaCreacion) AS DATE)
                ORDER BY fecha ASC
            `);

            ventasPorPeriodo = diasRes.recordset.map(r => {
                const rawDate = r.fecha;
                let diaNombre = '';
                if (rawDate instanceof Date) {
                    diaNombre = rawDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                } else if (typeof rawDate === 'string') {
                    const datePart = rawDate.split('T')[0] || '';
                    const parts = datePart.split('-');
                    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                        diaNombre = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                    } else {
                        diaNombre = rawDate;
                    }
                } else {
                    diaNombre = String(rawDate);
                }

                return {
                    etiqueta: diaNombre,
                    total: Number(Number(r.total || 0).toFixed(2)),
                    comandas: Number(r.comandas || 0)
                };
            });
        }

        // 5. Auditoría de Anulaciones y Motivos
        const anulacionesRes = await req.query(`
            SELECT 
                COALESCE(a.Motivo, 'Sin motivo especificado') as motivo,
                COUNT(*) as count,
                COALESCE(SUM(COALESCE(a.MontoOriginal, p.Total)), 0) as monto
            FROM dbo.Pedidos p
            LEFT JOIN dbo.Auditoria_Anulaciones a ON p.Id = a.PedidoId
            ${filterSql} AND p.Estado = 'ANULADO'
            GROUP BY COALESCE(a.Motivo, 'Sin motivo especificado')
            ORDER BY count DESC
        `);

        const anulacionesPorMotivo = anulacionesRes.recordset.map(r => {
            const count = Number(r.count || 0);
            return {
                motivo: String(r.motivo),
                count,
                porcentaje: totalAnulados > 0 ? Number(((count / totalAnulados) * 100).toFixed(1)) : 0,
                monto: Number(r.monto || 0)
            };
        });

        // 6. Top 5 Productos más Vendidos
        const topProdRes = await req.query(`
            SELECT TOP 5
                pr.Id as productoId,
                pr.Nombre as nombre,
                COALESCE(c.Nombre, 'General') as categoria,
                SUM(dp.Cantidad) as cantidad,
                SUM(dp.Cantidad * dp.PrecioUnitario) as total
            FROM dbo.Detalles_Pedido dp
            INNER JOIN dbo.Pedidos p ON dp.PedidoId = p.Id
            INNER JOIN dbo.Productos pr ON dp.ProductoId = pr.Id
            LEFT JOIN dbo.Categorias c ON pr.CategoriaId = c.Id
            ${filterSql} AND p.Estado = 'PAGADO'
            GROUP BY pr.Id, pr.Nombre, c.Nombre
            ORDER BY cantidad DESC
        `);

        const topProductos = topProdRes.recordset.map(r => ({
            productoId: Number(r.productoId),
            nombre: String(r.nombre),
            categoria: String(r.categoria),
            cantidad: Number(r.cantidad || 0),
            total: Number(Number(r.total || 0).toFixed(2))
        }));

        return {
            totalVentas: Number(totalVentas.toFixed(2)),
            totalComandas,
            totalPagos,
            totalAnulados,
            totalMesasAtendidas,
            montoAnulado: Number(montoAnulado.toFixed(2)),
            ticketPromedio,
            tasaEfectividad,
            ventasPorPeriodo,
            comandasPorEstado,
            pagosPorMetodo,
            anulacionesPorMotivo,
            topProductos
        };
    }
}
