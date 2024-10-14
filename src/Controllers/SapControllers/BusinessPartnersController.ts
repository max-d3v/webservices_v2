import { SapServices } from "../../services/SapServices";
import { HttpError, HttpErrorWithDetails } from "../../utils/errorHandler";
import * as helperFunctions from "../../utils/helperFunctions";
import * as interfaces from "../../types/interfaces";
import { DatabaseServices } from "../../services/DatabaseServices";
import { LocalFiscalDataClass } from "../../models/LocalFiscalDataClass";

//Updating sap controller file name

export class BusinessPartnersController {
    private static instance: BusinessPartnersController;
    private sapServices: SapServices;
    private dataBaseServices: DatabaseServices;
    private LocalFiscalDataClass: LocalFiscalDataClass;


    constructor() {
        this.sapServices = SapServices.getInstance();
        this.dataBaseServices = DatabaseServices.getInstance();
        this.LocalFiscalDataClass = LocalFiscalDataClass.getInstance();
    }

    public static getInstance(): BusinessPartnersController {
        if (!BusinessPartnersController.instance) {
            BusinessPartnersController.instance = new BusinessPartnersController();
        }
        return BusinessPartnersController.instance;
    }

    public async updateClientsRegistrationData(tipo: string, CardCode: string | null = null) {
        try {
            let clients: interfaces.RelevantClientData[] = [];
            const JsonInMemory = new LocalFiscalDataClass()
            JsonInMemory.loadFile('./src/models/data/cnpj_data_clientes_full.json');

            clients = await this.getFiscalClientData(tipo, CardCode, JsonInMemory);

            if (clients.length === 0) {
                throw new HttpError(404, "Nenhum cliente encontrado para processamento!");
            }

            console.log(`Starting ${tipo} process with ${clients.length} clients`);

            const errors: any[] = [];
            const processedClients: any[] = [];

            //BATCHING 

            const BATCH_SIZE = 200;
            const maxIterations = Math.ceil(clients.length / BATCH_SIZE);
            for (let iteration = 0; iteration < maxIterations; iteration++) {
                console.log(`Starting iteration ${iteration}, of ${BATCH_SIZE} clients - total iterations: ${maxIterations}`);

                const firstPosition = iteration * BATCH_SIZE;
                console.log(`Vai pegar os clientes do index ${firstPosition} ao ${firstPosition + BATCH_SIZE}`);

                const batch = clients.slice(firstPosition, firstPosition + BATCH_SIZE) as interfaces.RelevantClientData[];

                await Promise.all(batch.map(async (client) => this.ClientProcessController(client, JsonInMemory, processedClients, errors, tipo)))
            }


            //await helperFunctions.batchOperation(clients, this.ClientProcessController, 200, JsonInMemory, processedClients, errors, tipo);

            JsonInMemory.quit()
            const apiReturn = helperFunctions.handleMultipleProcessesResult(errors, processedClients)
            return apiReturn;

        } catch (err: any) {
            if (err instanceof HttpErrorWithDetails) {
                throw new HttpErrorWithDetails(err.statusCode, "Erro na atualizacao de clientes por CNPJ: " + err.message, err.details);
            }
            throw new HttpError(err.statusCode || 500, 'Erro ao atualizar clientes por CNPJ: ' + err.message);
        }
    }

