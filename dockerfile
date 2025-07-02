# ==================================
# 🐳 DOCKERFILE MULTI-STAGE
# Otimizado para produção com CI/CD
# ==================================

# Stage 1: Build dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências (incluindo dev para build)
RUN npm ci --only=production && npm ci --only=dev

# Stage 2: Build application
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copiar código fonte
COPY src/ ./src/
COPY tsconfig.json ./

# Build da aplicação
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine AS production

# Metadados para CI/CD
LABEL maintainer="WebServices Team"
LABEL version="1.0.0"
LABEL description="WebServices Node.js - Sistema SAP B1"
LABEL ci.pipeline="true"
LABEL quality.gates="enabled"

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar apenas dependências de produção
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copiar aplicação compilada
COPY --from=builder /app/dist ./dist

# Copiar arquivos necessários
COPY sensitive_data/ ./sensitive_data/
COPY prisma/ ./prisma/

# Criar diretórios necessários
RUN mkdir -p logs quality-metrics && \
    chown -R nodejs:nodejs /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Health check para CI/CD
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: process.env.PORT || 3000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "dist/src/app/main.js"]