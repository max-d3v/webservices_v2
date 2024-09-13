import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import { HttpError } from '../utils/errorHandler';
import { llm_api } from './llmApi';
const agent = new https.Agent({
    rejectUnauthorized: false
});

interface Credentials {
    UserName: string;
    Password: string;
    CompanyDB: string;
}

interface slConfig {
    serviceLayers: {
        port: string;
        url: string;
        username: string;
        password: string;
        companyName: string;
    };
    webService: {
        port: string;
        token: string;
        url: string;
    };
}

export default class SL {
    private host: string;
    private port: string;
    private headers: Record<string, string>;
    private credentialsObj: Credentials;
    private config: AxiosRequestConfig;
    private SessionId?: string;

    private slConfig: slConfig;


    constructor() {
        this.slConfig = {
            serviceLayers: {
                port: process.env.SERVICE_LAYER_PORT!, // Changed from SERVICE_LAYERS_PORT
                url: process.env.SERVICE_LAYER_URL!,
                username: process.env.SERVICE_LAYER_USERNAME!, // Changed from SERVICE_LAYERS_USERNAME
                password: process.env.SERVICE_LAYER_PASSWORD!, // Changed from SERVICE_LAYERS_PASSWORD
                companyName: process.env.SERVICE_LAYER_COMPANY_NAME! // Changed from SERVICE_LAYERS_COMPANY_NAME
            },
            webService: {
                port: process.env.WEB_SERVICE_PORT!,
                token: process.env.WEB_SERVICE_TOKEN!,
                url: process.env.WEB_SERVICE_URL!
            }
        };

        this.host = this.slConfig.serviceLayers.url!;
        this.port = this.slConfig.serviceLayers.port!;

        this.headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        };

        this.credentialsObj = {
            UserName: this.slConfig.serviceLayers.username!,
            Password: this.slConfig.serviceLayers.password!,
            CompanyDB: this.slConfig.serviceLayers.companyName!
        };

        this.config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${this.host}:${this.port}/b1s/v1/Login`,
            headers: this.headers,
            data: JSON.stringify(this.credentialsObj),
            httpsAgent: agent
        };
    }

    async login(): Promise<any> {
        const response = await axios.request(this.config);
        this.SessionId = response.data.SessionId;
        this.config.headers!['Cookie'] = `B1SESSION=${this.SessionId}; ROUTEID=.node3`;
        return response.data;
    }

    async get(tipo: string, parametro?: string | number, skip = 0, select?: string): Promise<{ data?: any;}> {

        try {
        const configCopy = { ...this.config };
        let url = `${this.host}:${this.port}/b1s/v1/${tipo}`;

        if (parametro !== undefined) {
            url += typeof parametro === 'number' ? `(${parametro})` : `('${parametro}')`;
        }

        if (select) {
            url += `?$select=${encodeURIComponent(select)}&$skip=${skip}`;
        }

        configCopy.url = url;
        configCopy.method = 'get';

        const response = await axios.request(configCopy);
        return {data: response.data};
        } catch (error: any) {
            const errorMessage = error.response.data.error?.message?.value || error.message;
            throw new HttpError(500, 'Erro ao buscar dados: ' + errorMessage);
        }
    }

    async logout(): Promise<any> {
        const headers = {
            ...this.headers,
            'Cookie': `B1SESSION=${this.SessionId}`,
            'ROUTEID': '.node3'
        };
        const response = await axios.post(`${this.host}:${this.port}/b1s/v1/Logout`, {}, { headers });
        return response.data;
    }

    async querySAP(query: string): Promise<{ data?: any; message?: string }> {
        const url = `${this.slConfig.webService.url}:${this.slConfig.webService.port}?token=${this.slConfig.webService.token}&query=${query}`
        const config = {
            headers: this.headers,
            httpsAgent: agent
        }
        const response = await axios.get(url, config);

        if (response.data.STATUS === '-1') {
            throw new HttpError(500, 'Erro ao executar query: ' + response.data.MENSAGEM);
        }
        return response;
    }

    async patch(tipo: string, id: string | number, data?: any): Promise<{ status: boolean; data?: any; message?: string }> {
        try {
            const configCopy = { ...this.config };
            configCopy.url = `${this.host}:${this.port}/b1s/v1/${tipo}`;
    
            if (data) {
                configCopy.data = JSON.stringify(data);
            } else {
                delete configCopy.data;
            }
    
            if (id !== undefined) {
                configCopy.url += typeof id === 'number' ? `(${id})` : `('${id}')`;
            }
    
            configCopy.method = 'patch';
    
            const response = await axios.request(configCopy);
            return { status: true, data: response.data };
            
        } catch (err: any) {
            const errorMessage = err.response.data.error?.message?.value || err.message;
            let translatedErrorMessage = errorMessage;
            try {
                translatedErrorMessage = await this.translateErrorMessage(errorMessage);
            } catch(err: any) {
                throw new HttpError(500, 'Erro ao atualizar dados na SL: ' + errorMessage);
            }
            throw new HttpError(500, 'Erro ao atualizar dados na SL: ' + translatedErrorMessage);
        }
    }

    async post(tipo: string, data?: any): Promise<{ status: boolean; data?: any; message?: string }> {
        try {

        const configCopy = { ...this.config };
        configCopy.url = `${this.host}:${this.port}/b1s/v1/${tipo}`;
        configCopy.method = 'post';

        if (data) {
            configCopy.data = JSON.stringify(data);
        } else {
            delete configCopy.data;
        }

        const response = await axios.request(configCopy);
            return { status: true, data: response.data };
        } catch (err: any) {
            const errorMessage = err.response.data.error?.message?.value || err.message;
            throw new HttpError(500, 'Erro ao atualizar dados na SL: ' + errorMessage);
        }
    }


    async translateErrorMessage(errorMessage: string): Promise<string> {
        const response = await llm_api('translate_to_pt', {
            text: errorMessage,
        });
        const data = JSON.parse(response.data);
        return data.text;
    }
}
