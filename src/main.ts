//make sure this is the furst import. to load the env variables
import './config';

import Server from "./server";
export const startServer = async () => {
    const server = new Server();

    server.start(); 

    return server;
}


startServer();