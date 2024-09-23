import { ErrorHandling } from "../utils/errorHandler";
import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import { Request, Response, NextFunction } from "express";
import * as helperFunctions from "../utils/helperFunctions";


describe("Error Handling", () => {
    let req: Request;
    let res: Response;
    let next: NextFunction;

    beforeEach(() => {
        req = {} as Request;
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        } as unknown as Response;
        next = jest.fn();
    });

    it("Should handle HttpError", () => {
        const error = new HttpError(404, "Not Found");

        ErrorHandling(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: "Not Found",
        });
    });

    it("Should handle HttpErrorWithDetails", () => {
        const error = new HttpErrorWithDetails(404, "Not Found", ["details"]);

        ErrorHandling(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: "Not Found",
            details: ["details"],
        });
    });

    it("Should handle generic Error", () => {
        const error = new Error("Generic Error");

        ErrorHandling(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: "Generic Error",
        });
    });
});

describe("Helper Functions", () => {
    //Only checkin vital functions
    describe("CPF Validation", () => {
        describe("Valid CPF", () => {
            it.each([
                {cpf: "35524782053", expected: true, description: "Valid CPF string"},
                {cpf: "355.247.820-53", expected: true, description: "Valid CPF string with valid ponctuation"},
                {cpf: 35524782053, expected: true, description: "Valid CPF number"},
            ])("$cpf $description should return true", ({cpf, expected}) => {
                expect(helperFunctions.validaCPF(cpf as any)).toBe(expected);
            })
        })


        describe("Invalid CPFs", () => {
            it.each([
                {cpf: "12345678900", expected: false, description: "Invalid CPF string with only digits"},
                {cpf: "123.456.789-00", expected: false, description: "Invalid CPF string with valid ponctuation"},
                {cpf: 12345678900, expected: false, description: "Invalid CPF number"},
                {cpf: false, expected: false, description: "Falsy value, could be null or undefined etc"},
            ])("$cpf $description should return false", ({cpf, expected}) => {
                expect(helperFunctions.validaCPF(cpf as any)).toBe(expected);
            })
        })
    })

    describe("CNPJ Validation", () => {
        describe("Valid CNPJ", () => {
            it.each([
                {cnpj: "78047595000128", expected: true, description: "Valid string with only digits"},
                {cnpj: "78.047.595/0001-28", expected: true, description: "Valid string with valid ponctuation"},
                {cnpj: 78047595000128, expected: true, description: "Valid number"},
            ])("$cnpj $description should return true", ({cnpj, expected}) => {
                expect(helperFunctions.validCNPJ(cnpj as any)).toBe(expected);
            })
        })

        describe("Invalid CNPJs", () => {
            it.each([
                {cnpj: 12345678901234, expected: false, description: "Invalid string with only digits"},
                {cnpj: "12345678901234", expected: false, description: "Invalid string with only digits"},
                {cnpj: null, expected: false, description: "Invalid null"},
                {cnpj: undefined, expected: false, description: "Invalid undefined"},
                {cnpj: false, expected: false, description: "Invalid boolean"},
                {cnpj: true, expected: false, description: "Invalid boolean"},
                {cnpj: {}, expected: false, description: "Invalid object"},
                {cnpj: [], expected: false, description: "Invalid array"},
                {cnpj: "", expected: false, description: "Invalid empty string"},
            ])("$cnpj $description should return false", ({cnpj, expected}) => {
                expect(helperFunctions.validCNPJ(cnpj as any)).toBe(expected);
            })
        })
    })

    describe("Empty Object", () => {

        describe("invalid empty object", () => {
            it.each([
                {object: [], expected: false, description: "Empty array"},
                {object: "", expected: false, description: "Empty string"},
                {object: 0, expected: false, description: "Empty number"},
                {object: null, expected: false, description: "Empty null"},
                {object: undefined, expected: false, description: "Empty undefined"},
            ])("$object $description should return false", ({object, expected}) => {
                expect(helperFunctions.objetoVazio(object)).toBe(expected);
            })
        })

        describe("Valid non-empty objects", () => {
            it.each([
                {object: {a: 1}, expected: false, description: "Non-empty object"},
                {object: {array: [1, 2, 3]}, expected: false, description: "Non-empty array"},
                {object: {string: "Hello, world!"}, expected: false, description: "Non-empty string"},
                {object: {number: 42}, expected: false, description: "Non-empty number"},
            ])("$object $description should return false", ({object, expected}) => {
                expect(helperFunctions.objetoVazio(object)).toBe(expected);
            })
        })
        
        describe("Valid empty objects", () => {
          it("Should return true for an empty object", () => {
            expect(helperFunctions.objetoVazio({})).toBe(true);
        });
        })

    })
})
