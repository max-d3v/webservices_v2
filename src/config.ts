import dotenv from 'dotenv';

dotenv.config();

const mode = process.env.NODE_ENV || 'development';
const envFile = `.env.${mode}`;
dotenv.config({ path: envFile });

const env = process.env;

export default env;