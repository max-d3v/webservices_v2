import Server from "./server";
import dotenv from "dotenv";


const configureEnvironment = () => {
    dotenv.config();
    const mode = process.env.NODE_ENV;
    console.log("Environment: ", mode);
    const envFile = `.env.${mode}`;
    dotenv.config({ path: envFile });
}

const startServer = async () => {
    configureEnvironment();

    const { default: router } = await import("./router/routes");

    const routes = router;
    const server = new Server(routes);
    server.start();
}


startServer();