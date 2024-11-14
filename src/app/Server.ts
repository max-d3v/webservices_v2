import express, { Application, NextFunction } from "express";
import { ErrorHandling } from "../utils/errorHandler";
import { authMiddleware } from "../middlewares/auth";
import { SapB1ServiceLayer } from "../Clients/SapB1ServiceLayerClient";
import http from "http";
import { Router } from "./Router";
import { Request, Response } from "express";

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class Server {
  private app: Application;
  private PORT: number;
  private server: http.Server | null;
  public static instance: Server;
  
  constructor() {
    this.server = null;
    this.app = express();
    this.PORT = parseInt(process.env.PORT as string);
  }

  public static getInstance(): Server {
    if (!Server.instance) {
        Server.instance = new Server();
    }
    return Server.instance;
}

  private async instanciateSapB1Service() {
    SapB1ServiceLayer.getInstance();
  }

  private applyMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(authMiddleware);
  }

  private async applyRoutes(): Promise<void> {
    const router = new Router();    
    this.app.use("/webservices", (req: Request, res: Response, next: NextFunction) => {
      router.handleRoute(req, res, next)
    });
  }


  public async start() {
    this.applyMiddlewares();
    
    await this.instanciateSapB1Service();
    await this.applyRoutes();

    this.app.use(ErrorHandling);
    
    this.server = this.app.listen(this.PORT, () => {
      console.log(`Server is running on port ${this.PORT} in ${process.env.NODE_ENV} mode`);
    });
  }

  public async stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

export default Server;
