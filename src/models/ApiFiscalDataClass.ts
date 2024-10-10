import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import { HttpError } from '../utils/errorHandler';
import * as helperFunctions from '../utils/helperFunctions';
import * as interfaces from '../types/interfaces';

const agent = new https.Agent({
    rejectUnauthorized: false
});

export class ApiFiscalDataClass {
    private url: string = process.env.CNPJJA_URL!;
    private token: string = process.env.CNPJJA_TOKEN!;
    private baseConfig: AxiosRequestConfig;
    private static instance: ApiFiscalDataClass;
    
    constructor() {
        this.baseConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${this.url}`,
            headers: {
                'Authorization': `${this.token}`
            },
            httpsAgent: agent
        };
    }

    public static getInstance(): ApiFiscalDataClass {
        if (!ApiFiscalDataClass.instance) {
            ApiFiscalDataClass.instance = new ApiFiscalDataClass();
        }
        return ApiFiscalDataClass.instance;
    }

    public async searchCnpj(cnpj: string): Promise<interfaces.CnpjJaData> {
        try {
            const isValidCnpj = helperFunctions.validCNPJ(cnpj);
            if (!isValidCnpj) {
                throw new HttpError(400, `CNPJ ${cnpj} inválido`);
            }

            const endpoint = `/office/${cnpj}?simples=true&simplesHistory=false&strategy=CACHE_IF_ERROR&registrations=BR&registrationsStatus=false&geocoding=false&links=OFFICE_MAP&links=OFFICE_MAP&maxAge=45&maxStale=30&sync=%3Cboolean%3E`;
            const config = {
                ...this.baseConfig,
                url: this.url + endpoint
            }
            const response = await axios.request(config);
            return response.data;    
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, `Erro ao buscar dados fiscais do CNPJ ${cnpj} via API`);
        }
    }

    
}