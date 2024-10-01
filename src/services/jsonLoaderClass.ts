import fs from 'fs';
import { HttpError } from '../server';
import * as interfaces from '../types/interfaces';

export class JsonInMemoryHandler {
    private parsedData: any;
    private static instance: JsonInMemoryHandler;        
  

    public static getInstance(): JsonInMemoryHandler {
        if (!JsonInMemoryHandler.instance) {
            JsonInMemoryHandler.instance = new JsonInMemoryHandler();
        }
        return JsonInMemoryHandler.instance;
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
  
    public getObjectByValue(valueName: string, value: any): interfaces.CnpjJaData {
        try {
            const data = this.parsedData;
            console.log(valueName, value);
            const object = data.find((object: any) => object[valueName] === value);
            return object;    
        } catch(err: any) {
            throw new HttpError(500, 'Error fetching object in memory: ' + err.message);
        }
    }

    public getParsedData() {
        return this.parsedData;
    }

    public quit() {
        this.parsedData = null;
    }
}
