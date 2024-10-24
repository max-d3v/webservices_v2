import * as interfaces from '../types/interfaces';
import { HttpError } from '../Server';
import { LocalFiscalDataClass } from "../models/LocalFiscalDataClass";

export class LocalFiscalDataServices {
    public static instance: LocalFiscalDataServices;

    public static getInstance(): LocalFiscalDataServices {
        if (!LocalFiscalDataServices.instance) {
            LocalFiscalDataServices.instance = new LocalFiscalDataServices();
        }
        return LocalFiscalDataServices.instance;
    }

    public getObjectByValue(valueName: string, value: any, LocalFiscalDataInstance: LocalFiscalDataClass ): interfaces.CnpjJaData | undefined {
        try {
            const data = LocalFiscalDataInstance.getData();
            const object = data.find((object: any) => object[valueName] === value);
            return object;    
        } catch(err: any) {
            throw new HttpError(500, 'Error fetching object in memory: ' + err.message);
        }
    }

}