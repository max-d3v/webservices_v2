import express, { Application } from "express";
import { ErrorHandling } from "./utils/errorHandler";
import { authMiddleware } from "./middlewares/auth";
import { SapHandler } from "./Handlers/SapHandler";
import { FiscalDataHandler } from "./Handlers/FiscalDataHandler";
import { Session } from 'node:inspector/promises';
import { writeFile } from "node:fs/promises";
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
  public static instance: Server;

  private SapHandler: SapHandler | null;
  private FiscalDataInstance: FiscalDataHandler | null;
  
  constructor() {
    this.server = null;
    this.app = express();
    this.PORT = parseInt(process.env.PORT as string);
    this.SapHandler = new SapHandler();
    this.FiscalDataInstance = new FiscalDataHandler();
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
        console.log(profile)
        _session.disconnect();
        
        const profileName = `cpu_profiles/profile-${Date.now()}.cpuprofile`;
        await writeFile(profileName, JSON.stringify(profile));
        
        return profile;
      }
    }
  }

  private async getHandlers() {
    this.SapHandler = SapHandler.getInstance();
    this.FiscalDataInstance = FiscalDataHandler.getInstance();

    await this.SapHandler.maintainServicesLogin();
  }

  private logMemoryUsage() {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      console.log(`Memory Usage: RSS: ${memoryUsage.rss / 1024 / 1024} MB, Heap Used: ${memoryUsage.heapUsed / 1024 / 1024} MB`);
    }, 5000); 
  }

  private applyMiddlewares(): void {
    //this.logMemoryUsage()

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

  private startCpuProfiling() {
    const { start, stop } = this.cpuProfiling();
    console.log(`Started CPU profiling`);
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
    this.startCpuProfiling();

    this.applyMiddlewares();
    
    await this.getHandlers();
    await this.applyRoutes();

    this.app.use(ErrorHandling);
    
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
