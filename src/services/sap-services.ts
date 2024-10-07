import SL from "../models/slClass";
import { CnpjJa } from "../models/cnpjClass";
import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import * as helperFunctions from "../utils/helperFunctions";
import * as interfaces from "../types/interfaces";
import { DatabaseServices } from "./database-services";
//import { RedisServices } from "./redisServices";

export class SapServices {
    private static instance: SapServices;
    private sl: SL;
    private cnpjJa: CnpjJa;
    private dataBaseServices: DatabaseServices;
    
    public constructor() {
        this.sl = new SL();
        this.cnpjJa = new CnpjJa();
        this.dataBaseServices = DatabaseServices.getInstance();
        this.maintainSLLogin();
    }

    public static getInstance(): SapServices {
        if (!SapServices.instance) {
            SapServices.instance = new SapServices();
        }
        return SapServices.instance;
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
            ORDER BY "CardCode"`;

            //console.log("Query: ", query);

            const fornecedores = await this.sl.querySAP(query, true);

            const data = fornecedores.data;

            return fornecedores.data;
        } catch (err: any) {                                                    
            throw new HttpError(500, 'Erro ao buscar fornecedores cadastrados no SAP: ' + err.message);
        }
    }

    public async updateFornecedor(fieldsToUpdateObject: interfaces.DadosPessoaJuridica | interfaces.DadosPessoaFisica | interfaces.DadosMicroempresa | any, CardCode: string) {
        try {
            await this.dataBaseServices.logFornecedorCadastrado({ CardCode: CardCode, Status: "Pendente", Erro: null });
        } catch(err: any) {
            throw new HttpError(500, 'Erro ao logar fornecedor cadastrado: ' + err.message);
        }
        
        try {
            const data = fieldsToUpdateObject;
            const update = await this.sl.patch("BusinessPartners", CardCode, data);
            this.dataBaseServices.atualizaFornecedorCadastrado({ CardCode: CardCode, Status: "Atualizado" });
            console.log("Updated fornecedor: ", CardCode, "with data: ", data);
        } catch (err: any) {    
            this.dataBaseServices.atualizaFornecedorCadastrado({ CardCode: CardCode, Status: "Erro ao atualizar" });
            throw new HttpError(500, 'Erro ao atualizar fornecedor no SAP: ' + err.message);
        }
    }

    

    public async getClientAdresses(CardCode: string): Promise<interfaces.FornecedorAdress[]> {
        try {
            const query = `SELECT "Address" FROM "SBO_COPAPEL_PRD".CRD7 WHERE "CardCode" = '${CardCode}' AND "AddrType" = 'S'`;
            const fornecedorAdresses = await this.sl.querySAP(query);

            const data = fornecedorAdresses.data;

            return fornecedorAdresses.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar endereços do fornecedor: ' + err.message);
        }
    }

    public async getOpenTicketsFromVendor(userId: number) {
        try {
            const query = `SELECT "ClgCode" FROM "SBO_COPAPEL_PRD".OCLG WHERE "AttendUser" = '${userId}' AND "Closed" = 'N'`;
            const tickets = await this.sl.querySAP(query);
            return tickets.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar tickets do fornecedor: ' + err.message);
        }
    }

    public async deactivateTicket(ticketNumber: number) {
        try {
            console.log("Desativando ticket: ", ticketNumber);
            const tickets = await this.sl.patch("Activities", ticketNumber, { "Closed": "tYES" });
            return tickets.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao desativar ticket: ' + err.message);
        }
    }

    public async getClientsRegistrationData(removedClients: string | null = null, filter: interfaces.GetClientsFilter | null = null): Promise<interfaces.RelevantClientData[]> {
        try {
            const query = `SELECT A."Balance", B."TaxId0", B."Address", A."State1", A."CardCode", A."CardName", CAST(A."Free_Text" AS NVARCHAR) as "Free_Text"
            FROM "SBO_COPAPEL_PRD".OCRD A 
            LEFT JOIN "SBO_COPAPEL_PRD".CRD7 B ON A."CardCode" = B."CardCode" 
            WHERE A."CardType" = 'C' 
            AND B."TaxId0" <> ''
            AND B."TaxId0" IS NOT NULL 
            AND B."TaxId0" <> 'null'    
            ${filter ? `AND ${filter.field} IN (${filter.value})` : ""}
            AND A."CardCode" NOT IN (${removedClients ? removedClients : "''"})
            LIMIT 5000
            `;            

            const clients = await this.sl.querySAP(query, true);
            
            const data: interfaces.getClientDataQueryReturn[] | string = clients.data;
            
            if (data.length == 0) {
                throw new HttpError(404, "Nenhum cliente encontrado para processamento!");
            }
            

            const formattedData: interfaces.RelevantClientData[] = [];

            data.forEach((client: interfaces.getClientDataQueryReturn) => {
                const isAlreadyInFormattedData = formattedData.some((formattedClient) => formattedClient.CardCode === client.CardCode);
                if (isAlreadyInFormattedData) return;
                
                const allRecordsFromSameCardCode = data.filter((record) => record.CardCode === client.CardCode);
                const firstRecord = allRecordsFromSameCardCode[0];
                const addresses = allRecordsFromSameCardCode.map((record) => record.Address);
                const newObj: interfaces.RelevantClientData = {
                    CardCode: firstRecord.CardCode,
                    CardName: firstRecord.CardName,
                    State1: firstRecord.State1,
                    TaxId0: firstRecord.TaxId0,
                    Free_Text: firstRecord.Free_Text,
                    Balance: firstRecord.Balance,
                    Adresses: addresses
                }
                formattedData.push(newObj);
            })

            //console.log("Formatted data: ", formattedData);
            
            console.log("Number of clients: ", formattedData.length);

            return formattedData;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar dados relevantes dos clientes: ' + err.message);
        }

    }

    public async getAllActiveClientsRegistrationData( removedClients: string | null = null, filter: interfaces.GetClientsFilter | null = null ): Promise<interfaces.RelevantClientData[]> {
        try {
            const query = `SELECT A."Balance", B."TaxId0", B."Address", A."State1", A."CardCode", A."CardName", CAST(A."Free_Text" AS NVARCHAR) as "Free_Text"
            FROM "SBO_COPAPEL_PRD".OCRD A 
            LEFT JOIN "SBO_COPAPEL_PRD".CRD7 B ON A."CardCode" = B."CardCode" 
            WHERE A."CardType" = 'C' 
            AND A."validFor" = 'Y' 
            AND B."TaxId0" <> ''
            AND B."TaxId0" IS NOT NULL 
            AND B."TaxId0" <> 'null'    
            ${filter ? `AND ${filter.field} IN (${filter.value})` : ""}
            AND A."CardCode" NOT IN (${removedClients ? removedClients : "''"})
            LIMIT 5000
            `;            

            const clients = await this.sl.newQuerySAP(query, true);
            
            const data: interfaces.getClientDataQueryReturn[] | string = clients.data;
            
            if (data.length == 0) {
                throw new HttpError(404, "Nenhum cliente encontrado para processamento!");
            }

            const formattedData: interfaces.RelevantClientData[] = [];

            data.forEach((client: interfaces.getClientDataQueryReturn) => {
                const isAlreadyInFormattedData = formattedData.some((formattedClient) => formattedClient.CardCode === client.CardCode);
                if (isAlreadyInFormattedData) return;
                
                const allRecordsFromSameCardCode = data.filter((record) => record.CardCode === client.CardCode);
                const firstRecord = allRecordsFromSameCardCode[0];
                const addresses = allRecordsFromSameCardCode.map((record) => record.Address);
                const newObj: interfaces.RelevantClientData = {
                    CardCode: firstRecord.CardCode,
                    CardName: firstRecord.CardName,
                    State1: firstRecord.State1,
                    TaxId0: firstRecord.TaxId0,
                    Free_Text: firstRecord.Free_Text,
                    Balance: firstRecord.Balance,
                    Adresses: addresses
                }
                formattedData.push(newObj);
            })

            console.log("Number of clients: ", formattedData.length);

            return formattedData;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar dados relevantes dos clientes: ' + err.message);
        }
    }

    public async getObservationFromSAP(cardCode: string): Promise<Array<interfaces.Observations>> {
        try {
            const query = `SELECT "Free_Text" FROM "SBO_COPAPEL_PRD".OCRD WHERE "CardCode" = '${cardCode}'`;
            const observation = await this.sl.querySAP(query);
            return observation.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar observação do fornecedor: ' + err.message);
        }
    }

    public async updateClient(Data: any, CardCode: string) {
        try {
            const update = await this.sl.patch("BusinessPartners", CardCode, Data);
            return update.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao atualizar cliente no SAP: ' + err.message);
        }
    }




}
