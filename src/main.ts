import { setupEnv } from './config';
import Server from "./Server";


export const startServer = async () => {
    setupEnv();

    const server = new Server();

    server.start(); 

    return server;
}


startServer();