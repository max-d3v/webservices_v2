import request from 'supertest';
import { Server } from '../../app/Server';
import { config } from 'dotenv';

// Configurar ambiente de teste
config({ path: './sensitive_data/env.tst.txt' });

describe('Integration Tests - BusinessPartner API', () => {
  let server: Server;
  let app: any;

  beforeAll(async () => {
    server = new Server();
    app = server.server;
  });

  afterAll(async () => {
    // Cleanup se necessário
  });

  describe('GET /api/businesspartner', () => {
    it('deve retornar status 200 para requisição válida', async () => {
      const response = await request(app)
        .get('/api/businesspartner/testClients')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    }, 10000);

    it('deve retornar erro 400 para tipo inválido', async () => {
      const response = await request(app)
        .get('/api/businesspartner/invalidType')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/businesspartner/process', () => {
    it('deve processar ação válida', async () => {
      const requestBody = {
        selects: ['CardCode', 'CardName'],
        filters: [],
        tables: ['OCRD'],
        limit: 10
      };

      const response = await request(app)
        .post('/api/businesspartner/process/Deactivate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toBeDefined();
    }, 15000);
  });

  describe('Performance Tests', () => {
    it('deve responder em menos de 2 segundos', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/businesspartner/testClients')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(2000);
    });

    it('deve suportar múltiplas requisições simultâneas', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/businesspartner/testClients')
          .expect(200)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    }, 30000);
  });
});