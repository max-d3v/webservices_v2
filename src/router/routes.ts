import { Router } from "express";
import runService from "../Controllers/webservicesController";
import { SapController } from "../Controllers/sapController";


export const createRoutes = async () => {
    const router = Router();        
    const SapControllerInstance = new SapController();
    await SapControllerInstance.maintainServicesLogin();

    router.get("/AtualizarCadastroFornecedores", (req, res, next) => runService(() => SapControllerInstance.CadastroFornecedores(), req, res, next));
    return router;
}



