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

export interface RelevantClientData {
    TaxId0: string | null | "";
    TaxId4: string | null | "";
    State1: string | null | "";
    CardCode: string;
    CardName: string;
    Free_Text?: string | null | "";
}

export interface ClientUpdateData {
    FreeText: string | null;
    U_TX_SN: 1 | 2 | null;
    U_TX_IndIEDest: "1" | "9" | null;
    BPFiscalTaxIDCollection: TemplateFiscal[] | null;  
}

export interface IsOptant {
    U_TX_SN: 1 | 2;
}


export interface FornecedorAdress {
    Address: string;
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