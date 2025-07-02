import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CodeComplexityAnalyzer } from './complexity-analyzer';
import { PerformanceAnalyzer } from './performance-analyzer';

interface QualityMetric {
  id: string;
  name: string;
  target: string;
  actual: string;
  status: 'OK' | 'NOK';
  tool: string;
  evidence: string;
  recommendation?: string;
}

interface AuditReport {
  timestamp: string;
  projectName: string;
  auditVersion: string;
  summary: {
    totalMetrics: number;
    passedMetrics: number;
    failedMetrics: number;
    overallScore: number;
  };
  metrics: QualityMetric[];
  detailedAnalysis: {
    codeQuality: any;
    performance: any;
    testCoverage: any;
  };
}

export class QualityAuditor {
  private metrics: QualityMetric[] = [];
  private reportDir: string = './quality-metrics';

  constructor() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async runFullAudit(): Promise<AuditReport> {
    console.log('🔍 INICIANDO AUDITORIA COMPLETA DE QUALIDADE');
    console.log('==============================================\n');

    // 1. Análise de Cobertura de Código
    console.log('📊 1. Executando análise de cobertura de código...');
    const coverageData = await this.runCoverageAnalysis();

    // 2. Análise de Complexidade Ciclomática
    console.log('🔄 2. Executando análise de complexidade ciclomática...');
    const complexityData = await this.runComplexityAnalysis();

    // 3. Testes de Performance
    console.log('⚡ 3. Executando testes de performance...');
    const performanceData = await this.runPerformanceAnalysis();

    // 4. Compilar métricas
    this.compileMetrics(coverageData, complexityData, performanceData);

    // 5. Gerar relatório final
    const report = this.generateFinalReport(coverageData, complexityData, performanceData);

    console.log('\n✅ AUDITORIA CONCLUÍDA!');
    console.log(`📄 Relatório gerado em: ${this.reportDir}/audit-report.html`);

    return report;
  }

  private async runCoverageAnalysis(): Promise<any> {
    try {
      // Executar testes com cobertura
      const output = execSync('npm test -- --coverage --coverageReporters=json-summary', 
        { encoding: 'utf-8', cwd: process.cwd() });
      
      // Ler dados de cobertura
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        return coverageData;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao executar análise de cobertura:', error);
    }
    
    return { total: { lines: { pct: 0 }, functions: { pct: 0 }, branches: { pct: 0 }, statements: { pct: 0 } } };
  }

  private async runComplexityAnalysis(): Promise<any> {
    const analyzer = new CodeComplexityAnalyzer();
    analyzer.analyzeDirectory('./src');
    
    const results = analyzer.getResults();
    const fileStats = analyzer.getFileStats();
    
    return {
      results,
      fileStats,
      summary: {
        totalFunctions: results.length,
        averageComplexity: results.length > 0 
          ? Math.round(results.reduce((sum, r) => sum + r.complexity, 0) / results.length * 100) / 100 
          : 0,
        maxComplexity: results.length > 0 ? Math.max(...results.map(r => r.complexity)) : 0,
        highComplexityFunctions: results.filter(r => r.complexity > 10).length
      }
    };
  }

  private async runPerformanceAnalysis(): Promise<any> {
    // Verificar se o servidor está rodando
    const analyzer = new PerformanceAnalyzer();
    
    const endpoints = [
      { path: '/api/businesspartner/testClients', method: 'GET' as const },
      { path: '/api/businesspartner/oldInactiveClients', method: 'GET' as const }
    ];

    try {
      const results = [];
      for (const endpoint of endpoints) {
        const result = await analyzer.runLoadTest(endpoint.path, 3, 10, endpoint.method);
        results.push(result);
      }
      
      return {
        results,
        summary: {
          averageResponseTime: Math.round(results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length),
          totalRequests: results.reduce((sum, r) => sum + r.totalRequests, 0),
          successRate: Math.round((results.reduce((sum, r) => sum + r.successfulRequests, 0) / 
                                  results.reduce((sum, r) => sum + r.totalRequests, 0)) * 100)
        }
      };
    } catch (error) {
      console.warn('⚠️ Não foi possível executar testes de performance. Servidor pode não estar rodando.');
      return {
        results: [],
        summary: { averageResponseTime: 0, totalRequests: 0, successRate: 0 },
        error: 'Servidor não disponível para testes'
      };
    }
  }

