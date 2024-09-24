//make sure this is the furst import. to load the env variables
import { setupEnv } from './config';
import Server from "./server";


export const startServer = async () => {
    setupEnv();

    const server = new Server();

    server.start(); 

    return server;
}


startServer();