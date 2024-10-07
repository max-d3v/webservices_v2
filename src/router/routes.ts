import { NextFunction, Request, Response, Router } from "express";
import runService from "../Handlers/ServicesHandler";
import { SapController } from "../Controllers/sapController";
import { SapServices } from "../services/sap-services";

class Routes {
    private router: Router;
    private sapControllerInstance: SapController;
    private sapServicesInstance: SapServices;
    private serviceRunner: typeof runService;


    constructor() {
        this.router = Router();
        this.sapControllerInstance = SapController.getInstance();
        this.sapServicesInstance = SapServices.getInstance();
        this.initializeRoutes();
        this.serviceRunner = runService;
    }

    private initializeRoutes() {



        //SUPPLIER ROUTES
        this.router.patch("/SupplierData/all", (req:  Request, res: Response, next: NextFunction) => 
            this.serviceRunner(() => this.sapControllerInstance.AtualizaCadastroFornecedores('1989-01-01'), req, res, next)
        );
        this.router.patch("/SupplierData/today", (req:  Request, res: Response, next: NextFunction) => {
            const todayIsoString = new Date().toISOString().split('T')[0];
            this.serviceRunner(() => this.sapControllerInstance.AtualizaCadastroFornecedores(todayIsoString), req, res, next);
        });



        //FISCAL DATA ROUTES
        this.router.patch("/FiscalData/:entityType", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.updateClientsRegistrationData(req.params.entityType), req, res, next)
        })


        //TICKETS ROUTES
        this.router.post("/Activities/DesativarTodosTicketsVendedor/:userId", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.deactiveAllTicketsFromVendor(req.params.userId), req, res, next);
        })
        this.router.patch("/Activities/MudarProprietarioTickets", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.changeTicketsOwnerShip(req.body.originUserId, req.body.destinyUserId), req, res, next);
        })


        //MISC ROUTES
        this.router.get("/BuscarCnpjTodosClientes", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.getAllClientsCnpjClear(), req, res, next);
        })
        this.router.get("/BuscarCnpjTodosFornecedores", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.getAllFornecedoresCnpjClear(), req, res, next);
        })
        this.router.get("/getMysqlSapClients", (req: Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.getMysqlSapClients(), req, res, next);
        })


        //COMPANY DATA ROUTES
        this.router.get("/company/:taxid", (req: Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.getCompanyByTaxId(req.params.taxid), req, res, next);
        })




    }

    public getRouter() {
        return this.router;
    }
}

export default Routes;


