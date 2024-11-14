import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket, PoolOptions } from 'mysql2/promise';

export class MeusPedidosDatabase {
    private static instance: MeusPedidosDatabase;
    private pool: Pool;

    private constructor() {
        const databaseUrl = process.env.MEUSPEDIDOS_DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('Database URL not found in environment variables');
        }

        // Parse the connection string manually to avoid URL encoding issues
        const connectionConfig = this.parseConnectionString(databaseUrl);
        this.pool = mysql.createPool(connectionConfig);
    }

    private parseConnectionString(url: string): PoolOptions {
        try {
            // Match the parts of the connection string using regex
            const regex = /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(?:\?(.+))?$/;
            const matches = url.match(regex);

            if (!matches) {
                throw new Error('Invalid connection string format');
            }

            const [, user, password, host, port, database, queryString] = matches;

            // Parse query parameters
            const params = new URLSearchParams(queryString || '');
            const connectionLimit = params.get('connection_limit');

            return {
                host,
                port: parseInt(port, 10),
                user,
                password,
                database,
                connectionLimit: connectionLimit ? parseInt(connectionLimit, 10) : 10,
                waitForConnections: true,
                queueLimit: 0
            };
        } catch (error: any) {
            throw new Error(`Error parsing database URL: ${error.message}`);
        }
    }

    public static getInstance(): MeusPedidosDatabase {
        if (!MeusPedidosDatabase.instance) {
            MeusPedidosDatabase.instance = new MeusPedidosDatabase();
        }
        return MeusPedidosDatabase.instance;
    }

    private async getConnection(): Promise<PoolConnection> {
        return await this.pool.getConnection();
    }

    public async query<T extends RowDataPacket[]>(sql: string, values?: any[]): Promise<T> {
        const connection = await this.getConnection();
        try {
            const [rows] = await connection.query<T>(sql, values);
            return rows;
        } finally {
            connection.release();
        }
    }

    public async execute(sql: string, values?: any[]): Promise<ResultSetHeader> {
        const connection = await this.getConnection();
        try {
            const [result] = await connection.execute<ResultSetHeader>(sql, values);
            return result;
        } finally {
            connection.release();
        }
    }

    public async transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    public async end(): Promise<void> {
        await this.pool.end();
    }
}