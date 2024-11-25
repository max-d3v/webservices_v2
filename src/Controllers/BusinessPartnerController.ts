import { BusinessPartnerServices } from "../Services/BusinessPartnerServices";
import { HttpError } from "../utils/errorHandler";
import { Request } from "express";
import { BusinessPartner } from "../Models/BusinessPartner";
import { BusinessPartnerProperties } from "../Models/BusinessPartner";
import * as utils from "../interfaces/utils";
import * as helper from '../utils/helperFunctions';
import * as SapClientTypes from '../interfaces/SapB1Client';
import { Operators } from "../interfaces/utils";


export class BusinessPartnerController {
  private BusinessPartnerServices: BusinessPartnerServices;

  constructor() {
    this.BusinessPartnerServices = new BusinessPartnerServices();
  }

  async RequestHandler(req: Request) {
    const { method, url, body } = req;
    if (method === utils.HttpMethods.GET) {
      return await this.handleGetRequest(url, body);
    } else {
      return await this.handleActionRequest(url, body, method);
    }
  }

  async handleGetRequest(url: string, body: any) {
    const [_, __, type] = url.split("/");
    
    //Limit set default for 100.
    let { selects, filters, tables, limit } = this.defineQueryParams(type, body)

    const QueryParams = { selects, filters, tables, limit };
    const validatedParams = this.validateQueryParams(QueryParams);

    const results = await this.BusinessPartnerServices.retrieveEntities(validatedParams);
    return results;
  }

  async handleActionRequest(url: string, body: any, method: string) {
    const [_, __, action, type] = url.split("/");
    //Limit set default for 100.

    let processingFunction = this.BusinessPartnerServices.getProcessingFunction(action)

    let { selects, filters, tables, limit } = this.defineQueryParams(type, body)
    const QueryParams = { selects, filters, tables, limit };
    const validatedParams = this.validateQueryParams(QueryParams);

    const results = await this.BusinessPartnerServices.processEntities(validatedParams, processingFunction);
    const ActionReturn: any = this.handleActionResults(results);
    return ActionReturn;
  }



  defineQueryParams(Type: string | undefined, Body: any): utils.QueryParamsRequest {
    let QueryParams: utils.QueryParamsRequest = {
      selects: [],
      filters: [],
      tables: [],
      limit: undefined
    };

    //If there is a type and a body, type has priority.

    if (Type && Type !== "") {
      const { selects, filters, tables, limit } = this.BusinessPartnerServices.businessPartnerTypes(Type);
      QueryParams = { selects, filters, tables, limit };

      return QueryParams
    }
    if (Body) {
      //todo
      //TENHO QUE VALIDAR ISSO DAQUI -- 
      const { selects, filters, tables, limit } = Body;
      QueryParams = { selects, filters, tables, limit };

      return QueryParams
    }

    //Should not reach here.
    return QueryParams
  }

  validateQueryParams(QueryParams: utils.QueryParamsRequest): { selects: Array<keyof BusinessPartner>, filters: Array<utils.Filter<BusinessPartner>>, tables: string[], limit: number | undefined } {
    const selects = QueryParams.selects.filter((field): field is keyof BusinessPartner => {
      return field in BusinessPartnerProperties;
    });

    const filters: Array<utils.Filter<BusinessPartner>> = QueryParams.filters.map((filter): utils.Filter<BusinessPartner> => {
      if (!(filter.field in BusinessPartnerProperties)) {
        throw new Error(`Invalid filter field: ${filter.field}`);
      }

      if (!Object.values(Operators).includes(filter.operator as Operators)) {
        throw new Error(`Invalid filter operator: ${filter.operator}`);
      }

      if (filter.conjunction !== 'and' && filter.conjunction !== 'or') {
        throw new Error(`Invalid filter conjunction: ${filter.conjunction}`);
      }

      return {
        field: filter.field as keyof BusinessPartner,
        operator: filter.operator,
        value: filter.value,
        conjunction: filter.conjunction
      };
    });

    const tables = QueryParams.tables.filter((table): table is string => {
      return typeof table === 'string' && table.length > 0;
    });

    const limit = QueryParams.limit;

    if (tables.length < 1) {
      throw new HttpError(400, "No valid table given");
    }

    if (limit && typeof limit !== "number") {
      throw new HttpError(400, "Incorrect limit! must be a number");
    }

    return {
      selects,
      filters,
      tables,
      limit
    };
  }

  handleActionResults(results: (SapClientTypes.SapClientResponse | SapClientTypes.SapClientError)[]) {
    let resultsSorted = {
      processed_entities: results.filter((result) => result.status === true),
      errors: results.filter((result) => result.status === false)
    }

    const errors = resultsSorted.errors;
    const processed_entities = resultsSorted.processed_entities;
    const apiReturn = helper.handleMultipleProcessesResult(errors, processed_entities);

    return apiReturn;
  }

}