  private compileMetrics(coverageData: any, complexityData: any, performanceData: any): void {
    // M-01: Cobertura de Código
    const lineCoverage = coverageData.total?.lines?.pct || 0;
    this.metrics.push({
      id: 'M-01',
      name: 'Cobertura de Código (Linhas)',
      target: '≥ 80%',
      actual: `${lineCoverage}%`,
      status: lineCoverage >= 80 ? 'OK' : 'NOK',
      tool: 'Jest + Coverage',
      evidence: './coverage/index.html',
      recommendation: lineCoverage < 80 ? 'Adicionar mais testes unitários para cobrir código não testado' : undefined
    });

    // M-02: Cobertura de Funções
    const functionCoverage = coverageData.total?.functions?.pct || 0;
    this.metrics.push({
      id: 'M-02',
      name: 'Cobertura de Funções',
      target: '≥ 80%',
      actual: `${functionCoverage}%`,
      status: functionCoverage >= 80 ? 'OK' : 'NOK',
      tool: 'Jest + Coverage',
      evidence: './coverage/index.html'
    });

    // M-03: Complexidade Ciclomática Média
    const avgComplexity = complexityData.summary.averageComplexity;
    this.metrics.push({
      id: 'M-03',
      name: 'Complexidade Ciclomática Média',
      target: '< 10',
      actual: avgComplexity.toString(),
      status: avgComplexity < 10 ? 'OK' : 'NOK',
      tool: 'Analisador Customizado',
      evidence: './quality-metrics/complexity-report.html',
      recommendation: avgComplexity >= 10 ? 'Refatorar funções com alta complexidade' : undefined
    });

    // M-04: Funções de Alta Complexidade
    const highComplexityCount = complexityData.summary.highComplexityFunctions;
    this.metrics.push({
      id: 'M-04',
      name: 'Funções com Alta Complexidade (>10)',
      target: '< 5',
      actual: highComplexityCount.toString(),
      status: highComplexityCount < 5 ? 'OK' : 'NOK',
      tool: 'Analisador Customizado',
      evidence: './quality-metrics/complexity-report.html'
    });

    // M-05: Tempo de Resposta Médio
    if (performanceData.summary && !performanceData.error) {
      const avgResponseTime = performanceData.summary.averageResponseTime;
      this.metrics.push({
        id: 'M-05',
        name: 'Tempo de Resposta Médio',
        target: '< 2000ms',
        actual: `${avgResponseTime}ms`,
        status: avgResponseTime < 2000 ? 'OK' : 'NOK',
        tool: 'Analisador de Performance',
        evidence: './quality-metrics/performance-report.html',
        recommendation: avgResponseTime >= 2000 ? 'Otimizar consultas e algoritmos' : undefined
      });

      // M-06: Taxa de Sucesso
      const successRate = performanceData.summary.successRate;
      this.metrics.push({
        id: 'M-06',
        name: 'Taxa de Sucesso das Requisições',
        target: '≥ 95%',
        actual: `${successRate}%`,
        status: successRate >= 95 ? 'OK' : 'NOK',
        tool: 'Analisador de Performance',
        evidence: './quality-metrics/performance-report.html'
      });
    } else {
      this.metrics.push({
        id: 'M-05',
        name: 'Tempo de Resposta Médio',
        target: '< 2000ms',
        actual: 'N/A',
        status: 'NOK',
        tool: 'Analisador de Performance',
        evidence: 'Teste não executado',
        recommendation: 'Iniciar servidor e executar novamente'
      });
    }
  }

