import express, { Application, Router } from "express";
import { ErrorHandling } from "./utils/errorHandler";




export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

class Server {
  private app: Application;
  private PORT: number;
  private routes: Router;
  
  constructor(routes: Router) {
    this.app = express();
    this.PORT = parseInt(process.env.PORT as string);
    this.routes = routes;
  }

  private applyMiddlewares(): void {
    this.app.use(express.json());
  }

  private applyRoutes(routes: Router): void {
    this.app.use("/webservices", routes);
  }

  public start() {
    this.applyMiddlewares();
    this.applyRoutes(this.routes);
    this.app.use(ErrorHandling);
    this.app.listen(this.PORT, () => {
      console.log(`Server is running on port ${this.PORT} in ${process.env.NODE_ENV} mode`);
    });
  }
}

export default Server;
