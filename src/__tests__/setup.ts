import { config } from 'dotenv';

// Configurar variáveis de ambiente para testes
config({ path: './sensitive_data/env.tst.txt' });

// Configuração global para timeouts
jest.setTimeout(30000);