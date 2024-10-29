export interface Fornecedor {
    CardCode: string;
    CardName: string;
    CardType: string;
    TaxId0: string | null | "";
    State1: string | null | "";
    TaxId4: string | null | "";
    U_RSD_PFouPJ?: "PJ" | "MEI" | "PF";
    U_TX_SN?: 1 | 2;
}

export interface CardCode {
    CardCode: string;
}

export interface DeactivationClientsData extends CardCode {
    Free_Text: string;
}

export interface Opportunity {
    OpprId: number;
}

export interface CrmOneCredentials {
    EmailUsuario: string;
    SenhaUsuario: string;
}

export interface Cart {
    Items: CartItem[]
}

export interface ActivityCreation {
    ActivityDate: string;
    ActivityTime: string;
    CardCode: string;
    Duration: string; 
    DurationType: 'du_Minuts' | string;
    EndDueDate: string;
    EndTime: string;
    Closed: 'tNO' | 'tYES';
    Reminder: 'tYES' | 'tNO';
    ReminderPeriod: string; 
    ReminderType: 'du_Minuts' | string;
    StartDate: string;
    StartTime: string;
    Notes: string;
    Activity: 'cn_Other' | string;
    ActivityType: number; 
    Subject: number; 
    HandledBy: string | number;
  }


export interface Field {
    field: string;
}


export interface Document {
    DocType: string;
    DocNum: number;
}


export interface QuotationData {
    CardCode: string;
    CardName: string;
    DocEntry: string;
    DocTotal: number;
    DocNum: number;
    DocType: "Cotação"
}

export interface CrmOneResponse {
    Retorno: {
        Dados: null | any,
        MensagemErro: null | string,
        Status: number;
    }
}

export interface CartItem {
    id_produto: string;
    nome_produto: string; // Name of the product
    preco_normal: number; // Normal price
    qtd: number; // Quantity
    subtotal: number; // Subtotal
    WhsCode: number; // Warehouse code
    faturamento: string | null; // Billing information
    entrega: string | null; // Delivery information
    data: string; // Date
}

export interface ItemCarrinho {
    id: string; // ID do item
    id_usuario: string; // ID do usuário
    data: string; // Data do item (formato: YYYY-MM-DD)
    id_produto: string; // ID do produto
    id_grupo: string | null | undefined; // ID do grupo
    nome_produto: string; // Nome do produto
    preco_normal: number; // Preço normal (pode ser convertido para número)
    qtd: number; // Quantidade (pode ser convertida para número)
    subtotal: number; // Subtotal (pode ser convertido para número)
    faturamento: string | null | undefined; // Faturamento (pode ser convertido para número)
    entrega: string | null | undefined; // Informações de entrega
    WhsCode: number | null | undefined; // Código do armazém
}

export interface BaseOrderClientData {
    SlpCode: number;
    ShipType: string;
    State: string;
    BPLId: number;
    empID: number
}

export interface LinhaDocumento {
    ItemCode: string;
    Quantity: number;
    PriceBefDi: number;
    WhsCode: number;
    Usage: number;
}

export interface getClientDataQueryReturn {
    Address: string;
    TaxId0: string | null | "";
    TaxId4: string | null | "";
    State: string | null | "";
    CardCode: string;
    CardName: string;
    Balance: number;
    Free_Text?: string | null | "";
}

export interface RelevantClientData {
    Adresses: string[];
    TaxId0: string | null | "";
    State1: string | null | "";
    CardCode: string;
    CardName: string;
    Balance: number;
    Free_Text?: string | null | "";
}




export interface ClientUpdateData {
    FreeText: string | null;
    U_TX_SN: 1 | 2 | null;
    U_TX_IndIEDest: "1" | "9" | null;
    BPFiscalTaxIDCollection: TemplateFiscal[] | null;  
    Valid: "tYES" | "tNO" | null;
    Frozen: "tYES" | "tNO" | null;
}

export interface IsOptant {
    U_TX_SN: 1 | 2;
}

export interface FornecedorAdress {
    Address: string;
}

export interface ActivitiesCode {
    ClgCode: number
}

export interface Observations {
    Free_text: string | null;
}

export interface TemplateFiscal {
    Address: string;
    BPCode: string;
    AddrType: "bo_ShipTo";
    TaxId1: "Isento" | string;
}


