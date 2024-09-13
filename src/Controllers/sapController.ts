import {SapServices} from "../services/sap-services";
import SL from "../models/slClass";
import { CnpjJa } from "../models/cnpjClass";
import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import * as helperFunctions from "../utils/helperFunctions";
import * as interfaces from "../types/interfaces";

class SapController {
    private static instance: SapController;
    private sapServices: SapServices;

    constructor() {
        this.sapServices = SapServices.getInstance();
    }

    public static getInstance(): SapController {
        if (!SapController.instance) {
            SapController.instance = new SapController();
        }
        return SapController.instance;
    }

    public async CadastroFornecedores() {
        try {
            const fornecedores = await this.sapServices.getFornecedoresLeads();
            if (helperFunctions.objetoVazio(fornecedores[0])) {
                throw new HttpError(404, 'Nenhum fornecedor encontrado');
            }

            const processErrors: any[] = [];
            const fornecedoresProcessados: interfaces.Fornecedor[] = [];
            await Promise.all(fornecedores.map(async (fornecedor) => {
                try {
                    const cnpj = fornecedor.TaxId0;
                    const cpf = fornecedor.TaxId4;
                    const CardCode = fornecedor.CardCode;
                    const isValidCnpj = helperFunctions.validCNPJ(cnpj);
                    const isValidCpf = helperFunctions.validaCPF(cpf);

                    if (!CardCode) {
                        throw new HttpError(400, `Código do fornecedor não encontrado (Não obedeceu regras do sap)`);
                    }

                    if (cnpj && !isValidCnpj) {
                        throw new HttpError(400, `CNPJ inválido - cnpj: ${cnpj}`);
                    }
                    if (cpf && !isValidCpf) {
                        throw new HttpError(400, `CPF inválido - cpf: ${cpf}`);
                    }
                    if (!cpf && !cnpj) {
                        throw new HttpError(400, `Não foi enviado um cpf ou cnpj (Não obedeceu regras do sap)`);
                    }

                    if (cnpj && isValidCnpj) {
                        const cleanedCnpj = cnpj.replace(/\D/g, '');
                        const fornecedorData = await this.sapServices.getFornecedorByCnpj(cleanedCnpj);
                        const isMEI = fornecedorData.company.simei.optant;
                        if (isMEI) {
                            const registerDate = fornecedorData.company.simei.since;
                            if (!helperFunctions.isIsoDate(registerDate)) {
                                throw new HttpError(400, 'Data de registro da microempresa inválida (deve ser uma data no formato ISO ("yyyy-mm-dd"))');
                            }
                            const dadosMicroEmpresa: interfaces.DadosMicroempresa = {
                                TributType: 10,
                            }
                            await this.sapServices.updateFornecedor(dadosMicroEmpresa, CardCode);
                            fornecedoresProcessados.push(fornecedor);
                            return;
                        }
                        const optanteSimplesNacional = fornecedorData.company.simples.optant;
                        const dadosPessoaJuridica: interfaces.DadosPessoaJuridica = {
                            U_TX_SN: optanteSimplesNacional ? 1 : 2
                        }
                        await this.sapServices.updateFornecedor(dadosPessoaJuridica, CardCode);
                        fornecedoresProcessados.push(fornecedor);
                        return;
                    } if (cpf && isValidCpf) {
                        const dateIso = 'yyyy-mm-dd';
                        const dadosPessoaFisica: interfaces.DadosPessoaFisica = {
                            TributType: 9,
                        }
                        await this.sapServices.updateFornecedor(dadosPessoaFisica, CardCode);
                        fornecedoresProcessados.push(fornecedor);
                        return;
                    }
                    throw new HttpError(400, 'Erro inesperado');
                } catch (err: any) {
                    processErrors.push({CardCode: fornecedor.CardCode, error: err.message});
                }
            }));

            if (processErrors.length > 0 && fornecedoresProcessados.length === 0) {
                const errorDetails = processErrors.map(err => ({
                    CardCode: err.CardCode || 'Não foi possível obter o CardCode do fornecedor',
                    error: err.error || 'Erro desconhecido'
                }));
                throw new HttpErrorWithDetails(500, 'Erros dos fornecedores:', errorDetails)            
            } else if (processErrors.length > 0 && fornecedoresProcessados.length > 0) {
                return {
                    customStatusCode: 206,
                    fornecedoresProcessados: fornecedoresProcessados,
                    errors: processErrors.map(err => ({
                        CardCode: err.CardCode || 'Não foi possível obter o CardCode do fornecedor',
                        error: err.error || 'Erro desconhecido'
                    }))
                };
            }

            return { fornecedoresProcessados: fornecedoresProcessados, errors: [] };
        }
        catch (err: any) {
            if (err instanceof HttpErrorWithDetails) {
                throw new HttpErrorWithDetails(err.statusCode, "Erro na atualizacao de fornecedores: " + err.message, err.details);
            }
            throw new HttpError(err.statusCode || 500, 'Erro ao cadastrar fornecedores: ' + err.message);
        }
    }
}

export const SapControllerInstance = SapController.getInstance();