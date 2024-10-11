import { LocalFiscalDataClass } from "../models/LocalFiscalDataClass";
import { ApiFiscalDataClass } from "../models/ApiFiscalDataClass";
import { HttpError } from "../utils/errorHandler";
import * as helperFunctions from "../utils/helperFunctions";

export class FiscalDataController {
    private static instance: FiscalDataController;
    private LocalFiscalDataClass: LocalFiscalDataClass;
    private ApiFiscalDataClass: ApiFiscalDataClass;

    constructor() {
        this.LocalFiscalDataClass = LocalFiscalDataClass.getInstance();
        this.ApiFiscalDataClass = ApiFiscalDataClass.getInstance();
    }

    public static getInstance(): FiscalDataController {
        if (!FiscalDataController.instance) {
            FiscalDataController.instance = new FiscalDataController();
        }
        return FiscalDataController.instance;
    }
    
    public async getCompanyByTaxId(taxid: string) {
        try {
            if (!taxid || !helperFunctions.validCNPJ(taxid)) {
                throw new HttpError(400, 'CNPJ inválido');
            }
            this.LocalFiscalDataClass.loadFile('./src/models/data/cnpj_data_clientes_full.json');
            const company = this.LocalFiscalDataClass.getObjectByValue('taxId', taxid);
    
            this.LocalFiscalDataClass.quit();

            if (!company) {
                throw new HttpError(404, 'Empresa não encontrada');
            }
            
            return company;
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao buscar empresa por CNPJ: ' + err.message);
        }
    }

    public async getCompanyByTaxIdApi(taxId: string) {
        return this.ApiFiscalDataClass.searchCnpj(taxId);
    }


}