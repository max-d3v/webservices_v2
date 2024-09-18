import SL from "../models/slClass";
import { CnpjJa } from "../models/cnpjClass";
import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import * as helperFunctions from "../utils/helperFunctions";
import * as interfaces from "../types/interfaces";
import { PrismaClient, Prisma, fornecedores_cadastro_geral_log } from "@prisma/client";
export class SapServices {
    private static instance: SapServices;
    private sl: SL;
    private cnpjJa: CnpjJa;
    private prisma: PrismaClient;

    public constructor() {
        this.sl = new SL();
        this.cnpjJa = new CnpjJa();
        this.prisma = new PrismaClient();
    }

    

    public async maintainSLLogin() {
        try {
            console.log("Loggin in to SAP SL in mode: ", process.env.NODE_ENV);
            await this.sl.login();
            setInterval(() => {
                console.log('Maintining SAP login, current time: ', new Date().toLocaleTimeString());
                this.sl.login();
            }, 20 * 60 * 1000);
        } catch (error) {
            console.error(error);
            throw new HttpError(500, 'Error with SAP login');
        }
    }


    //Cadastro de fornecedores
    public async getFornecedoresLeads(isoString: string): Promise<interfaces.Fornecedor[]> {
        try {
            const query = `SELECT DISTINCT A."CardCode", A."CardName", A."CardType", B."TaxId0", A."State1", B."TaxId4" 
            FROM "SBO_COPAPEL_TST".OCRD A 
            INNER JOIN "SBO_COPAPEL_TST".CRD7 B ON A."CardCode" = B."CardCode" 
            WHERE "CardType" = 'S' 
            AND "CreateDate" >= '${isoString}'  
            AND (B."TaxId0" <> '' OR B."TaxId4" <> '') 
            ORDER BY "CardCode" DESC`;

            console.log("Query: ", query);

            const fornecedores = await this.sl.querySAP(query);

            return fornecedores.data;
        } catch (err: any) {                                                    
            throw new HttpError(500, 'Erro ao buscar fornecedores cadastrados no SAP: ' + err.message);
        }
    }



    public async getFornecedorByCnpj(cnpj: string): Promise<interfaces.FornecedorData> {
        try {
            const response = await this.cnpjJa.searchCnpj(cnpj);
            return response;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar fornecedor pela api CNPJ: ' + err.message);
        }
    }

    public async updateFornecedor(fieldsToUpdateObject: interfaces.DadosPessoaJuridica | interfaces.DadosPessoaFisica | interfaces.DadosMicroempresa | any, CardCode: string) {
        try {
            await this.logFornecedorCadastrado({ CardCode: CardCode, Status: "Pendente" });
        } catch(err: any) {
            throw new HttpError(500, 'Erro ao logar fornecedor cadastrado: ' + err.message);
        }
        
        try {
            const data = fieldsToUpdateObject;
            const update = await this.sl.patch("BusinessPartners", CardCode, data);
            this.atualizaFornecedorCadastrado({ CardCode: CardCode, Status: "Atualizado" });
            console.log("Updated fornecedor: ", CardCode, "with data: ", data);
        } catch (err: any) {    
            this.atualizaFornecedorCadastrado({ CardCode: CardCode, Status: "Erro ao atualizar" });
            throw new HttpError(500, 'Erro ao atualizar fornecedor no SAP: ' + err.message);
        }
    }

    public async logFornecedorCadastrado(fornecedorObj: Omit<fornecedores_cadastro_geral_log, "id" | "timestamp">) {
        try {
            if (!fornecedorObj.CardCode) {
                throw new HttpError(400, 'CardCode não informado');
            }
            const fornecedorExists = await this.findFornecedorCadastrado(fornecedorObj.CardCode);
            if (fornecedorExists) {
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


    public async atualizaFornecedorCadastrado(fornecedorObj: Omit<fornecedores_cadastro_geral_log, "id" | "timestamp">) {
        try {
            if (!fornecedorObj.CardCode) {
                throw new HttpError(400, 'CardCode não informado');
            }


            const fornecedorLog = await this.prisma.fornecedores_cadastro_geral_log.update({
                where: { CardCode: fornecedorObj.CardCode },
                data: { Status: fornecedorObj.Status }
            });
            return fornecedorLog;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao atualizar fornecedor cadastrado: ' + err.message);
        }
    }



}
