import { SapServices } from "../../services/SapServices";
import { HttpError, HttpErrorWithDetails } from "../../utils/errorHandler";
import * as helperFunctions from "../../utils/helperFunctions";
import * as interfaces from "../../types/interfaces";
import { DatabaseServices } from "../../services/DatabaseServices";
import { LocalFiscalDataClass } from "../../models/LocalFiscalDataClass";
import { LocalFiscalDataServices } from "../../services/LocalFiscalDataServices";
import { ApiFiscalDataClass } from "../../models/ApiFiscalDataClass";
//Updating sap controller file name.

export class BusinessPartnersController {
    private static instance: BusinessPartnersController;
    private sapServices: SapServices;
    private dataBaseServices: DatabaseServices;
    private LocalFiscalDataClass: LocalFiscalDataClass;
    private LocalFiscalDataServices: LocalFiscalDataServices;
    private ApiFiscalDataClass: ApiFiscalDataClass;

    constructor() {
        this.sapServices = SapServices.getInstance();
        this.dataBaseServices = DatabaseServices.getInstance();
        this.LocalFiscalDataClass = LocalFiscalDataClass.getInstance();
        this.LocalFiscalDataServices = LocalFiscalDataServices.getInstance();
        this.ApiFiscalDataClass = ApiFiscalDataClass.getInstance();
    }

    public static getInstance(): BusinessPartnersController {
        if (!BusinessPartnersController.instance) {
            BusinessPartnersController.instance = new BusinessPartnersController();
        }
        return BusinessPartnersController.instance;
    }

