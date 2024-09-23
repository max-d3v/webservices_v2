import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import { HttpError } from '../utils/errorHandler';

const agent = new https.Agent({
    rejectUnauthorized: false
});

export class CnpjJa {
    private url: string = process.env.CNPJJA_URL!;
    private token: string = process.env.CNPJJA_TOKEN!;
    private baseConfig: AxiosRequestConfig;



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

    public async searchCnpj(cnpj: string): Promise<any> {
        const endpoint = `/office/${cnpj}?simples=true&simplesHistory=false&strategy=CACHE&registrations=BR&registrationsStatus=false&geocoding=false&links=OFFICE_MAP&links=OFFICE_MAP&maxAge=30&maxStale=30&sync=%3Cboolean%3E`;
        const config = {
            ...this.baseConfig,
            url: this.url + endpoint
        }
        const response = await axios.request(config);
        return response.data;
    }

    
}