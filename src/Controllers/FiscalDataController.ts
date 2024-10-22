import { LocalFiscalDataClass } from "../models/LocalFiscalDataClass";
import { ApiFiscalDataClass } from "../models/ApiFiscalDataClass";
import { HttpError } from "../utils/errorHandler";
import { LocalFiscalDataServices } from "../services/LocalFiscalDataServices";
import * as helperFunctions from "../utils/helperFunctions";

export class FiscalDataController {
    private static instance: FiscalDataController;
    private LocalFiscalDataClass: LocalFiscalDataClass;
    private LocalFiscalDataServices: LocalFiscalDataServices;
    private ApiFiscalDataClass: ApiFiscalDataClass;

    constructor() {
        this.LocalFiscalDataServices = LocalFiscalDataServices.getInstance();
        this.LocalFiscalDataClass = LocalFiscalDataClass.getInstance();
        this.ApiFiscalDataClass = ApiFiscalDataClass.getInstance();
        this.LocalFiscalDataClass.loadFile('./src/models/data/cnpj_data_clientes_full.json');
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
            const company = this.LocalFiscalDataServices.getObjectByValue('taxId', taxid, this.LocalFiscalDataClass);
    
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