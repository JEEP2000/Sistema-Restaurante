import sql from 'mssql';
import { connectDatabase } from '../../../../config/database.js';
import type { UserRepositoryPort } from '../../../../application/ports/out/user-repository.port.js';
import type { User } from '../../../../domain/models/user.model.js';

export class SqlServerUserRepositoryAdapter implements UserRepositoryPort {
    async findByEmail(email: string): Promise<User | null> {
        const pool = await connectDatabase();
        const result = await pool
            .request()
            .input('email', sql.VarChar, email)
            .query(`
                SELECT u.Id as id, u.SucursalId as sucursalId, u.RolId as rolId, 
                       u.Nombre as nombre, u.Apellido as apellido, u.Email as email, 
                       u.PasswordHash as passwordHash, u.Telefono as telefono, 
                       u.Activo as activo, u.FechaCreacion as fechaCreacion,
                       r.Nombre as rolNombre,
                       s.Nombre as sucursalNombre
                FROM dbo.Usuarios u
                INNER JOIN dbo.Roles r ON u.RolId = r.Id
                LEFT JOIN dbo.Sucursales s ON u.SucursalId = s.Id
                WHERE u.Email = @email AND u.Activo = 1
            `);

        if (result.recordset.length === 0) {
            return null;
        }

        return result.recordset[0];
    }

    async findByName(nombre: string): Promise<User[]> {
        const pool = await connectDatabase();
        const result = await pool
            .request()
            .input('nombre', sql.NVarChar, nombre)
            .query(`
                SELECT u.Id as id, u.SucursalId as sucursalId, u.RolId as rolId, 
                       u.Nombre as nombre, u.Apellido as apellido, u.Email as email, 
                       u.PasswordHash as passwordHash, u.Telefono as telefono, 
                       u.Activo as activo, u.FechaCreacion as fechaCreacion,
                       r.Nombre as rolNombre,
                       s.Nombre as sucursalNombre
                FROM dbo.Usuarios u
                INNER JOIN dbo.Roles r ON u.RolId = r.Id
                LEFT JOIN dbo.Sucursales s ON u.SucursalId = s.Id
                WHERE u.Nombre = @nombre AND u.Activo = 1
            `);

        return result.recordset;
    }

    async create(user: Omit<User, 'id' | 'activo' | 'fechaCreacion'>): Promise<Omit<User, 'passwordHash'>> {
        const pool = await connectDatabase();
        const result = await pool
            .request()
            .input('sucursalId', sql.Int, user.sucursalId)
            .input('rolId', sql.Int, user.rolId)
            .input('nombre', sql.NVarChar, user.nombre)
            .input('apellido', sql.NVarChar, user.apellido)
            .input('email', sql.VarChar, user.email || null)
            .input('passwordHash', sql.VarChar, user.passwordHash)
            .input('telefono', sql.VarChar, user.telefono || null)
            .query(`
                INSERT INTO dbo.Usuarios (SucursalId, RolId, Nombre, Apellido, Email, PasswordHash, Telefono)
                OUTPUT INSERTED.Id as id, INSERTED.SucursalId as sucursalId, INSERTED.RolId as rolId, 
                       INSERTED.Nombre as nombre, INSERTED.Apellido as apellido, INSERTED.Email as email, 
                       INSERTED.Telefono as telefono, INSERTED.Activo as activo, INSERTED.FechaCreacion as fechaCreacion
                VALUES (@sucursalId, @rolId, @nombre, @apellido, @email, @passwordHash, @telefono)
            `);

        return result.recordset[0];
    }

    async getBySucursal(sucursalId: number): Promise<User[]> {
        const pool = await connectDatabase();
        const result = await pool
            .request()
            .input('sucursalId', sql.Int, sucursalId)
            .query(`
                SELECT u.Id as id, u.SucursalId as sucursalId, u.RolId as rolId,
                       u.Nombre as nombre, u.Apellido as apellido, 
                       u.Email as email, u.Telefono as telefono, u.Activo as activo,
                       r.Nombre as rolNombre,
                       s.Nombre as sucursalNombre
                FROM dbo.Usuarios u
                INNER JOIN dbo.Roles r ON u.RolId = r.Id
                LEFT JOIN dbo.Sucursales s ON u.SucursalId = s.Id
                WHERE u.SucursalId = @sucursalId
                ORDER BY r.Id ASC, u.Nombre ASC
            `);

        return result.recordset;
    }

    async update(id: number, data: Partial<User>): Promise<boolean> {
        const pool = await connectDatabase();
        const request = pool.request().input('id', sql.Int, id);
        
        let query = 'UPDATE dbo.Usuarios SET ';
        const updates: string[] = [];
        
        if (data.nombre !== undefined) {
            request.input('nombre', sql.NVarChar, data.nombre);
            updates.push('Nombre = @nombre');
        }
        if (data.apellido !== undefined) {
            request.input('apellido', sql.NVarChar, data.apellido);
            updates.push('Apellido = @apellido');
        }
        if (data.email !== undefined) {
            request.input('email', sql.VarChar, data.email || null);
            updates.push('Email = @email');
        }
        if (data.telefono !== undefined) {
            request.input('telefono', sql.VarChar, data.telefono || null);
            updates.push('Telefono = @telefono');
        }
        if (data.rolId !== undefined) {
            request.input('rolId', sql.Int, data.rolId);
            updates.push('RolId = @rolId');
        }
        if (data.passwordHash !== undefined) {
            request.input('passwordHash', sql.VarChar, data.passwordHash);
            updates.push('PasswordHash = @passwordHash');
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
            .query('DELETE FROM dbo.Usuarios WHERE Id = @id');
        return (result.rowsAffected[0] ?? 0) > 0;
    }
}
