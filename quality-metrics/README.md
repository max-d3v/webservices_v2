# 📊 Sistema de Métricas de Qualidade - N2

Este sistema implementa um conjunto completo de ferramentas para medir e auditar métricas de qualidade de software, desenvolvido especificamente para a avaliação N2 da disciplina de Qualidade de Software.

## 🎯 Métricas Implementadas

### 📈 Métricas de Código
- **M-01**: Cobertura de Código (Linhas) - Meta: ≥ 80%
- **M-02**: Cobertura de Funções - Meta: ≥ 80%
- **M-03**: Complexidade Ciclomática Média - Meta: < 10
- **M-04**: Funções de Alta Complexidade - Meta: < 5

### ⚡ Métricas de Performance
- **M-05**: Tempo de Resposta Médio - Meta: < 2000ms
- **M-06**: Taxa de Sucesso das Requisições - Meta: ≥ 95%

## 🔧 Ferramentas Utilizadas

| Métrica | Ferramenta | Arquivo de Configuração |
|---------|------------|------------------------|
| Cobertura de Código | Jest + Coverage | `jest.config.js` |
| Complexidade Ciclomática | Analisador Customizado | `quality-metrics/complexity-analyzer.ts` |
| Performance | Analisador de Carga | `quality-metrics/performance-analyzer.ts` |
| Auditoria Geral | Auditor de Qualidade | `quality-metrics/quality-auditor.ts` |

## 🚀 Como Executar

### 1. Instalação das Dependências
```bash
npm install
```

### 2. Executar Testes Unitários com Cobertura
```bash
npm run test:coverage
```

### 3. Análise de Complexidade Ciclomática
```bash
npm run quality:complexity
```

### 4. Testes de Performance (Servidor deve estar rodando)
```bash
# Em um terminal, inicie o servidor
npm run dev

# Em outro terminal, execute os testes de performance
npm run quality:performance
```

### 5. Auditoria Completa (Recomendado para N2)
```bash
npm run quality:audit
```

## 📋 Relatórios Gerados

Após executar a auditoria completa, os seguintes relatórios são gerados na pasta `quality-metrics/`:

### 📄 Relatórios HTML (Para Visualização)
- **`audit-report.html`** - Relatório principal da auditoria (USAR ESTE PARA N2)
- **`complexity-report.html`** - Análise detalhada de complexidade
- **`performance-report.html`** - Métricas de performance
- **`coverage/index.html`** - Cobertura de código (gerado pelo Jest)

### 📊 Dados Brutos (JSON)
- **`audit-report.json`** - Dados estruturados da auditoria
- **`complexity-report.json`** - Dados de complexidade
- **`performance-report.json`** - Dados de performance

## 📝 Estrutura de Testes

```
src/
├── __tests__/
│   ├── setup.ts                           # Configuração dos testes
│   ├── UnitTests/
│   │   ├── BusinessPartnerController.test.ts
│   │   └── BusinessPartnerServices.test.ts
│   ├── IntegrationTests/
│   │   └── BusinessPartner.integration.test.ts
│   └── PerformanceTests/                  # Para testes específicos de performance
```

## 🎯 Para a Avaliação N2

### Passos Recomendados:

1. **Execute a auditoria completa:**
   ```bash
   npm run quality:audit
   ```

2. **Abra o relatório principal:**
   - Arquivo: `quality-metrics/audit-report.html`
   - Este relatório contém todas as informações necessárias para a N2

3. **Colete as evidências:**
   - Screenshots dos relatórios HTML
   - Arquivos JSON com dados brutos
   - Logs de execução dos testes

### Formato do Relatório N2

O relatório gerado segue exatamente o template solicitado:

```
1. Capa ✅
2. Introdução ✅
3. Auditoria das Métricas de Qualidade ✅
4. Análise dos Resultados ✅
5. Ações Corretivas e Melhorias Propostas ✅
6. Conclusão ✅
7. Anexos ✅
```

## 🔍 Interpretação dos Resultados

### Status das Métricas:
- **✅ OK**: Métrica atende ao critério estabelecido
- **❌ NOK**: Métrica não atende ao critério (necessita ação corretiva)

### Score Geral:
- **80-100%**: 🟢 Excelente - Sistema atende aos padrões de qualidade
- **60-79%**: 🟡 Bom - Sistema precisa de melhorias pontuais  
- **0-59%**: 🔴 Crítico - Sistema necessita de refatoração significativa

## 🛠️ Troubleshooting

### Problema: Testes de performance falham
**Solução**: Certifique-se de que o servidor esteja rodando em `http://localhost:3000`

### Problema: Cobertura de código baixa
**Solução**: Adicione mais testes unitários nos arquivos `*.test.ts`

### Problema: Complexidade alta
**Solução**: Refatore funções com muitas condições e loops aninhados

## 📚 Próximos Passos

1. Implementar CI/CD com verificação automática de qualidade
2. Adicionar métricas de segurança (OWASP)
3. Implementar métricas de usabilidade
4. Configurar alertas para degradação de qualidade

## 🤝 Contribuição

Para adicionar novas métricas:
1. Implemente o analisador em `quality-metrics/`
2. Adicione a métrica no `QualityAuditor`
3. Atualize este README
4. Adicione testes para a nova funcionalidade

---

**Desenvolvido para a disciplina de Qualidade de Software (Testes e Observabilidade)**