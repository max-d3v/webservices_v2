import { SapServices } from "../services/SapServices";
import { DatabaseServices } from "../services/DatabaseServices";
import { ActivitiesController } from "../Controllers/SapControllers/ActivitiesController";
import { BusinessPartnersController } from "../Controllers/SapControllers/BusinessPartnersController";
import { OpportunitiesController } from "../Controllers/SapControllers/OpportunitiesController";
import { QuotationsController } from "../Controllers/SapControllers/QuotationsController";
import { HttpError } from "../Server";
import * as helperFunctions from '../utils/helperFunctions';
import { create } from "domain";
export class SapHandler {
    private static instance: SapHandler;
    private sapServices: SapServices;
    private dataBaseServices: DatabaseServices;

    private ActivitiesController: ActivitiesController;
    private BusinessPartnersController: BusinessPartnersController;
    private OpportunitiesController: OpportunitiesController;
    private QuotationsController: QuotationsController;

    private loginMaintainer: NodeJS.Timeout | null;

    constructor() {
        this.sapServices = SapServices.getInstance();
        this.dataBaseServices = DatabaseServices.getInstance();

        this.ActivitiesController = ActivitiesController.getInstance();
        this.BusinessPartnersController = BusinessPartnersController.getInstance();
        this.OpportunitiesController = OpportunitiesController.getInstance();
        this.QuotationsController = QuotationsController.getInstance();

        this.loginMaintainer = null;
    }

    public static getInstance(): SapHandler {
        if (!SapHandler.instance) {
            SapHandler.instance = new SapHandler();
        }
        return SapHandler.instance;
    }

    public async maintainServicesLogin(): Promise<void> {
       this.loginMaintainer = await this.sapServices.maintainSLLogin();
    }

    public async stopServiceLayerLoginMaintainer() {
        if (this.loginMaintainer) {
            clearInterval(this.loginMaintainer);
            this.loginMaintainer = null;
        }
    } 

    //Business partners

    public async AtualizaCadastroFornecedores(type: string | null | undefined): Promise<any> {
        if (!type) {
            throw new HttpError(400, "No valid type was given");
        }
        return this.BusinessPartnersController.AtualizaCadastroFornecedores(type);
    }

    public async updateClientsRegistrationData(entityType: string | null | undefined | number, CardCode?: string | null | undefined | number): Promise<any> {
        if (typeof entityType !== "string") {
            throw new HttpError(400, "Invalid type given");
        }
        if (CardCode !== undefined && CardCode !== null && typeof CardCode !== "string") {
            throw new HttpError(400, "Invalid CardCode given");
        }
        return this.BusinessPartnersController.updateClientsRegistrationData(entityType, CardCode);
    }
    public async getAllClientsCnpjClear(): Promise<string> {
        return this.BusinessPartnersController.getAllClientsCnpjClear();
    }

    public async getAllFornecedoresCnpjClear(): Promise<string> {
        return this.BusinessPartnersController.getAllFornecedoresCnpjClear();
    }

    public async getMysqlSapClients(): Promise<any> {
        return this.BusinessPartnersController.getMysqlSapClients();
    }

    public async DeactivateVendors(type: string | null | undefined | number): Promise<any> {
        if (typeof type !== "string") {
            throw new HttpError(400, "Invalid type given")
        }
        return this.BusinessPartnersController.DeactivateChosenClients(type);
    }

    //Activities
    public async deactiveTickets(type: string | null | undefined, userId: string | null | undefined = null): Promise<any> {
        if (typeof type !== "string" || type == "") {
            throw new HttpError(400, "Invalid Type given")
        }

        if (type == "Vendor" && (typeof userId !== "string" || userId == "")) {
            throw new HttpError(400, "Invalid id given")
        }
        return this.ActivitiesController.deactiveTickets(type, userId);
    }

    public async changeTicketsOwnerShip(originUserId: string | null | undefined | number, destinyUserId: string | null | undefined| number): Promise<any> {
        if (typeof originUserId !== "string" || typeof destinyUserId !== "string") {
            throw new HttpError(400, "Invalid Ids given")
        }
        return this.ActivitiesController.changeTicketsOwnerShip(originUserId, destinyUserId);
    }

    //Opportunities

    public async changeOpportunitiesOwnerShip(originUserId: number | undefined | string | null, destinyUserId: number | undefined | string | null): Promise<any> {
        if (typeof originUserId !== "number" || typeof destinyUserId !== "number") {
            throw new HttpError(400, "Invalid Ids given")
        }
        return this.OpportunitiesController.ChangeOpportunitiesOwnerShip(originUserId, destinyUserId);
    }


    //Quotations

    public async CreateQuotationsAndFollowUpTicketsForOldEcommerceCarts() {
        const totalProcessedObjects: any[] = [];
        const totalErrors: any[] = [];

        const [createdQuotations, errorQuotations] = await this.QuotationsController.CreateQuotationsForOldEcommerceCarts();
        totalProcessedObjects.push(createdQuotations);
        totalErrors.push(errorQuotations);

        console.log("Processados: ", totalProcessedObjects);
        
        const requiredFieldQuotations = createdQuotations.map(({ DocType, DocNum }) => ({ DocType, DocNum }));

        //const requiredFieldQuotationsMock = [
        //    { DocType: 'Cotação', DocNum: 154294 },
        //    { DocType: 'Cotação', DocNum: 154295 }
        //]

        const [ successes, errors ] = await this.ActivitiesController.createFollowUpActivities(requiredFieldQuotations)
        totalProcessedObjects.push(successes);
        totalErrors.push(errors);

        return helperFunctions.handleMultipleProcessesResult(totalErrors, totalProcessedObjects);
    }

}
