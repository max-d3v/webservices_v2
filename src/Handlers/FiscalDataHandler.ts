import { FiscalDataController } from "../Controllers/FiscalDataController";

export class FiscalDataHandler {
    private static instance: FiscalDataHandler;
    private FiscalDataController: FiscalDataController;


    constructor() {
        this.FiscalDataController = FiscalDataController.getInstance();
    }

    public static getInstance(): FiscalDataHandler {
        if (!FiscalDataHandler.instance) {
            FiscalDataHandler.instance = new FiscalDataHandler();
        }
        return FiscalDataHandler.instance;
    }   

    public async getCompanyByTaxId(taxid: string) {
        return this.FiscalDataController.getCompanyByTaxId(taxid);
    }

    

}