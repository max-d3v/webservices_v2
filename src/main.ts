import dotenv from "dotenv";


const configureEnvironment = () => {
    dotenv.config();
    const mode = process.env.NODE_ENV;

    const envFile = `.env.${mode}`;
    dotenv.config({ path: envFile });
    console.log("Configurado o ambiente: ", mode);
}

const startServer = async () => {
    configureEnvironment();
    
    const { default: Server } = await import("./server");

    const server = new Server();

    server.start(); 
}

//Managed to deploy
startServer();