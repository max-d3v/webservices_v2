import { HttpError } from "../utils/errorHandler";
import {ExtendedRequest} from "../Handlers/ServicesHandler";
import { PrismaClient } from "@prisma/client";
import * as PrismaTypes from "@prisma/client";
import * as interfaces from '../types/interfaces';
import { MeusPedidosDatabase } from "../models/MeusPedidosDatabaseClass";


export class DatabaseServices {
    private prisma: PrismaClient;
    private prismaMeusPedidos: any;
    private MeuspedidosDatabase: MeusPedidosDatabase;
    private static instance: DatabaseServices;
    
    constructor() {
        this.prisma = new PrismaClient();

        
        this.prismaMeusPedidos = new PrismaClient()
        
        //This other database will use regular mysql connection, as prisma do not have support for multiple sources for mysql :(
        this.MeuspedidosDatabase = MeusPedidosDatabase.getInstance();
    }

    public static getInstance(): DatabaseServices {
        if (!DatabaseServices.instance) {
            DatabaseServices.instance = new DatabaseServices();
        }
        return DatabaseServices.instance;
    }

    public async getUnprocessedSuppliers() {
        try {
            const suppliers = await this.prisma.fornecedores_cadastro_geral_log.findMany({
                where: { Status: { not: "Atualizado" } }
            });
    
            return suppliers    
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Error when retrieving unprocessed suppliers: " + err.message);
        }
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

    

    public async getOldCarts(daysOfAge: number): Promise<Map<string, interfaces.Cart>> {
        try {
            //Vai pegar todos os clientes que tenham um produto a no minimo 2 dias no carrinho, dai vai procurar o carrinho inteiro do cara e
            //so vai manter se ele tiver um a no minimo 7 dias mesmo.  
            const xDaysAgo = new Date();
            xDaysAgo.setDate(xDaysAgo.getDate() - 2);
            const xDaysAgoIsoDate = xDaysAgo.toISOString().split("T")[0];

            
            const query: any = `SELECT * FROM carrinho WHERE data <= '${xDaysAgoIsoDate}' AND QuotationCreated <> 'S'`;

            const items: any = await this.MeuspedidosDatabase.query(query);
    
            const carts = this.GroupItemsByClient(items);

            this.removeClientsWithNoMinimumDate(carts, daysOfAge);

            return carts
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao pegar itens dos carrinhos:" + err.message);
        }

    }

    public async logCartsWithQuotationsCreateds(CardCodes: string[]) {
        try {
            const CardCodesString = "'" + CardCodes.join("','") + "'";
            const query = `UPDATE carrinho SET QuotationCreated = 'S' WHERE id_usuario IN (${CardCodesString})`;    
            await this.MeuspedidosDatabase.query(query);
        } catch(err: any) {
            console.log(`Error when loggin the carts that had quotations created, be aware!: ` + err.message);
            
        }
    }

    private async removeClientsWithNoMinimumDate(carts: Map<interfaces.CardCode, interfaces.Cart>, daysOfAge: number) {
        const xDaysAgo = new Date();
        xDaysAgo.setDate(xDaysAgo.getDate() - (daysOfAge));
        
        
        for (const [key, value] of carts) {
            let correctDateItem = null;
            for (const item of value.Items) {
                //Eu quero que a data do item seja igual ou mais antiga que a data do days ago, ou seja, quero que todos os itens colocados depois da data fiquem apenas 
                if (new Date(item.data) <= xDaysAgo ) {
                    //Found item with minimum date diff
                    correctDateItem = item;
                    break;
                }
            }

            if (!correctDateItem) {
                carts.delete(key);
            }
        }
    }

    private GroupItemsByClient(items: interfaces.ItemCarrinho[]) {
        const carts = new Map();

        items.map((item) => {
            const CardCode = item.id_usuario
            const polisedItem = { 
                id_produto: item.id_produto,
                nome_produto: item.nome_produto,
                preco_normal: item.preco_normal,
                qtd: item.qtd,
                subtotal: item.subtotal,
                WhsCode: item.WhsCode,
                faturamento: item.faturamento,
                entrega: item.entrega,
                data: item.data
            }

            const client = carts.get(CardCode)

            if (!client) {
                const newClient = {
                    Items: [polisedItem]
                }  
                carts.set(CardCode, newClient);
            } else {
                client.Items.push(polisedItem);
            }
        })

        return carts;
    }

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
                console.log(fornecedorExists)
                console.log("Tried to create fornecedor log that already exists: ", fornecedorObj.CardCode);
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

