import express from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Configurar coleta de métricas padrão
collectDefaultMetrics({ prefix: 'webservices_' });

// Métricas customizadas para CI/CD
export const cicdMetrics = {
  // Deployments
  deploymentsTotal: new Counter({
    name: 'cicd_deployments_total',
    help: 'Total number of deployments',
    labelNames: ['environment', 'status', 'branch']
  }),

  // Quality Gates
  qualityGateScore: new Gauge({
    name: 'cicd_quality_gate_score',
    help: 'Current quality gate score percentage',
    labelNames: ['environment']
  }),

  // Build metrics
  buildDuration: new Histogram({
    name: 'cicd_build_duration_seconds',
    help: 'Duration of builds in seconds',
    labelNames: ['environment', 'status'],
    buckets: [10, 30, 60, 120, 300, 600]
  }),

  // Test metrics
  testCoverage: new Gauge({
    name: 'cicd_test_coverage_percentage',
    help: 'Test coverage percentage',
    labelNames: ['type'] // unit, integration, e2e
  }),

  // Application metrics
  httpRequestsTotal: new Counter({
    name: 'webservices_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),

  httpRequestDuration: new Histogram({
    name: 'webservices_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  // Database metrics
  databaseConnections: new Gauge({
    name: 'webservices_database_connections_active',
    help: 'Number of active database connections'
  }),

  databaseQueryDuration: new Histogram({
    name: 'webservices_database_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
  })
};

// Middleware para coleta automática de métricas HTTP
export const metricsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    cicdMetrics.httpRequestsTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .inc();
    
    cicdMetrics.httpRequestDuration
      .labels(req.method, req.route?.path || req.path)
      .observe(duration);
  });
  
  next();
};

// Endpoint para exposição de métricas
export const metricsHandler = async (req: express.Request, res: express.Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};

// Funções para atualizar métricas de CI/CD
export const updateDeploymentMetrics = (environment: string, status: 'success' | 'failure', branch: string) => {
  cicdMetrics.deploymentsTotal.labels(environment, status, branch).inc();
};

export const updateQualityGateScore = (environment: string, score: number) => {
  cicdMetrics.qualityGateScore.labels(environment).set(score);
};

export const updateBuildMetrics = (environment: string, status: 'success' | 'failure', duration: number) => {
  cicdMetrics.buildDuration.labels(environment, status).observe(duration);
};

export const updateTestCoverage = (type: 'unit' | 'integration' | 'e2e', coverage: number) => {
  cicdMetrics.testCoverage.labels(type).set(coverage);
};

// Health check endpoint com métricas
export const healthCheck = async (req: express.Request, res: express.Response) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    metrics: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  };
  
  res.status(200).json(healthData);
};