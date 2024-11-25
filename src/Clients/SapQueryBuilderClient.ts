import * as utils from '../interfaces/utils';

export class SapQueryBuilderClient {
  private readonly schema: string = process.env.WEB_SERVICE_COMPANY_NAME!;

  //This does not need a entity given that all the fields will be of the webservice and not of the Service Layer Model.
  createQuery<Entity extends Record<string, any>>(
    selects: Array<keyof Entity>, 
    tables: string[], 
    filters: Array<utils.Filter<Entity>>,
    limit: number | undefined
  ): string {
    if (!tables.length) {
      throw new Error('Tables and selects arrays cannot be empty');
    }

    const selectClause = this.createSelect(selects as string[], tables);
    const whereClause = filters.length ? this.createWhere(filters) : '';
    const limitClause = this.createLimitClause(limit);

    return `${selectClause} ${whereClause} ${limitClause}`.trim();
  }

  private createLimitClause(limit: number | undefined) {
    let limiter = ``;
    if (limit && limit > 0) {
      limiter = `LIMIT ${limit}`
    }
    return limiter;
  }

  /**
   * Creates the SELECT and FROM parts of the query
   */
  private createSelect(selects: string[], tables: string[]): string {
    const selectFields = this.createSelectClause(selects);
    
    const fromClause = this.createFromClause(tables);

    return `SELECT ${selectFields} ${fromClause}`;
  }

  private createSelectClause(selects: string[]) {
    let selectFields;
      if (selects.length === 0 ) {
        selectFields = "*";
      } else {
        selectFields = selects
        .map(field => `"${this.escapeSQLString(field)}"`)
        .join(', ');  
      }

      return selectFields
  }

  /**
   * Creates the FROM clause with proper table joining
   */
  private createFromClause(tables: string[]): string {
    if (tables.length === 1) {
      return `FROM "${this.schema}".${this.escapeSQLString(tables[0])}`;
    }

    // For multiple tables, implement proper JOIN logic here
    // This is a basic implementation - expand based on your needs
    return tables
      .map((table, index) => {
        if (index === 0) {
          return `FROM "${this.schema}".${this.escapeSQLString(table)}`;
        }
        // Add proper JOIN conditions based on your schema
        return `INNER JOIN "${this.schema}".${this.escapeSQLString(table)}`;
      })
      .join(' ');
  }

  /**
   * Creates the WHERE clause of the query
   */
  private createWhere<Entity>(filters: Array<utils.Filter<Entity>>): string {
    if (!filters.length) return '';

    const conditions = filters.map((filter, index) => {
      const { field, operator, value, conjunction = 'AND' } = filter;
      const fieldName = this.escapeSQLString(String(field));
      const formattedValues = this.formatValues(value);
      
      let condition = '';

      switch (operator) {
        case 'BETWEEN':
          if (value.length !== 2) {
            throw new Error('BETWEEN operator requires exactly 2 values');
          }
          condition = `"${fieldName}" BETWEEN ${formattedValues[0]} AND ${formattedValues[1]}`;
          break;
        
        case 'IN':
        case 'NOT IN':
          condition = `"${fieldName}" ${operator} (${formattedValues.join(', ')})`;
          break;
        
        case 'LIKE':
        case 'NOT LIKE':
          condition = `"${fieldName}" ${operator} ${formattedValues[0]}`;
          break;
        
        default:
          condition = `"${fieldName}" ${operator} ${formattedValues[0]}`;
      }

      return index === 0 ? condition : `${conjunction} ${condition}`;
    });

    return `WHERE ${conditions.join(' ')}`;
  }

  /**
   * Formats values based on their type
   */
  private formatValues(values: (string | number)[]): string[] {
    return values.map(value => {
      if (typeof value === 'number') {
        return String(value);
      }
      return `'${this.escapeSQLString(value)}'`;
    });
  }

  /**
   * Escapes special characters in SQL strings
   */
  private escapeSQLString(str: string): string {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, char => {
      switch (char) {
        case '"':
          return '""';
        case "'":
          return "''";
        case '\\':
          return '\\\\';
        case '%':
          return '\\%';
        default:
          return char;
      }
    });
  }
}

