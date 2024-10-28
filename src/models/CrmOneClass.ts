import axios, { AxiosRequestConfig } from 'axios';
import * as interfaces from '../types/interfaces';
import { HttpError } from '../Server';
export class CrmOne {
    public static instance: CrmOne;
    private baseConfig: AxiosRequestConfig;
    private host: string;
    private base: string;
    private credentials: interfaces.CrmOneCredentials;

    public static getInstance(): CrmOne {
        if (!CrmOne.instance) {
            CrmOne.instance = new CrmOne();
        }
        return CrmOne.instance;
    }

    constructor() {
        this.host = process.env.CRMONE_HOST!;
        this.base = process.env.CRMONE_BASE!;

        this.credentials = {
            EmailUsuario: process.env.CRMONE_EMAIL!,
            SenhaUsuario: process.env.CRMONE_SENHA!
        }

        this.baseConfig = {
            method: 'post',
            url: `${this.host}${this.base}/DWUAPI`,
            headers: {
                'Content-Type': 'application/json',
            },
            data: this.credentials
        }
    }

    public async adicionaPedido(dadosDoPedido: any, camposUsuario: any): Promise<any> {
        try {
            const config = this.baseConfig;
            let data = {
                oPedido: dadosDoPedido,
                ListaCamposUsuario: camposUsuario
            };
            
    
            config.url += "/AdicionaPedido";
            config.data = { ...config.data, ...data }
    
    
            var response = await axios.request(config);
            const responseData = response.data

            this.validateResponse(responseData, "pedido")
            return responseData;        
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao criar pedido via API DWU: " + err.message);
        }
    }

    public async adicionaCotacao(dadosCotacao: any, camposUsuario: any) {
        try {
            const config = this.baseConfig;

            let data = {
                aCotacao: dadosCotacao,
                ListaCamposUsuario: camposUsuario
            };
    
            config.url += "/AdicionaCotacao";
            config.data = { ...config.data, ...data }
    
            var response = await axios.request(config);
            const responseData = response.data

            this.validateResponse(responseData, "cotacao")
            return responseData;    
        } catch(err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao criar cotacao via API DWU: " + err.message);
        }
    }


    //Will throw error if error is detected within response
    private validateResponse(
        responseData: interfaces.CrmOneResponse | null | undefined,
        endpoint: string
    ): void {
        // Check if response exists
        if (!responseData) {
            throw new HttpError(
                400,
                `No response received from CrmOne API endpoint: ${endpoint}`
            );
        }
    
        // Check if response has expected structure
        if (!responseData.Retorno) {
            throw new HttpError(
                400,
                `Invalid response structure from CrmOne API endpoint: ${endpoint}`
            );
        }
    
        const { MensagemErro, Status, Dados } = responseData.Retorno;
    
        switch (true) {
            // Case: Error message present with error status
            case Boolean(MensagemErro) && Status === 0:
                throw new HttpError(
                    400,
                    `Error at ${endpoint}: ${MensagemErro}`
                );
    
            // Case: No error message but error status present
            case !MensagemErro && Status === 0:
                throw new HttpError(
                    400,
                    `Error at ${endpoint}: Received error status (0) without error message`
                );
    
            // Case: Error message present but status indicates success
            case Boolean(MensagemErro) && Status !== 0:
                throw new HttpError(
                    400,
                    `Error at ${endpoint}: Received error message "${MensagemErro}" with non-error status (${Status})`
                );
    
            // Case: No data returned when expected
            case Status !== 0 && Dados === null:
                throw new HttpError(
                    404,
                    `No data returned from ${endpoint} despite successful status`
                );
        }
    
        // Optional: Add success logging
        if (Status !== 0 && !MensagemErro) {
            console.debug(`Successfully validated response from ${endpoint}`);
        }
    }
    }
