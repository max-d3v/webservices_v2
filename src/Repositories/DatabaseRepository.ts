import { Prisma, PrismaClient } from "@prisma/client";
import * as PrismaTypes from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

export class DatabaseRepository {
    private PrismaClient: PrismaClient;

    constructor() {
        this.PrismaClient = new PrismaClient();
    }

    async findOne<T extends keyof PrismaClient>(
        model: T,
        identifier: number | string
    ): Promise<T | null> {
        return await (this.PrismaClient[model] as any).findFirst({
            where: {
                id: identifier
            }
        });
    }

}