export interface BaseFornecedorData {
    BPFiscalTaxIDCollection: TemplateFiscal[];    
    U_TX_IndIEDest: null | "9" | "1";
    U_RSD_PFouPJ: "PF" | "PJ" | "MEI" | null;
}

export interface DadosPessoaFisica extends BaseFornecedorData {
    U_RSD_PFouPJ: "PF";
    U_TX_IndIEDest: "9";
}

export interface BasePessoaJuridicaData extends BaseFornecedorData {
    U_TX_IndIEDest: "9" | "1";
}

export interface DadosMicroempresa extends BasePessoaJuridicaData {
    U_RSD_PFouPJ: "MEI";
}

export interface DadosPessoaJuridica extends BasePessoaJuridicaData {
    U_RSD_PFouPJ: "PJ"; 
    U_TX_SN: 1 | 2;
}

export interface FornecedorProcessado {
    CardCode: string;
    data: DadosPessoaFisica | DadosPessoaJuridica | DadosMicroempresa;
}


export interface BaseClientRegistrationData {
    U_TX_SN: 1 | 2 ;
    U_TX_IndIEDest: "9" | "1";
    BPFiscalTaxIDCollection: TemplateFiscal[];
}

export interface GetClientsFilter {
    field: string;
    value: string;
}

export interface generalFilter {
    field: string;
    value: string;
    operator: string;
}


export interface CnpjJaData {
    taxId: string;
    updated: string;
    company: {
        id: number;
        name: string;
        jurisdiction?: string;
        equity: number;
        nature: {
            id: number;
            text: string;
        };
        size: {
            id: number;
            acronym: string;
            text: string;
        };
        simples: {
            optant: boolean;
            since: string;
            history: Array<SimplesSimeiHistory>;
        };
        simei: {
            optant: boolean;
            since: string;
            history: Array<SimplesSimeiHistory>;
        };
        members: Array<Member>;
    }
    alias: string;
    founded: string;
    head: boolean;
    statusDate: string;
    status: {
        id: number;
        text: string;
    };
    reason?: {
        id: number;
        text: string;
    };
    specialDate?: string;
    special?: {
        id: number;
        text: string;
    };
    address: {
        municipality: number;
        street: string;
        number: string;
        district: string;
        city: string;
        state: 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA' | 'MG' | 'MS' | 'MT' | 'PA' | 'PB' | 'PE' | 'PI' | 'PR' | 'RJ' | 'RN' | 'RO' | 'RR' | 'RS' | 'SC' | 'SP' | 'SE' | 'TO';
        details: string;
        zip: string;
        latitude: number;
        longitude: number;
    };
    country: {
        id: number;
        name: string;
    };
    phones: Array<Phone>;
    emails: Array<Email>;
    mainActivity: Activity;
    sideActivities: Array<Activity>;
    registrations: Array<Registration> | [];
    suframa: Array<Suframa>;
};


interface SimplesSimeiHistory {
    from: string;
    until: string;
    text: string;
}

interface Member {
    since: string;
    person: Person;
    role: {
        id: number;
        text: string;
    };
    agent?: {
        person: Person;
        role: {
            id: number;
            text: string;
        };
    };
}

interface Person {
    id: string;
    type: 'NATURAL' | 'LEGAL' | 'FOREIGN' | 'UNKNOWN';
    name: string;
    taxId?: string;
    age?: '0-12' | '13-20' | '21-30' | '31-40' | '41-50' | '51-60' | '61-70' | '71-80' | '81+';
    country?: {
        id: number;
        name: string;
    };
}

interface Phone {
    area: string;
    number: string;
}

interface Email {
    address: string;
    domain: string;
}

export interface Activity {
    id: number;
    text: string;
}

export interface Registration {
    number: string;
    state: 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA' | 'MG' | 'MS' | 'MT' | 'PA' | 'PB' | 'PE' | 'PI' | 'PR' | 'RJ' | 'RN' | 'RO' | 'RR' | 'RS' | 'SC' | 'SP' | 'SE' | 'TO';
    enabled: boolean;
    statusDate: string;
    status: {
        id: number;
        text: string;
    };
    type: {
        id: number;
        text: string;
    };
}

interface Suframa {
    number: string;
    since: string;
    approved: boolean;
    approvalDate: string;
    status: {
        id: number;
        text: string;
    };
    incentives: Array<{
        tribute: 'ICMS' | 'IPI';
        benefit: string;
        purpose: string;
        basis: string;
    }>;
}


export interface TicketNumber {
    ClgCode: number;
}