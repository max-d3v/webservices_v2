#!/bin/bash

# ====================================
# 🚀 SCRIPT DE DEPLOY AUTOMATIZADO
# CI/CD Pipeline - N3
# ====================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE_NAME="webservices-node"
CONTAINER_NAME="webservices-app"
QUALITY_THRESHOLD=80
ENVIRONMENT=${1:-staging}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "🔍 Verificando pré-requisitos..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não encontrado!"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado!"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm não encontrado!"
        exit 1
    fi
    
    log_success "Pré-requisitos verificados!"
}

run_quality_gates() {
    log_info "🔒 Executando Gates de Qualidade..."
    
    # Install dependencies
    npm ci
    
    # Run quality audit
    npm run quality:audit
    
    # Extract quality score
    QUALITY_SCORE=$(node -e "
        try {
            const report = require('./quality-metrics/audit-report.json');
            console.log(report.summary.overallScore);
        } catch(e) {
            console.log('0');
        }
    ")
    
    log_info "Score de Qualidade: ${QUALITY_SCORE}%"
    
    if [ "$QUALITY_SCORE" -lt "$QUALITY_THRESHOLD" ]; then
        log_error "Gates de qualidade REPROVADOS! Score: ${QUALITY_SCORE}% < ${QUALITY_THRESHOLD}%"
        log_error "Deploy BLOQUEADO. Corrija os problemas de qualidade primeiro."
        exit 1
    fi
    
    log_success "Gates de qualidade APROVADOS! Score: ${QUALITY_SCORE}%"
}

build_application() {
    log_info "🏗️ Building aplicação..."
    
    # Build TypeScript
    npm run build
    
    # Build Docker image
    docker build -t ${DOCKER_IMAGE_NAME}:latest -t ${DOCKER_IMAGE_NAME}:$(git rev-parse --short HEAD) .
    
    log_success "Build concluído!"
}

run_security_scan() {
    log_info "🔒 Executando análise de segurança..."
    
    # npm audit
    npm audit --audit-level=high
    
    # Docker security scan (if available)
    if command -v docker scan &> /dev/null; then
        docker scan ${DOCKER_IMAGE_NAME}:latest || log_warning "Docker scan falhou ou não disponível"
    fi
    
    log_success "Análise de segurança concluída!"
}

deploy_to_environment() {
    log_info "🚀 Deploying para ambiente: ${ENVIRONMENT}"
    
    case $ENVIRONMENT in
        "staging")
            deploy_staging
            ;;
        "production")
            deploy_production
            ;;
        *)
            log_error "Ambiente inválido: ${ENVIRONMENT}"
            exit 1
            ;;
    esac
}

deploy_staging() {
    log_info "🧪 Deploying para STAGING..."
    
    # Stop existing container
    docker stop ${CONTAINER_NAME}-staging 2>/dev/null || true
    docker rm ${CONTAINER_NAME}-staging 2>/dev/null || true
    
    # Run new container
    docker run -d \
        --name ${CONTAINER_NAME}-staging \
        --restart unless-stopped \
        -p 3001:3000 \
        -e NODE_ENV=staging \
        -e LOG_LEVEL=debug \
        -v $(pwd)/logs:/app/logs \
        -v $(pwd)/quality-metrics:/app/quality-metrics \
        ${DOCKER_IMAGE_NAME}:latest
    
    # Wait for application to start
    sleep 30
    
    # Health check
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log_success "Deploy para STAGING bem-sucedido!"
    else
        log_error "Health check falhou!"
        exit 1
    fi
}

