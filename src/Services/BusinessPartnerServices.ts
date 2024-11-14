import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import { BusinessPartner } from "../Models/BusinessPartner";
import { SapEntityServices } from "../interfaces/SapEntityServices";
import { SapB1BusinessPartnerRepository } from "../Repositories/BusinessPartnerRepository";
import * as utils from '../interfaces/utils';

export class BusinessPartnerServices implements SapEntityServices<BusinessPartner> {
  public static instance: BusinessPartnerServices;
  private Repository: SapB1BusinessPartnerRepository;

  constructor() {
    this.Repository = SapB1BusinessPartnerRepository.getInstance();
  }

  public static getInstance(): BusinessPartnerServices {
    if (!BusinessPartnerServices.instance) {
      BusinessPartnerServices.instance = new BusinessPartnerServices();
    }
    return BusinessPartnerServices.instance;
  }


  async createEntities() {
    //Origins of data:
    //Databases, webservices, csv, etc.

  }

  async processEntities(QueryParams: utils.QueryParams<BusinessPartner>, processingFunction: (params: Partial<BusinessPartner>) => Promise<Partial<BusinessPartner>>) {
    const BusinessPartners = await this.Repository.findMany(QueryParams);
    return await this.Repository.updateInBatches(BusinessPartners, processingFunction);
  }

  async retrieveEntities(QueryParams: utils.QueryParams<BusinessPartner>): Promise<Array<Partial<BusinessPartner>>> {
    const BusinessPartners = await this.Repository.findMany(QueryParams);
    return this.Repository.returnEntities(BusinessPartners);
  }

  async Deactivate(BusinessPartner: Partial<BusinessPartner>): Promise<Partial<BusinessPartner>> {
    const requiredFields: (keyof BusinessPartner)[] = ["GroupCode"];
    this.validateRequiredFieldsForService(requiredFields, BusinessPartner)

    const data = {
      "Valid": "tNO",
      "Frozen": "tYES"
    }

    return data;
  }

  async FiscalDataMock(BusinessPartner: Partial<BusinessPartner>): Promise<Partial<BusinessPartner>> {
    const { CardName } = BusinessPartner;
    if (!CardName) {
      throw new HttpError(400, "No valid CardName given")
    }

    const data = {
      "Valid": CardName.toUpperCase(),
    }

    return data;
  }



  getProcessingFunction(action: string | undefined): (params: Partial<BusinessPartner>) => Promise<Partial<BusinessPartner>> {
    if (!action) {
      throw new HttpError(400, "No action was given.")
    }
    switch (action) {
      case "Deactivate":
          return this.Deactivate;
      case "FiscalDataMock":
          return this.FiscalDataMock;
        default:
        throw new HttpError(400, "Action was not implemented yet.")
    }
  }

  businessPartnerTypes(Type: string): { selects: string[], filters: Array<utils.FilterRequest>, tables: string[], limit: number | undefined } {
    let selects: string[] = [];
    let filters: utils.FilterRequest[] = [];
    let tables: string[] = ["OCRD"];
    let limit: number | undefined = 100;


    switch (Type) {
      case "oldInactiveClients":
        const filter: utils.FilterRequest = {
          field: "Valid",
          operator: "=",
          value: ["tNO"],
          conjunction: "and"
        }
        filters.push(filter);
        break;
      default:
        throw new HttpError(400, "Type of business partner not implemented.")
    }


    return { selects, filters, tables, limit }
  }


  validateRequiredFieldsForService(requiredFields: (keyof BusinessPartner)[], Entity: Partial<BusinessPartner>) {
    const givenFields = Object.keys(Entity);
    const requiredFieldsAsStrings = requiredFields as string[];

    const matchedFields: string[] = [];

    for (const givenField of givenFields) {
      if (requiredFieldsAsStrings.includes(givenField)) {
        matchedFields.push(givenField)
      }
    }

    if (requiredFieldsAsStrings.equals(matchedFields)) {
      return true;
    } else {
      const fieldsLeft = requiredFieldsAsStrings.filter(field => !matchedFields.includes(field));
      throw new HttpErrorWithDetails(400, "Required field(s) for BusinessPartner not found.", fieldsLeft);
    }
  }
}