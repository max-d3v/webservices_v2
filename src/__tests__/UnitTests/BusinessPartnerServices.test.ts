import { BusinessPartnerServices } from '../../Services/BusinessPartnerServices';
import { HttpError, HttpErrorWithDetails } from '../../utils/errorHandler';
import { BusinessPartner } from '../../Models/BusinessPartner';

describe('BusinessPartnerServices', () => {
  let service: BusinessPartnerServices;

  beforeEach(() => {
    service = new BusinessPartnerServices();
  });

  describe('getInstance', () => {
    it('deve retornar a mesma instância (Singleton)', () => {
      const instance1 = BusinessPartnerServices.getInstance();
      const instance2 = BusinessPartnerServices.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getProcessingFunction', () => {
    it('deve retornar função Deactivate para action "Deactivate"', () => {
      const func = service.getProcessingFunction('Deactivate');
      expect(func).toBe(service.Deactivate);
    });

    it('deve retornar função FiscalDataMock para action "FiscalDataMock"', () => {
      const func = service.getProcessingFunction('FiscalDataMock');
      expect(func).toBe(service.FiscalDataMock);
    });

    it('deve lançar erro para action não implementada', () => {
      expect(() => service.getProcessingFunction('NonExistentAction'))
        .toThrow(HttpError);
    });

    it('deve lançar erro quando action é undefined', () => {
      expect(() => service.getProcessingFunction(undefined))
        .toThrow(HttpError);
    });
  });

  describe('Deactivate', () => {
    it('deve retornar dados de desativação', async () => {
      const businessPartner: Partial<BusinessPartner> = {
        CardCode: 'C00001'
      };

      const result = await service.Deactivate(businessPartner);

      expect(result).toEqual({
        "Valid": "tNO",
        "Frozen": "tYES"
      });
    });
  });

  describe('FiscalDataMock', () => {
    it('deve retornar CardName em maiúsculo', async () => {
      const businessPartner: Partial<BusinessPartner> = {
        CardName: 'test customer'
      };

      const result = await service.FiscalDataMock(businessPartner);

      expect(result).toEqual({
        "Valid": "TEST CUSTOMER"
      });
    });

    it('deve lançar erro quando CardName não é fornecido', async () => {
      const businessPartner: Partial<BusinessPartner> = {};

      await expect(service.FiscalDataMock(businessPartner))
        .rejects.toThrow(HttpError);
    });
  });

  describe('businessPartnerTypes', () => {
    it('deve retornar configuração para oldInactiveClients', () => {
      const result = service.businessPartnerTypes('oldInactiveClients');

      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].field).toBe('Valid');
      expect(result.filters[0].value).toEqual(['tNO']);
      expect(result.tables).toEqual(['OCRD']);
      expect(result.limit).toBe(100);
    });

    it('deve retornar configuração para testClients', () => {
      const result = service.businessPartnerTypes('testClients');

      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].field).toBe('CardName');
      expect(result.filters[0].operator).toBe('LIKE');
      expect(result.selects).toContain('CardName');
      expect(result.selects).toContain('CardCode');
      expect(result.limit).toBe(500);
    });

    it('deve lançar erro para tipo não implementado', () => {
      expect(() => service.businessPartnerTypes('NonExistentType'))
        .toThrow(HttpError);
    });
  });

  describe('validateRequiredFieldsForService', () => {
    it('deve validar campos obrigatórios com sucesso', () => {
      const requiredFields: (keyof BusinessPartner)[] = ['CardCode'];
      const entity: Partial<BusinessPartner> = { CardCode: 'C00001' };

      expect(() => service.validateRequiredFieldsForService(requiredFields, entity))
        .not.toThrow();
    });

    it('deve lançar erro quando campos obrigatórios estão ausentes', () => {
      const requiredFields: (keyof BusinessPartner)[] = ['CardCode', 'CardName'];
      const entity: Partial<BusinessPartner> = { CardCode: 'C00001' };

      expect(() => service.validateRequiredFieldsForService(requiredFields, entity))
        .toThrow(HttpErrorWithDetails);
    });
  });
});