deploy_production() {
    log_info "🏭 Deploying para PRODUÇÃO..."
    
    # Additional confirmation for production
    read -p "⚠️  Confirma deploy para PRODUÇÃO? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deploy cancelado pelo usuário."
        exit 0
    fi
    
    # Blue-Green deployment strategy
    CURRENT_PORT=$(docker port ${CONTAINER_NAME}-prod 2>/dev/null | cut -d: -f2 || echo "3000")
    NEW_PORT=$((CURRENT_PORT == 3000 ? 3002 : 3000))
    
    log_info "Iniciando Blue-Green deployment (porta ${NEW_PORT})..."
    
    # Start new version
    docker run -d \
        --name ${CONTAINER_NAME}-prod-new \
        --restart unless-stopped \
        -p ${NEW_PORT}:3000 \
        -e NODE_ENV=production \
        -e LOG_LEVEL=info \
        -v $(pwd)/logs:/app/logs \
        ${DOCKER_IMAGE_NAME}:latest
    
    # Wait and health check
    sleep 60
    if curl -f http://localhost:${NEW_PORT}/health > /dev/null 2>&1; then
        log_success "Nova versão está funcionando!"
        
        # Stop old version
        docker stop ${CONTAINER_NAME}-prod 2>/dev/null || true
        docker rm ${CONTAINER_NAME}-prod 2>/dev/null || true
        
        # Rename new container
        docker rename ${CONTAINER_NAME}-prod-new ${CONTAINER_NAME}-prod
        
        log_success "Deploy para PRODUÇÃO concluído!"
    else
        log_error "Health check da nova versão falhou!"
        docker stop ${CONTAINER_NAME}-prod-new 2>/dev/null || true
        docker rm ${CONTAINER_NAME}-prod-new 2>/dev/null || true
        exit 1
    fi
}

run_post_deploy_tests() {
    log_info "🧪 Executando testes pós-deploy..."
    
    # Smoke tests
    if [ "$ENVIRONMENT" = "staging" ]; then
        TEST_URL="http://localhost:3001"
    else
        TEST_URL="http://localhost:3000"
    fi
    
    # Test health endpoint
    if curl -f ${TEST_URL}/health > /dev/null 2>&1; then
        log_success "Health check: ✅"
    else
        log_error "Health check: ❌"
        exit 1
    fi
    
    # Test main API endpoints
    if curl -f ${TEST_URL}/api/businesspartner/testClients > /dev/null 2>&1; then
        log_success "API check: ✅"
    else
        log_warning "API check: ⚠️ (pode ser normal se não há dados)"
    fi
    
    log_success "Testes pós-deploy concluídos!"
}

generate_deploy_report() {
    log_info "📊 Gerando relatório de deploy..."
    
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    COMMIT_HASH=$(git rev-parse --short HEAD)
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    cat > deploy-report.md << EOF
# 🚀 Relatório de Deploy

**Data:** ${TIMESTAMP}
**Ambiente:** ${ENVIRONMENT}
**Branch:** ${BRANCH}
**Commit:** ${COMMIT_HASH}
**Quality Score:** ${QUALITY_SCORE}%

## ✅ Stages Executados:
- 🔍 Gates de Qualidade: APROVADO
- 🏗️ Build: SUCESSO
- 🔒 Análise de Segurança: EXECUTADA
- 🚀 Deploy: SUCESSO
- 🧪 Testes Pós-Deploy: SUCESSO

## 📊 Métricas:
- Threshold de Qualidade: ${QUALITY_THRESHOLD}%
- Score Obtido: ${QUALITY_SCORE}%
- Imagem Docker: ${DOCKER_IMAGE_NAME}:${COMMIT_HASH}

## 🔗 URLs:
- Aplicação: http://localhost:$([ "$ENVIRONMENT" = "staging" ] && echo "3001" || echo "3000")
- Health Check: http://localhost:$([ "$ENVIRONMENT" = "staging" ] && echo "3001" || echo "3000")/health

Deploy realizado com sucesso! 🎉
EOF

    log_success "Relatório gerado: deploy-report.md"
}

cleanup() {
    log_info "🧹 Limpando recursos temporários..."
    
    # Remove old images
    docker image prune -f
    
    log_success "Cleanup concluído!"
}

# ====================================
# 🎯 MAIN EXECUTION
# ====================================

main() {
    log_info "🚀 Iniciando Deploy Automatizado - Ambiente: ${ENVIRONMENT}"
    log_info "================================================"
    
    check_prerequisites
    run_quality_gates
    build_application
    run_security_scan
    deploy_to_environment
    run_post_deploy_tests
    generate_deploy_report
    cleanup
    
    log_success "🎉 Deploy concluído com sucesso!"
    log_info "📊 Verifique o relatório: deploy-report.md"
}

# Trap errors
trap 'log_error "Deploy falhou na linha $LINENO"' ERR

# Execute main function
main "$@"