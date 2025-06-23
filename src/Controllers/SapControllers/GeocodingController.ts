import { SapServices } from "../../services/SapServices";
import { HttpError, HttpErrorWithDetails } from "../../utils/errorHandler";
import * as helperFunctions from "../../utils/helperFunctions";
import * as interfaces from "../../types/interfaces";
import SL from "../../models/ServiceLayerClass";
import axios from "axios";
import * as fs from 'fs';
import * as path from 'path';

export class GeocodingController {
    private static instance: GeocodingController;
    private sapServices: SapServices;
    private sl: SL;

    // Configurações
    private readonly GOOGLE_MAPS_API_KEY = 'AIzaSyDoMD3g0WZnI0DrUpdMUSd_a9Dd7P4opwM';
    private readonly API_DELAY = 0.2; // 200ms entre requisiçõesl
    private readonly BATCH_SIZE = 50;
    private readonly BACKUP_ENABLED = true;

    constructor() {
        this.sapServices = SapServices.getInstance();
        this.sl = new SL();
    }

    public static getInstance(): GeocodingController {
        if (!GeocodingController.instance) {
            GeocodingController.instance = new GeocodingController();
        }
        return GeocodingController.instance;
    }

    /**
     * Executa o geocoding em lote dos clientes
     */
    public async executarGeocodingEmLote(limite: number = 0, processarTodos: boolean = false): Promise<interfaces.GeocodingProcessResult> {
        try {
            console.log("=== GEOCODING EM LOTE VIA SERVICE LAYER ===");
            console.log(`Data/Hora: ${new Date().toLocaleString()}`);
            console.log(`Limite: ${limite > 0 ? limite : 'SEM LIMITE'}`);
            console.log(`Processar todos: ${processarTodos ? 'SIM' : 'NÃO'}`);

            // Login no Service Layer
            console.log("Conectando ao Service Layer...");
            await this.sl.login();
            console.log("✅ Conectado ao Service Layer");

            // Buscar clientes sem coordenadas
            const clientes = await this.buscarClientesSemCoordenadas(limite);
            
            if (clientes.length === 0) {
                console.log("✅ Nenhum cliente pendente de geocoding encontrado!");
                return {
                    sucessos: 0,
                    falhas: 0,
                    atualizacoes: 0,
                    total: 0,
                    tempoDecorrido: 0,
                    taxaSucesso: 100
                };
            }

            console.log(`📍 ${clientes.length} clientes encontrados para processamento\n`);

            // Inicializar sistema de backup
            let backupInfo: interfaces.GeocodingBackupInfo | null = null;
            if (this.BACKUP_ENABLED) {
                backupInfo = this.inicializarSistemaBackup();
                console.log(`📦 Sistema de backup inicializado: ${backupInfo.arquivo_backup}`);
            }

            // Processar clientes
            const resultado = await this.processarClientesGeocoding(clientes, backupInfo);

            // Finalizar backup
            if (this.BACKUP_ENABLED && backupInfo) {
                this.finalizarBackup(backupInfo, resultado);
                console.log("📦 Backup finalizado e resumo salvo");
            }

            // Exibir resumo final
            this.exibirResumoFinal(resultado);

            return resultado;

        } catch (err: any) {
            console.error(`❌ ERRO FATAL: ${err.message}`);
            throw new HttpError(err.statusCode || 500, 'Erro no processamento de geocoding: ' + err.message);
        }
    }

    /**
     * Busca clientes que não possuem coordenadas
     */
    private async buscarClientesSemCoordenadas(limite: number): Promise<interfaces.ClienteGeocodingData[]> {
        try {
            let query = `
                SELECT 
                    T0."CardCode" as "Codigo",
                    T0."CardName" as "Nome",
                    T1."Address" as "Endereco",
                    T1."City" as "Cidade",
                    T1."State" as "Estado",
                    T1."ZipCode" as "CEP",
                    T1."Block" as "Bairro",
                    T1."StreetNo" as "Numero"
                FROM "SBO_COPAPEL_PRD"."OCRD" T0
                INNER JOIN "SBO_COPAPEL_PRD"."CRD1" T1 ON T0."CardCode" = T1."CardCode"
                WHERE T0."CardType" = 'C'
                  AND T0."ShipToDef" = T1."Address"
                  AND (T0."validFor" = 'Y' OR T0."validFor" IS NULL)
                  AND (T1."U_Latitude" IS NULL OR T1."U_Longitude" IS NULL OR T1."U_Latitude" = '' OR T1."U_Longitude" = '')
                  AND T1."City" IS NOT NULL 
                  AND T1."State" IS NOT NULL
                ORDER BY T0."CardName" ASC`;

            if (limite > 0) {
                query += ` LIMIT ${limite}`;
            }

            console.log("Consultando clientes sem coordenadas...");
            const response = await this.sl.querySAP(query, true);
            return response.data || [];

        } catch (err: any) {
            throw new HttpError(500, 'Erro ao buscar clientes sem coordenadas: ' + err.message);
        }
    }

