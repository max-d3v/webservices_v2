import Server from "./server";
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


    const { default: router } = await import("./router/routes");

    const routes = router;
    
    console.log("Variaveis de ambiente:", process.env);
    const server = new Server(routes);

    server.start(); 
}


startServer();