  private generateFinalReport(coverageData: any, complexityData: any, performanceData: any): AuditReport {
    const passedMetrics = this.metrics.filter(m => m.status === 'OK').length;
    const totalMetrics = this.metrics.length;
    const overallScore = Math.round((passedMetrics / totalMetrics) * 100);

    const report: AuditReport = {
      timestamp: new Date().toISOString(),
      projectName: 'WebServices Node.js - Sistema SAP B1',
      auditVersion: '1.0',
      summary: {
        totalMetrics,
        passedMetrics,
        failedMetrics: totalMetrics - passedMetrics,
        overallScore
      },
      metrics: this.metrics,
      detailedAnalysis: {
        codeQuality: complexityData,
        performance: performanceData,
        testCoverage: coverageData
      }
    };

    // Salvar relatório JSON
    fs.writeFileSync(
      path.join(this.reportDir, 'audit-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Gerar relatório HTML
    this.generateAuditHtmlReport(report);

    // Log resumo
    console.log('\n📋 RESUMO DA AUDITORIA');
    console.log('======================');
    console.log(`Score Geral: ${overallScore}%`);
    console.log(`Métricas Aprovadas: ${passedMetrics}/${totalMetrics}`);
    console.log('\n📊 Status das Métricas:');
    this.metrics.forEach(metric => {
      const status = metric.status === 'OK' ? '✅' : '❌';
      console.log(`${status} ${metric.id} - ${metric.name}: ${metric.actual} (Meta: ${metric.target})`);
    });

    return report;
  }

  private generateAuditHtmlReport(report: AuditReport): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Relatório de Auditoria de Qualidade - N2</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .score { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .score.excellent { color: #28a745; }
        .score.good { color: #ffc107; }
        .score.poor { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .status-ok { color: #28a745; font-weight: bold; }
        .status-nok { color: #dc3545; font-weight: bold; }
        .recommendation { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 5px 0; font-size: 0.9em; }
        .section { margin: 40px 0; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 RELATÓRIO DE AUDITORIA DE QUALIDADE</h1>
            <h2>N2 - Qualidade de Software (Testes e Observabilidade)</h2>
            <p><strong>${report.projectName}</strong></p>
            <p>Gerado em: ${new Date(report.timestamp).toLocaleString('pt-BR')}</p>
        </div>

        <div class="summary">
            <div class="metric-card">
                <h3>Score Geral</h3>
                <div class="score ${report.summary.overallScore >= 80 ? 'excellent' : report.summary.overallScore >= 60 ? 'good' : 'poor'}">
                    ${report.summary.overallScore}%
                </div>
            </div>
            <div class="metric-card">
                <h3>Métricas Aprovadas</h3>
                <div class="score">${report.summary.passedMetrics}/${report.summary.totalMetrics}</div>
            </div>
            <div class="metric-card">
                <h3>Métricas Reprovadas</h3>
                <div class="score">${report.summary.failedMetrics}</div>
            </div>
        </div>

        <div class="section">
            <h2>📋 Auditoria das Métricas de Qualidade</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Métrica</th>
                        <th>Meta</th>
                        <th>Resultado</th>
                        <th>Status</th>
                        <th>Ferramenta</th>
                        <th>Evidência</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.metrics.map(metric => `
                    <tr>
                        <td><strong>${metric.id}</strong></td>
                        <td>${metric.name}</td>
                        <td>${metric.target}</td>
                        <td>${metric.actual}</td>
                        <td class="status-${metric.status.toLowerCase()}">${metric.status === 'OK' ? '✅ OK' : '❌ NOK'}</td>
                        <td>${metric.tool}</td>
                        <td><code>${metric.evidence}</code></td>
                    </tr>
                    ${metric.recommendation ? `
                    <tr>
                        <td colspan="7">
                            <div class="recommendation">
                                <strong>💡 Recomendação:</strong> ${metric.recommendation}
                            </div>
                        </td>
                    </tr>
                    ` : ''}
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📈 Análise dos Resultados</h2>
            <h3>✅ Métricas Atingidas</h3>
            <ul>
                ${report.metrics.filter(m => m.status === 'OK').map(metric => 
                    `<li><strong>${metric.name}:</strong> ${metric.actual} (Meta: ${metric.target})</li>`
                ).join('')}
            </ul>

            <h3>❌ Métricas Não Atingidas</h3>
            <ul>
                ${report.metrics.filter(m => m.status === 'NOK').map(metric => 
                    `<li><strong>${metric.name}:</strong> ${metric.actual} (Meta: ${metric.target})</li>`
                ).join('')}
            </ul>
        </div>

        <div class="section">
            <h2>🔧 Ações Corretivas e Melhorias Propostas</h2>
            <ul>
                ${report.metrics.filter(m => m.recommendation).map(metric => 
                    `<li><strong>${metric.name}:</strong> ${metric.recommendation}</li>`
                ).join('')}
                <li><strong>Monitoramento Contínuo:</strong> Implementar pipeline CI/CD com verificação automática de qualidade</li>
                <li><strong>Code Review:</strong> Estabelecer processo obrigatório de revisão de código</li>
                <li><strong>Documentação:</strong> Manter documentação atualizada das métricas e processos</li>
            </ul>
        </div>

        <div class="section">
            <h2>📊 Conclusão</h2>
            <p><strong>Grau de Aderência à Qualidade:</strong> ${report.summary.overallScore}%</p>
            <p><strong>Status Geral:</strong> ${report.summary.overallScore >= 80 ? 
                '🟢 Excelente - Sistema atende aos padrões de qualidade' : 
                report.summary.overallScore >= 60 ? 
                '🟡 Bom - Sistema precisa de melhorias pontuais' : 
                '🔴 Crítico - Sistema necessita de refatoração significativa'
            }</p>
            
            <h3>Próximos Passos:</h3>
            <ol>
                <li>Implementar as ações corretivas recomendadas</li>
                <li>Estabelecer monitoramento contínuo das métricas</li>
                <li>Realizar auditorias regulares de qualidade</li>
                <li>Integrar verificações de qualidade no processo de CI/CD</li>
            </ol>
        </div>

        <div class="section">
            <h2>📎 Anexos</h2>
            <ul>
                <li><a href="./coverage/index.html">Relatório de Cobertura de Código</a></li>
                <li><a href="./complexity-report.html">Relatório de Complexidade Ciclomática</a></li>
                <li><a href="./performance-report.html">Relatório de Performance</a></li>
                <li><a href="./audit-report.json">Dados Brutos da Auditoria (JSON)</a></li>
            </ul>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(this.reportDir, 'audit-report.html'), html);
  }
}

// Script para executar auditoria completa
if (require.main === module) {
  const auditor = new QualityAuditor();
  auditor.runFullAudit()
    .then(report => {
      console.log(`\n🎉 Auditoria concluída com score: ${report.summary.overallScore}%`);
    })
    .catch(console.error);
}