import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  memoryUsage?: NodeJS.MemoryUsage;
}

interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

export class PerformanceAnalyzer {
  private metrics: PerformanceMetric[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async measureSingleRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<PerformanceMetric> {
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();
    
    try {
      const response = await axios({
        url: `${this.baseUrl}${endpoint}`,
        method,
        data,
        timeout: 10000
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const memoryAfter = process.memoryUsage();

      const metric: PerformanceMetric = {
        endpoint,
        method,
        responseTime,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
        memoryUsage: {
          rss: memoryAfter.rss - memoryBefore.rss,
          heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          external: memoryAfter.external - memoryBefore.external,
          arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers
        }
      };

      this.metrics.push(metric);
      return metric;

    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const metric: PerformanceMetric = {
        endpoint,
        method,
        responseTime,
        statusCode: error.response?.status || 0,
        timestamp: new Date().toISOString()
      };

      this.metrics.push(metric);
      return metric;
    }
  }

  async runLoadTest(endpoint: string, concurrentUsers: number = 10, totalRequests: number = 100, method: 'GET' | 'POST' = 'GET', data?: any): Promise<LoadTestResult> {
    console.log(`🚀 Iniciando teste de carga: ${endpoint}`);
    console.log(`👥 Usuários simultâneos: ${concurrentUsers}`);
    console.log(`📊 Total de requisições: ${totalRequests}`);

    const startTime = Date.now();
    const promises: Promise<PerformanceMetric>[] = [];
    const requestsPerBatch = Math.ceil(totalRequests / concurrentUsers);

    // Executar requisições em lotes para simular usuários simultâneos
    for (let i = 0; i < concurrentUsers; i++) {
      for (let j = 0; j < requestsPerBatch && (i * requestsPerBatch + j) < totalRequests; j++) {
        promises.push(this.measureSingleRequest(endpoint, method, data));
      }
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // em segundos

    const successfulResults: PerformanceMetric[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.statusCode >= 200 && result.value.statusCode < 300) {
          successfulResults.push(result.value);
        } else {
          errors.push(`Request ${index + 1}: HTTP ${result.value.statusCode}`);
        }
      } else {
        errors.push(`Request ${index + 1}: ${result.reason}`);
      }
    });

    const responseTimes = successfulResults.map(r => r.responseTime);
    const averageResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 0;

    const loadTestResult: LoadTestResult = {
      endpoint,
      totalRequests: promises.length,
      successfulRequests: successfulResults.length,
      failedRequests: promises.length - successfulResults.length,
      averageResponseTime,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond: Math.round(successfulResults.length / totalTime),
      errors
    };

    return loadTestResult;
  }

  async runPerformanceAudit(endpoints: Array<{path: string, method?: 'GET' | 'POST', data?: any}>): Promise<void> {
    console.log('🔍 Executando auditoria de performance...\n');

    const results: LoadTestResult[] = [];

    for (const endpoint of endpoints) {
      console.log(`Testing ${endpoint.path}...`);
      
      // Teste individual
      await this.measureSingleRequest(endpoint.path, endpoint.method, endpoint.data);
      
      // Teste de carga
      const loadResult = await this.runLoadTest(endpoint.path, 5, 25, endpoint.method, endpoint.data);
      results.push(loadResult);
      
      // Pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.generatePerformanceReport(results);
  }

  private generatePerformanceReport(loadTestResults: LoadTestResult[]): void {
    const reportDir = './quality-metrics';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Relatório consolidado
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEndpointsTested: loadTestResults.length,
        averageResponseTime: Math.round(loadTestResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / loadTestResults.length),
        totalRequests: loadTestResults.reduce((sum, r) => sum + r.totalRequests, 0),
        totalSuccessfulRequests: loadTestResults.reduce((sum, r) => sum + r.successfulRequests, 0),
        averageRequestsPerSecond: Math.round(loadTestResults.reduce((sum, r) => sum + r.requestsPerSecond, 0) / loadTestResults.length),
        slowestEndpoint: loadTestResults.reduce((prev, current) => 
          prev.averageResponseTime > current.averageResponseTime ? prev : current
        ),
        fastestEndpoint: loadTestResults.reduce((prev, current) => 
          prev.averageResponseTime < current.averageResponseTime ? prev : current
        )
      },
      detailedResults: loadTestResults,
      individualMetrics: this.metrics
    };

    // Salvar relatório JSON
    fs.writeFileSync(
      path.join(reportDir, 'performance-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Gerar relatório HTML
    this.generatePerformanceHtmlReport(report, reportDir);

    // Log resumo no console
    console.log('\n📈 RELATÓRIO DE PERFORMANCE');
    console.log('============================');
    console.log(`Endpoints testados: ${report.summary.totalEndpointsTested}`);
    console.log(`Tempo médio de resposta: ${report.summary.averageResponseTime}ms`);
    console.log(`Requisições por segundo: ${report.summary.averageRequestsPerSecond} req/s`);
    console.log(`Taxa de sucesso: ${Math.round((report.summary.totalSuccessfulRequests / report.summary.totalRequests) * 100)}%`);
    console.log(`\n🐌 Endpoint mais lento: ${report.summary.slowestEndpoint.endpoint} (${report.summary.slowestEndpoint.averageResponseTime}ms)`);
    console.log(`⚡ Endpoint mais rápido: ${report.summary.fastestEndpoint.endpoint} (${report.summary.fastestEndpoint.averageResponseTime}ms)`);
  }

  private generatePerformanceHtmlReport(report: any, reportDir: string): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Relatório de Performance</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .slow { background-color: #ffebee; }
        .fast { background-color: #e8f5e8; }
        .medium { background-color: #fff3e0; }
        .chart { margin: 20px 0; }
    </style>
</head>
<body>
    <h1>📈 Relatório de Performance</h1>
    <p>Gerado em: ${report.timestamp}</p>
    
    <div class="summary">
        <h2>Resumo Executivo</h2>
        <div class="metric">
            <strong>Endpoints Testados:</strong><br>${report.summary.totalEndpointsTested}
        </div>
        <div class="metric">
            <strong>Tempo Médio de Resposta:</strong><br>${report.summary.averageResponseTime}ms
        </div>
        <div class="metric">
            <strong>Requisições por Segundo:</strong><br>${report.summary.averageRequestsPerSecond} req/s
        </div>
        <div class="metric">
            <strong>Taxa de Sucesso:</strong><br>${Math.round((report.summary.totalSuccessfulRequests / report.summary.totalRequests) * 100)}%
        </div>
    </div>

    <h2>Resultados Detalhados por Endpoint</h2>
    <table>
        <tr>
            <th>Endpoint</th>
            <th>Requisições</th>
            <th>Sucessos</th>
            <th>Falhas</th>
            <th>Tempo Médio (ms)</th>
            <th>Min (ms)</th>
            <th>Max (ms)</th>
            <th>Req/s</th>
            <th>Status</th>
        </tr>
        ${report.detailedResults.map((result: any) => {
          const avgTime = result.averageResponseTime;
          const cssClass = avgTime > 2000 ? 'slow' : avgTime > 1000 ? 'medium' : 'fast';
          const status = avgTime > 2000 ? '🔴 Lento' : avgTime > 1000 ? '🟡 Médio' : '🟢 Rápido';
          
          return `
        <tr class="${cssClass}">
            <td>${result.endpoint}</td>
            <td>${result.totalRequests}</td>
            <td>${result.successfulRequests}</td>
            <td>${result.failedRequests}</td>
            <td>${result.averageResponseTime}</td>
            <td>${result.minResponseTime}</td>
            <td>${result.maxResponseTime}</td>
            <td>${result.requestsPerSecond}</td>
            <td>${status}</td>
        </tr>`;
        }).join('')}
    </table>

    <h2>Análise de Erros</h2>
    ${report.detailedResults.filter((r: any) => r.errors.length > 0).map((result: any) => `
        <h3>${result.endpoint}</h3>
        <ul>
            ${result.errors.map((error: string) => `<li>${error}</li>`).join('')}
        </ul>
    `).join('')}
</body>
</html>`;

    fs.writeFileSync(path.join(reportDir, 'performance-report.html'), html);
  }

  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }
}

// Script para executar teste de performance
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  
  const endpoints = [
    { path: '/api/businesspartner/testClients', method: 'GET' as const },
    { path: '/api/businesspartner/oldInactiveClients', method: 'GET' as const },
    { 
      path: '/api/businesspartner/process/Deactivate', 
      method: 'POST' as const,
      data: {
        selects: ['CardCode', 'CardName'],
        filters: [],
        tables: ['OCRD'],
        limit: 10
      }
    }
  ];

  analyzer.runPerformanceAudit(endpoints)
    .then(() => console.log('✅ Auditoria de performance concluída!'))
    .catch(console.error);
}