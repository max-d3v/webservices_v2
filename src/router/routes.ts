import { Router } from "express";
import runService from "../Controllers/webservicesController";
import { SapController } from "../Controllers/sapController";


class Routes {
    private router: Router;
    private sapControllerInstance: SapController;
    private serviceRunner: typeof runService;


    constructor() {
        this.router = Router();
        this.sapControllerInstance = SapController.getInstance();
        this.initializeRoutes();
        this.serviceRunner = runService;
    }

    private initializeRoutes() {
        this.router.get("/AtualizarCadastroTodosFornecedores", (req, res, next) => 
            this.serviceRunner(() => this.sapControllerInstance.AtualizaCadastroFornecedores('1989-01-01'), req, res, next)
        );
        this.router.get("/AtualizarCadastroFornecedores", (req, res, next) => {
            const todayIsoString = new Date().toISOString().split('T')[0];
            this.serviceRunner(() => this.sapControllerInstance.AtualizaCadastroFornecedores(todayIsoString), req, res, next);
        });
    }

    public getRouter() {
        return this.router;
    }
}

export default Routes;


