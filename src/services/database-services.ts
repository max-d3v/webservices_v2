import { Request } from "express";
import { PrismaClient, webservice_logs  } from "@prisma/client";
import { HttpError } from "../utils/errorHandler";
import {ExtendedRequest} from "../Controllers/webservicesController";

export class DatabaseServices {
    private prisma: PrismaClient;
    private static instance: DatabaseServices;
    
    constructor() {
        this.prisma = new PrismaClient();
    }

    public static getInstance(): DatabaseServices {
        if (!DatabaseServices.instance) {
            DatabaseServices.instance = new DatabaseServices();
        }
        return DatabaseServices.instance;
    }

    public async logRequest(request: ExtendedRequest, status: string) {
        try {
            const requestObject: Omit<webservice_logs, 'id' | 'timestamp'> = {
                endpoint: request.originalUrl,
                status: status,
                caller: request.ip || '',
                time_taken: request.executionTime || 0
            }
            await this.prisma.webservice_logs.create({
                data: requestObject
            })
        } catch (error) {
            throw new HttpError(500, 'Error logging request');
        }
    }
}


export const databaseServices = DatabaseServices.getInstance();