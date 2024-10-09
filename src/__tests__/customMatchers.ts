import {CnpjJa} from "../models/cnpjClass";
import * as interfaces from '../types/interfaces';

const checkPropertyType = (obj: any, key: string, expectedType: string): boolean => {
    if (!(key in obj)) return false;
    
    const value = obj[key];
    
    if (value === null) return true;
    
    if (value === undefined) return true;
    
    if (Array.isArray(value) && expectedType.includes('Array')) return true;
    
    if (expectedType === 'Object' && typeof value === 'object') return true;
    
    return typeof value === expectedType.toLowerCase();
  }
  
  const getExpectedType = (obj: any, key: string): string => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (!descriptor) return 'unknown';
    
    const value = descriptor.value;
    if (Array.isArray(value)) return 'Array';
    if (value === null) return 'null';
    if (typeof value === 'object') return 'Object';
    return typeof value;
  }
  

expect.extend({
    toBeValidCnpjData(received: any) {
        const sampleObj: interfaces.CnpjJaData = {} as interfaces.CnpjJaData;
        
        const interfaceKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(sampleObj));
        
        const invalidProperties: string[] = [];
        
        for (const key of interfaceKeys) {
          const expectedType = getExpectedType(sampleObj, key);
          if (!checkPropertyType(received, key, expectedType)) {
            invalidProperties.push(key);
          }
        }
        
        const pass = invalidProperties.length === 0;
        
        return {
          pass,
          message: () => 
            pass
              ? `Object is a valid CnpjJaData.`
              : `Expected object to be a valid CnpjJaData, but the following properties were invalid or missing: ${invalidProperties.join(', ')}`
        };
    },

    toReturnValidUser(userObj, user) {
        const resultObj: jest.CustomMatcherResult  = {
            pass: true,
            message: () => "Valid data"
        }

        if (userObj.name !== user) {
            resultObj.pass = false;
            resultObj.message = () => "Invalid name"
        }
        return resultObj;
    }
})

interface CustomMatchers<R> {
    toBeValidCnpjData(): R;
    toReturnValidUser(user: any): R;
}

declare global {
    namespace jest {
        interface Matchers<R> extends CustomMatchers<R> {}
    }
}


//examples
expect({} as any as interfaces.CnpjJaData).toBeValidCnpjData()
expect({name: "John"}).toReturnValidUser("John")