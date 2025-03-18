import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { HttpError } from '../utils/errorHandler';
import * as helperFunctions from '../utils/helperFunctions';

export type ServiceLayerError = {
    code: number;
    message: {
        lang: string;
        value: string
    }
}

// Configuration interfaces
type ServiceLayerConfig = {
    port: string;
    url: string;
    username: string;
    password: string;
    companyName: string;
}

type WebServiceConfig = {
    port: string;
    token: string;
    url: string;
    companyName: string;
}

type SapConfig = {
    serviceLayers: ServiceLayerConfig;
    webService: WebServiceConfig;
}

type Credentials = {
    UserName: string;
    Password: string;
    CompanyDB: string;
}


export class SapB1ServiceLayerClient {
    private static instance: SapB1ServiceLayerClient;
    private axios: AxiosInstance;
    private sessionId?: string;
    private loginInterval?: NodeJS.Timeout; // Changed from Timer to Timeout
    private readonly config: SapConfig;
    private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
    private readonly SESSION_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes
    private readonly MAX_RETRIES = 2;

    private constructor() {
        this.config = this.loadConfig();
        this.axios = this.createAxiosInstance();
        this.initialize();
    }

    public static getInstance(): SapB1ServiceLayerClient {
        if (!SapB1ServiceLayerClient.instance) {
            SapB1ServiceLayerClient.instance = new SapB1ServiceLayerClient();
        }
        return SapB1ServiceLayerClient.instance;
    }

    private loadConfig(): SapConfig {
        const requiredEnvVars = [
            'SERVICE_LAYER_PORT',
            'SERVICE_LAYER_URL',
            'SERVICE_LAYER_USERNAME',
            'SERVICE_LAYER_PASSWORD',
            'SERVICE_LAYER_COMPANY_NAME',
            'WEB_SERVICE_PORT',
            'WEB_SERVICE_TOKEN',
            'WEB_SERVICE_URL',
            'WEB_SERVICE_COMPANY_NAME'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }

        return {
            serviceLayers: {
                port: process.env.SERVICE_LAYER_PORT!,
                url: process.env.SERVICE_LAYER_URL!,
                username: process.env.SERVICE_LAYER_USERNAME!,
                password: process.env.SERVICE_LAYER_PASSWORD!,
                companyName: process.env.SERVICE_LAYER_COMPANY_NAME!
            },
            webService: {
                port: process.env.WEB_SERVICE_PORT!,
                token: process.env.WEB_SERVICE_TOKEN!,
                url: process.env.WEB_SERVICE_URL!,
                companyName: process.env.WEB_SERVICE_COMPANY_NAME!
            }
        };
    }

