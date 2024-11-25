import dotenv from 'dotenv';

export const setupEnv = () => {
    dotenv.config();
    const mode = process.env.NODE_ENV || 'prd';
    const envFile = `.env.${mode}`;
    dotenv.config({ path: envFile });
}

setupEnv();