    /**
     * Processa os clientes para geocoding em lotes com processamento assíncrono
     */
    private async processarClientesGeocoding(
        clientes: interfaces.ClienteGeocodingData[], 
        backupInfo: interfaces.GeocodingBackupInfo | null
    ): Promise<interfaces.GeocodingProcessResult> {
        const startTime = Date.now();
        let sucessos = 0;
        let falhas = 0;
        let atualizacoes = 0;

        // Processar em lotes
        for (let i = 0; i < clientes.length; i += this.BATCH_SIZE) {
            const batch = clientes.slice(i, i + this.BATCH_SIZE);
            console.log(`\n--- PROCESSANDO LOTE ${Math.floor(i / this.BATCH_SIZE) + 1} ---`);
            console.log(`Clientes ${i + 1} a ${Math.min(i + this.BATCH_SIZE, clientes.length)} de ${clientes.length}`);

            const batchStartTime = Date.now();

            // 🚀 PROCESSAMENTO ASSÍNCRONO: Todos os clientes do lote processam em paralelo
            const batchPromises = batch.map(async (cliente, batchIndex) => {
                const numeroProcessamento = i + batchIndex + 1;
                const percentual = ((numeroProcessamento / clientes.length) * 100).toFixed(2);

                console.log(`[${numeroProcessamento}/${clientes.length} - ${percentual}%] Processando: ${cliente.Codigo} - ${cliente.Nome}`);

                try {
                    // Construir endereço completo
                    const endereco = this.construirEnderecoCompleto(cliente);
                    console.log(`   Endereço: ${endereco}`);

                    // Tentar geocoding
                    const coordenadas = await this.obterCoordenadasPorEndereco(endereco, cliente.CEP);

                    if (coordenadas) {
                        console.log(`   ✅ Coordenadas obtidas: ${coordenadas.lat}, ${coordenadas.lng} (fonte: ${coordenadas.source})`);

                        // Atualizar via Service Layer
                        const resultadoUpdate = await this.atualizarCoordenadasViaServiceLayer(
                            cliente.Codigo, 
                            coordenadas.lat, 
                            coordenadas.lng, 
                            backupInfo
                        );

                        if (resultadoUpdate.sucesso) {
                            console.log("   ✅ Coordenadas atualizadas via Service Layer");
                            return { tipo: 'sucesso', cliente: cliente.Codigo };
                        } else {
                            console.log(`   ❌ Erro ao atualizar via Service Layer: ${resultadoUpdate.erro}`);
                            return { tipo: 'falha', cliente: cliente.Codigo, erro: resultadoUpdate.erro };
                        }
                    } else {
                        console.log("   ❌ Não foi possível obter coordenadas");
                        return { tipo: 'falha', cliente: cliente.Codigo, erro: 'Coordenadas não encontradas' };
                    }
                } catch (err: any) {
                    console.log(`   ❌ Erro no processamento: ${err.message}`);
                    return { tipo: 'erro', cliente: cliente.Codigo, erro: err.message };
                }
            });

            // Aguardar todos os clientes do lote processarem em paralelo
            const resultadosLote = await Promise.allSettled(batchPromises);

            // Contar resultados do lote
            resultadosLote.forEach((resultado) => {
                if (resultado.status === 'fulfilled') {
                    if (resultado.value.tipo === 'sucesso') {
                        sucessos++;
                        atualizacoes++;
                    } else {
                        falhas++;
                    }
                } else {
                    falhas++;
                    console.error(`   ❌ Erro crítico: ${resultado.reason}`);
                }
            });

            // Estatísticas do lote
            const batchTime = Date.now() - batchStartTime;
            const sucessosLote = resultadosLote.filter(r => r.status === 'fulfilled' && r.value.tipo === 'sucesso').length;
            console.log(`--- Lote concluído em ${(batchTime / 1000).toFixed(1)}s ---`);
            console.log(`--- Sucessos no lote: ${sucessosLote}/${batch.length} ---`);

            // Delay entre lotes para não sobrecarregar APIs
            if (i + this.BATCH_SIZE < clientes.length) {
                console.log(`   ⏳ Aguardando ${this.API_DELAY}s antes do próximo lote...`);
                await this.delay(this.API_DELAY * 1000);
            }
        }

        const tempoDecorrido = Date.now() - startTime;

        return {
            sucessos,
            falhas,
            atualizacoes,
            total: clientes.length,
            tempoDecorrido,
            taxaSucesso: clientes.length > 0 ? (sucessos / clientes.length) * 100 : 0
        };
    }

