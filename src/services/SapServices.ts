import SL from "../models/ServiceLayerClass";
import { ApiFiscalDataClass } from "../models/ApiFiscalDataClass";
import { HttpError } from "../utils/errorHandler";
import * as interfaces from "../types/interfaces";
import { DatabaseServices } from "./DatabaseServices";

export class SapServices {
    private static instance: SapServices;
    private sl: SL;
    private ApiFiscalDataClass: ApiFiscalDataClass;
    private dataBaseServices: DatabaseServices;
    
    public constructor() {
        this.sl = new SL();
        this.ApiFiscalDataClass = new ApiFiscalDataClass();
        this.dataBaseServices = DatabaseServices.getInstance();
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
            const maintainer = setInterval(() => {
                console.log('Maintining SAP login, current time: ', new Date().toLocaleTimeString());
                this.sl.login();
            }, 20 * 60 * 1000);
            return maintainer
        } catch (error) {
            console.error(error);
            throw new HttpError(500, 'Error with SAP login');
        }
    }

    public async getClientsWithNoOrders(filter: interfaces.generalFilter | null = null): Promise<interfaces.DeactivationClientsData[]> {
        try {
            const query = `SELECT A."CardCode", CAST(A."Free_Text" AS NVARCHAR) as "Free_Text" FROM "SBO_COPAPEL_PRD"."OCRD" A LEFT JOIN "SBO_COPAPEL_PRD"."OINV" B ON A."CardCode" = B."CardCode" WHERE B."DocNum" IS NULL AND A."validFor" = 'Y' AND (A."CardType" = 'C' OR A."CardType" = 'L')  ${ filter ? `AND ${filter.field} ${filter.operator} ${filter.value}` : "" }`;
            console.log(query)
            const result = await this.sl.querySAP(query, true);
            return result.data;
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao pegar clientes sem ordens: " + err.message);
        }
    }

    public async getDataFromQuotation(DocNum: number, fields: interfaces.Field[]): Promise<any> {
        let query;
        try {
            const query = `SELECT ${fields.map(field => field.field).join(', ')} FROM "SBO_COPAPEL_PRD".OQUT A INNER JOIN "SBO_COPAPEL_PRD".OCRD B ON A."CardCode" = B."CardCode" INNER JOIN "SBO_COPAPEL_PRD".OAGP C ON B."AgentCode" = C."AgentCode" INNER JOIN "SBO_COPAPEL_PRD".OUSR D ON C."UserSign" = D."userSign" INNER JOIN "SBO_COPAPEL_PRD".OHEM E ON D."USERID" = E."userId" WHERE A."DocNum" = ${DocNum} AND E."Active" = 'Y'`;
            const result = await this.sl.querySAP(query);
    
            return result.data[0] || []
        } catch(err: any) {
            console.log(`Query with error: ${query}`);
            throw new HttpError(err.statusCode ?? 500, "Error when fetching data from doc: " + err.message)
        }
    }

    public async getOpenTicketsFromBefore(date: Date): Promise<interfaces.ActivitiesCode[]> {
        const isoStringDate = date.toISOString().split("T")[0];
        const query = `SELECT "ClgCode" FROM "SBO_COPAPEL_PRD".OCLG WHERE "CntctDate" <= '${isoStringDate}' AND "Closed" = 'N'`;
        console.log(query)

        const response = await this.sl.querySAP(query);
        const data = response.data;

        if (data.length == 0) {
            throw new HttpError(404, "No tickets were found for deactivation")
        }
        return data;
}

    public async getOrderClientData(CardCode: string): Promise<interfaces.BaseOrderClientData> {
        try {
            const query = `
            SELECT A."SlpCode", A."ShipType", C."State", B."BPLId", D."empID"
            FROM "SBO_COPAPEL_PRD".OCRD A 
            INNER JOIN "SBO_COPAPEL_PRD".OINV B ON A."CardCode" = B."CardCode"
            INNER JOIN "SBO_COPAPEL_PRD".CRD1 C ON C."CardCode" = A."CardCode" AND A."ShipToDef" = C."Address" AND C."AdresType" = 'S'
            INNER JOIN "SBO_COPAPEL_PRD".OHEM D ON A."SlpCode" = D."salesPrson"
            WHERE A."CardCode" = '${CardCode}' LIMIT 1`;

            const response = await this.sl.querySAP(query);
            const data = response.data;
            
            if (response.data.length === 0) {
                throw new Error("Nenhum dado foi encontrado para o cliente.");
            }

            const clientData = data[0];

            return clientData;
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao pegar dados de compra do cliente: " + err.message);
        }
    }


    public async getFornecedoresLeads(isoString: string, getUnprocessed: boolean = false): Promise<interfaces.Fornecedor[]> {
        try {
            const query = `SELECT DISTINCT A."CardCode", A."CardName", A."CardType", B."TaxId0", A."State1", B."TaxId4" 
            FROM "SBO_COPAPEL_TST".OCRD A 
            INNER JOIN "SBO_COPAPEL_TST".CRD7 B ON A."CardCode" = B."CardCode" 
            WHERE "CardType" = 'S' 
            AND "CreateDate" >= '${isoString}'  
            AND (B."TaxId0" <> '' OR B."TaxId4" <> '') 
            ORDER BY "CardCode"`;

            console.log("Query: ", query);

            const fornecedores = await this.sl.querySAP(query, true);

            let data = fornecedores.data;

            if (getUnprocessed) {
                data = await this.filterProcessedSuppliers(data);
            }
            
            return data;
        } catch (err: any) {                                                    
            throw new HttpError(500, 'Erro ao buscar fornecedores cadastrados no SAP: ' + err.message);
        }
    }

    private async filterProcessedSuppliers(data: interfaces.Fornecedor[]) {
        const unprocessedSuppliers = await this.dataBaseServices.getUnprocessedSuppliers();

        const filteredSuppliers = data.filter((supplier) => {
            const unprocessed = unprocessedSuppliers.findIndex((sup) => sup.CardCode === supplier.CardCode);
            return unprocessed !== -1;
        });
        
        return filteredSuppliers
    }

    public async getOpportunities(SlpCode: number): Promise<interfaces.Opportunity[]>  {
        try {
            const query = `SELECT * FROM "SBO_COPAPEL_PRD"."OOPR" WHERE "SlpCode" = ${SlpCode} AND "Status" = 'O'`;
            const response = await this.sl.querySAP(query, true);
            return response.data;    
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao pegar oportunidades: " + err.message)
        }
    }

    public async createTicket(ticket: interfaces.ActivityCreation) {
        try {
            const response = await this.sl.post("Activities", ticket);
            return response;
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Error creating ticket: " + err.message);
        }
    }

    public async changeOpprOwner(OpprId: number, SlpCode: number) {
        try {
            return this.sl.patch("SalesOpportunities", OpprId, { "SalesPerson": SlpCode });
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao pegar oportunidades" + err.message)
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
            await this.sl.patch("BusinessPartners", CardCode, data);
            const response = this.dataBaseServices.atualizaFornecedorCadastrado({ CardCode: CardCode, Status: "Atualizado", Erro: null });
            console.log("Updated fornecedor: ", CardCode, "with data: ", data);
        } catch (err: any) {    
            this.dataBaseServices.atualizaFornecedorCadastrado({ CardCode: CardCode, Status: "Erro ao atualizar" });
            throw new HttpError(500, 'Erro ao atualizar fornecedor no SAP: ' + err.message);
        }
    }

    

    public async getClientAdresses(CardCode: string): Promise<interfaces.FornecedorAdress[]> {
        try {
            const query = `SELECT "Address" FROM "SBO_COPAPEL_PRD".CRD7 WHERE "CardCode" = '${CardCode}' AND "AddrType" = 'S'`;
            const fornecedorAdresses = await this.sl.querySAP(query, true);

            const data = fornecedorAdresses.data;

            return fornecedorAdresses.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar endereços do fornecedor: ' + err.message);
        }
    }

    public async getOpenTicketsFromVendor(userId: number): Promise<interfaces.ActivitiesCode[]> {
        try {
            const query = `SELECT "ClgCode" FROM "SBO_COPAPEL_PRD".OCLG WHERE "AttendUser" = '${userId}' AND "Closed" = 'N'`;
            const tickets = await this.sl.querySAP(query);
            return tickets.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar tickets do fornecedor: ' + err.message);
        }
    }

    public async getOpenTicketsFromRegion(region: number): Promise<interfaces.ActivitiesCode[]> {
        try {
            const query = `SELECT A."ClgCode" FROM "SBO_COPAPEL_PRD".OCLG A INNER JOIN "SBO_COPAPEL_PRD".OCRD B ON A."CardCode" = B."CardCode" WHERE B."U_RSD_RegVend" = '${region}' AND A."Closed" = 'N'`;
            const tickets = await this.sl.querySAP(query);
            return tickets.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar tickets do fornecedor: ' + err.message);
        }
    }

    public async deactivateTicket(ticketNumber: number) {
        try {
            const tickets = await this.sl.patch("Activities", ticketNumber, { "Closed": "tYES" });
            return tickets.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao desativar ticket: ' + err.message);
        }
    }

    public async deactivateClient(CardCode: string) {
        try {
            const data = { Valid: "tNO", Frozen: "tYES" }
            const response = await this.sl.patch('BusinessPartners', CardCode, data);
            return response;
        } catch(err: any) {
            throw new HttpError(500, "Erro ao desativar vendedor: " + err.message);
        }   
    }

    public async getClientsRegistrationData(removedClients: string | null = null, filter: interfaces.GetClientsFilter | null = null): Promise<interfaces.RelevantClientData[]> {
        try {
            const query = `SELECT A."Balance", B."TaxId0", B."Address", C."State", A."CardCode", A."CardName", CAST(A."Free_Text" AS NVARCHAR) as "Free_Text"
            FROM "SBO_COPAPEL_PRD".OCRD A 
            LEFT JOIN "SBO_COPAPEL_PRD".CRD7 B ON A."CardCode" = B."CardCode" 
            INNER JOIN "SBO_COPAPEL_PRD".CRD1 C ON C."CardCode" = A."CardCode" AND A."ShipToDef" = C."Address" AND C."AdresType" = 'S'
            WHERE A."CardType" = 'C' 
            AND B."TaxId0" <> ''
            AND B."TaxId0" IS NOT NULL 
            AND B."TaxId0" <> 'null'    
            ${filter ? `AND ${filter.field} IN (${filter.value})` : ""}
            AND A."CardCode" NOT IN (${removedClients ? removedClients : "''"})
            LIMIT 5000
            `;            

            const clients = await this.sl.querySAP(query);
            
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
                    State1: firstRecord.State,
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

    public async getAllActiveClientsCardCodes() {
        const query = `SELECT A."CardCode"
        FROM "SBO_COPAPEL_PRD".OCRD A 
        LEFT JOIN "SBO_COPAPEL_PRD".CRD7 B ON A."CardCode" = B."CardCode" 
        WHERE A."CardType" = 'C' 
        AND A."validFor" = 'Y' 
        AND B."TaxId0" <> ''
        AND B."TaxId0" IS NOT NULL 
        AND B."TaxId0" <> 'null'    
        GROUP BY A."CardCode"
        `;

        console.log(query);

        const response = await this.sl.newQuerySAP(query);
        const data = response.data;
        if (data.length === 0 ){
            throw new HttpError(404, "Nenhum cliente encontrado!");
        }

        return data;
    }

    public async getAllActiveClientsRegistrationData( filter: interfaces.GetClientsFilter | null = null, exceptions: interfaces.GetClientsFilter | null = null, getInactiveClients: boolean = false ): Promise<interfaces.RelevantClientData[]> {
        try {
            const query = `SELECT A."Balance", B."TaxId0", B."Address", C."State", A."CardCode", A."CardName", CAST(A."Free_Text" AS NVARCHAR) as "Free_Text"
            FROM "SBO_COPAPEL_PRD".OCRD A 
            LEFT JOIN "SBO_COPAPEL_PRD".CRD7 B ON A."CardCode" = B."CardCode" 
            INNER JOIN "SBO_COPAPEL_PRD".CRD1 C ON C."CardCode" = A."CardCode" AND A."ShipToDef" = C."Address" AND C."AdresType" = 'S'
            WHERE A."CardType" = 'C' 
            ${getInactiveClients ? "" : `AND A."validFor" = 'Y'`} 
            AND B."TaxId0" <> ''
            AND B."TaxId0" IS NOT NULL 
            AND B."TaxId0" <> 'null'    
            ${filter ? `AND ${filter.field} IN (${filter.value})` : ""}
            ${exceptions ? `AND ${exceptions.field} NOT IN (${exceptions.value})` : ""}
            `;

            console.log("Query: ", query);
            
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
                    State1: firstRecord.State,
                    TaxId0: firstRecord.TaxId0,
                    Free_Text: firstRecord.Free_Text,
                    Balance: firstRecord.Balance,
                    Adresses: addresses
                }
                formattedData.push(newObj);
            });
            return formattedData;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar dados relevantes dos clientes: ' + err.message);
        }
    }

    public async getCardCodesBasedOnTaxId(taxIds: string[]): Promise<string[]> {
        const query = `SELECT A."CardCode" FROM "SBO_COPAPEL_PRD".OCRD A INNER JOIN "SBO_COPAPEL_PRD".CRD7 B ON A."CardCode" = B."TaxId0" WHERE B."TaxId0" IN (${taxIds.map(id => `'${id.replace(/\D/g, '')}'`).join(", ")}) GROUP BY A."CardCode"`;
        try {
            console.log(query);
            const response = await this.sl.querySAP(query);
            return response.data;
        } catch(err) {
            throw new HttpError(500, "Erro ao pegar CardCodes com base nos cnpjs");
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

    public async updateActivity(ActivityId: number, Data: any) {
        try {
            const update = await this.sl.patch("Activities", ActivityId, Data);
            return update.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao atualizar atividade no SAP: ' + err.message);
        }
    }

    

    public async getClient(CardCode: string): Promise<Array<any>> {
        try {
            const clientQuery = `SELECT * FROM "SBO_COPAPEL_PRD"."OCRD" WHERE "CardCode" = '${CardCode}'`;
            const result = await this.sl.querySAP(clientQuery);
            return result.data;    
        } catch(err: any) {
            throw new HttpError(500, 'Erro ao buscar cliente no SAP: ' + err.message);
        }
    }

}