    private async ClientProcessController(client: interfaces.RelevantClientData, JsonInMemory: LocalFiscalDataClass, processedClients: any[], errors: any[], type: string) {
        try {
            const cardCode = client.CardCode;

            console.log("Starting client: ", cardCode);

            const clientRegistrationLog = await this.dataBaseServices.findClientRegistrationLog(cardCode);
            if (clientRegistrationLog?.Status === "SUCCESS") {
                console.log("Found client that already has been processed with success: (se estiver no unprocessed está errado)", cardCode);
                if (type == "unprocessed") {
                    return;
                }
            }

            if (!clientRegistrationLog) {
                await this.dataBaseServices.logClientRegistration({
                    CardCode: cardCode, Status: "PENDING"
                });
            }

            const [processedClient, processedData] = await this.processClient(client, JsonInMemory);
            processedClients.push(processedClient);

            console.log("Finished client with success: ", cardCode);

            await this.dataBaseServices.updateClientRegistrationLog(cardCode, {
                Status: "SUCCESS",
                data_updated: JSON.stringify(processedData),
            });

            return true;
        } catch (err: any) {
            const cardCode = client.CardCode;
            if (!cardCode) {
                return errors.push({ CardCode: null, error: "No CardCode" })
            }

            console.log("Finished client with error: ", cardCode);
            console.log("Error: ", err);

            try {
                await this.dataBaseServices.updateClientRegistrationLog(cardCode, {
                    Status: "ERROR",
                    Error: err.message,
                });
            } catch (logErr: any) {
                console.error("Error updating log on catch: ", logErr.message);
                return errors.push({ CardCode: cardCode, error: `Main error: ${err.message}. Log update error: ${logErr.message}` });
            }

            return errors.push({ CardCode: cardCode, error: err.message });
        }

    }

    private async processClient(client: interfaces.RelevantClientData, JsonInMemory: LocalFiscalDataClass): Promise<(interfaces.ClientUpdateData | { CardCode: string; data: interfaces.ClientUpdateData; })[]> {
        const cardCode = client.CardCode

        const cnpj = client.TaxId0?.replace(/\D/g, '') ?? null;
        const estado = client.State1 ?? null;
        const cardName = client.CardName;
        const freeText = client.Free_Text ?? null;
        const balance = client.Balance;

        if (!cnpj || cnpj === "") {
            throw new HttpError(400, 'CNPJ inválido da query ao SAP');
        }
        if (!estado || estado === "") {
            throw new HttpError(400, 'Estado inválido da query ao SAP');
        }


        const cnpjInformation = JsonInMemory.getObjectByValue('taxId', cnpj);
        if (!cnpjInformation) {
            throw new HttpError(404, `CNPJ não encontrado no cache`);
        }

        const ClientData: interfaces.ClientUpdateData = {
            U_TX_IndIEDest: null,
            U_TX_SN: null,
            BPFiscalTaxIDCollection: null,
            FreeText: null,
            Valid: null,
            Frozen: null
        }

        const simplesOptant = cnpjInformation.company.simples.optant;
        this.ProcessSimplesOptant(simplesOptant, ClientData);


        const registrations = cnpjInformation.registrations;
        const adresses = client.Adresses;
        await this.ProcessIE(registrations, estado, cardCode, adresses, ClientData);

        const status = cnpjInformation.status.id;
        this.ProcessCnpjStatus(status, balance, ClientData)

        const mainActivityText = cnpjInformation.mainActivity.text;
        const reason = cnpjInformation.reason?.text;
        await this.NewObservation(mainActivityText, status, reason, freeText, cardCode, ClientData);

        helperFunctions.checkAllFields(ClientData);

        await this.sapServices.updateClient(ClientData, cardCode);

        return [{ CardCode: cardCode, data: ClientData }, ClientData];

    }