    private createAxiosInstance(): AxiosInstance {
        return axios.create({
            timeout: this.REQUEST_TIMEOUT,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
    }

    private async initialize(): Promise<void> {
        try {
            await this.login();
            this.startSessionMaintenance();
        } catch (error) {
            console.error('Failed to initialize SAP connection:', error);
            throw new HttpError(500, 'Failed to initialize SAP connection');
        }
    }

    private async login(): Promise<void> {
        const credentials: Credentials = {
            UserName: this.config.serviceLayers.username,
            Password: this.config.serviceLayers.password,
            CompanyDB: this.config.serviceLayers.companyName
        };

        try {
            const response = await this.axios.post(
                `${this.config.serviceLayers.url}:${this.config.serviceLayers.port}/b1s/v1/Login`,
                credentials
            );
            this.sessionId = response.data.SessionId;
            this.axios.defaults.headers.common['Cookie'] = `B1SESSION=${this.sessionId}; ROUTEID=.node3`;
        } catch (error: any) {
            throw this.handleError(error, 'Failed to login to SAP');
        }
    }

    private startSessionMaintenance(): void {
        if (this.loginInterval) {
            clearInterval(this.loginInterval);
        }
        
        this.loginInterval = setInterval(async () => {
            try {
                console.log('Maintaining SAP session at:', new Date().toISOString());
                await this.login();
            } catch (error) {
                console.error('Failed to maintain SAP session:', error);
            }
        }, this.SESSION_REFRESH_INTERVAL);
    }

    public async get<T>(
        type: string,
        parameter: string | number,
        skip = 0,
        select?: string
    ): Promise<T> {
        let url = `${this.config.serviceLayers.url}:${this.config.serviceLayers.port}/b1s/v1/${type}`;
        url += typeof parameter === 'number' ? `(${parameter})` : `('${parameter}')`;

        if (select) {
            url += `?$select=${encodeURIComponent(select)}&$skip=${skip}`;
        }

        try {
            const response = await this.executeWithRetry(() => this.axios.get<T>(url));
            return response.data;
        } catch (error: any) {
            throw this.handleError(error, 'Error fetching data');
        }
    }

    public async patch<T>(
        type: string,
        id: string | number,
        data?: Partial<T>
    ): Promise<string> {
        const url = `${this.config.serviceLayers.url}:${this.config.serviceLayers.port}/b1s/v1/${type}${typeof id === 'number' ? `(${id})` : `('${id}')`}`;

        try {
            const response = await this.executeWithRetry(() => this.axios.patch<T>(url, data));
            
            //if success SL will return string.
            const responseData = response.data as string
            return responseData;
        } catch (error: any) {

            throw this.handleError(error, 'Error updating data');
        }
    }

    public async post<T>(
        type: string,
        data?: any
    ): Promise<string> {
        const url = `${this.config.serviceLayers.url}:${this.config.serviceLayers.port}/b1s/v1/${type}`;

        try {
            const response = await this.executeWithRetry(() => this.axios.post<T>(url, data));
            return response.data as string;
        } catch (error: any) {
            throw this.handleError(error, 'Error creating data');
        }
    }

    public async executeQuery<Entity>(
        query: string,
        useProductionDb = false
    ): Promise<Array<Partial<Entity>>> {
        const dbName = useProductionDb ? "SBO_COPAPEL_PRD" : this.config.serviceLayers.companyName;
        const processedQuery = query.replace(/SBO_COPAPEL_(PRD|TST)/g, dbName);

        try {
            const response = await this.executeWithRetry(() =>
                this.axios.post(
                    `${this.config.webService.url}:${this.config.webService.port}/ConsultaSQL?token=${this.config.webService.token}`,
                    processedQuery,
                    { headers: { 'Content-Type': 'text/plain' } }
                )
            );

            const data = response.data;

            if (data.STATUS === '-1') {
                throw new HttpError(500, `Query execution failed: ${data.MENSAGEM}`);
            }

            if (!Array.isArray(data)) {
                throw new HttpError(500, 'Invalid query response format');
            }

            if (helperFunctions.objetoVazio(data[0])) {
                return [];
            }

            return data;
        } catch (error: any) {
            throw this.handleError(error, 'Error executing query');
        }
    }

    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        retries = this.MAX_RETRIES
    ): Promise<T> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                if (attempt === retries) throw error;
                if (error.response?.status === 401) {
                    await this.login();
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        throw new HttpError(500, 'Max retries exceeded');
    }

    private handleError(error: any, context: string): HttpError {
        const errorMessage = error.response?.data?.error?.message?.value || error.message;
        const statusCode = error.response?.status || 500;
        return new HttpError(statusCode, `${context}: ${errorMessage}`);
    }

    public async dispose(): Promise<void> {
        if (this.loginInterval) {
            clearInterval(this.loginInterval);
        }
        
        if (this.sessionId) {
            try {
                await this.axios.post(`${this.config.serviceLayers.url}:${this.config.serviceLayers.port}/b1s/v1/Logout`);
            } catch (error) {
                console.error('Error during logout:', error);
            }
        }
    }
}