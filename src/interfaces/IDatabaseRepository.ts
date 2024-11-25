import { PrismaClient } from "@prisma/client"

export interface IDatabaseRepository {
    DatabaseClient: PrismaClient;

    findOne<Table>(identifier: string | number): Promise<Table | null> 
    findMany<Table>(QueryParams: any): Promise<Table[]>;
    update<Table>(identifier: string | number, data: Partial<Table>): Promise<Table>;
    create<Table>(data: Table): Promise<Table>;
    delete<T>(identifier: string | number): Promise<T>;
}