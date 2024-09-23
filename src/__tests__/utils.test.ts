import { ErrorHandling } from "../utils/errorHandler";
import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import { Request, Response, NextFunction } from "express";
import * as helperFunctions from "../utils/helperFunctions";

/*
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
            it("Should return true for a valid string with only digits", () => {
                expect(helperFunctions.validaCPF("35524782053")).toBe(true);
            });
            it("Should return true for a valid string with valid ponctuation", () => {
                expect(helperFunctions.validaCPF("355.247.820-53")).toBe(true);
            });
            it("Should return true for a non-string valid CPF value", () => {
                expect(helperFunctions.validaCPF(35524782053)).toBe(true);
            });
        })


        it("Should return false for an invalid CPF", () => {
            expect(helperFunctions.validaCPF("12345678900")).toBe(false);
        });
        it("Should return false for an empty string", () => {
            expect(helperFunctions.validaCPF("")).toBe(false);
        });

        it("Should return false for a null value", () => {
            expect(helperFunctions.validaCPF(null)).toBe(false);
        });

        it("Should return false for an undefined value", () => {
            expect(helperFunctions.validaCPF(undefined)).toBe(false);
        });
    })

    describe("CNPJ Validation", () => {
        describe("Valid CNPJ", () => {
            it("Should return true for a valid string with only digits", () => {
                expect(helperFunctions.validCNPJ("78047595000128")).toBe(true);
            });
            it("Should return true for a non-string valid CNPJ value", () => {
                expect(helperFunctions.validCNPJ(78047595000128)).toBe(true);
            });

            it("Should return true for a valid string with valid ponctuation", () => {
                expect(helperFunctions.validCNPJ("78.047.595/0001-28")).toBe(true);
            });
        })


        describe("Invalid CNPJ", () => {
            it("Should return false for a non-string invalid CNPJ value", () => {
                expect(helperFunctions.validCNPJ(12345678901234)).toBe(false);
            });
            it("Should return false for an invalid CNPJ", () => {
                expect(helperFunctions.validCNPJ("12345678901234")).toBe(false);
            });

            it("Should return false for an empty string", () => {
                expect(helperFunctions.validCNPJ("")).toBe(false);
            });

            it("Should return false for a null value", () => {
                expect(helperFunctions.validCNPJ(null)).toBe(false);
            });

            it("Should return false for an undefined value", () => {
                expect(helperFunctions.validCNPJ(undefined)).toBe(false);
            });
        })

    })

    describe("Empty Object", () => {
        it("Should return true for an empty object", () => {
            expect(helperFunctions.objetoVazio({})).toBe(true);
        });
        it("Should return false for a non-empty object", () => {
            expect(helperFunctions.objetoVazio({ a: 1 })).toBe(false);
        });
        it("Should return false for an empty array", () => {
            expect(helperFunctions.objetoVazio([])).toBe(false);
        });
        it("Should return false for an empty string", () => {
            expect(helperFunctions.objetoVazio("")).toBe(false);
        });
        it("Should return false for an empty number", () => {
            expect(helperFunctions.objetoVazio(0)).toBe(false);
        });
        it("Should return false for an empty null", () => {
            expect(helperFunctions.objetoVazio(null)).toBe(false);
        });
        it("Should return false for an empty undefined", () => {
            expect(helperFunctions.objetoVazio(undefined)).toBe(false);
        });
    })
})
*/