    public async AtualizaCadastroFornecedores(isoString: string): Promise<any> {
        try {
            const isIsoString = helperFunctions.isIsoString(isoString);
            if (!isIsoString) {
                throw new HttpError(400, 'Data inválida (deve ser uma data no formato ISO ("yyyy-mm-dd"))');
            }
            const fornecedores = await this.sapServices.getFornecedoresLeads(isoString);

            if (fornecedores.length == 0) {
                throw new HttpError(404, 'Nenhum fornecedor encontrado');
            }

            const processErrors: any[] = [];
            const fornecedoresProcessados: any[] = [];

            const JsonInMemory = new LocalFiscalDataClass();
            JsonInMemory.loadFile('./src/models/data/cnpj_data_fornecedores_full.json');

            for (let i = 0; i < fornecedores.length; i += 50) {
                const batch = fornecedores.slice(i, i + 50);

                let processingStartTime = Date.now();

                await Promise.all(batch.map(async (fornecedor) => {
                    try {
                        const cnpj = fornecedor.TaxId0;
                        const cpf = fornecedor.TaxId4;
                        const CardCode = fornecedor.CardCode;
                        const isValidCnpj = helperFunctions.validCNPJ(cnpj);
                        const isValidCpf = helperFunctions.validaCPF(cpf);
                        const estado = fornecedor.State1;

                        if (!estado || estado === "") {
                            throw new HttpError(400, `Estado inválido - estado: ${estado}`);
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
                            const fornecedorData = JsonInMemory.getObjectByValue('taxId', cleanedCnpj);
                            if (!fornecedorData) {
                                throw new HttpError(404, `CNPJ não encontrado no cache`);
                            }

                            const isMEI = fornecedorData.company.simei.optant;
                            const registrations = fornecedorData.registrations;
                            const stateRegistration = registrations?.find((registration: any) => registration?.state === estado);
                            const isContribuinteICMS = stateRegistration?.enabled

                            const fornecedorAdresses: interfaces.FornecedorAdress[] = await this.sapServices.getClientAdresses(CardCode);
                            if (fornecedorAdresses.length == 0) {
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

            JsonInMemory.quit();


            const apiReturn = helperFunctions.handleMultipleProcessesResult(processErrors, fornecedoresProcessados);
            return apiReturn;
        }
        catch (err: any) {
            if (err instanceof HttpErrorWithDetails) {
                throw new HttpErrorWithDetails(err.statusCode, "Erro na atualizacao de fornecedores: " + err.message, err.details);
            }
            throw new HttpError(err.statusCode || 500, 'Erro ao cadastrar fornecedores: ' + err.message);
        }
    }

    private async getFiscalClientData(tipo: string, CardCode: string | null = null, JsonInMemory: LocalFiscalDataClass): Promise<interfaces.RelevantClientData[]> {
        let clients: interfaces.RelevantClientData[] = [];

        if (tipo == "Unprocessed") {
            clients = await this.getClientsToProcess();
        }
        else if (tipo == 'Inativados') {
            clients = await this.getInactivatedClientsSAP();
        } else if (tipo == "Client") {
            if (!CardCode) {
                throw new HttpError(400, "CardCode não informado");
            }
            clients = await this.sapServices.getActiveClientRegistrationData(CardCode);
            console.log("Cliente selecionado: ", clients);
        } else if (tipo == "All") {
            clients = await this.sapServices.getAllActiveClientsRegistrationData();
        } else if (tipo == "ManyRegistrations") {
            clients = await this.getClientsWithMoreThanOneRegistration(JsonInMemory);
        }
        else {
            clients = await this.getClientsToProcess();
        }

        console.log(clients)
        return clients;
    }

    private async getInactivatedClientsSAP(): Promise<interfaces.RelevantClientData[]> {
        try {
            const inactivatedClients = await this.dataBaseServices.getInactivatedClients();
            const inactivatedClientsCardCodes = inactivatedClients.map((client) => `'${client.CardCode}'`).join(",");

            const inactivatedClientsSAP = await this.sapServices.getClientsRegistrationData(null, { field: `A."CardCode"`, value: inactivatedClientsCardCodes });
            return inactivatedClientsSAP;
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao buscar clientes inativos: ' + err.message);
        }
    }

    private async getClientsToProcess(): Promise<interfaces.RelevantClientData[]> {
        let clients: interfaces.RelevantClientData[] = [];
        let tipo = "remove";
        //const TURNING_POINT = 20000;

        const clientAlreadyProcessed = await this.dataBaseServices.getClientsAlreadyProcessed();
        //if (clientAlreadyProcessed.length > TURNING_POINT) {
        //    tipo = "choose";
        //}

        console.log("Vai pegar os clientes para processar com o tipo: ", tipo);

        if (tipo == "remove") {
            console.log(`Filtering ${clientAlreadyProcessed.length} Clients out of the cliens to process (Clients already processed with success)`)

            const clientsProcessedCardCodesString = clientAlreadyProcessed.map((client) => `'${client.CardCode}'`).join(",");

            const ActiveClients = await this.sapServices.getAllActiveClientsRegistrationData(clientsProcessedCardCodesString);
            clients = ActiveClients.map((client) => {
                if (clientAlreadyProcessed.find((processedClient) => processedClient.CardCode === client.CardCode)) {
                    console.log("Client already processed: ", client.CardCode);
                    return;
                }
                return client;
            }).filter((client) => client !== undefined);
        }
        else if (tipo == "choose") {
            const allClients = await this.sapServices.getAllActiveClientsRegistrationData();
            const cardCodes = allClients.map((client) => client.CardCode);
            const cardCodesNotInClientAlreadyProcessed = cardCodes.filter((cardCode) => !clientAlreadyProcessed.find((processedClient) => processedClient.CardCode === cardCode));
            const cardCodesString = cardCodesNotInClientAlreadyProcessed.join("','");
            clients = await this.sapServices.getAllActiveClientsRegistrationData(null, { field: 'A."CardCode"', value: `'${cardCodesString}'` });

            console.log(`Selecting ${clients.length} clients out of ${allClients.length} (Clients not already processed)`);
        }

        return clients;
    }

    private async getClientsWithMoreThanOneRegistration(JsonInMemory: LocalFiscalDataClass): Promise<interfaces.RelevantClientData[]> {
        const clients = JsonInMemory.getData();

        const clientsWithMoreThanOneRegistration = clients.filter((client: any) => client.registrations.length > 1);
        const taxIds = clientsWithMoreThanOneRegistration.map((client: any) => {
            const cleanTaxId = client.taxId.replace(/\D/g, '');
            const ponctuatedTaxId = cleanTaxId.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
            return ponctuatedTaxId;
        });
        const taxIdsString = taxIds.join("','");

        const clientsSAP = await this.sapServices.getAllActiveClientsRegistrationData(null, { field: `B."TaxId0"`, value: `'${taxIdsString}'` }, null);
        return clientsSAP;
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

    public async getMysqlSapClients() {
        return await this.dataBaseServices.getMysqlSapClients();
    }

    private ProcessCnpjStatus(status: number, balance: number, ClientData: any): void {
        try {
            if (balance === 0) {
                const statusForSL = status === 2 || status === 4 ? "tYES" : "tNO";
                const frozenForSL = status === 2 || status === 4 ? "tNO" : "tYES";
                ClientData.Valid = statusForSL;
                ClientData.Frozen = frozenForSL;
            } else {
                ClientData.Valid = "tYES";
                ClientData.Frozen = "tNO";
            }
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao processar CNPJ baixado do cliente: ' + err.message);
        }
    }

    private async ProcessIE(registrations: interfaces.Registration[] | [], estado: string, cardCode: string, clientAdresses: interfaces.RelevantClientData["Adresses"], ClientData: any): Promise<void> {
        try {
            //IE normal e do estado.
            const registration = registrations?.find((registration) => registration?.state === estado && registration?.type?.id === 1 || registration?.type?.id === 4);
            
            const BPFiscalTaxIDCollection: interfaces.TemplateFiscal[] = [];

            const isEnabled = registration?.enabled;
            const InscricaoEstadual = isEnabled ? (registration?.number || "Isento") : "Isento";
            const isIsento = !isEnabled;

            for (const adress of clientAdresses) {
                const templateFiscal: interfaces.TemplateFiscal = {
                    Address: adress,
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

    private ProcessSimplesOptant(simplesOptant: boolean, ClientData: any): void {
        try {
            ClientData.U_TX_SN = simplesOptant ? 1 : 2;
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao processar inscrição simples do cliente: ' + err.message);
        }
    }

    private async NewObservation(mainActivityText: string, cnpjStatus: number, reasonForBaixa: string | undefined, freeText: string | null, cardCode: string, ClientData: any) {
        try {
            const oldObservation = freeText || "";
            const alreadyUpdated = oldObservation.includes("Informações da Atualiação cadastral geral");

            let templateString = oldObservation + " - Informações da Atualiação cadastral geral, realizada dia " + new Date().toISOString().split('T')[0] + ": ";
            templateString += "  Atividade principal: " + mainActivityText;

            if (cnpjStatus !== 2) {
                templateString += "  Motivo da baixa: " + reasonForBaixa;
            } else {
                if (alreadyUpdated) {
                    ClientData.FreeText = oldObservation;
                    return;
                }
            }

            ClientData.FreeText = templateString;

        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao processar observação do cliente: ' + err.message);
        }
    }

}