    /**
     * Atualiza coordenadas via Service Layer
     */
    private async atualizarCoordenadasViaServiceLayer(
        cardCode: string, 
        latitude: number, 
        longitude: number, 
        backupInfo: interfaces.GeocodingBackupInfo | null
    ): Promise<{ sucesso: boolean; erro?: string }> {
        try {
            // 1. Obter dados atuais do cliente
            console.log("   📥 Obtendo endereços atuais do cliente via Service Layer...");
            const response = await this.sl.get('BusinessPartners', cardCode);
            
            if (!response) {
                return { sucesso: false, erro: 'Erro ao obter dados do cliente' };
            }

            let dadosCliente: any;
            try {
                // O response do Service Layer já pode vir como objeto ou string JSON
                dadosCliente = typeof response === 'string' ? JSON.parse(response) : response;
                
                // Debug: vamos ver exatamente o que está sendo retornado
                //console.log(`   🔍 DEBUG - Estrutura do response para ${cardCode}:`);
                //console.log("   📦 response.data existe?", !!response.data);
                //console.log("   📦 response.data é objeto?", typeof response.data === 'object');
                
                // Se response tem uma propriedade data, usar ela
                if (response.data) {
                    dadosCliente = response.data;
                }
                
                //console.log("   📦 dadosCliente.BPAddresses existe?", !!dadosCliente.BPAddresses);
                //console.log("   📦 dadosCliente.BPAddresses é array?", Array.isArray(dadosCliente.BPAddresses));
                //console.log("   📦 Campos disponíveis no dadosCliente:", Object.keys(dadosCliente || {}));
                
                // Se temos BPAddresses
                if (dadosCliente.BPAddresses) {
                    //console.log("   📦 Número de endereços:", dadosCliente.BPAddresses.length);
                    //console.log("   📦 Primeiro endereço:", JSON.stringify(dadosCliente.BPAddresses[0], null, 2));
                }
                
            } catch (parseError) {
                //console.log("   ❌ Erro ao fazer parse do response:", parseError);
                return { sucesso: false, erro: 'Erro ao processar resposta do Service Layer' };
            }

            if (!dadosCliente.BPAddresses || !Array.isArray(dadosCliente.BPAddresses)) {
                console.log("   ❌ DEBUG - Estrutura inválida detectada:");
                console.log("   📦 dadosCliente completo:", JSON.stringify(dadosCliente, null, 2));
                return { sucesso: false, erro: 'Cliente não possui endereços ou estrutura inválida' };
            }

            // 2. Backup dos dados originais
            if (this.BACKUP_ENABLED && backupInfo) {
                const backupRecord: interfaces.GeocodingBackupRecord = {
                    cardCode,
                    cardName: dadosCliente.CardName || '',
                    dataHora: new Date().toISOString(),
                    coordenadas_novas: { lat: latitude, lng: longitude },
                    dados_originais: dadosCliente
                };
                this.salvarBackupCliente(backupInfo, backupRecord);
                console.log("   💾 Backup dos dados originais salvo");
            }

            // 3. Atualizar coordenadas no endereço principal
            const enderecosAtualizados = dadosCliente.BPAddresses;
            const enderecoPrincipal = dadosCliente.ShipToDefault;
            let enderecoEncontrado = false;
            let coordenadasAnteriores = null;

            console.log("   🎯 Procurando endereço principal:", enderecoPrincipal);
            console.log("   📋 Endereços disponíveis:", enderecosAtualizados.map((e: any) => e.AddressName || e.Address).join(', '));

            for (const endereco of enderecosAtualizados) {
                if (endereco.AddressName === enderecoPrincipal) {
                    // Salvar coordenadas anteriores
                    coordenadasAnteriores = {
                        latitude: endereco.U_Latitude || null,
                        longitude: endereco.U_Longitude || null
                    };

                    endereco.U_Latitude = latitude.toString();
                    endereco.U_Longitude = longitude.toString();
                    enderecoEncontrado = true;
                    console.log(`   📍 Endereço principal encontrado (RowNum: ${endereco.RowNum}), coordenadas atualizadas localmente`);

                    // Log da alteração
                    if (this.BACKUP_ENABLED && backupInfo) {
                        this.logAlteracaoCliente(backupInfo, cardCode, dadosCliente.CardName || '', coordenadasAnteriores, { latitude, longitude });
                    }
                    break;
                }
            }

            if (!enderecoEncontrado) {
                return { sucesso: false, erro: 'Endereço principal não encontrado' };
            }

            // 4. Enviar atualização via PATCH
            const dadosParaAtualizar = {
                BPAddresses: enderecosAtualizados
            };

            console.log("   📤 Enviando array completo de endereços via PATCH...");
            const resultadoPatch = await this.sl.patch('BusinessPartners', cardCode, dadosParaAtualizar);

            // Verificar se houve erro no PATCH
            if (resultadoPatch) {
                // O retorno do PATCH pode ser um objeto com status, data, message
                if (typeof resultadoPatch === 'object' && 'status' in resultadoPatch) {
                    if (!resultadoPatch.status) {
                        return { sucesso: false, erro: resultadoPatch.message || 'Erro no PATCH' };
                    }
                } else if (typeof resultadoPatch === 'string') {
                    try {
                        const responseData = JSON.parse(resultadoPatch);
                        if (responseData && responseData.error) {
                            return { sucesso: false, erro: responseData.error.message?.value || 'Erro desconhecido no PATCH' };
                        }
                    } catch (parseError) {
                        // Se não conseguir fazer parse, considera sucesso se não houver exceção
                    }
                }
            }

            return { sucesso: true };

        } catch (err: any) {
            console.log("   ❌ Exceção capturada:", err.message);
            console.log("   ❌ Stack trace:", err.stack);
            return { sucesso: false, erro: `Exceção: ${err.message}` };
        }
    }

