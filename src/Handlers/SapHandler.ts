import { SapServices } from "../services/SapServices";
import { DatabaseServices } from "../services/DatabaseServices";
import { ActivitiesController } from "../Controllers/SapControllers/ActivitiesController";
import { BusinessPartnersController } from "../Controllers/SapControllers/BusinessPartnersController";
import { OpportunitiesController } from "../Controllers/SapControllers/OpportunitiesController";
import { HttpError } from "../Server";
export class SapHandler {
    private static instance: SapHandler;
    private sapServices: SapServices;
    private dataBaseServices: DatabaseServices;

    private ActivitiesController: ActivitiesController;
    private BusinessPartnersController: BusinessPartnersController;
    private OpportunitiesController: OpportunitiesController;


    private loginMaintainer: NodeJS.Timeout | null;

    constructor() {
        this.sapServices = SapServices.getInstance();
        this.dataBaseServices = DatabaseServices.getInstance();

        this.ActivitiesController = ActivitiesController.getInstance();
        this.BusinessPartnersController = BusinessPartnersController.getInstance();
        this.OpportunitiesController = OpportunitiesController.getInstance();

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

    public async AtualizaCadastroFornecedores(type: string): Promise<any> {
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
        return this.BusinessPartnersController.DeactivateChosenVendors(type);
    }

    //Activities
    public async deactiveAllTicketsFromVendor(userId: string | null | undefined | number): Promise<any> {
        if (typeof userId !== "string") {
            throw new HttpError(400, "Invalid id given")
        }
        return this.ActivitiesController.deactiveAllTicketsFromVendor(userId);
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

}
