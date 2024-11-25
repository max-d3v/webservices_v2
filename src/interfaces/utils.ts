//type Filter = string;

export enum Operators {
  Equals = '=',
  NotEquals = '!=',
  GreaterThan = '>',
  LessThan = '<',
  GreaterThanOrEqual = '>=',
  LessThanOrEqual = '<=',
  In = 'IN',
  NotIn = 'NOT IN',
  Like = 'LIKE',
  NotLike = 'NOT LIKE',
  Between = 'BETWEEN'
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export enum HttpMethods {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

export type Operator = 
  | '=' 
  | '!=' 
  | '>' 
  | '<' 
  | '>=' 
  | '<=' 
  | 'IN' 
  | 'NOT IN'
  | 'LIKE'
  | 'NOT LIKE'
  | 'BETWEEN';

export type FilterRequest = {
  field: string,
  operator: Operator,
  value: (string | number)[],
  conjunction: string
}

export type Filter<Entity> = {
  field: keyof Entity,
  operator: Operator,
  value: (string | number)[]
  conjunction: string;
}


export type QueryParams<Entity> = {
    selects: Array<keyof Entity>,
    filters: Array<Filter<Entity>>,
    tables: string[],
    limit: number | undefined;
}

export type QueryParamsRequest = {
  selects: string[];
  filters: FilterRequest[];
  tables: string[];
  limit: number | undefined;
}

export type ActionResponse = {
  status: boolean,
  message: string,
  details: any
} 


