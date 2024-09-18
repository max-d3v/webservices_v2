import { Router } from "express";
import runService from "../Controllers/webservicesController";
import { SapController } from "../Controllers/sapController";

const router = Router();

const applyRoutes = async () => {
    const SapControllerInstance: any = await SapController.getInstance();

    router.get("/AtualizarCadastroFornecedores", (req, res, next) => runService(() => SapControllerInstance.CadastroFornecedores(), req, res, next));
}

applyRoutes();


export default router;
