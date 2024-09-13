import { Router } from "express";
import runService from "../Controllers/webservicesController";
import { SapControllerInstance } from "../Controllers/sapController";


const router = Router();

router.get("/AtualizarCadastroFornecedores", (req, res, next) => runService(() => SapControllerInstance.CadastroFornecedores(), req, res, next));

export default router;
