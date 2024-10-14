import express, { Application } from "express";
import { ErrorHandling } from "./utils/errorHandler";
import { authMiddleware } from "./middlewares/auth";
import { SapHandler } from "./Handlers/SapHandler";
import { FiscalDataHandler } from "./Handlers/FiscalDataHandler";

import routerClass from "./router/routes";
import http from "http";
import { FiscalDataController } from "./Controllers/FiscalDataController";
export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class Server {
  private app: Application;
  private PORT: number;
  private server: http.Server | null;

  private SapHandler: SapHandler | null;
  private FiscalDataInstance: FiscalDataHandler | null;
  
  constructor() {
    this.server = null;
    this.app = express();
    this.PORT = parseInt(process.env.PORT as string);
    this.SapHandler = null;
    this.FiscalDataInstance = null;
  }

  private async getHandlers() {
    this.SapHandler = SapHandler.getInstance();
    this.FiscalDataInstance = FiscalDataHandler.getInstance();

    await this.SapHandler.maintainServicesLogin();
  }

  private applyMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(authMiddleware);
  }

  private async applyRoutes(): Promise<void> {
    if (!this.SapHandler || !this.FiscalDataInstance) {
      throw new HttpError(500, "Erro ao aplicar rotas: Handlers não foram instanciados corretamente.");
    }
    const router = new routerClass(this.SapHandler, this.FiscalDataInstance);
    const routes = router.getRoutes();
    
    this.app.use("/webservices", routes);
  }


  public async start() {
    this.applyMiddlewares();
    this.app.use(ErrorHandling);
    
    await this.getHandlers();
    await this.applyRoutes();
    
    this.server = this.app.listen(this.PORT, () => {
      console.log(`Server is running on port ${this.PORT} in ${process.env.NODE_ENV} mode`);
    });
  }

  public async stop() {
    if (this.server) {
      if (this.SapHandler) {
        this.SapHandler.stopServiceLayerLoginMaintainer();
      }

      this.server.close();
    }
  }
}

export default Server;
