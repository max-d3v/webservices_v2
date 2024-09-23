import SL from "../models/slClass";
import { CnpjJa } from "../models/cnpjClass";
import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import * as helperFunctions from "../utils/helperFunctions";
import * as interfaces from "../types/interfaces";
import { DatabaseServices } from "./database-services";

export class SapServices {
    private static instance: SapServices;
    private sl: SL;
    private cnpjJa: CnpjJa;
    private dataBaseServices: DatabaseServices;

    public constructor() {
        this.sl = new SL();
        this.cnpjJa = new CnpjJa();
        this.dataBaseServices = DatabaseServices.getInstance();
        this.maintainSLLogin();
    }

    public static getInstance(): SapServices {
        if (!SapServices.instance) {
            SapServices.instance = new SapServices();
        }
        return SapServices.instance;
    }

    public async maintainSLLogin() {
        try {
            console.log("Loggin in to SAP SL in mode: ", process.env.NODE_ENV);
            await this.sl.login();
            setInterval(() => {
                console.log('Maintining SAP login, current time: ', new Date().toLocaleTimeString());
                this.sl.login();
            }, 20 * 60 * 1000);
        } catch (error) {
            console.error(error);
            throw new HttpError(500, 'Error with SAP login');
        }
    }


    //Cadastro de fornecedores
    public async getFornecedoresLeads(isoString: string): Promise<interfaces.Fornecedor[]> {
        try {
            const query = `SELECT DISTINCT A."CardCode", A."CardName", A."CardType", B."TaxId0", A."State1", B."TaxId4" 
            FROM "SBO_COPAPEL_TST".OCRD A 
            INNER JOIN "SBO_COPAPEL_TST".CRD7 B ON A."CardCode" = B."CardCode" 
            WHERE "CardType" = 'S' 
            AND "CreateDate" >= '${isoString}'  
            AND (B."TaxId0" <> '' OR B."TaxId4" <> '') 
            ORDER BY "CardCode"`;

            console.log("Query: ", query);

            const fornecedores = await this.sl.querySAP(query);

            return fornecedores.data;
        } catch (err: any) {                                                    
            throw new HttpError(500, 'Erro ao buscar fornecedores cadastrados no SAP: ' + err.message);
        }
    }



    public async getFornecedorByCnpj(cnpj: string): Promise<interfaces.FornecedorData> {
        try {
            const response = await this.cnpjJa.searchCnpj(cnpj);
            return response;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar fornecedor pela api CNPJ: ' + err.message);
        }
    }

    public async updateFornecedor(fieldsToUpdateObject: interfaces.DadosPessoaJuridica | interfaces.DadosPessoaFisica | interfaces.DadosMicroempresa | any, CardCode: string) {
        try {
            await this.dataBaseServices.logFornecedorCadastrado({ CardCode: CardCode, Status: "Pendente" });
        } catch(err: any) {
            throw new HttpError(500, 'Erro ao logar fornecedor cadastrado: ' + err.message);
        }
        
        try {
            const data = fieldsToUpdateObject;
            const update = await this.sl.patch("BusinessPartners", CardCode, data);
            this.dataBaseServices.atualizaFornecedorCadastrado({ CardCode: CardCode, Status: "Atualizado" });
            console.log("Updated fornecedor: ", CardCode, "with data: ", data);
        } catch (err: any) {    
            this.dataBaseServices.atualizaFornecedorCadastrado({ CardCode: CardCode, Status: "Erro ao atualizar" });
            throw new HttpError(500, 'Erro ao atualizar fornecedor no SAP: ' + err.message);
        }
    }

    

    public async getFornecedorAdresses(CardCode: string) {
        try {
            const query = `SELECT "Address" FROM "SBO_COPAPEL_PRD".CRD7 WHERE "CardCode" = '${CardCode}' AND "AddrType" = 'S'`;
            const fornecedorAdresses = await this.sl.querySAP(query);
            return fornecedorAdresses.data;
        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar endereços do fornecedor: ' + err.message);
        }
    }



}
