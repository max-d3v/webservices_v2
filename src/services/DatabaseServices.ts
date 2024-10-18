import { HttpError } from "../utils/errorHandler";
import {ExtendedRequest} from "../Handlers/ServicesHandler";
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

    public async getInactivatedClients() {
        try {
            const clients = await this.prisma.log_atualizacao_cadastral_clientes.findMany({
                where: { data_updated: { contains: `"Valid":"tNO"` } }
            });
            return clients;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar clientes inativos: ' + err.message);
        }
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

    /*
    public async getSelectedClients(): Promise<PrismaTypes.clientes_para_processar> {
        try {
            const clients = await this.prisma.clientes_para_processar.findMany();
            return clients;
        } catch(err: any) {
            throw new HttpError(500, 'Erro ao buscar clientes selecionados pra processamento: ' + err.message);
        }
    }
    */

    public async getClientsAlreadyProcessed(): Promise<PrismaTypes.log_atualizacao_cadastral_clientes[]> {
        try {
            const clients = await this.prisma.log_atualizacao_cadastral_clientes.findMany({
                where: { Status: "SUCCESS" }
            });
            return clients;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar clientes já processados: ' + err.message);
        }
    }

    public async logFornecedorCadastrado(fornecedorObj: Omit<PrismaTypes.fornecedores_cadastro_geral_log, "id" | "timestamp"> & { Erro?: string | undefined | null }) {
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

    public async logClientRegistration(data: Partial<Omit<PrismaTypes.log_atualizacao_cadastral_clientes, "id" | "timestamp">>) {
        try {
            const clientRegistration = await this.prisma.log_atualizacao_cadastral_clientes.create({
                data: data
            });
            return clientRegistration;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao criar log da atualização cadastral de cliente: ' + err.message);
        }
    }

    public async updateClientRegistrationLog(CardCode: string,data: Partial<Omit<PrismaTypes.log_atualizacao_cadastral_clientes, "id" | "timestamp" | "CardCode">>) {
        try {
            const clientRegistration = await this.prisma.log_atualizacao_cadastral_clientes.update({
                where: { CardCode: CardCode },
                data: data
            });
            return clientRegistration;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao atualizar atualização cadastral de cliente: ' + err.message);
        }
    }

    public async findClientRegistrationLog(CardCode: string) {
        try {
            const clientRegistration = await this.prisma.log_atualizacao_cadastral_clientes.findUnique({
                where: { CardCode: CardCode }
            });
            return clientRegistration;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar log da atualização cadastral de cliente: ' + err.message);
        }
    }

    public async getMysqlSapClients() {
        try {
            const clients = await this.prisma.sap_clientes.findMany();
            return clients;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar clientes do SAP: ' + err.message);
        }
    }

}

