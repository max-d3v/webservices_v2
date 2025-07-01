import { HttpError, HttpErrorWithDetails } from "../utils/errorHandler";
import { BusinessPartner } from "../Models/BusinessPartner";
import { SapEntityServices } from "../interfaces/SapEntityServices";
import * as utils from '../interfaces/utils';

export class BusinessPartnerServices implements SapEntityServices<BusinessPartner> {
  public static instance: BusinessPartnerServices;
  constructor() {}

  public static getInstance(): BusinessPartnerServices {
    if (!BusinessPartnerServices.instance) {
      BusinessPartnerServices.instance = new BusinessPartnerServices();
    }
    return BusinessPartnerServices.instance;
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


  async Deactivate(BusinessPartner: Partial<BusinessPartner>): Promise<Partial<BusinessPartner>> {
    const requiredFields: (keyof BusinessPartner)[] = [];
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


  businessPartnerTypes(Type: string): { selects: string[], filters: Array<utils.FilterRequest>, tables: string[], limit: number | undefined } {
    let selects: string[] = [];
    let filters: utils.FilterRequest[] = [];
    let tables: string[] = ["OCRD"];
    let limit: number | undefined = 100;

    let filter: utils.FilterRequest | null = null;

    switch (Type) {
      case "oldInactiveClients":
        filter = {
          field: "Valid",
          operator: "=",
          value: ["tNO"],
          conjunction: "and"
        }
        filters.push(filter);
        break;
      case "testClients":
        filter = {
          field: "CardName",
          operator: "LIKE",
          value: ["%C%"],
          conjunction: "and",
        }
        limit = 500;
        filters.push(filter);
        selects.push("CardName");
        selects.push("CardCode");

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