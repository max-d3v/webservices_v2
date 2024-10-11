import fs from 'fs';
import { HttpError } from '../Server';
import * as interfaces from '../types/interfaces';

export class LocalFiscalDataClass {
    private parsedData: any;
    private static instance: LocalFiscalDataClass;        
  

    public static getInstance(): LocalFiscalDataClass {
        if (!LocalFiscalDataClass.instance) {
            LocalFiscalDataClass.instance = new LocalFiscalDataClass();
        }
        return LocalFiscalDataClass.instance;
    }
  
    public loadFile(filename: string) {
      try {
        const data = fs.readFileSync(filename, 'utf8');
        this.parsedData = JSON.parse(data);
        return this.parsedData;
      } catch (error: any) {
        throw new HttpError(500, 'Error reading file: ' + error.message);
      }
    }
  
    public getObjectByValue(valueName: string, value: any): interfaces.CnpjJaData | undefined {
        try {
            const data = this.parsedData;
            const object = data.find((object: any) => object[valueName] === value);
            return object;    
        } catch(err: any) {
            throw new HttpError(500, 'Error fetching object in memory: ' + err.message);
        }
    }

    public getData() {
        return this.parsedData;
    }

    public quit() {
        this.parsedData = null;
    }
}
