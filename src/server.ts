import express, { Application } from "express";
import { ErrorHandling } from "./utils/errorHandler";
import { authMiddleware } from "./middlewares/auth";
import routerClass from "./router/routes";
import http from "http";
export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class Server {
  private app: Application;
  private PORT: number;
  private server: http.Server | null;
  
  constructor() {
    this.server = null;
    this.app = express();
    this.PORT = parseInt(process.env.PORT as string);
  }

  private applyMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(authMiddleware);
  }

  private async applyRoutes(): Promise<void> {
    const routes = new routerClass().getRouter();
    
    this.app.use("/webservices", routes);
  }

  public async start() {
    this.applyMiddlewares();
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
