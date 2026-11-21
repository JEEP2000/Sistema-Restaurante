import sql from 'mssql';
import { connectDatabase } from '../../../../config/database.js';
import type { SucursalRepositoryPort } from '../../../../application/ports/out/sucursal-repository.port.js';
import type { Sucursal } from '../../../../domain/models/sucursal.model.js';

export class SqlServerSucursalRepositoryAdapter implements SucursalRepositoryPort {
    async getAll(): Promise<Sucursal[]> {
        const pool = await connectDatabase();
        const result = await pool.request().query(`
            SELECT 
                s.Id as id,
                s.EmpresaId as empresaId,
                s.Nombre as nombre,
                s.Direccion as direccion,
                s.Telefono as telefono,
                s.CorreoContacto as correoContacto,
                CONVERT(VARCHAR(5), s.HorarioApertura, 108) as horarioApertura,
                CONVERT(VARCHAR(5), s.HorarioCierre, 108) as horarioCierre,
                s.EsDelivery as esDelivery,
                s.CostoDelivery as costoDelivery,
                s.Activo as activo,
                e.Nombre as empresaNombre,
                e.RUC as ruc
            FROM dbo.Sucursales s
            LEFT JOIN dbo.Empresas e ON s.EmpresaId = e.Id
            ORDER BY s.Id ASC
        `);

        return result.recordset;
    }

    async getById(id: number): Promise<Sucursal | null> {
        const pool = await connectDatabase();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    s.Id as id,
                    s.EmpresaId as empresaId,
                    s.Nombre as nombre,
                    s.Direccion as direccion,
                    s.Telefono as telefono,
                    s.CorreoContacto as correoContacto,
                    CONVERT(VARCHAR(5), s.HorarioApertura, 108) as horarioApertura,
                    CONVERT(VARCHAR(5), s.HorarioCierre, 108) as horarioCierre,
                    s.EsDelivery as esDelivery,
                    s.CostoDelivery as costoDelivery,
                    s.Activo as activo,
                    e.Nombre as empresaNombre,
                    e.RUC as ruc
                FROM dbo.Sucursales s
                LEFT JOIN dbo.Empresas e ON s.EmpresaId = e.Id
                WHERE s.Id = @id
            `);

        if (result.recordset.length === 0) {
            return null;
        }

        return result.recordset[0];
    }

    async create(sucursal: Omit<Sucursal, 'id'>): Promise<Sucursal> {
        const pool = await connectDatabase();
        const result = await pool
            .request()
            .input('empresaId', sql.Int, sucursal.empresaId || 1)
            .input('nombre', sql.NVarChar, sucursal.nombre)
            .input('direccion', sql.NVarChar, sucursal.direccion)
            .input('telefono', sql.VarChar, sucursal.telefono)
            .input('correoContacto', sql.VarChar, sucursal.correoContacto || null)
            .input('horarioApertura', sql.VarChar, sucursal.horarioApertura || null)
            .input('horarioCierre', sql.VarChar, sucursal.horarioCierre || null)
            .input('esDelivery', sql.Bit, sucursal.esDelivery !== undefined ? (sucursal.esDelivery ? 1 : 0) : 1)
            .input('costoDelivery', sql.Decimal(10, 2), sucursal.costoDelivery !== undefined ? sucursal.costoDelivery : 0)
            .input('activo', sql.Bit, sucursal.activo !== undefined ? (sucursal.activo ? 1 : 0) : 1)
            .query(`
                INSERT INTO dbo.Sucursales 
                (EmpresaId, Nombre, Direccion, Telefono, CorreoContacto, HorarioApertura, HorarioCierre, EsDelivery, CostoDelivery, Activo)
                OUTPUT 
                    INSERTED.Id as id,
                    INSERTED.EmpresaId as empresaId,
                    INSERTED.Nombre as nombre,
                    INSERTED.Direccion as direccion,
                    INSERTED.Telefono as telefono,
                    INSERTED.CorreoContacto as correoContacto,
                    CONVERT(VARCHAR(5), INSERTED.HorarioApertura, 108) as horarioApertura,
                    CONVERT(VARCHAR(5), INSERTED.HorarioCierre, 108) as horarioCierre,
                    INSERTED.EsDelivery as esDelivery,
                    INSERTED.CostoDelivery as costoDelivery,
                    INSERTED.Activo as activo
                VALUES 
                (@empresaId, @nombre, @direccion, @telefono, @correoContacto, @horarioApertura, @horarioCierre, @esDelivery, @costoDelivery, @activo)
            `);

        return result.recordset[0];
    }

    async update(id: number, data: Partial<Sucursal>): Promise<boolean> {
        const pool = await connectDatabase();
        const request = pool.request().input('id', sql.Int, id);

        let query = 'UPDATE dbo.Sucursales SET ';
        const updates: string[] = [];

        if (data.nombre !== undefined) {
            request.input('nombre', sql.NVarChar, data.nombre);
            updates.push('Nombre = @nombre');
        }
        if (data.direccion !== undefined) {
            request.input('direccion', sql.NVarChar, data.direccion);
            updates.push('Direccion = @direccion');
        }
        if (data.telefono !== undefined) {
            request.input('telefono', sql.VarChar, data.telefono);
            updates.push('Telefono = @telefono');
        }
        if (data.correoContacto !== undefined) {
            request.input('correoContacto', sql.VarChar, data.correoContacto || null);
            updates.push('CorreoContacto = @correoContacto');
        }
        if (data.horarioApertura !== undefined) {
            request.input('horarioApertura', sql.VarChar, data.horarioApertura || null);
            updates.push('HorarioApertura = @horarioApertura');
        }
        if (data.horarioCierre !== undefined) {
            request.input('horarioCierre', sql.VarChar, data.horarioCierre || null);
            updates.push('HorarioCierre = @horarioCierre');
        }
        if (data.esDelivery !== undefined) {
            request.input('esDelivery', sql.Bit, data.esDelivery ? 1 : 0);
            updates.push('EsDelivery = @esDelivery');
        }
        if (data.costoDelivery !== undefined) {
            request.input('costoDelivery', sql.Decimal(10, 2), data.costoDelivery);
            updates.push('CostoDelivery = @costoDelivery');
        }
        if (data.activo !== undefined) {
            request.input('activo', sql.Bit, data.activo ? 1 : 0);
            updates.push('Activo = @activo');
        }

        if (updates.length === 0) return false;

        query += updates.join(', ') + ' WHERE Id = @id';
        const result = await request.query(query);
        return (result.rowsAffected[0] ?? 0) > 0;
    }

    async delete(id: number): Promise<boolean> {
        const pool = await connectDatabase();
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.Sucursales WHERE Id = @id');

        return (result.rowsAffected[0] ?? 0) > 0;
    }
}
