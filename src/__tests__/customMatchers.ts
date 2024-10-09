import {CnpjJa} from "../models/cnpjClass";
import * as interfaces from '../types/interfaces';

expect.extend({
    toBeValidCnpjData(cnpj: interfaces.CnpjJaData) {  
        const resultObj: jest.CustomMatcherResult  = {
            pass: true,
            message: () => "Valid data"
        }

        if (!cnpj.registrations) {
            resultObj.pass = false;
            resultObj.message = () => "Registration not found"
            return resultObj;
        }
        return resultObj
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