    public async updateClientsRegistrationData(tipo: string, CardCode: string | undefined | null = null) {
        try {
            let clients: interfaces.RelevantClientData[] = [];
            const JsonInMemory = new LocalFiscalDataClass();
            await JsonInMemory.loadFile('./src/models/data/cnpj_data_clientes_full.json');

            if (tipo == "Client" && !CardCode) {
                throw new HttpError(400, "No CardCode was given!");
            }

            clients = await this.getFiscalClientData(tipo, CardCode, JsonInMemory);

            console.log(`Começando processo de clientes de tipo ${tipo} com ${clients.length}`);

            if (clients.length === 0) {
                throw new HttpError(404, "Nenhum cliente encontrado para processamento!");
            }

            const errors: {CardCode: string, error: string}[] = [];
            const processedClients: [] = [];

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
            const apiReturn = await helperFunctions.handleMultipleProcessesResult(errors, processedClients)
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

            if (!clientRegistrationLog) {
                await this.dataBaseServices.logClientRegistration({
                    CardCode: cardCode, Status: "PENDING"
                });
            } else {
                await this.dataBaseServices.updateClientRegistrationLog(cardCode, {Status: "PENDING"})
            }

            const [processedClient, processedData] = await this.ProcessClientFiscalData(client, JsonInMemory);
            await this.sapServices.updateClient(processedData, cardCode);


            await this.dataBaseServices.updateClientRegistrationLog(cardCode, {
                Status: "SUCCESS",
                data_updated: JSON.stringify(processedData),
            });

            processedClients.push(processedClient);
            console.log("Finished client and updated db with success: ", cardCode);

            return true;
        } catch (err: any) {
            const cardCode = client.CardCode;
            if (!cardCode) {
                return errors.push({ CardCode: null, error: "No CardCode" })
            }

            console.log("Finished client with error: ", cardCode);
            // console.log("Error: ", err.message);

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

    private async ProcessClientFiscalData(client: interfaces.RelevantClientData, JsonInMemory: LocalFiscalDataClass): Promise<(interfaces.ClientUpdateData | { CardCode: string; data: interfaces.ClientUpdateData; })[]> {
        try {
            const cardCode = client.CardCode

            const cnpj = client.TaxId0?.replace(/\D/g, '') ?? null;
            const estado = client.State1 ?? null;
            const freeText = client.Free_Text ?? null;
            const balance = client.Balance;
    
            if (!cnpj || cnpj === "") {
                throw new HttpError(400, 'CNPJ inválido da query ao SAP');
            }
            if (!estado || estado === "") {
                throw new HttpError(400, 'Estado inválido da query ao SAP');
            }
    
    
            const cnpjInformation = this.LocalFiscalDataServices.getObjectByValue('taxId', cnpj, JsonInMemory);
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
        
            return [{ CardCode: cardCode, data: ClientData }, ClientData];
    
        }catch(err: any) {
            throw new HttpError(err.statusCode ? err.statusCode : 500 , `Error when processing client fiscal data: ` + err.message);
        }
    }

    

    public async getFiscalClientData(tipo: string, CardCode: string | null = null, JsonInMemory: LocalFiscalDataClass): Promise<interfaces.RelevantClientData[]> {
        let clients: interfaces.RelevantClientData[] = [];

        let selectedClients: string[] = [];
        let removedClients: string[] = [];
        let getInactiveClients = false;


        if (tipo == "Unprocessed") {
            [selectedClients, removedClients] = await this.getClientsToProcess();
        }
        else if (tipo == 'Inativados') {
            selectedClients = await this.getInactivatedClientsSAP();
            getInactiveClients = true;
        } else if (tipo == "Client") {
            selectedClients = [CardCode!];
        } else if (tipo == "ManyRegistrations") {
            selectedClients = await this.getClientsWithMoreThanOneRegistration(JsonInMemory);
        } else if (tipo == "SelectedClients") {
          //  selectedClients = await this.getSelectedClients();
        } else {
            //Nothing, will get all active clients.
        }

        const filter = selectedClients.length > 0 ? {
            field: 'A."CardCode"',
            value: "'" + selectedClients.join(`','`) + "'"
        } : null;
        const exceptions = removedClients.length > 0 ? {
            field: 'A."CardCode"',
            value: "'" + removedClients.join(`','`) + "'"
        } : null;
        

        clients = await this.sapServices.getAllActiveClientsRegistrationData(filter, exceptions, getInactiveClients);
        return clients;
    }


    private async getInactivatedClientsSAP(): Promise<string[]> {
        try {
            const inactivatedClients = await this.dataBaseServices.getInactivatedClients();
            const CardCodesArray = inactivatedClients
                .filter((client) => client.CardCode)
                .map((client) => client.CardCode as string);
            return CardCodesArray;
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao buscar clientes inativos: ' + err.message);
        }
    }

    private async getClientsToProcess(): Promise<string[][]> {
        let clientsToSearch: string[] = [];
        let clientsToRemove: string[] = [];

        let tipo = "remove";
        const TURNING_POINT = 30000;

        const clientAlreadyProcessed = await this.dataBaseServices.getClientsAlreadyProcessed();
        if (clientAlreadyProcessed.length > TURNING_POINT) {
            tipo = "choose";
        }

        console.log("Vai pegar os clientes para processar com o tipo: ", tipo);

        if (tipo == "remove") {
            const cardCodes: string[] = clientAlreadyProcessed
                .filter((client) => client.CardCode)
                .map((client) => client.CardCode as string);

            clientsToRemove = cardCodes;
        }
        else if (tipo == "choose") {
            const allClientsCardCodes = await this.sapServices.getAllActiveClientsCardCodes();
            const cardCodesNotInClientAlreadyProcessed: string[] = allClientsCardCodes
                .map(client => client.CardCode)
                .filter(cardCode => !clientAlreadyProcessed.find(processedClient => processedClient.CardCode === cardCode));
            clientsToSearch = cardCodesNotInClientAlreadyProcessed;
        }

        return [clientsToSearch, clientsToRemove]
    }

    private async getClientsWithMoreThanOneRegistration(JsonInMemory: LocalFiscalDataClass): Promise<string[]> {
        const clients = JsonInMemory.getData();

        const clientsWithMoreThanOneRegistration = clients.filter((client: any) => client.registrations.length > 1);
        const taxIds = clientsWithMoreThanOneRegistration.map((client: any) => {
            const cleanTaxId = client.taxId.replace(/\D/g, '');
            const ponctuatedTaxId = cleanTaxId.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
            return ponctuatedTaxId;
        });

        const CardCodesWithGivenTaxIds = this.sapServices.getCardCodesBasedOnTaxId(taxIds);
        return CardCodesWithGivenTaxIds;
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

    private ProcessCnpjStatus<T extends { Valid: string | null, Frozen: string | null }>(status: number, balance: number, ClientData: T): void {
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
            const foundRegistrations = registrations?.filter((registration) => registration?.state === estado && registration?.type?.id === 1 || registration?.type?.id === 4);
            let registration: null | interfaces.Registration = null;
            if (foundRegistrations.length == 1) {
                registration = foundRegistrations[0]
            } else if (foundRegistrations.length > 1) {
                console.log("Cliente tem mais de uma IE normal para o estado, selecionando a ativa (se tiver!)")
                const activatedRegistration = foundRegistrations.find((registration) => registration.enabled == true)
                if (activatedRegistration) {
                    registration = activatedRegistration
                    console.log(`Selecionou a registration`)
                    console.log(registration)
                }
            }

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

    private ProcessSimplesOptant<T extends { U_TX_SN: number | null }>(simplesOptant: boolean, ClientData: T): void {
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

    


    public async AtualizaCadastroFornecedores(type: string): Promise<{
        CardCode: string;
        data: any | undefined | null;
    }[]> {
        try {
            let unprocessed = false;
            let isoString = '1890-01-01';
            if (type == "Today") {
                isoString = new Date().toISOString().split('T')[0];
            } else if (type == "Unprocessed") {
                unprocessed = true;
            }
            const isIsoString = helperFunctions.isIsoString(isoString);
            if (!isIsoString) {
                throw new HttpError(400, 'Data inválida (deve ser uma data no formato ISO ("yyyy-mm-dd"))');
            }
            const fornecedores = await this.sapServices.getFornecedoresLeads(isoString, unprocessed);

            if (fornecedores.length == 0) {
                throw new HttpError(404, 'Nenhum fornecedor encontrado');
            }

            console.log(`Starting process with ${fornecedores.length} fornecedores`)

            const processErrors: {CardCode: string, error: string | undefined}[] = [];
            const fornecedoresProcessados: {CardCode: string, data: any | undefined | null}[] = [];

            const JsonInMemory = new LocalFiscalDataClass();
            await JsonInMemory.loadFile('./src/models/data/cnpj_data_fornecedores_full.json');

            

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
                            let fornecedorData: interfaces.CnpjJaData | null | undefined = null;
                            if (type == "Today") {
                                fornecedorData = await this.ApiFiscalDataClass.searchCnpj(cleanedCnpj);
                            } else {
                                fornecedorData = this.LocalFiscalDataServices.getObjectByValue("taxId", cleanedCnpj, JsonInMemory)
                                if (!fornecedorData) {
                                    console.log(`Não achou fornecedor no local e vai buscar via api`)
                                    fornecedorData = await this.ApiFiscalDataClass.searchCnpj(cleanedCnpj);
                                    console.log(`retorno api: `, fornecedorData)
                                    if (!fornecedorData) {
                                        throw new HttpError(404, `CNPJ não encontrado no cache e na API`);
                                    }
                                }
                                console.log("Found data in cache")
    
                            }


                            
                            const isMEI = fornecedorData.company.simei.optant;
                            const registrations = fornecedorData.registrations;
                            
                            const foundRegistrations = registrations?.filter((registration) => registration?.state === estado && registration?.type?.id === 1 || registration?.type?.id === 4);
                            let stateRegistration: null | interfaces.Registration = null;
                            if (foundRegistrations.length == 1) {
                                stateRegistration = foundRegistrations[0];
                            } else if (foundRegistrations.length > 1) {
                                console.log("Cliente tem mais de uma IE normal para o estado, selecionando a ativa (se tiver!)")
                                const activatedRegistration = foundRegistrations.find((registration) => registration.enabled == true)
                                if (activatedRegistration) {
                                    stateRegistration = activatedRegistration
                                    console.log(`Selecionou a registration`)
                                    console.log(stateRegistration)
                                }
                            }
                
                            
                            
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

    public async DeactivateChosenClients(type: string) {
        const clients = await this.getClients(type);

        console.log(`Starting Deactivation process with ${clients.length} clients!`);

        return await this.DeactivateClients(clients, type)
    }

    public async ActivateChosenClients(type: string) {
        const clients = await this.getClients(type);

        console.log(`Starting Activation process with ${clients.length} clients!`);

        return await this.ActivateClients(clients, type)
    }

    private async getClients(type: string): Promise<interfaces.DeactivationClientsData[]> {
        try {
            let clients: interfaces.DeactivationClientsData[] = [];

            if (type == "BrunoProcess") {
                const filteredClients = [
                    "C038942", "C042111", "C000041", "C001323", "C038228", "C040649", "C042358", "C044150", "C044964",
                    "C042221", "C037432", "C045344", "C038887", "C040972", "C039763", "C041762", "C037508", "C038572",
                    "C040382", "C045385", "C040147", "C042434", "C038884", "C018137", "C016707", "C000940", "C035658",
                    "C004400", "C039172", "C031929", "C041377", "C040022", "C038621", "C008908", "C038972", "C042709",
                    "C025905", "C042472", "C045372", "C041574", "C038442", "C000643", "C043185", "C042618", "C018376",
                    "C042394", "C040054", "C042257", "C042141", "C000567", "C044026", "C005064", "C041469", "C039037",
                    "C009035", "C001952", "C042020", "C042660", "C003387", "C039867", "C040428", "C037966", "C042634",
                    "C038415", "C039004", "C003826", "C040278", "C000995", "C042167", "C042617", "C041617", "C000607",
                    "C013244", "C007258", "C042973", "C015087", "C041579", "C017403", "C041710", "C040156", "C038811",
                    "C041890", "C038830", "C041576", "C038311", "C040950", "C042977", "C038795", "C040069", "C034576",
                    "C015632", "C045465", "C039315", "C011792", "C032591", "C043260", "C038308", "C038685", "C040653",
                    "C041535", "C043431", "C036350", "C041483", "C037608", "C042497", "C019863", "C042746", "C012260",
                    "C020177", "C000027", "C039250", "C043029", "C001949", "C038414", "C045373", "C017728", "C040323",
                    "C041758", "C042950", "C013771", "C038853", "C038927", "C041977", "C032030", "C001777", "C041852",
                    "C038290", "C042708", "C001005", "C038454"
                ];
                const filter = { field: 'A."CreateDate"', operator: "<", value: "'2024-05-01'"}
                clients = await this.sapServices.getClientsWithNoOrders(filter);
                clients = clients.filter((client) => !filteredClients.includes(client.CardCode))
            } else if (type == "ReactivationClients") {
                const clientsSelected = [
                    "C045006",
                    "C040108",
                    "C039083",
                    "C038683",
                    "C017435",
                    "C035734",
                    "C040871",
                    "C005305",
                    "C032355",
                    "C017431",
                    "C035890",
                    "C045160",
                    "C020222",
                    "C002489",
                    "C037955",
                    "C042335",
                    "C024284",
                    "C016666",
                    "C014871",
                    "C032751",
                    "C008144",
                    "C031299",
                    "C038120",
                    "C021386",
                    "C001258",
                    "C006540",
                    "C042933",
                    "L07000140",
                    "C000176",
                    "C002436",
                    "C027955",
                    "C034649",
                    "C018096",
                    "C021664",
                    "L06000058",
                    "C033722",
                    "C021072",
                    "C044603",
                    "C037445",
                    "C033429",
                    "C025502",
                    "C026020",
                    "C033004",
                    "C044364",
                    "C035611",
                    "L07000644",
                    "C043225",
                    "C034260",
                    "C020905",
                    "C028291",
                    "C034146",
                    "C029855",
                    "C035891",
                    "C031908",
                    "C032644",
                    "C029341",
                    "C041487",
                    "C019599",
                    "C007034",
                    "C031220",
                    "C041152",
                    "C012610",
                    "C037852",
                    "C007573",
                    "C041089",
                    "C029596",
                    "C036281",
                    "C009207",
                    "C013521",
                    "C007821",
                    "L07003825",
                    "L07003128",
                    "C036127",
                    "L07003900",
                    "C010736",
                    "C039451",
                    "C005633",
                    "C025006",
                    "C006947",
                    "C037738",
                    "C037438",
                    "C037218",
                    "C008301",
                    "C017972",
                    "C018550",
                    "C043846",
                    "C022246",
                    "C027674"
                ];
                clients = await this.sapServices.getDeactivationDataFromClients(clientsSelected);
            } 
            else {
                clients = []
            }
    
            return clients    
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, `Erro ao pegar clientes do tipo ${type}: ` + err.message);
        }
    }

    public async DeactivateClients(clients: interfaces.DeactivationClientsData[], type: string) {
        try {
            const deactivatedClients: interfaces.CardCode[] = [];
            const errorClients: interfaces.CardCode[] = [];

            const BATCH_SIZE = 200;
            const maxIterations = Math.ceil(clients.length / BATCH_SIZE);
            for (let iteration = 0; iteration < maxIterations; iteration++) {
                console.log(`Starting iteration ${iteration}, of ${BATCH_SIZE} clients - total iterations: ${maxIterations}`);

                const firstPosition = iteration * BATCH_SIZE;
                console.log(`Vai pegar os clientes do index ${firstPosition} ao ${firstPosition + BATCH_SIZE}`);

                const batch = clients.slice(firstPosition, firstPosition + BATCH_SIZE) as interfaces.DeactivationClientsData[];

                await Promise.all(batch.map( async (vendor: interfaces.DeactivationClientsData) => { await this.DeactivateProcess(vendor, deactivatedClients, errorClients, type) }) );
            }

            console.log(deactivatedClients)
            console.log(errorClients)

            const response = helperFunctions.handleMultipleProcessesResult(errorClients, deactivatedClients);
            return response;
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao Desativar vendedores: " + err.message)
        }
    }

    public async ActivateClients(clients: interfaces.DeactivationClientsData[], type: string) {
        try {
            const deactivatedClients: interfaces.CardCode[] = [];
            const errorClients: interfaces.CardCode[] = [];




            const BATCH_SIZE = 200;
            const maxIterations = Math.ceil(clients.length / BATCH_SIZE);
            for (let iteration = 0; iteration < maxIterations; iteration++) {
                console.log(`Starting iteration ${iteration}, of ${BATCH_SIZE} clients - total iterations: ${maxIterations}`);

                const firstPosition = iteration * BATCH_SIZE;
                console.log(`Vai pegar os clientes do index ${firstPosition} ao ${firstPosition + BATCH_SIZE}`);

                const batch = clients.slice(firstPosition, firstPosition + BATCH_SIZE) as interfaces.DeactivationClientsData[];

                await Promise.all(batch.map( async (vendor: interfaces.DeactivationClientsData) => { await this.ActivateProcess(vendor, deactivatedClients, errorClients, type) }) );
            }

            console.log(deactivatedClients)
            console.log(errorClients)

            const response = helperFunctions.handleMultipleProcessesResult(errorClients, deactivatedClients);
            return response;
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao Desativar vendedores: " + err.message)
        }
    }

    private async ActivateProcess(vendor: interfaces.DeactivationClientsData, processedVendors: interfaces.CardCode[] , errorClients: interfaces.CardCode[], type: string) {
        try {
            await this.ActivateClient(vendor.CardCode);
            
        
            console.log(`Activated client ${vendor.CardCode} successfully`)
            processedVendors.push(vendor)
        } catch(err: any) {
            console.log("Error when activating")
            errorClients.push(vendor)
        }
    }

    private async DeactivateProcess(vendor: interfaces.DeactivationClientsData, processedVendors: interfaces.CardCode[] , errorClients: interfaces.CardCode[], type: string) {
        try {
            await this.updateObservationWithReason(vendor.Free_Text, vendor.CardCode, type);
            await this.DeactivateClient(vendor.CardCode);
            
        
            console.log(`deactivated client ${vendor.CardCode} successfully`)
            processedVendors.push(vendor)
        } catch(err: any) {
            console.log("Error when deactivating")
            errorClients.push(vendor)
        }
    }

    private async updateObservationWithReason(oldObs: string, CardCode: string, type: string) {
        try {
            const todayDate = new Date().toLocaleString('pt-BR');
            let motivo = "Não especificado";
            let newObs = "";
            if (type == "BrunoProcess") {
                motivo = "Cliente foi criado antes do dia 01/05/2024 e nunca comprou com a copapel."
            }
    
            newObs = oldObs + ` - Cliente desativado dia ${todayDate} via integração, Motivo: ` + motivo;
    
            const data = { "FreeText": newObs }
    
            await this.sapServices.updateClient(data, CardCode);    
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao atualizar as Observações: " + err.message);
        }
    }

    private async DeactivateClient(CardCode: string) {
        try {
            await this.sapServices.deactivateClient(CardCode)
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao desativar cliente: " + err.message);
        }
    }
    private async ActivateClient(CardCode: string) {
        try {
            await this.sapServices.activateClient(CardCode)
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao ativar cliente: " + err.message);
        }
    }
}
