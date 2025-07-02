import { BusinessPartnerController } from '../../Controllers/BusinessPartnerController';
import { BusinessPartnerServices } from '../../Services/BusinessPartnerServices';
import { SapB1BusinessPartnerRepository } from '../../Repositories/BusinessPartnerRepository';
import { HttpError } from '../../utils/errorHandler';
import { Request } from 'express';

// Mock das dependências
jest.mock('../../Services/BusinessPartnerServices');
jest.mock('../../Repositories/BusinessPartnerRepository');

describe('BusinessPartnerController', () => {
  let controller: BusinessPartnerController;
  let mockBusinessPartnerServices: jest.Mocked<BusinessPartnerServices>;
  let mockSapB1BusinessPartnerRepository: jest.Mocked<SapB1BusinessPartnerRepository>;

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
    
    controller = new BusinessPartnerController();
    
    // Configurar mocks
    mockBusinessPartnerServices = jest.mocked(BusinessPartnerServices.prototype);
    mockSapB1BusinessPartnerRepository = jest.mocked(SapB1BusinessPartnerRepository.prototype);
  });

  describe('RequestHandler', () => {
    it('deve chamar handleGetRequest para método GET', async () => {
      // Arrange
      const mockRequest = {
        method: 'GET',
        url: '/api/businesspartner/customers',
        body: {}
      } as Request;

      const spy = jest.spyOn(controller, 'handleGetRequest').mockResolvedValue([]);

      // Act
      await controller.RequestHandler(mockRequest);

      // Assert
      expect(spy).toHaveBeenCalledWith('/api/businesspartner/customers', {});
    });

    it('deve chamar handleActionRequest para métodos diferentes de GET', async () => {
      // Arrange
      const mockRequest = {
        method: 'POST',
        url: '/api/businesspartner/process/customers',
        body: { data: 'test' }
      } as Request;

      const spy = jest.spyOn(controller, 'handleActionRequest').mockResolvedValue([]);

      // Act
      await controller.RequestHandler(mockRequest);

      // Assert
      expect(spy).toHaveBeenCalledWith('/api/businesspartner/process/customers', { data: 'test' });
    });
  });

  describe('handleGetRequest', () => {
    it('deve processar requisição GET com sucesso', async () => {
      // Arrange
      const url = '/api/businesspartner/customers';
      const body = {};
      const mockResults = [{ CardCode: 'C027277 ' }];

      mockSapB1BusinessPartnerRepository.retrieveEntities.mockResolvedValue(mockResults);

      // Act
      const result = await controller.handleGetRequest(url, body);

      // Assert
      expect(result).toEqual(mockResults);
      expect(mockSapB1BusinessPartnerRepository.retrieveEntities).toHaveBeenCalled();
    });
  });

  describe('validateQueryParams', () => {
    it('deve lançar erro quando não há tabelas válidas', () => {
      // Arrange
      const queryParams = {
        selects: [],
        filters: [],
        tables: [],
        limit: undefined
      };

      // Act & Assert
      expect(() => controller.validateQueryParams(queryParams))
        .toThrow(HttpError);
    });

    it('deve lançar erro quando limit não é um número', () => {
      // Arrange
      const queryParams = {
        selects: [],
        filters: [],
        tables: ['OCRD'],
        limit: '10' as any
      };

      // Act & Assert
      expect(() => controller.validateQueryParams(queryParams))
        .toThrow(HttpError);
    });

    it('deve validar parâmetros corretamente', () => {
      // Arrange
      const queryParams = {
        selects: ['CardCode', 'CardName'],
        filters: [],
        tables: ['OCRD'],
        limit: 100
      };

      // Act
      const result = controller.validateQueryParams(queryParams);

      // Assert
      expect(result.tables).toEqual(['OCRD']);
      expect(result.limit).toBe(100);
    });
  });

  describe('defineQueryParams', () => {
    it('deve usar Type quando fornecido', () => {
      // Arrange
      const type = 'customers';
      const body = { selects: ['different'], tables: ['different'] };
      
      mockBusinessPartnerServices.businessPartnerTypes.mockReturnValue({
        selects: ['CardCode'],
        filters: [],
        tables: ['OCRD'],
        limit: 50
      });

      // Act
      const result = controller.defineQueryParams(type, body);

      // Assert
      expect(mockBusinessPartnerServices.businessPartnerTypes).toHaveBeenCalledWith(type);
      expect(result.selects).toEqual(['CardCode']);
    });

    it('deve usar Body quando Type não é fornecido', () => {
      // Arrange
      const type = '';
      const body = {
        selects: ['CardName'],
        filters: [],
        tables: ['OCRD'],
        limit: 25
      };

      // Act
      const result = controller.defineQueryParams(type, body);

      // Assert
      expect(result).toEqual(body);
    });
  });
});