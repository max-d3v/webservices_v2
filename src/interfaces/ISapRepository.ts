import * as utils from './utils';
import * as SapClientTypes from './SapB1Client';


export interface ISapRepository<T extends Object> {
    findOne(identifier: string | number): Promise<T | null>; // If none is found currently throw err.
    findMany(QueryOptions: utils.QueryParams<T>): Promise<Array<Partial<T>>>; 
    updateOne(Entity: T, processingFunction: Function): Promise<SapClientTypes.ActionResponse<T> | SapClientTypes.SapClientError>;
    updateInBatches(entities: Array<T>, processingFunction: Function): Promise<(SapClientTypes.SapClientError | SapClientTypes.ActionResponse<T>)[]>
}

