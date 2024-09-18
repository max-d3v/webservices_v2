import express, { Application, Router } from "express";
import { ErrorHandling } from "./utils/errorHandler";
import { authMiddleware } from "./middlewares/auth";
import { createRoutes } from "./router/routes";

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

class Server {
  private app: Application;
  private PORT: number;
  
  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT as string);
  }

  private applyMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(authMiddleware);
  }

  private async applyRoutes(): Promise<void> {
    const routes = await createRoutes();
    this.app.use("/webservices", routes);
  }

  public async start() {
    this.applyMiddlewares();
    await this.applyRoutes();
    this.app.use(ErrorHandling);
    this.app.listen(this.PORT, () => {
      console.log(`Server is running on port ${this.PORT} in ${process.env.NODE_ENV} mode`);
    });
  }
}

export default Server;
