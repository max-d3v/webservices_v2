import { SapB1ServiceLayerServices } from "../Services/SapB1ServiceLayerServices";
import { BusinessPartner } from "../Models/BusinessPartner";
import { BusinessPartnerServices } from "../Services/BusinessPartnerServices";
import { ISapRepository } from "../interfaces/ISapRepository";
import { HttpError } from "../utils/errorHandler";
import * as utils from '../interfaces/utils';
import * as SapClientTypes from '../interfaces/SapB1Client';


export class SapB1BusinessPartnerRepository implements ISapRepository<BusinessPartner> {
  public static instance: SapB1BusinessPartnerRepository;
  private SapClient: SapB1ServiceLayerServices;
  private BusinessPartnerServices: BusinessPartnerServices;

  constructor() {
    this.BusinessPartnerServices = BusinessPartnerServices.getInstance();
    this.SapClient = SapB1ServiceLayerServices.getInstance();
  }

  public static getInstance(): SapB1BusinessPartnerRepository {
    if (!SapB1BusinessPartnerRepository.instance) {
      SapB1BusinessPartnerRepository.instance = new SapB1BusinessPartnerRepository();
    }
    return SapB1BusinessPartnerRepository.instance;
  }

  async findOne(identifier: string | number): Promise<BusinessPartner | null> {
    const result = await this.SapClient.getEntity<BusinessPartner>("BusinessPartner", identifier);
    return result?.data ?? null
  }

  async findMany(QueryOptions: utils.QueryParams<BusinessPartner>): Promise<Partial<BusinessPartner>[]> {
    const response = await this.SapClient.queryEntities<BusinessPartner>(QueryOptions);
    return response.data;
  }

  async createOne<OriginData>(originData: OriginData, creatorFunction: (params: OriginData) => Promise<BusinessPartner>): Promise<SapClientTypes.ActionResponse<BusinessPartner> | SapClientTypes.SapClientError> {
    try {
      const boundFunction = creatorFunction.bind(this.BusinessPartnerServices);
      const data = await boundFunction(originData);

      return await this.SapClient.createEntity<BusinessPartner>("BusinessPartners", data);
    } catch(err: unknown) {
      return this.handleError(err);
    }
  }

  //This is expected that some fail. (All of SAP rules are not implemented for each individual update :)) )
  async updateOne(BusinessPartner: Partial<BusinessPartner>, processingFunction: (params: Partial<BusinessPartner>) => Promise<Partial<BusinessPartner>>): Promise<SapClientTypes.ActionResponse<BusinessPartner> | SapClientTypes.SapClientError> {
    try {
      const identifier = BusinessPartner.CardCode!
      console.log(`Starting update process of business partner: ${identifier}`);

      const boundFunction = processingFunction.bind(this.BusinessPartnerServices);
      const data = await boundFunction(BusinessPartner);

      return (await this.SapClient.updateEntity<BusinessPartner>("BusinessPartners", identifier, data));
    } catch (err: SapClientTypes.SapClientError | unknown) {
      return this.handleError(err);
    }
  }

  returnEntities(businessPartners: Array<Partial<BusinessPartner>>): Array<Partial<BusinessPartner>> {
    return businessPartners;
  }

  async createInBatches<OriginData>(creatorFunction: (params: OriginData) => Promise<BusinessPartner>, originData: OriginData[]) {
    const results: (SapClientTypes.SapClientError | SapClientTypes.ActionResponse<BusinessPartner>)[] = [];

    // Processamento em lotes com controle de concorrência
    for (const chunk of this.chunkArray(originData, 50)) {
      const batchResults = await Promise.all(
        chunk.map(async originDataObject => await this.createOne(originDataObject, creatorFunction))
      );
      results.push(...batchResults);
    }
    return results;
  }

  async updateInBatches(businessPartners: Array<Partial<BusinessPartner>>, processingFunction: (params: Partial<BusinessPartner>) => Promise<Partial<BusinessPartner>>): Promise<(SapClientTypes.SapClientError | SapClientTypes.ActionResponse<BusinessPartner>)[]> {
    const results: (SapClientTypes.SapClientError | SapClientTypes.ActionResponse<BusinessPartner>)[] = [];

    // Processamento em lotes com controle de concorrência
    for (const chunk of this.chunkArray(businessPartners, 50)) {
      const batchResults = await Promise.all(
        chunk.map(async businessPartner => await this.updateOne(businessPartner, processingFunction))
      );
      results.push(...batchResults);
    }
    return results;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from(
      { length: Math.ceil(array.length / size) },
      (_, i) => array.slice(i * size, (i + 1) * size)
    );
  }

  handleError(Error: unknown): SapClientTypes.SapClientError{
    return {
      status: false,
      message: (Error as any).message ?? "Erro inesperado",
      statusCode: (Error as any).statusCode ?? 500,
      details: (Error as any).details ?? {}
    };
  }
}
