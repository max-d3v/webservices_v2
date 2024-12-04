import { SapServices } from "../../services/SapServices";
import { DatabaseServices } from "../../services/DatabaseServices";
import { CrmOne } from "../../models/CrmOneClass";
import * as helperFunctions from '../../utils/helperFunctions';
import { HttpError } from "../../Server";
import * as interfaces from '../../types/interfaces'
import { ActivitiesController } from "./ActivitiesController";
import axios from "axios";
export class QuotationsController {
    public static instance: QuotationsController;

    private SapServices: SapServices;
    private DataBaseServices: DatabaseServices;
    private CrmOne: CrmOne;
    private ActivitesController: ActivitiesController;


    constructor() {
        this.CrmOne = CrmOne.getInstance();
        this.SapServices = SapServices.getInstance();
        this.DataBaseServices = DatabaseServices.getInstance();
        this.ActivitesController = ActivitiesController.getInstance();
    }

    public static getInstance(): QuotationsController {
        if (!QuotationsController.instance) {
            QuotationsController.instance = new QuotationsController();
        }
        return QuotationsController.instance;
    }

    public async TransformApprovedQuotationsIntoOrders() {
        const processedQuotations = [];
        const errorQuotations = [];

        const quotations = await this.DataBaseServices.getFilaQuotations();

        

        if (quotations.length === 0) {
            throw new HttpError(404, "Nenhuma cotação pendente!");
        }

        for (const quotation of quotations) {
            try {
                const { DocEntry, id } = quotation;
                if (!DocEntry || DocEntry === "") {
                    throw new HttpError(500, "No DocEntry was given in quotation data.");
                }
                const response = await this.TransformQuotationIntoOrder(DocEntry);
                const { pedido, esboco, motivo_autorizacao } = response;
                let tipo = 'desconhecido'
                if (pedido) {
                    tipo = "pedido";
                    const { DocNum } = pedido;
                    const data = {
                        Status: "Sucesso",
                        Info: `Pedido número ${DocNum} gerado`
                    }
                    await this.DataBaseServices.atualizaFilaCotacoes(id, data);
                } else if (esboco) {
                    tipo = "esboço";
                    const { NumeroEsboco } = esboco;
                    const data = {
                        Status: "Sucesso",
                        Info: `Esboco número ${NumeroEsboco} gerado, motivo: ${motivo_autorizacao}`
                    }
                    await this.DataBaseServices.atualizaFilaCotacoes(id, data);
                }
                processedQuotations.push({ DocEntry, tipo });
            } catch (err: any) {
                this.DataBaseServices.atualizaFilaCotacoes(quotation.id, { Status: "Erro", Info: err.message });
                errorQuotations.push({ DocEntry: quotation.DocEntry, error: err.message });
            }
        }

        const retorno = helperFunctions.handleMultipleProcessesResult(errorQuotations, processedQuotations);
        return retorno;
    }

    public async TransformQuotationIntoOrder(DocEntry: string) {
        const baseUrl = `https://lark-handy-horse.ngrok-free.app`;  
        const url = `${baseUrl}/api/sap/transformarEmPedido/${DocEntry}`;
        console.log(url);
        try {
            const response = await axios.post(url, null, {
                headers: {
                  "ngrok-skip-browser-warning": true
                }
            });

            const { pedido, esboco, motivo_autorizacao } = response.data;

            if (pedido) {
                return pedido;
            } else if (esboco) {
                return {esboco, motivo_autorizacao};
            } else {
                throw new HttpError(500, "No order or draft data was given in API response")
            }
        } catch(err: any) {
            const { error, details } = err.response.data;
            if (error) {
                throw new HttpError(500, `${error} ${details}`);
            }
            throw new HttpError(500, "Erro inesperado ao transformar cotação em pedido: " + err.message);
        }
    }
//
    public async CreateQuotationsForOldEcommerceCarts(): Promise<[Array<interfaces.QuotationData | interfaces.DraftData>, any[]]> {
        const processedCarts: Array<interfaces.QuotationData | interfaces.DraftData>  = [];
        const errorCarts: any = [];

        //Maybe move the cart age to the query params.
        const cartAge = 7;

        const carts = await this.getOldCarts(cartAge)
        const cartEntries = Array.from(carts.entries());

        console.log(`Starting quotations creation process with: ${carts.size} quotations.`)

        
        const BATCH_SIZE = 200;
        const maxIterations = Math.ceil(carts.size / BATCH_SIZE);
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            console.log(`Starting iteration ${iteration} of ${maxIterations}`)
            const firstPosition = iteration * BATCH_SIZE;
            const batch = cartEntries.slice(firstPosition, firstPosition + BATCH_SIZE);

            await Promise.all(Array.from(batch).map(async ([key, cart]) =>{await this.processCart(key, cart, processedCarts, errorCarts)}));
        }

        this.logCartsThatHadQuotationCreated(processedCarts);

