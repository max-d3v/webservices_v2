import { SapServices } from "../services/sap-services";
import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import * as helperFunctions from "../utils/helperFunctions";
import * as interfaces from "../types/interfaces";
import { DatabaseServices } from "../services/database-services";
import { JsonInMemoryHandler } from "../services/jsonLoaderClass";

export class SapController {
    private static instance: SapController;
    private sapServices: SapServices;
    private dataBaseServices: DatabaseServices;
    private JsonInMemoryHandler: JsonInMemoryHandler;

    constructor() {
        this.sapServices = SapServices.getInstance();
        this.dataBaseServices = DatabaseServices.getInstance();
        this.JsonInMemoryHandler = JsonInMemoryHandler.getInstance();
    }

    public static getInstance(): SapController {
        if (!SapController.instance) {
            SapController.instance = new SapController();
        }
        return SapController.instance;
    }

    public async maintainServicesLogin(): Promise<void> {
        await this.sapServices.maintainSLLogin();
    }

    public async AtualizaCadastroFornecedores(isoString: string) {
        try {
            const isIsoString = helperFunctions.isIsoString(isoString);
            if (!isIsoString) {
                throw new HttpError(400, 'Data inválida (deve ser uma data no formato ISO ("yyyy-mm-dd"))');
            }
            const fornecedores = await this.sapServices.getFornecedoresLeads(isoString);

            if (helperFunctions.objetoVazio(fornecedores[0])) {
                throw new HttpError(404, 'Nenhum fornecedor encontrado');
            }

            const processErrors: any[] = [];
            const fornecedoresProcessados: any[] = [];

            for (let i = 0; i < fornecedores.length; i += 50) {
                const batch = fornecedores.slice(i, i + 50);

                let processingStartTime = Date.now();

                const DataInMemory = new JsonInMemoryHandler();
                DataInMemory.loadFile('./src/models/data/cnpj_data_all_fornecedores.json');

                await Promise.all(batch.map(async (fornecedor) => {
                    try {
                        const cnpj = fornecedor.TaxId0;
                        const cpf = fornecedor.TaxId4;
                        const CardCode = fornecedor.CardCode;
                        const isValidCnpj = helperFunctions.validCNPJ(cnpj);
                        const isValidCpf = helperFunctions.validaCPF(cpf);
                        const estado = fornecedor.State1;

                        if (!CardCode) {
                            throw new HttpError(400, `Código do fornecedor não encontrado (Não obedeceu regras do sap)`);
                        }

                        if (cnpj && !isValidCnpj) {
                            throw new HttpError(400, `CNPJ inválido - cnpj: ${cnpj}`);
                        }
                        if (cpf && !isValidCpf) {
                            throw new HttpError(400, `CPF inválido - cpf: ${cpf}`);
                        }
                        if (!cpf && !cnpj) {
                            throw new HttpError(400, `Não foi enviado um cpf ou cnpj (Não obedeceu regras do sap)`);
                        }

                        const baseFornecedorData: interfaces.BaseFornecedorData = {
                            BPFiscalTaxIDCollection: [],
                            U_TX_IndIEDest: null,
                            U_RSD_PFouPJ: null,
                        }

                        if (cnpj && isValidCnpj) {
                            const cleanedCnpj = cnpj.replace(/\D/g, '');
                            const fornecedorData = DataInMemory.getObjectByValue('taxId', cleanedCnpj);
                            const isMEI = fornecedorData.company.simei.optant;
                            const registrations = fornecedorData.registrations;
                            const stateRegistration = registrations?.find((registration: any) => registration?.state === estado);
                            const isContribuinteICMS = stateRegistration?.enabled

                            const fornecedorAdresses: interfaces.FornecedorAdress[] = await this.sapServices.getClientAdresses(CardCode);
                            if (helperFunctions.objetoVazio(fornecedorAdresses)) {
                                throw new HttpError(404, 'Nenhum endereço encontrado para o fornecedor');
                            }
                            const isInscricaoEstadualEnabled = stateRegistration?.number && isContribuinteICMS ? stateRegistration.number : "Isento";


                            const indieDest = isContribuinteICMS ? "1" : "9";
                            const BPFiscalTaxIDCollection: interfaces.TemplateFiscal[] = [];

                            for (const adress of fornecedorAdresses) {
                                const templateFiscal: interfaces.TemplateFiscal = {
                                    Address: adress.Address,
                                    BPCode: CardCode,
                                    AddrType: "bo_ShipTo",
                                    TaxId1: isInscricaoEstadualEnabled,
                                }
                                BPFiscalTaxIDCollection.push(templateFiscal);
                            }

                            const BasePessoaJuridicaData: interfaces.BasePessoaJuridicaData = {
                                ...baseFornecedorData,
                                BPFiscalTaxIDCollection: BPFiscalTaxIDCollection,
                                U_TX_IndIEDest: indieDest,
                            }

                            if (isMEI) {
                                const registerDate = fornecedorData.company.simei.since;
                                if (!helperFunctions.isIsoDate(registerDate)) {
                                    throw new HttpError(400, 'Data de registro da microempresa inválida (deve ser uma data no formato ISO ("yyyy-mm-dd"))');
                                }
                                const dadosMicroEmpresa: interfaces.DadosMicroempresa = {
                                    ...BasePessoaJuridicaData,
                                    U_RSD_PFouPJ: "MEI",
                                }
                                await this.sapServices.updateFornecedor(dadosMicroEmpresa, CardCode);
                                fornecedoresProcessados.push({ CardCode: fornecedor.CardCode, data: dadosMicroEmpresa });
                                return;
                            }
                            const optanteSimplesNacional = fornecedorData.company.simples.optant;
                            const dadosPessoaJuridica: interfaces.DadosPessoaJuridica = {
                                ...BasePessoaJuridicaData,
                                U_TX_SN: optanteSimplesNacional ? 1 : 2,
                                U_RSD_PFouPJ: "PJ",
                            }
                            await this.sapServices.updateFornecedor(dadosPessoaJuridica, CardCode);
                            fornecedoresProcessados.push({ CardCode: fornecedor.CardCode, data: dadosPessoaJuridica });
                            return;
                        } if (cpf && isValidCpf) {
                            const fornecedorAdresses: interfaces.FornecedorAdress[] = await this.sapServices.getClientAdresses(CardCode);
                            if (helperFunctions.objetoVazio(fornecedorAdresses)) {
                                throw new HttpError(404, 'Nenhum endereço encontrado para o fornecedor');
                            }

                            for (const adress of fornecedorAdresses) {
                                const templateFiscal: interfaces.TemplateFiscal = {
                                    Address: adress.Address,
                                    BPCode: CardCode,
                                    AddrType: "bo_ShipTo",
                                    TaxId1: "Isento",
                                }
                                baseFornecedorData.BPFiscalTaxIDCollection.push(templateFiscal);
                            }

                            const dadosPessoaFisica: interfaces.DadosPessoaFisica = {
                                ...baseFornecedorData,
                                U_RSD_PFouPJ: "PF",
                                U_TX_IndIEDest: "9",
                            }


                            await this.sapServices.updateFornecedor(dadosPessoaFisica, CardCode);
                            fornecedoresProcessados.push({ CardCode: fornecedor.CardCode, data: dadosPessoaFisica });
                            return;
                        }
                        throw new HttpError(400, 'Erro inesperado');
                    } catch (err: any) {
                        const fornecedorIsInDb = await this.dataBaseServices.findFornecedorCadastrado(fornecedor.CardCode);
                        if (fornecedorIsInDb) {
                            await this.dataBaseServices.atualizaFornecedorCadastrado({ CardCode: fornecedor.CardCode, Status: "Erro ao atualizar", Erro: err.message });
                        } else {
                            await this.dataBaseServices.logFornecedorCadastrado({ CardCode: fornecedor.CardCode, Status: "Erro ao atualizar", Erro: err.message });
                        }
                        processErrors.push({ CardCode: fornecedor.CardCode, error: err.message });

                    }
                }));

                // If not the last batch, wait for the remaining time to complete a minute
                if (i + 50 < fornecedores.length) {
                    const processingEndTime = Date.now();
                    const processingTime = processingEndTime - processingStartTime;
                    const waitTime = Math.max(60000 - processingTime, 0);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                processingStartTime = Date.now();
            }


            if (processErrors.length > 0 && fornecedoresProcessados.length === 0) {
                const errorDetails = processErrors.map(err => ({
                    CardCode: err.CardCode || 'Não foi possível obter o CardCode do fornecedor',
                    error: err.error || 'Erro desconhecido'
                }));
                throw new HttpErrorWithDetails(500, 'Erros dos fornecedores:', errorDetails)
            } else if (processErrors.length > 0 && fornecedoresProcessados.length > 0) {
                return {
                    customStatusCode: 206,
                    fornecedoresProcessados: fornecedoresProcessados,
                    errors: processErrors.map(err => ({
                        CardCode: err.CardCode || 'Não foi possível obter o CardCode do fornecedor',
                        error: err.error || 'Erro desconhecido'
                    }))
                };
            }

            return { fornecedoresProcessados: fornecedoresProcessados, errors: [] };
        }
        catch (err: any) {
            if (err instanceof HttpErrorWithDetails) {
                throw new HttpErrorWithDetails(err.statusCode, "Erro na atualizacao de fornecedores: " + err.message, err.details);
            }
            throw new HttpError(err.statusCode || 500, 'Erro ao cadastrar fornecedores: ' + err.message);
        }
    }

    public async updateAllClientsRegistrationData() {
        try {
            const clients = await this.sapServices.getAllActiveClientsRegistrationData();
            const errors: any[] = [];
            const processedClients: any[] = [];

            const JsonInMemory = new JsonInMemoryHandler()
            JsonInMemory.loadFile('./src/models/data/cnpj_data_clientes_full.json');

            await Promise.all(clients.map(async (client) => {   
                try {
                    const cardCode = client.CardCode;
                    if (!client || !cardCode) {
                        throw new HttpError(400, 'Cliente inválido');
                    }
                    
                    console.log("Starting client: ", client);

                    const clientRegistrationLog = await this.dataBaseServices.findClientRegistrationLog(cardCode);
                    if (clientRegistrationLog?.Status === "SUCCESS") {
                        console.log("Found client that already has been processed with success: ", cardCode);
                        return;
                    }

                    if(!clientRegistrationLog) {
                        const insertFirstLog = {
                            CardCode: cardCode,
                            Status: "PENDING",
                        }
                        await this.dataBaseServices.logClientRegistration(insertFirstLog);    
                    }
            
                    const [processedClient, processedData] = await this.processClient(client, JsonInMemory);
                    processedClients.push(processedClient);

                    console.log("Finished client with success: ", cardCode);
            
                    const insertLogObj = {
                        Status: "SUCCESS",
                        data_updated: JSON.stringify(processedData),
                    }
                    await this.dataBaseServices.updateClientRegistrationLog(cardCode, insertLogObj);
            
                    return true;
                } catch (err: any) {
                    const cardCode = client.CardCode;
                    if (!cardCode) {
                        return errors.push({ CardCode: null, error: "No CardCode" })
                    }

                    const updateLogObj = {
                        Status: "ERROR",
                        Error: err.message,
                    }
                    this.dataBaseServices.updateClientRegistrationLog(cardCode, updateLogObj);

                    console.log("Finished client with error: ", cardCode);
                    console.log("Error: ", err.message);
                    return errors.push({ CardCode: cardCode, error: err.message });
                }
            }))

            const totalClients = clients.length;
            
            if (errors.length === totalClients) {
                throw new HttpErrorWithDetails(500, "Erro ao atualizar clientes por CNPJ", errors);
            } else if (errors.length > 0) {
                throw new HttpErrorWithDetails(206, "Erro ao atualizar parte dos clientes", errors)
            } else if (errors.length === 0) {
                return processedClients;
            } else {
                throw new HttpError(500, 'Erro inesperado');
            }

        } catch (err: any) {
            if(err instanceof HttpErrorWithDetails) {
                throw new HttpErrorWithDetails(err.statusCode, "Erro na atualizacao de clientes por CNPJ: " + err.message, err.details);
            }
            throw new HttpError(err.statusCode || 500, 'Erro ao atualizar clientes por CNPJ: ' + err.message);
        }
    }

    public async deactiveAllTicketsFromVendor(userId: string) {
        try {
            if (!userId) {
                throw new HttpError(400, 'Nenhum Id de usuário encontrado');
            }
            const parsedUserId = parseInt(userId);
            if (isNaN(parsedUserId)) {
                throw new HttpError(400, 'Id de usuário inválido');
            }
            const tickets: interfaces.TicketNumber[] = await this.sapServices.getOpenTicketsFromVendor(parsedUserId);
            if (helperFunctions.objetoVazio(tickets[0])) {
                throw new HttpError(404, 'Nenhum ticket encontrado para o vendedor');
            }
            const ticketsProcessados: interfaces.TicketNumber[] = [];
            const ticketsErros: any[] = [];

            await Promise.all(tickets.map(async (ticket) => {
                try {
                    this.sapServices.deactivateTicket(ticket.ClgCode),
                        ticketsProcessados.push({ ClgCode: ticket.ClgCode });
                } catch (err: any) {
                    ticketsErros.push({ ClgCode: ticket.ClgCode, error: err.message });
                }
            }))

            if (ticketsErros.length > 0 && ticketsProcessados.length === 0) {
                const errorDetails = ticketsErros.map(err => ({
                    ClgCode: err.ClgCode || 'Não foi possível obter o ClgCode do ticket',
                    error: err.error || 'Erro desconhecido'
                }));
                throw new HttpErrorWithDetails(500, 'Erros dos tickets:', errorDetails)
            }
            else if (ticketsErros.length > 0 && ticketsProcessados.length > 0) {
                return {
                    customStatusCode: 206,
                    ticketsProcessados: ticketsProcessados,
                    errors: ticketsErros.map(err => ({
                        ClgCode: err.ClgCode || 'Não foi possível obter o ClgCode do ticket',
                        error: err.error || 'Erro desconhecido'
                    }))
                }
            }
            else if (ticketsProcessados.length > 0 && ticketsErros.length === 0) {
                return {
                    customStatusCode: 200,
                    ticketsProcessados: ticketsProcessados,
                }
            } else {
                throw new HttpError(500, 'Erro inesperado');
            }
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao desativar todos os tickets do vendedor: ' + err.message);
        }
    }

    public async getAllClientsCnpjClear() {
        const clients = await this.sapServices.getAllActiveClientsRegistrationData();
        let string = "";
        clients.map((client: any) => string += client.TaxId0 + ",");
        return string;
    }

    public async getAllFornecedoresCnpjClear() {
        const isoStringAllTime = '1900-01-01';
        const fornecedores = await this.sapServices.getFornecedoresLeads(isoStringAllTime);
        let string = "";
        fornecedores.map((fornecedor: any) => string += fornecedor.TaxId0 + ",");
        return string;
    }

    private async processClient(client: interfaces.ClientRegistrationData, JsonInMemory: JsonInMemoryHandler) {
        const cardCode = client.CardCode;

        const cnpj = client.TaxId0?.replace(/\D/g, '') ?? null;
        const estado = client.State1 ?? null;
        const cardName = client.CardName ?? null;
        const freeText = client.Free_Text ?? null;
        
        
        if (!cardName || cardName === "") {
            throw new HttpError(400, 'Nome do cliente inválido da query ao SAP');
        }
        if (!cnpj || cnpj === "") {
            throw new HttpError(400, 'CNPJ inválido da query ao SAP');
        }
        if (!estado || estado === "") {
            throw new HttpError(400, 'Estado inválido da query ao SAP');
        }

        

        const cnpjInformation = await JsonInMemory.getObjectByValue('taxId', cnpj);
        console.log(cnpjInformation);
        if (!cnpjInformation) {
            throw new HttpError(404, `CNPJ não encontrado no cache`);
        }

        const ClientData: interfaces.ClientUpdateData = {
            U_TX_IndIEDest: null,
            U_TX_SN: null,
            BPFiscalTaxIDCollection: null,
            FreeText: null
        }

        const simplesOptant = cnpjInformation.company.simples.optant;
        this.getInscricaoSimples(simplesOptant, ClientData);


        const registrations = cnpjInformation.registrations;
        await this.getInscricaoEstadual(registrations, estado, cardCode, ClientData);

        const status = cnpjInformation.status.id;
        this.getCnpjBaixado(status, ClientData)

        const mainActivityText = cnpjInformation.mainActivity.text;
        const reason = cnpjInformation.reason?.text;
        await this.getNewObservation(mainActivityText, status, reason, freeText, cardCode, ClientData);
        
        this.checkAllFields(ClientData);

        await this.sapServices.updateClient(ClientData, cardCode);

        return [{ CardCode: cardCode, data: ClientData }, ClientData];

    }
 
    private getCnpjBaixado(status: number, ClientData: any): void {
        try {
            const statusForSL = status === 2 ? "tYES" : "tNO";
            ClientData.Valid = statusForSL;
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao processar CNPJ baixado do cliente: ' + err.message);
        }
    }

    private async getInscricaoEstadual(registrations: interfaces.Registration[] | [], estado: string, cardCode: string, ClientData: any): Promise<void> {
        try {
            
            const registration = registrations?.find((registration) => registration?.state === estado);
            const clientAdresses = await this.sapServices.getClientAdresses(cardCode);
            const BPFiscalTaxIDCollection: interfaces.TemplateFiscal[] = [];

            const isEnabled = registration?.enabled;
            const InscricaoEstadual = isEnabled ? registration?.number : "Isento";

            const isIsento = !isEnabled;

            for (const adress of clientAdresses) {
                const templateFiscal: interfaces.TemplateFiscal = {
                    Address: adress.Address,
                    BPCode: cardCode,
                    AddrType: "bo_ShipTo",
                    TaxId1: InscricaoEstadual,
                }
                BPFiscalTaxIDCollection.push(templateFiscal);
            }

            ClientData.BPFiscalTaxIDCollection = BPFiscalTaxIDCollection;
            ClientData.U_TX_IndIEDest = isIsento ? "9" : "1";
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao processar inscrição estadual do cliente: ' + err.message);
        }
    }

    private getInscricaoSimples(simplesOptant: boolean, ClientData: any): void {
        try {
            ClientData.U_TX_SN = simplesOptant ? 1 : 2;
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao processar inscrição simples do cliente: ' + err.message);
        }
    }

    private async getNewObservation(mainActivityText: string, cnpjStatus: number, reasonForBaixa: string | undefined, freeText: string | null, cardCode: string, ClientData: any): Promise<void> {
        try {
            const oldObservation = freeText || "";
            let templateString = oldObservation + " - Informações da Atualiação cadastral geral, realizada dia " + new Date().toISOString().split('T')[0] + ": ";
            templateString += "  Atividade principal: " + mainActivityText;

            if (cnpjStatus !== 2) {
                templateString += "  Motivo da baixa: " + reasonForBaixa;
            }

            ClientData.FreeText = templateString;

        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao processar observação do cliente: ' + err.message);
        }
    }

    private checkAllFields(Data: any): void {
        try {
            const fields = Object.keys(Data);
            for (const field of fields) {
                if (Data[field] === null || Data[field] === undefined || Data[field] === "") {
                    throw new HttpError(400, `Dado: ${field} inválido: (null undefined ou empty str)`);
                }
            }

        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao verificar se os dados do cliente estão completos: ' + err.message);
        }
    }

    public async getMysqlSapClients() {
        return await this.dataBaseServices.getMysqlSapClients();
    }





}
