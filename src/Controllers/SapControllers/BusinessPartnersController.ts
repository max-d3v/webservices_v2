import { SapServices } from "../../services/SapServices";
import { HttpError, HttpErrorWithDetails } from "../../utils/errorHandler";
import * as helperFunctions from "../../utils/helperFunctions";
import * as interfaces from "../../types/interfaces";
import { DatabaseServices } from "../../services/DatabaseServices";
import { LocalFiscalDataClass } from "../../models/LocalFiscalDataClass";
import { LocalFiscalDataServices } from "../../services/LocalFiscalDataServices";
import { ApiFiscalDataClass } from "../../models/ApiFiscalDataClass";
//Updating sap controller file name

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
            JsonInMemory.loadFile('./src/models/data/cnpj_data_clientes_full.json');

            if (tipo == "Client" && !CardCode) {
                throw new HttpError(400, "No CardCode was given!");
            }

            clients = await this.getFiscalClientData(tipo, CardCode, JsonInMemory);

            console.log(`Começando processo de clientes de tipo ${tipo} com ${clients.length}`);

            if (clients.length === 0) {
                throw new HttpError(404, "Nenhum cliente encontrado para processamento!");
            }

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

            console.log("Chegou aqui")
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
            const cardName = client.CardName;
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
        
        console.log("Chegou antes de pegar os cliente");

        clients = await this.sapServices.getAllActiveClientsRegistrationData(filter, exceptions, getInactiveClients);
        return clients;
    }

    private async getSelectedClients() {
        const clients = this.dataBaseServices


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
            let foundRegistrations = registrations?.filter((registration) => registration?.state === estado && registration?.type?.id === 1 || registration?.type?.id === 4);
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


    public async AtualizaCadastroFornecedores(type: string): Promise<any> {
        try {
            let isoString = '1890-01-01';
            if (type == "Today") {
                isoString = new Date().toISOString().split('T')[0];
            }
            const isIsoString = helperFunctions.isIsoString(isoString);
            if (!isIsoString) {
                throw new HttpError(400, 'Data inválida (deve ser uma data no formato ISO ("yyyy-mm-dd"))');
            }
            const fornecedores = await this.sapServices.getFornecedoresLeads(isoString);

            if (fornecedores.length == 0) {
                throw new HttpError(404, 'Nenhum fornecedor encontrado');
            }

            console.log(`Staerting process with ${fornecedores.length} fornecedores`)

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
                            let fornecedorData: interfaces.CnpjJaData | null | undefined = null;
                            if (type == "Today") {
                                fornecedorData = await this.ApiFiscalDataClass.searchCnpj(cleanedCnpj);
                            } else {
                                fornecedorData = this.LocalFiscalDataServices.getObjectByValue("taxId", cleanedCnpj, JsonInMemory)
                            }


                            if (!fornecedorData) {
                                throw new HttpError(404, `CNPJ não encontrado no cache`);
                            }

                            const isMEI = fornecedorData.company.simei.optant;
                            const registrations = fornecedorData.registrations;
                            
                            let foundRegistrations = registrations?.filter((registration) => registration?.state === estado && registration?.type?.id === 1 || registration?.type?.id === 4);
                            let stateRegistration: null | interfaces.Registration = null;
                            if (foundRegistrations.length == 1) {
                                stateRegistration = foundRegistrations[0]
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

    public async DeactivateChosenVendors(type: string) {
        const vendors = [
            { CardCode: "C032644" },
            { CardCode: "C022627" },
            { CardCode: "C029304" },
            { CardCode: "C021749" },
            { CardCode: "C022985" },
            { CardCode: "C029467" },
            { CardCode: "C029374" },
            { CardCode: "C022798" },
            { CardCode: "C029016" },
            { CardCode: "C029014" },
            { CardCode: "C025843" },
            { CardCode: "C024531" },
            { CardCode: "C022630" },
            { CardCode: "C023946" },
            { CardCode: "C024809" },
            { CardCode: "C024659" },
            { CardCode: "C024327" },
            { CardCode: "C039235" },
            { CardCode: "C023886" },
            { CardCode: "C022818" },
            { CardCode: "C023706" },
            { CardCode: "C024225" },
            { CardCode: "C022715" },
            { CardCode: "C024049" },
            { CardCode: "C025536" },
            { CardCode: "C045662" },
            { CardCode: "C023462" },
            { CardCode: "C024930" },
            { CardCode: "C023906" },
            { CardCode: "C025546" }
        ];

        return await this.DeactivateVendors(vendors)

    }

    public async DeactivateVendors(vendors: interfaces.Vendor[]) {
        try {
            const deactivatedVendors: interfaces.Vendor[] = [];
            const errorVendors: interfaces.Vendor[] = [];
            await Promise.all(vendors.map( async (vendor: interfaces.Vendor) => { await this.DeactivateVendor(vendor, deactivatedVendors, errorVendors) }) );


            console.log(deactivatedVendors)
            console.log(errorVendors)

            const response = helperFunctions.handleMultipleProcessesResult(errorVendors, deactivatedVendors);
            return response;
        } catch(err: any) {
            if (err instanceof HttpErrorWithDetails) {
                throw err;
            }
            throw new HttpError(err.statusCode ?? 500, "Erro ao Desativar vendedores: " + err.message)
        }
    }

    private async DeactivateVendor(vendor: interfaces.Vendor, processedVendors: interfaces.Vendor[] , errorVendors: interfaces.Vendor[]) {
        try {
            await this.sapServices.deactivateVendor(vendor.CardCode)
            console.log("deactivated successfully")
            processedVendors.push(vendor)
        } catch(err: any) {
            console.log("Error when deactivating")
            errorVendors.push(vendor)
        }
    }
}
