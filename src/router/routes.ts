import { NextFunction, Request, Response, Router } from "express";
import runService from "../Handlers/ServicesHandler";
import { SapHandler } from "../Handlers/SapHandler";
import { FiscalDataHandler } from "../Handlers/FiscalDataHandler";


class Routes {
    private router: Router;
    
    private SapHandler: SapHandler;
    private FiscalDataHandler: FiscalDataHandler;

    private serviceRunner: typeof runService;


    constructor(SapHandler: SapHandler, FiscalHandler: FiscalDataHandler) {
        this.router = Router();

        this.SapHandler = SapHandler;
        this.FiscalDataHandler = FiscalHandler;

        this.serviceRunner = runService;

        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.FiscalDataRoutes();
        this.SapRoutes();
        
    }

    private FiscalDataRoutes() {
        this.router.get("/company/:taxid", (req: Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.FiscalDataHandler.getCompanyByTaxId(req.params.taxid), req, res, next);
        })
    }

    private SapRoutes() {
        this.router.patch("/SupplierData/All", (req:  Request, res: Response, next: NextFunction) => 
            this.serviceRunner(() => this.SapHandler.AtualizaCadastroFornecedores('1989-01-01'), req, res, next)
        );
        this.router.patch("/SupplierData/Today", (req:  Request, res: Response, next: NextFunction) => {
            const todayIsoString = new Date().toISOString().split('T')[0];
            this.serviceRunner(() => this.SapHandler.AtualizaCadastroFornecedores(todayIsoString), req, res, next);
        });

        this.router.patch("/FiscalData/:entityType", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.updateClientsRegistrationData(req.params.entityType), req, res, next)
        })

        this.router.patch("/FiscalData/Client/:CardCode", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.updateClientsRegistrationData("Client", req.params.CardCode), req, res, next)
        })

        this.router.post("/Activities/DesativarTodosTicketsVendedor/:userId", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.deactiveAllTicketsFromVendor(req.params.userId), req, res, next);
        })
        this.router.patch("/Activities/MudarProprietarioTickets", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.changeTicketsOwnerShip(req.body.originUserId, req.body.destinyUserId), req, res, next);
        })

        this.router.get("/BuscarCnpjTodosClientes", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.getAllClientsCnpjClear(), req, res, next);
        })
        this.router.get("/BuscarCnpjTodosFornecedores", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.getAllFornecedoresCnpjClear(), req, res, next);
        })
        this.router.get("/getMysqlSapClients", (req: Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.getMysqlSapClients(), req, res, next);
        })

    }
    

    public getRoutes() {
        return this.router;
    }
}

export default Routes;


