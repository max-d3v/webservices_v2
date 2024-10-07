export const objetoVazio = (objeto: Object | null | undefined) => {
  console.log(typeof objeto)
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
      Soma = Soma + parseInt(strCPF.substring(i-1, i)) * (11 - i);
  
    Resto = (Soma * 10) % 11
  
    if ((Resto == 10) || (Resto == 11)) 
      Resto = 0
  
    if (Resto != parseInt(strCPF.substring(9, 10)) )
      return false
  
    Soma = 0
  
    for (let i = 1; i <= 10; i++)
      Soma = Soma + parseInt(strCPF.substring(i-1, i)) * (12 - i)
  
    Resto = (Soma * 10) % 11
  
    if ((Resto == 10) || (Resto == 11)) 
      Resto = 0
  
    if (Resto != parseInt(strCPF.substring(10, 11) ) )
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

  const matchNumbers =(value: string | number | number[] = '') => {
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
