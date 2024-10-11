import { Request, Response, NextFunction } from "express";
import { DatabaseServices } from "../services/DatabaseServices";
import { logger } from "../middlewares/logger";
import { v4 as uuidv4 } from 'uuid';
import { HttpError } from "../Server"; 
export interface ExtendedRequest extends Request {
    executionTime?: number;
}


const runService = async (
    serviceFunction: () => Promise<any>,
    request: ExtendedRequest,
    response: Response,
    next: NextFunction
) => {
    const serviceId = uuidv4();
    const databaseServices = DatabaseServices.getInstance();

    try {
        logger.info({
            serviceId: serviceId,
            message: `Starting service`,
            url: request.originalUrl,
            timestamp: new Date().toISOString()
        });
        const initialTime = performance.now();
        const result = await serviceFunction();
        const endTime = performance.now();

        if (!result) {
            throw new HttpError(500, "Serviço não retornou dados");
        }

        const statusCode = result.customStatusCode || 200;
        if (result.customStatusCode) {
            delete result.customStatusCode;
        }


        logger.info({
            serviceId: serviceId,
            message: `Service completed`,
            url: request.originalUrl,
            timestamp: new Date().toISOString()
        });
        const executionTime = endTime - initialTime;
        request.executionTime = executionTime;

        response.status(statusCode).json({ message: "Success", data: result });

        logger.info({
            serviceId: serviceId,
            message: `Response sent to user`,
            url: request.originalUrl,
            timestamp: new Date().toISOString()
        });
        logger.info({
            data: result,
            serviceId: serviceId,
            message: `Response data`
        });


        logger.info({
            serviceId: serviceId,
            message: `Logging request`,
            url: request.originalUrl || "Não foi possível obter o url da request",
            timestamp: new Date().toISOString()
        });
        await databaseServices.logRequest(request, "success");
    } catch (error: any) {
        logger.error({
            serviceId: serviceId,
            message: `Error on service`,
            url: request.originalUrl,
            timestamp: new Date().toISOString()
        });
        try {
            await databaseServices.logRequest(request, "error");
            logger.info({
                serviceId: serviceId,
                message: `Logged service error`,
                url: request.originalUrl,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            logger.error({
                serviceId: serviceId,
                message: `Error on logging service error`,
                url: request.originalUrl,
                timestamp: new Date().toISOString()
            });
        }
        console.log(error)
        next(error);
    }
};

export default runService;