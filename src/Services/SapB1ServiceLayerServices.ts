import { SapB1ServiceLayerClient } from "../Clients/SapB1ServiceLayerClient";
import { SapB1FieldTranslator } from "../Clients/TranslationClient";
import { SapQueryBuilderClient } from "../Clients/SapQueryBuilderClient";
import * as utils from '../interfaces/utils';
import * as types from '../interfaces/SapB1Client';

export class SapB1ServiceLayerServices {
    private static instance: SapB1ServiceLayerServices;
    
    private readonly serviceLayer: SapB1ServiceLayerClient;
    private readonly translator: SapB1FieldTranslator;
    private readonly queryBuilder: SapQueryBuilderClient;

    private constructor() {
        this.serviceLayer = SapB1ServiceLayerClient.getInstance();
        this.translator = new SapB1FieldTranslator();
        this.queryBuilder = new SapQueryBuilderClient();
    }

    public static getInstance(): SapB1ServiceLayerServices {
        if (!SapB1ServiceLayerServices.instance) {
            SapB1ServiceLayerServices.instance = new SapB1ServiceLayerServices();
        }
        return SapB1ServiceLayerServices.instance;
    }    

    /**
     * Queries entities with translation between Service Layer and Web Service formats
     * @param options Query options including select fields, filters, tables and limit
     * @returns Translated entity data
     */
    public async queryEntities<Entity extends Object>(
        options: utils.QueryParams<Entity>
    ): Promise<types.WebServiceResponse<Entity>> {
        try {
            // Translate fields to Web Service format
            
            const translatedFields = this.translator.translateArray(
                options.selects as string[],
                "WS"
            );

            const translatedFilters: Array<utils.Filter<any>> = options.filters.map((filter) => {
                const field = filter.field as string;
                const translatedField = this.translator.translateIntoWebServiceField(field);
                return {
                    ...filter,
                    field: translatedField
                }
            })

            // Build query
            const query = this.queryBuilder.createQuery<Entity>(
                translatedFields,
                options.tables,
                translatedFilters,
                options.limit
            );

            console.log(query)

            // Execute query
            const response = await this.serviceLayer.executeQuery<Entity>(query);

            // Translate response back to Service Layer format
            const translatedData = this.translator.translateData<Entity>(
                response as Partial<Entity>[],
                "SL"
            );

            return {
                data: translatedData
            };
        } catch (error: any) {
            throw this.handleError(error, 'Error querying entities', options);
        }
    }

    /**
     * Retrieves a single entity by identifier
     * @param entityName SAP entity type name
     * @param identifier Entity identifier
     * @returns Entity data
     */
    public async getEntity<T>(
        entityName: string,
        identifier: number | string
    ): Promise<types.GetResponse<T> | null> {
        try {
            const data = await this.serviceLayer.get<T>(entityName, identifier);
            return {
                status: true,
                message: `Retrieved ${entityName} ${identifier} successfully`,
                data
            };
        } catch (error: any) {
            return null
        }
    }

    /**
     * Updates an existing entity
     * @param entityName SAP entity type name
     * @param identifier Entity identifier
     * @param data Update data
     * @returns Updated entity
     */
    public async updateEntity<T extends object>(
        entityName: string,
        identifier: string | number,
        data: Partial<T>
    ): Promise<types.ActionResponse<T> | types.SapClientError> {
        try {
            await this.serviceLayer.patch<T>(
                entityName,
                identifier,
                data
            );
            return {
                status: true,
                message: `${entityName} ${identifier} updated successfully`,
                details: data
            };
        } catch (error: any) {
            throw this.handleError(error, `Error updating ${entityName}`, data);
        }
    }

    /**
     * Creates a new entity
     * @param entityName SAP entity type name
     * @param data Entity data
     * @returns Created entity
     */
    public async createEntity<T extends object>(
        entityName: string,
        data: Partial<T>
    ): Promise<types.ActionResponse<T>> {
        try {
            await this.serviceLayer.post<T>(entityName, data);
            return {
                status: true,
                details: data, 
                message: `${entityName} created successfully`
            };
        } catch (error: any) {
            throw this.handleError(error, `Error creating ${entityName}`, data);
        }
    }

    /**
     * Handles and transforms errors
     */
    private handleError(error: any, context: string, data: any): types.SapClientError {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Unknown error occurred';
        const fullMessage = `${context}: ${message}`;
        const errorObj: types.SapClientError = {
            status: false,
            message: fullMessage,
            statusCode,
            details: {
                data
            }
        }
        return errorObj;
    }
}
