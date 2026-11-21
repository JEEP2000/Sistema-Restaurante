import { connectDatabase } from '../../../../config/database.js';
import type { MesaRepositoryPort } from '../../../../application/ports/out/mesa-repository.port.js';
import type { Mesa } from '../../../../domain/models/mesa.model.js';

export class SqlServerMesaRepositoryAdapter implements MesaRepositoryPort {
    async getAll(sucursalId?: number): Promise<Mesa[]> {
        const pool = await connectDatabase();
        const request = pool.request();
        let query = `
            SELECT 
                m.Id as id, 
                m.SucursalId as sucursalId, 
                m.Numero as numero, 
                m.Capacidad as capacidad, 
                LOWER(m.Estado) as estado, 
                m.PosX as posX, 
                m.PosY as posY,
                p.ClienteNombre as clienteNombre,
                p.Total as total,
                COALESCE(RTRIM(CONCAT(u.Nombre, ' ', LEFT(u.Apellido, 1), '.')), u.Nombre, 'Mesero') as mesero
            FROM dbo.Mesas m
            LEFT JOIN dbo.Pedidos p ON m.Id = p.MesaId AND p.Estado IN ('EN_PROCESO', 'LISTO', 'PENDIENTE_PAGO')
            LEFT JOIN dbo.Usuarios u ON p.UsuarioMeseroId = u.Id
            WHERE m.Activo = 1
        `;

        if (sucursalId !== undefined) {
            request.input('sucursalId', sucursalId);
            query += ' AND m.SucursalId = @sucursalId';
        }

        query += ' ORDER BY m.Numero ASC';
        const result = await request.query(query);

        return result.recordset;
    }

    async findByNumero(sucursalId: number, numero: number): Promise<any | null> {
        const pool = await connectDatabase();
        const request = pool.request();
        request.input('sucursalId', sucursalId);
        request.input('numero', numero);
        const result = await request.query(`
            SELECT 
                Id as id, 
                SucursalId as sucursalId, 
                Numero as numero, 
                Capacidad as capacidad, 
                LOWER(Estado) as estado, 
                PosX as posX, 
                PosY as posY, 
                Activo as activo
            FROM dbo.Mesas
            WHERE SucursalId = @sucursalId AND Numero = @numero
        `);
        return result.recordset[0] || null;
    }

    async create(mesa: { sucursalId: number; numero: number; capacidad: number; posX?: number | null; posY?: number | null }): Promise<Mesa> {
        const pool = await connectDatabase();
        const existing = await this.findByNumero(mesa.sucursalId, mesa.numero);

        if (existing && !existing.activo) {
            const request = pool.request();
            request.input('id', existing.id);
            request.input('capacidad', mesa.capacidad || 4);
            request.input('posX', mesa.posX || null);
            request.input('posY', mesa.posY || null);
            const result = await request.query(`
                UPDATE dbo.Mesas
                SET Activo = 1, Capacidad = @capacidad, Estado = 'Libre', PosX = @posX, PosY = @posY
                OUTPUT 
                    INSERTED.Id as id, 
                    INSERTED.SucursalId as sucursalId, 
                    INSERTED.Numero as numero, 
                    INSERTED.Capacidad as capacidad, 
                    LOWER(INSERTED.Estado) as estado, 
                    INSERTED.PosX as posX, 
                    INSERTED.PosY as posY
                WHERE Id = @id
            `);
            return result.recordset[0];
        }

        const request = pool.request();
        request.input('sucursalId', mesa.sucursalId);
        request.input('numero', mesa.numero);
        request.input('capacidad', mesa.capacidad || 4);
        request.input('posX', mesa.posX || null);
        request.input('posY', mesa.posY || null);

        const result = await request.query(`
            INSERT INTO dbo.Mesas (SucursalId, Numero, Capacidad, Estado, Activo, PosX, PosY)
            OUTPUT 
                INSERTED.Id as id, 
                INSERTED.SucursalId as sucursalId, 
                INSERTED.Numero as numero, 
                INSERTED.Capacidad as capacidad, 
                LOWER(INSERTED.Estado) as estado, 
                INSERTED.PosX as posX, 
                INSERTED.PosY as posY
            VALUES (@sucursalId, @numero, @capacidad, 'Libre', 1, @posX, @posY)
        `);

        return result.recordset[0];
    }
}
