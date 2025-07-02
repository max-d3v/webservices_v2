import express, { Application, NextFunction } from "express";
import { ErrorHandling } from "../utils/errorHandler";
import { authMiddleware } from "../middlewares/auth";
import { SapB1ServiceLayerServices } from "../Services/SapB1ServiceLayerServices";
import http from "http";
import { Router } from "./Router";
import { Request, Response } from "express";
import { Session } from 'node:inspector/promises';
import { writeFile } from "node:fs/promises";

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class Server {
  private app: Application;
  private PORT: number;
  public server: http.Server | null;
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

  private cpuProfiling() {
    let _session: Session;
    return {
      async start() {
        _session = new Session();
        _session.connect();

        await _session.post("Profiler.enable");
        await _session.post("Profiler.start");
      },

      async stop() {
        const { profile } = await _session.post("Profiler.stop");
        _session.disconnect();

        const profileName = `cpu_profiling/profile-${Date.now()}.cpuprofile`;
        await writeFile(profileName, JSON.stringify(profile));
        console.log(`Saved cpu profile ${profileName.split("/")[1]}`);
        return profile;
      }
    }
  }

  private instanciateSapB1Service() {
    SapB1ServiceLayerServices.getInstance();
  }

  private applyMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(authMiddleware);
  }

  private applyRoutes(): void {
    const router = new Router();
    this.app.use("/webservices", (req: Request, res: Response, next: NextFunction) => {
      router.handleRoute(req, res, next)
    });
  }

  private profile_cpu_usage() {
    const { start, stop } = this.cpuProfiling();
    start();

    const exitSignals = ["SIGINT", "SIGTERM", "SIGUSR2"];
    exitSignals.forEach(signal => {
      process.on(signal, async () => {
        await stop();
        console.log(`Stopped cpu profile`);
        process.exit(0);
      });
    })
  }


  public async start() {
    this.app.use(ErrorHandling);
    this.profile_cpu_usage();

    this.applyMiddlewares();
    this.instanciateSapB1Service();
    this.applyRoutes();

    
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