    /**
     * Constrói endereço completo para geocoding
     */
    private construirEnderecoCompleto(cliente: interfaces.ClienteGeocodingData): string {
        const partes: string[] = [];

        if (cliente.Endereco?.trim()) partes.push(cliente.Endereco.trim());
        if (cliente.Bairro?.trim()) partes.push(cliente.Bairro.trim());
        if (cliente.Cidade?.trim()) partes.push(cliente.Cidade.trim());
        if (cliente.Estado?.trim()) partes.push(cliente.Estado.trim());
        if (cliente.CEP?.trim()) partes.push(`CEP ${cliente.CEP.trim()}`);
        if (cliente.Numero?.trim()) partes.push(`Nº ${cliente.Numero.trim()}`);

        partes.push("Brasil");

        return partes.join(', ');
    }

    /**
     * Obtém coordenadas por endereço (Google Maps API + fallback CEP)
     */
    private async obterCoordenadasPorEndereco(
        enderecoCompleto: string, 
        cep: string
    ): Promise<interfaces.CoordenadasGeograficas | null> {
        // 1. Tentar geocodificação via Google Maps API
        let coordenadas = await this.geocodificarComGoogleMaps(enderecoCompleto);
        if (coordenadas) {
            coordenadas.source = 'geocoding_api';
            return coordenadas;
        }

        // 2. Fallback: Tentar com CEP se disponível
        if (cep?.trim()) {
            coordenadas = await this.geocodificarPorCEP(cep.trim());
            if (coordenadas) {
                coordenadas.source = 'cep_lookup';
                return coordenadas;
            }
        }

        return null;
    }

