import { NextFunction, Request, Response, Router } from "express";
import runService from "../Controllers/webservicesController";
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
        this.router.get("/AtualizarCadastroTodosFornecedores", (req:  Request, res: Response, next: NextFunction) => 
            this.serviceRunner(() => this.sapControllerInstance.AtualizaCadastroFornecedores('1989-01-01'), req, res, next)
        );
        
        this.router.get("/AtualizarCadastroFornecedores", (req:  Request, res: Response, next: NextFunction) => {
            const todayIsoString = new Date().toISOString().split('T')[0];
            this.serviceRunner(() => this.sapControllerInstance.AtualizaCadastroFornecedores(todayIsoString), req, res, next);
        });

        this.router.get("/DesativarTodosTicketsVendedor/:userId", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.deactiveAllTicketsFromVendor(req.params.userId), req, res, next);
        })
        
        this.router.get("/BuscarCnpjTodosClientes", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.getAllClientsCnpjClear(), req, res, next);
        })

        this.router.get("/updateAllClientsRegistrationData", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.updateAllClientsRegistrationData(), req, res, next)
        })

        this.router.get("/BuscarCnpjTodosFornecedores", (req:  Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.getAllFornecedoresCnpjClear(), req, res, next);
        })

        this.router.get("/getMysqlSapClients", (req: Request, res: Response, next: NextFunction) => {
            this.serviceRunner(() => this.sapControllerInstance.getMysqlSapClients(), req, res, next);
        })


    }

    public getRouter() {
        return this.router;
    }
}

export default Routes;


