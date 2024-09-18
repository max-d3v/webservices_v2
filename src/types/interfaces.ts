export interface Fornecedor {
    CardCode: string;
    CardName: string;
    CardType: string;
    TaxId0: string | null | "";
    State1: string | null | "";
    TaxId4: string | null | "";
    U_RSD_PFouPJ?: "PJ" | "MEI" | "PF";
    U_TX_SN?: 1 | 2 ; 
}

export interface DadosPessoaJuridica {
    U_TX_SN: 1 | 2 ; // se é optante ou não pelo simples nacional
    U_RSD_PFouPJ: "PJ";
}

export interface DadosPessoaFisica {
    U_RSD_PFouPJ: "PF";
}

export interface DadosMicroempresa {
    U_RSD_PFouPJ: "MEI";
}





export interface FornecedorData {
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
        registrations: Array<Registration>;
        suframa: Array<Suframa>;
    };
}

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

interface Activity {
    id: number;
    text: string;
}

interface Registration {
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