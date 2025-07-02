import * as fs from 'fs';
import * as path from 'path';

interface ComplexityResult {
  file: string;
  function: string;
  complexity: number;
  startLine: number;
}

interface FileStats {
  file: string;
  totalComplexity: number;
  averageComplexity: number;
  maxComplexity: number;
  functionsCount: number;
  linesOfCode: number;
}

export class CodeComplexityAnalyzer {
  private results: ComplexityResult[] = [];
  private fileStats: FileStats[] = [];

  analyzeDirectory(dirPath: string): void {
    this.walkDirectory(dirPath);
    this.generateReport();
  }

  private walkDirectory(dirPath: string): void {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
        this.walkDirectory(fullPath);
      } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts')) {
        this.analyzeFile(fullPath);
      }
    }
  }

  private analyzeFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let currentFunction = '';
    let functionStartLine = 0;
    let complexity = 0;
    let braceCount = 0;
    let inFunction = false;
    let totalComplexity = 0;
    let functionsCount = 0;
    let linesOfCode = lines.filter(line => line.trim().length > 0).length;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detectar início de função
      const functionMatch = line.match(/(async\s+)?(function\s+\w+|[\w\s]+\([^)]*\)\s*[:{]|\w+\s*=\s*\([^)]*\)\s*=>|^\s*\w+\([^)]*\)\s*\{)/);
      if (functionMatch && !inFunction) {
        currentFunction = this.extractFunctionName(line);
        functionStartLine = i + 1;
        complexity = 1; // Base complexity
        braceCount = 0;
        inFunction = true;
      }

      if (inFunction) {
        // Contar chaves para detectar fim da função
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;

        // Calcular complexidade ciclomática
        const complexityKeywords = [
          'if', 'else if', 'while', 'for', 'do', 'switch', 'case',
          'catch', '&&', '\\|\\|', '\\?', 'forEach', 'map', 'filter'
        ];

        for (const keyword of complexityKeywords) {
          const matches = line.match(new RegExp(`\\b${keyword}\\b`, 'g'));
          if (matches) {
            complexity += matches.length;
          }
        }

        // Fim da função
        if (braceCount === 0 && line.includes('}')) {
          this.results.push({
            file: filePath,
            function: currentFunction || 'anonymous',
            complexity,
            startLine: functionStartLine
          });
          
          totalComplexity += complexity;
          functionsCount++;
          inFunction = false;
        }
      }
    }

    if (functionsCount > 0) {
      this.fileStats.push({
        file: filePath,
        totalComplexity,
        averageComplexity: Math.round((totalComplexity / functionsCount) * 100) / 100,
        maxComplexity: Math.max(...this.results.filter(r => r.file === filePath).map(r => r.complexity)),
        functionsCount,
        linesOfCode
      });
    }
  }

  private extractFunctionName(line: string): string {
    // Extrair nome da função de diferentes formatos
    const patterns = [
      /function\s+(\w+)/,
      /(\w+)\s*\([^)]*\)\s*[:{]/,
      /(\w+)\s*=\s*\([^)]*\)\s*=>/,
      /async\s+(\w+)\s*\(/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'anonymous';
  }

  private generateReport(): void {
    const reportDir = './quality-metrics';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Relatório detalhado
    const detailedReport = this.results
      .sort((a, b) => b.complexity - a.complexity)
      .map(result => ({
        ...result,
        file: path.relative(process.cwd(), result.file)
      }));

    // Relatório por arquivo
    const fileReport = this.fileStats
      .sort((a, b) => b.averageComplexity - a.averageComplexity)
      .map(stat => ({
        ...stat,
        file: path.relative(process.cwd(), stat.file)
      }));

    // Estatísticas gerais
    const totalFunctions = this.results.length;
    const totalComplexity = this.results.reduce((sum, r) => sum + r.complexity, 0);
    const averageComplexity = totalFunctions > 0 ? Math.round((totalComplexity / totalFunctions) * 100) / 100 : 0;
    const maxComplexity = Math.max(...this.results.map(r => r.complexity));
    const highComplexityFunctions = this.results.filter(r => r.complexity > 10).length;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFunctions,
        totalComplexity,
        averageComplexity,
        maxComplexity,
        highComplexityFunctions,
        percentageHighComplexity: totalFunctions > 0 ? Math.round((highComplexityFunctions / totalFunctions) * 100) : 0
      },
      detailedResults: detailedReport,
      fileStats: fileReport
    };

    fs.writeFileSync(
      path.join(reportDir, 'complexity-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Relatório em HTML para melhor visualização
    this.generateHtmlReport(report, reportDir);

    console.log('\n📊 RELATÓRIO DE COMPLEXIDADE CICLOMÁTICA');
    console.log('==========================================');
    console.log(`Total de funções analisadas: ${totalFunctions}`);
    console.log(`Complexidade média: ${averageComplexity}`);
    console.log(`Complexidade máxima: ${maxComplexity}`);
    console.log(`Funções com alta complexidade (>10): ${highComplexityFunctions} (${report.summary.percentageHighComplexity}%)`);
    console.log('\n🔴 Funções com maior complexidade:');
    
    detailedReport.slice(0, 5).forEach(result => {
      console.log(`  ${result.function} (${result.file}:${result.startLine}) - Complexidade: ${result.complexity}`);
    });
  }

  private generateHtmlReport(report: any, reportDir: string): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Relatório de Complexidade Ciclomática</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .high-complexity { background-color: #ffebee; }
        .medium-complexity { background-color: #fff3e0; }
        .low-complexity { background-color: #e8f5e8; }
    </style>
</head>
<body>
    <h1>📊 Relatório de Complexidade Ciclomática</h1>
    <p>Gerado em: ${report.timestamp}</p>
    
    <div class="summary">
        <h2>Resumo Executivo</h2>
        <div class="metric">
            <strong>Total de Funções:</strong><br>${report.summary.totalFunctions}
        </div>
        <div class="metric">
            <strong>Complexidade Média:</strong><br>${report.summary.averageComplexity}
        </div>
        <div class="metric">
            <strong>Complexidade Máxima:</strong><br>${report.summary.maxComplexity}
        </div>
        <div class="metric">
            <strong>Funções de Alta Complexidade:</strong><br>${report.summary.highComplexityFunctions} (${report.summary.percentageHighComplexity}%)
        </div>
    </div>

    <h2>Funções por Complexidade</h2>
    <table>
        <tr>
            <th>Arquivo</th>
            <th>Função</th>
            <th>Linha</th>
            <th>Complexidade</th>
            <th>Status</th>
        </tr>
        ${report.detailedResults.map((result: any) => {
          const cssClass = result.complexity > 15 ? 'high-complexity' : 
                          result.complexity > 10 ? 'medium-complexity' : 'low-complexity';
          const status = result.complexity > 15 ? '🔴 Alta' : 
                        result.complexity > 10 ? '🟡 Média' : '🟢 Baixa';
          
          return `
        <tr class="${cssClass}">
            <td>${result.file}</td>
            <td>${result.function}</td>
            <td>${result.startLine}</td>
            <td>${result.complexity}</td>
            <td>${status}</td>
        </tr>`;
        }).join('')}
    </table>

    <h2>Estatísticas por Arquivo</h2>
    <table>
        <tr>
            <th>Arquivo</th>
            <th>Funções</th>
            <th>Linhas de Código</th>
            <th>Complexidade Média</th>
            <th>Complexidade Máxima</th>
        </tr>
        ${report.fileStats.map((stat: any) => `
        <tr>
            <td>${stat.file}</td>
            <td>${stat.functionsCount}</td>
            <td>${stat.linesOfCode}</td>
            <td>${stat.averageComplexity}</td>
            <td>${stat.maxComplexity}</td>
        </tr>`).join('')}
    </table>
</body>
</html>`;

    fs.writeFileSync(path.join(reportDir, 'complexity-report.html'), html);
  }

  getResults(): ComplexityResult[] {
    return this.results;
  }

  getFileStats(): FileStats[] {
    return this.fileStats;
  }
}

// Script para executar a análise
if (require.main === module) {
  const analyzer = new CodeComplexityAnalyzer();
  analyzer.analyzeDirectory('./src');
}