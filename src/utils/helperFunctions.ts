import { HttpError } from "./errorHandler";
import { HttpErrorWithDetails } from "./errorHandler";
import shortUUID from "short-uuid";
export const objetoVazio = (objeto: Object | null | undefined) => {
  if (typeof objeto !== 'object' || objeto === null || Array.isArray(objeto)) {
    return false;
  }
  return Object.keys(objeto).length === 0;
}

export const validaCPF = (cpf: string | null | undefined | number) => {
  var Soma = 0
  var Resto

  var strCPF = String(cpf).replace(/[^\d]/g, '')

  if (strCPF.length !== 11)
    return false

  if ([
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999',
  ].indexOf(strCPF) !== -1)
    return false

  for (let i = 1; i <= 9; i++)
    Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);

  Resto = (Soma * 10) % 11

  if ((Resto == 10) || (Resto == 11))
    Resto = 0

  if (Resto != parseInt(strCPF.substring(9, 10)))
    return false

  Soma = 0

  for (let i = 1; i <= 10; i++)
    Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i)

  Resto = (Soma * 10) % 11

  if ((Resto == 10) || (Resto == 11))
    Resto = 0

  if (Resto != parseInt(strCPF.substring(10, 11)))
    return false

  return true
}


export function validCNPJ(value: string | null | number | number[] = '') {
  const regexCNPJ = /^\d{2}.\d{3}.\d{3}\/\d{4}-\d{2}$/

  if (!value) return false

  // Aceita receber o valor como string, número ou array com todos os dígitos
  const isString = typeof value === 'string'
  const validTypes = isString || Number.isInteger(value) || Array.isArray(value)

  // Elimina valor de tipo inválido
  if (!validTypes) return false

  // Filtro inicial para entradas do tipo string
  if (isString) {
    // Teste Regex para veificar se é uma string apenas dígitos válida
    const digitsOnly = /^\d{14}$/.test(value)
    // Teste Regex para verificar se é uma string formatada válida
    const validFormat = regexCNPJ.test(value)
    // Verifica se o valor passou em ao menos 1 dos testes
    const isValid = digitsOnly || validFormat

    // Se o formato não é válido, retorna inválido
    if (!isValid) return false
  }

  // Elimina tudo que não é dígito
  const numbers = matchNumbers(value)

  // Valida a quantidade de dígitos
  if (numbers.length !== 14) return false

  // Elimina inválidos com todos os dígitos iguais
  const items = [...new Set(numbers)]
  if (items.length === 1) return false

  // Separa os 2 últimos dígitos verificadores
  const digits = numbers.slice(12)

  // Valida 1o. dígito verificador
  const digit0 = validCalc(12, numbers)
  if (digit0 !== digits[0]) return false

  // Valida 2o. dígito verificador
  const digit1 = validCalc(13, numbers)
  return digit1 === digits[1]
}

const matchNumbers = (value: string | number | number[] = '') => {
  const match = value.toString().match(/\d/g)
  return Array.isArray(match) ? match.map(Number) : []
}

const validCalc = (x: number, numbers: number[]) => {
  const slice = numbers.slice(0, x)
  let factor = x - 7
  let sum = 0

  for (let i = x; i >= 1; i--) {
    const n = slice[x - i]
    sum += n * factor--
    if (factor < 2) factor = 9
  }

  const result = 11 - (sum % 11)

  return result > 9 ? 0 : result
}

export const isIsoDate = (date: string) => {
  return new Date(date).toISOString().split('T')[0] === date;
}

export const isIsoString = (str: string): boolean => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return isoDateRegex.test(str) && isIsoDate(str);
}


export const isEmpty = (value: any[]): boolean => {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.length === 0;
}

export const batchOperation = async (entities: any[], cb: Function, batchSize: number, ...parameters: any[]) => {
  const maxIterations = Math.ceil(entities.length / batchSize);
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log(`Starting iteration ${iteration}, of ${batchSize} clients - total iterations: ${maxIterations}`);

    const firstPosition = iteration * batchSize;
    const batch = entities.slice(firstPosition, firstPosition + batchSize);
    await Promise.all(batch.map(async (entity) => await cb(entity, ...parameters)));
  }
}


export const handleMultipleProcessesResult = async <TError, TProcessed>(errors: TError[], processedEntities: TProcessed[]) => {
  deleteEmptyArraysInPlace(errors);
  deleteEmptyArraysInPlace(processedEntities);
  if (processedEntities.length === 0 && errors.length > 0) {
    throw new HttpErrorWithDetails(400, "Erro ao executar todas as operações", errors);
  } else if (errors.length > 0 && processedEntities.length > 0) {
    throw new HttpErrorWithDetails(206, "Erro ao atualizar parte das operações", { ObjetosComErro: errors, ObjetosProcessados: processedEntities })
  } else if (errors.length === 0 && processedEntities.length > 0) {
    return processedEntities;
  } else if (errors.length == 0 && processedEntities.length == 0) {
    throw new HttpError(500, 'Erro ao processar resultados, nenhum dado passado.');
  } else {
    throw new HttpError(500, 'Erro ao processar resultados');
  }
}

const deleteEmptyArraysInPlace = (array: any[]): void => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (Array.isArray(array[i]) && array[i].length === 0) {
      array.splice(i, 1);
    }
  }
};


export const checkAllFields = (Data: any): void => {
  try {
    const fields = Object.keys(Data);
    for (const field of fields) {
      if (Data[field] === null || Data[field] === undefined || Data[field] === "") {
        throw new HttpError(400, `Dado: ${field} inválido: (null undefined ou empty str)`);
      }
    }
  } catch (err: any) {
    throw new HttpError(err.statusCode || 500, 'Erro ao verificar se os dados do cliente estão completos: ' + err.message);
  }
}


export const generateReferenceNum = (CardCode: string | null) => {
  let ref = "";

  const id = shortUUID.generate();
  //const date = new Date().toISOString().split("T")[0];
  ref = `${id}`;

  return ref
}

export const addWorkDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(date.getDate() + days);

  if (result.getDay() === 0) {
    result.setDate(result.getDate() + 1);
  } else if (result.getDay() === 6) {
    result.setDate(result.getDate() + 2);
  }

  return result;
}

declare global {
  interface Array<T> {
    equals(array: T[]): boolean;
  }
}

Array.prototype.equals = function (array: any[]) {
  // if the other array is a falsy value, return
  if (!array)
    return false;
  // if the argument is the same array, we can be sure the contents are same as well
  if (array === this)
    return true;
  // compare lengths - can save a lot of time 
  if (this.length != array.length)
    return false;

  for (var i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i]))
        return false;
    }
    else if (this[i] != array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });




