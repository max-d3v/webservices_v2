import { NextFunction, Request, Response, Router } from "express";
import runService from "../Handlers/ServicesHandler";
import { SapHandler } from "../Handlers/SapHandler";
import { FiscalDataHandler } from "../Handlers/FiscalDataHandler";
//

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
//
    private SapRoutes() {
        this.router.patch("/BusinessPartners/SupplierData/:type", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.AtualizaCadastroFornecedores(req.params.type), req, res, next)
        });



        this.router.patch("/BusinessPartners/FiscalData/:entityType", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.updateClientsRegistrationData(req.params.entityType), req, res, next)
        })

        this.router.patch("/BusinessPartners/FiscalData/Client/:CardCode", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.updateClientsRegistrationData("Client", req.params.CardCode), req, res, next)
        });

        this.router.patch("/BusinessPartners/DeactivatePartners/:type", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.DeactivateVendors(req.params.type), req, res, next)
        });

        this.router.patch("/BusinessPartners/Activate/:type", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.ActivateVendors(req.params.type), req, res, next)
        });

        this.router.post("/Activities/Deactivate/Vendor/:userId", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.deactiveTickets("Vendor", req.params.userId), req, res, next);
        })
        this.router.post("/Activities/Deactivate/:type", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.deactiveTickets(req.params.type), req, res, next);
        })

        this.router.patch("/Activities/ChangeOwnership", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.changeTicketsOwnerShip(req.body.originUserId, req.body.destinyUserId), req, res, next);
        })

        this.router.patch("/Activities/ChangeOwnershipRegion", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.changeTicketsOwnerShipFromRegion(req.body.region, req.body.destinyUserId), req, res, next);
        })

        this.router.patch("/Activities/DeactivatePending/:userId", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.deactivatePendingTickets(req.params.userId), req, res, next);
        })

        this.router.patch("/Opportunities/ChangeOwnership", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.changeOpportunitiesOwnerShip(req.body.OriginSlpCode, req.body.DestinySlpCode), req, res, next);
        })


        this.router.post("/Quotations/CreateForOldEcommerceCarts", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.CreateQuotationsAndFollowUpTicketsForOldEcommerceCarts(), req, res, next);
        })

        this.router.get("/Quotations/TransformApprovedQuotationsIntoOrders", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.TransformApprovedQuotationsIntoOrders(), req, res, next);
        })

        this.router.get("/Quotations/RejectQuotationsInLine", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.RejectQuotationsInLine(), req, res, next);
        })


        this.router.get("/BuscarCnpjTodosClientes", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.getAllClientsCnpjClear(), req, res, next);
        })
        this.router.get("/BuscarCnpjTodosFornecedores", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.SapHandler.getAllFornecedoresCnpjClear(), req, res, next);
        })
        this.router.get("/getMysqlSapClients/asdasd", (req: Request, res: Response, next: NextFunction) => {
            console.log(req);
            this.serviceRunner(() => this.SapHandler.getMysqlSapClients(), req, res, next);
        })

        //Testing purposes
        this.router.get("/stale", () => {
            this.stale();
        })

    }

    stale() {
        for (let i = 100000000000000000000; i > 0; i--) {
            console.log(i);
        }
    }
    

    public getRoutes() {
        return this.router;
    }
}

export default Routes;


