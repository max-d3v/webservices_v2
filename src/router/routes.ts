import { Router } from "express";
import runService from "../Controllers/webservicesController";
import { SapController } from "../Controllers/sapController";


export const createRoutes = async () => {
    const router = Router();        
    const SapControllerInstance = new SapController();
    await SapControllerInstance.maintainServicesLogin();

    router.get("/AtualizarCadastroTodosFornecedores", (req, res, next) => runService(() => SapControllerInstance.AtualizaCadastroFornecedores('1989-01-01'), req, res, next));
    router.get("/AtualizarCadastroFornecedores", (req, res, next) => {
        const todayIsoString = new Date().toISOString().split('T')[0];
        runService(() => SapControllerInstance.AtualizaCadastroFornecedores(todayIsoString), req, res, next)
    });
    return router;
}
    


