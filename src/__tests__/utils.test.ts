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
                {cpf: "35524782053", description: "Valid CPF string"},
                {cpf: "355.247.820-53", description: "Valid CPF string with valid ponctuation"},
                {cpf: 35524782053, description: "Valid CPF number"},
            ])("$cpf $description should return true", ({cpf}) => {
                expect(helperFunctions.validaCPF(cpf as any)).toBe(true);
            })
        })


        describe("Invalid CPFs", () => {
            it.each([
                {cpf: "12345678900", description: "Invalid CPF string with only digits"},
                {cpf: "123.456.789-00", description: "Invalid CPF string with valid ponctuation"},
                {cpf: 12345678900, description: "Invalid CPF number"},
                {cpf: false, description: "Falsy value, could be null or undefined etc"},
            ])("$cpf $description should return false", ({cpf}) => {
                expect(helperFunctions.validaCPF(cpf as any)).toBe(false);
            })
        })
    })

    describe("CNPJ Validation", () => {
        describe("Valid CNPJ", () => {
            it.each([
                {cnpj: "78047595000128", description: "Valid string with only digits"},
                {cnpj: "78.047.595/0001-28", description: "Valid string with valid ponctuation"},
                {cnpj: 78047595000128, description: "Valid number"},
            ])("$cnpj $description should return true", ({cnpj}) => {
                expect(helperFunctions.validCNPJ(cnpj as any)).toBe(true);
            })
        })

        describe("Invalid CNPJs", () => {
            it.each([
                {cnpj: 12345678901234, description: "Invalid string with only digits"},
                {cnpj: "12345678901234", description: "Invalid string with only digits"},
                {cnpj: null, description: "Invalid null"},
                {cnpj: undefined, description: "Invalid undefined"},
                {cnpj: false, description: "Invalid boolean"},
                {cnpj: true, description: "Invalid boolean"},
                {cnpj: {}, description: "Invalid object"},
                {cnpj: [], description: "Invalid array"},
                {cnpj: "", description: "Invalid empty string"},
            ])("$cnpj $description should return false", ({cnpj}) => {
                expect(helperFunctions.validCNPJ(cnpj as any)).toBe(false);
            })
        })
    })

    describe("Empty Object", () => {

        describe("invalid empty object", () => {
            it.each([
                {object: [], description: "Empty array"},
                {object: "", description: "Empty string"},
                {object: 0, description: "Empty number"},
                {object: null, description: "Empty null"},
                {object: undefined, description: "Empty undefined"},
            ])("$object $description should return false", ({object}) => {
                expect(helperFunctions.objetoVazio(object)).toBe(false);
            })
        })

        describe("Valid non-empty objects", () => {
            it.each([
                {object: {a: 1}, description: "Non-empty object"},
                {object: {array: [1, 2, 3]}, description: "Non-empty array"},
                {object: {string: "Hello, world!"}, description: "Non-empty string"},
                {object: {number: 42}, description: "Non-empty number"},
            ])("$object $description should return false", ({object}) => {
                expect(helperFunctions.objetoVazio(object)).toBe(false);
            })
        })
        
        describe("Valid empty objects", () => {
          it("Should return true for an empty object", () => {
            expect(helperFunctions.objetoVazio({})).toBe(true);
        });
        })

    })
})