        return [processedCarts, errorCarts]
    }

    private async logCartsThatHadQuotationCreated(processedCarts: Array<interfaces.QuotationData | interfaces.DraftData>) {
        const CardCodes = processedCarts.map((cart) => cart.CardCode);
        await this.DataBaseServices.logCartsWithQuotationsCreateds(CardCodes)
        console.log(`Finished logging carts that had quotation created`)
    }

    private async getOldCarts(daysOfAge: number) {
        try {
            const carts = this.DataBaseServices.getOldCarts(daysOfAge);
            return carts;
        } catch (err: any) {
            throw new HttpError(err.statusCode ?? 500, "Error when getting old carts for getting old carts: " + err.message);
        }
    }
    
    private async processCart(CardCode: string, cart: interfaces.Cart, successCarts: Array<interfaces.QuotationData | interfaces.DraftData>, errorCarts: any[]) {
        try {
            const response = await this.createQuotation(CardCode, cart);
            const dados = response.Retorno.Dados;
            if (!dados) {
                throw new HttpError(500, "No data was given in quotation creation.");
            }
            const { CardName, DocEntry, DocTotal, DocNum } = dados;
            
            if (!DocNum) {
                const DraftData = dados.DadosRetornoEsboco;
                console.log(`Draft was created for client ${CardCode}: `, DraftData);
                if (!DraftData || helperFunctions.objetoVazio(DraftData)) {
                    throw new HttpError(500, "No order or draft data was given in API response")
                }
                const { NumeroEsboco, NomeAutorizacao } = DraftData;
                successCarts.push({ DocNum: NumeroEsboco, MotivoAutorizacao: NomeAutorizacao, CardCode, DocType: "Cotação (esboço)" });
            } else if (DocNum) {
                successCarts.push({ CardCode, CardName, DocEntry, DocTotal, DocNum, DocType: "Cotação" });
            }
        } catch (err: any) {
            errorCarts.push({ CardCode, error: err.message });
        }
    }

    private async createQuotation(CardCode: string, cart: interfaces.Cart) {
        try {
            const { BPLId, SlpCode, State, empID } = await this.SapServices.getOrderClientData(CardCode);

            const ref = helperFunctions.generateReferenceNum(CardCode);
            const date = new Date()
            const DocDate = date.toLocaleDateString('pt-BR');
            const TaxDate = date.toLocaleDateString('pt-BR');
            const DocDueDate = helperFunctions.addWorkDays(date, 2).toLocaleDateString('pt-BR');
            const Comments = 'Cotação gerada a partir do carrinho parado desse cliente no meus pedidos!';
            const IncoTerms = 0;
            const TrnspCode = 3;
            const OrigemPedido = 4; //meuspedidos

            const orderTotal = this.getOrderTotal(cart);
            const frete = orderTotal >= 220 ? 0 : 30;
            const DespesasAdicionais = [
                {
                    "ExpenseCode": 1,
                    "LineTotal": frete,
                    "LineTotalFC": frete,
                    "LineTotalSys": frete,
                    "LineGross": frete,
                    "LineGrossSys": frete
                }
            ];

            const LinhasDocumento = this.getLinhasDocumentoFromCart(cart, BPLId);

            const quotationData = {
                "BplId": BPLId,
                "U_NossoNumero": ref,
                "CardCode": CardCode,
                "DocDate": DocDate,
                "OwnerCode": empID,
                "DocDueDate": DocDueDate,
                "TaxDate": TaxDate,
                "Comments": Comments,
                "SlpCode": SlpCode,
                "IncoTerms": IncoTerms,
                "TrnspCode": TrnspCode,
                "DespesasAdicionais": DespesasAdicionais,
                "LinhasDocumento": LinhasDocumento
            }



            const userData = [
                {
                    'IDCampo': "U_DWU_Origem",
                    'ValorCampo': "W",
                    'LocalCampo': 0
                },
                {
                    'IDCampo': "U_RSD_UF_FILIAL",
                    'ValorCampo': State,
                    'LocalCampo': 0
                },
                {
                    'IDCampo': "U_Origem_Ped",
                    'ValorCampo': `${OrigemPedido}`,
                    'LocalCampo': 0
                },
                //{
                //    'IDCampo': "U_IP",
                //    'ValorCampo': clientIp,
                //    'LocalCampo': 0
                //},
                {
                    'IDCampo': "U_NossoNumero",
                    'ValorCampo': ref,
                    'LocalCampo': 0
                }
            ];

            const result = await this.CrmOne.adicionaCotacao(quotationData, userData);

        return result;
    } catch(err: any) {
        throw new HttpError(err.statusCode ?? 500, "Erro ao criar cotacao: " + err.message);
    }
}

    private getOrderTotal(cart: interfaces.Cart) {
    let total = 0;
    for (const item of cart.Items) {
        total += item.subtotal
    }
    return total;
}

    private getLinhasDocumentoFromCart(cart: interfaces.Cart, BPLId: number) {
    const LinhasDocumento: interfaces.LinhaDocumento[] = [];
    for (const item of cart.Items) {
        const linhaDocumento: interfaces.LinhaDocumento = {
            ItemCode: item.id_produto,
            Quantity: item.qtd,
            PriceBefDi: item.preco_normal,
            WhsCode: BPLId * 100,
            Usage: 8
        }

        LinhasDocumento.push(linhaDocumento)
    }

    return LinhasDocumento
}

}
