import { HttpError } from "../utils/errorHandler";
import {ExtendedRequest} from "../Controllers/webservicesController";
import { PrismaClient } from "@prisma/client";
import * as PrismaTypes from "@prisma/client";

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
            const requestObject: Omit<PrismaTypes.webservice_logs, 'id' | 'timestamp'> = {
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
    public async logFornecedorCadastrado(fornecedorObj: Omit<PrismaTypes.fornecedores_cadastro_geral_log, "id" | "timestamp">) {
        try {
            if (!fornecedorObj.CardCode) {
                throw new HttpError(400, 'CardCode não informado');
            }
            const fornecedorExists = await this.findFornecedorCadastrado(fornecedorObj.CardCode);
            if (fornecedorExists) {
                console.log("Tried to update fornecedor that already exists: ", fornecedorObj.CardCode);
                return false;
            }
            const fornecedorLog = await this.prisma.fornecedores_cadastro_geral_log.create({
                data: fornecedorObj
            });
            return fornecedorLog;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao logar fornecedor cadastrado: ' + err.message);
        }
    }

    public async findFornecedorCadastrado(CardCode: string) {
        try {
            const fornecedorLog = await this.prisma.fornecedores_cadastro_geral_log.findUnique({
                where: { CardCode: CardCode }
            });
            return fornecedorLog;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar fornecedor cadastrado: ' + err.message);
        }
    }


    public async atualizaFornecedorCadastrado(fornecedorObj: Partial<Omit<PrismaTypes.fornecedores_cadastro_geral_log, "id" | "timestamp">>) {
        try {
            if (!fornecedorObj.CardCode) {
                throw new HttpError(400, 'CardCode não informado');
            }


            const fornecedorLog = await this.prisma.fornecedores_cadastro_geral_log.update({
                where: { CardCode: fornecedorObj.CardCode },
                data: fornecedorObj 
            });
            return fornecedorLog;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao atualizar fornecedor cadastrado: ' + err.message);
        }
    }
}

