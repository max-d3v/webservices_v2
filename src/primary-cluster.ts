import cluster from "cluster";
import os from "os";

try {
const CORE_COUNT = os.cpus().length;
let USABLE_CORES = CORE_COUNT - 2;
if (USABLE_CORES < 1) {
    USABLE_CORES = 1;
}

console.log("Number of cores used: ", USABLE_CORES);


    cluster.setupPrimary({
        exec: './dist/main.js',
        args: ['--use', 'https']
    });
    
    for (let i = 0; i < USABLE_CORES; i++) {
        cluster.fork();
    }
    
    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.id} died`);
        cluster.fork();
    });
} catch(err: any) {
    console.log("Error on primary cluster: ", err.message);
}
