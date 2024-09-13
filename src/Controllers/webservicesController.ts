import { Request, Response, NextFunction } from "express";
import { databaseServices } from "../services/database-services";

export interface ExtendedRequest extends Request {
    executionTime?: number;
}

//mudar esse controller pra routerController e criar o serviceController pra todos os metodos publicos do sap-services


const runService = async (
    serviceFunction: () => Promise<any>,
    request: ExtendedRequest,
    response: Response,
    next: NextFunction
) => {
    try {
        const initialTime = performance.now();
        const result = await serviceFunction();
        const endTime = performance.now();

        const statusCode = result.customStatusCode || 200;
        delete result.customStatusCode;

        const executionTime = endTime - initialTime;
        request.executionTime = executionTime;

        response.status(statusCode).json({ message: "Success", data: result });

        await databaseServices.logRequest(request, "success");
    } catch (error: any) {
        await databaseServices.logRequest(request, "error");
        console.error(error);        
        next(error);
    }
};

export default runService;