    /**
     * Geocodificação usando Google Maps API
     */
    private async geocodificarComGoogleMaps(endereco: string): Promise<interfaces.CoordenadasGeograficas | null> {
        try {
            const enderecoEncoded = encodeURIComponent(endereco);
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${enderecoEncoded}&key=${this.GOOGLE_MAPS_API_KEY}&region=br`;

            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; CopapelHub-Batch/1.0)'
                }
            });

            if (response.data && response.data.status === 'OK' && response.data.results?.length > 0) {
                const location = response.data.results[0].geometry.location;
                return {
                    lat: parseFloat(location.lat),
                    lng: parseFloat(location.lng)
                };
            }

        } catch (err: any) {
            console.error(`   ⚠️ Erro no Google Maps API: ${err.message}`);
        }

        return null;
    }

    /**
     * Geocodificação por CEP usando ViaCEP + Google Maps
     */
    private async geocodificarPorCEP(cep: string): Promise<interfaces.CoordenadasGeograficas | null> {
        try {
            // Limpar CEP
            const cepLimpo = cep.replace(/[^0-9]/g, '');
            
            if (cepLimpo.length !== 8) {
                return null;
            }

            // Buscar endereço pelo CEP
            const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
                timeout: 5000
            });

            if (response.data && !response.data.erro) {
                const data = response.data;
                const endereco = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
                return await this.geocodificarComGoogleMaps(endereco);
            }

        } catch (err: any) {
            console.error(`   ⚠️ Erro no ViaCEP: ${err.message}`);
        }

        return null;
    }

    // Métodos de backup e logging

    private inicializarSistemaBackup(): interfaces.GeocodingBackupInfo {
        const backupDir = './logs/geocoding/';
        const dataAtual = new Date().toISOString().split('T')[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Criar diretórios se não existirem
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const dirData = path.join(backupDir, dataAtual);
        if (!fs.existsSync(dirData)) {
            fs.mkdirSync(dirData, { recursive: true });
        }

        const arquivoBackup = path.join(dirData, `geocoding_backup_${timestamp}.json`);
        const arquivoLog = path.join(dirData, `geocoding_log_${timestamp}.txt`);

        // Criar arquivo de backup inicial
        const metadados = {
            versao: '1.0',
            data_criacao: new Date().toISOString(),
            descricao: 'Backup automático de clientes alterados pela rotina de geocoding',
            clientes: []
        };

        fs.writeFileSync(arquivoBackup, JSON.stringify(metadados, null, 2));

        // Criar arquivo de log inicial
        const logInicial = `=== LOG DE ALTERAÇÕES - GEOCODING BATCH ===\n` +
                          `Data/Hora: ${new Date().toISOString()}\n` +
                          `=====================================\n\n`;

        fs.writeFileSync(arquivoLog, logInicial);

        return {
            arquivo_backup: arquivoBackup,
            arquivo_log: arquivoLog,
            diretorio: dirData
        };
    }

    private salvarBackupCliente(backupInfo: interfaces.GeocodingBackupInfo, dadosCliente: interfaces.GeocodingBackupRecord): void {
        try {
            const conteudoAtual = fs.readFileSync(backupInfo.arquivo_backup, 'utf8');
            const backup = JSON.parse(conteudoAtual);

            backup.clientes.push(dadosCliente);
            backup.total_clientes = backup.clientes.length;
            backup.ultima_atualizacao = new Date().toISOString();

            fs.writeFileSync(backupInfo.arquivo_backup, JSON.stringify(backup, null, 2));
        } catch (err: any) {
            console.error(`   ⚠️ Erro ao salvar backup: ${err.message}`);
        }
    }

    private logAlteracaoCliente(
        backupInfo: interfaces.GeocodingBackupInfo, 
        cardCode: string, 
        cardName: string, 
        coordenadasAnteriores: any, 
        coordenadasNovas: any
    ): void {
        try {
            let logEntry = `[${new Date().toISOString()}] Cliente: ${cardCode} - ${cardName}\n`;
            
            if (coordenadasAnteriores?.latitude && coordenadasAnteriores?.longitude) {
                logEntry += `  Coordenadas Anteriores: ${coordenadasAnteriores.latitude}, ${coordenadasAnteriores.longitude}\n`;
            } else {
                logEntry += `  Coordenadas Anteriores: (vazias)\n`;
            }
            
            logEntry += `  Coordenadas Novas: ${coordenadasNovas.latitude}, ${coordenadasNovas.longitude}\n`;
            logEntry += `  Status: ATUALIZADO\n`;
            logEntry += `---\n\n`;

            fs.appendFileSync(backupInfo.arquivo_log, logEntry);
        } catch (err: any) {
            console.error(`   ⚠️ Erro ao registrar log: ${err.message}`);
        }
    }

    private finalizarBackup(backupInfo: interfaces.GeocodingBackupInfo, estatisticas: interfaces.GeocodingProcessResult): void {
        try {
            const resumoFinal = `\n=====================================\n` +
                              `=== RESUMO FINAL DO BACKUP ===\n` +
                              `Data/Hora Finalização: ${new Date().toISOString()}\n` +
                              `Total de Clientes Alterados: ${estatisticas.sucessos}\n` +
                              `Total de Clientes Processados: ${estatisticas.total}\n` +
                              `Taxa de Sucesso: ${estatisticas.taxaSucesso.toFixed(2)}%\n` +
                              `Arquivo de Backup: ${path.basename(backupInfo.arquivo_backup)}\n` +
                              `=====================================\n`;

            fs.appendFileSync(backupInfo.arquivo_log, resumoFinal);

            // Criar arquivo de índice
            const arquivoIndice = path.join(backupInfo.diretorio, 'indice_backups.txt');
            const entradaIndice = `${new Date().toISOString()} - ${path.basename(backupInfo.arquivo_backup)} - ${estatisticas.sucessos} clientes alterados\n`;
            
            fs.appendFileSync(arquivoIndice, entradaIndice);
        } catch (err: any) {
            console.error(`   ⚠️ Erro ao finalizar backup: ${err.message}`);
        }
    }

    private exibirResumoFinal(resultado: interfaces.GeocodingProcessResult): void {
        const tempoFormatado = this.formatarTempo(resultado.tempoDecorrido);
        const mediaMinuto = resultado.tempoDecorrido > 0 ? (resultado.total / (resultado.tempoDecorrido / 60000)).toFixed(2) : '0';

        console.log("\n=====================================");
        console.log("=== RESUMO FINAL DO PROCESSAMENTO ===");
        console.log(`Total processados: ${resultado.total.toLocaleString()}`);
        console.log(`Sucessos: ${resultado.sucessos.toLocaleString()}`);
        console.log(`Falhas: ${resultado.falhas.toLocaleString()}`);
        console.log(`Atualizações no banco: ${resultado.atualizacoes.toLocaleString()}`);
        console.log(`Taxa de sucesso: ${resultado.taxaSucesso.toFixed(2)}%`);
        console.log(`Tempo total: ${tempoFormatado}`);
        console.log(`Média de processamento: ${mediaMinuto} clientes/minuto`);
        console.log("=== GEOCODING EM LOTE - CONCLUÍDO ===");
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private formatarTempo(ms: number): string {
        const segundos = Math.floor(ms / 1000);
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        const segs = segundos % 60;

        if (horas > 0) {
            return `${horas}h ${minutos}m ${segs}s`;
        } else if (minutos > 0) {
            return `${minutos}m ${segs}s`;
        } else {
            return `${segs}s`;
        }
    }

    /**
     * Conta quantos clientes precisam de geocoding
     */
    public async contarClientesSemCoordenadas(): Promise<{ total: number }> {
        try {
            const query = `
                SELECT COUNT(*) as "Total"
                FROM "SBO_COPAPEL_PRD"."OCRD" T0
                INNER JOIN "SBO_COPAPEL_PRD"."CRD1" T1 ON T0."CardCode" = T1."CardCode"
                WHERE T0."CardType" = 'C'
                  AND T0."ShipToDef" = T1."Address"
                  AND (T0."validFor" = 'Y' OR T0."validFor" IS NULL)
                  AND (T1."U_Latitude" IS NULL OR T1."U_Longitude" IS NULL OR T1."U_Latitude" = '' OR T1."U_Longitude" = '')
                  AND T1."City" IS NOT NULL 
                  AND T1."State" IS NOT NULL`;

            const response = await this.sl.querySAP(query, true);
            return { total: response.data[0]?.Total || 0 };

        } catch (err: any) {
            throw new HttpError(500, 'Erro ao contar clientes sem coordenadas: ' + err.message);
        }
    }
}