import { SapServices } from "../services/SapServices";
import { DatabaseServices } from "../services/DatabaseServices";
import { ActivitiesController } from "../Controllers/SapControllers/ActivitiesController";
import { BusinessPartnersController } from "../Controllers/SapControllers/BusinessPartnersController";


export class SapHandler {
    private static instance: SapHandler;
    private sapServices: SapServices;
    private dataBaseServices: DatabaseServices;

    private ActivitiesController: ActivitiesController;
    private BusinessPartnersController: BusinessPartnersController;

    constructor() {
        this.sapServices = SapServices.getInstance();
        this.dataBaseServices = DatabaseServices.getInstance();

        this.ActivitiesController = ActivitiesController.getInstance();
        this.BusinessPartnersController = BusinessPartnersController.getInstance();
    }

    public static getInstance(): SapHandler {
        if (!SapHandler.instance) {
            SapHandler.instance = new SapHandler();
        }
        return SapHandler.instance;
    }

    public async maintainServicesLogin(): Promise<void> {
        await this.sapServices.maintainSLLogin();
    }

    //Business partners

    public async AtualizaCadastroFornecedores(isoString: string): Promise<any> {
        return this.BusinessPartnersController.AtualizaCadastroFornecedores(isoString);
    }

    public async updateClientsRegistrationData(entityType: string, CardCode?: string): Promise<any> {
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

    //Activities

    public async deactiveAllTicketsFromVendor(userId: string): Promise<any> {
        return this.ActivitiesController.deactiveAllTicketsFromVendor(userId);
    }

    public async changeTicketsOwnerShip(originUserId: string, destinyUserId: string): Promise<any> {
        return this.ActivitiesController.changeTicketsOwnerShip(originUserId, destinyUserId);
    }

    

    
    
        
}
