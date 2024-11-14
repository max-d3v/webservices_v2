import { BusinessPartnerController } from "../Controllers/BusinessPartnerController"
import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errorHandler";
import ServiceRunner from './Handler/ServicesHandler';

export class Router {
    private BusinessPartnerController: BusinessPartnerController;

    constructor() {
        this.BusinessPartnerController = new BusinessPartnerController();
    }

    handleRoute(req: Request, res: Response, next: NextFunction) {
        const { url } = req;
        const segments = url.replace(/^\//, '').split('/');
        
        const entity = segments[0];
        if (!entity) {
            throw new HttpError(400, "Invalidd URL, no entity given")
        }

        this.handleEntityController(entity, req, res, next);
    }


    handleEntityController(Entity: string, req: Request, res: Response, next: NextFunction) {
        switch (Entity) {
            case "BusinessPartner":
                ServiceRunner((req: Request) => this.BusinessPartnerController.RequestHandler(req), req, req, res, next);
                break;
            default:
                throw new HttpError(400, "Entity not implemented.")
        }
    }
}