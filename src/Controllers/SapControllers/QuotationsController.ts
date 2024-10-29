import { SapServices } from "../../services/SapServices";
import { DatabaseServices } from "../../services/DatabaseServices";
import { CrmOne } from "../../models/CrmOneClass";
import * as helperFunctions from '../../utils/helperFunctions';
import { HttpError } from "../../Server";
import * as interfaces from '../../types/interfaces'
import { ActivitiesController } from "./ActivitiesController";

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
//
    public async CreateQuotationsForOldEcommerceCarts(): Promise<interfaces.QuotationData[]> {
        const processedCarts: interfaces.QuotationData[] = [];
        const errorCarts: any = [];

        //Maybe move the cart age to the query params.
        const cartAge = 30;

        const carts = await this.getOldCarts(cartAge)

        console.log(`Will create ${carts.size} quotations.`)

        await Promise.all(Array.from(carts.entries()).map(async ([key, cart]) =>{await this.processCart(key, cart, processedCarts, errorCarts)}));

        return processedCarts 
    }

    private async getOldCarts(daysOfAge: number) {
        try {
            const carts = this.DataBaseServices.getOldCarts(daysOfAge);
            return carts;
        } catch (err: any) {
            throw new HttpError(err.statusCode ?? 500, "Error when getting old carts for getting old carts: " + err.message);
        }
    }

    private async processCart(CardCode: string, cart: interfaces.Cart, successCarts: interfaces.QuotationData[], errorCarts: any[]) {
        try {
            const response = await this.createQuotation(CardCode, cart);
            console.log(`Successfully created quotation for client ${CardCode}`);
            const { CardName, DocEntry, DocTotal, DocNum } = response.Retorno.Dados;
            if (!DocNum) {
                throw new HttpError(500, "No DocNum was given in API response");
            }
            successCarts.push({ CardCode, CardName, DocEntry, DocTotal, DocNum, DocType: "Cotação" });
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
            const Comments = 'Cotação gerada por carrinho parado no meus pedidos!';
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

        console.log(result);

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
