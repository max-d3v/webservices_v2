export interface BusinessPartner {
    'odata.metadata': string;
    'odata.etag': string;
    CardCode: string;
    CardName: string;
    CardType: string;
    GroupCode: number;
    Address: string;
    ZipCode: string;
    MailAddress: string;
    MailZipCode: string;
    Phone1: string | null;
    Phone2: string | null;
    Fax: string | null;
    ContactPerson: string;
    Notes: string;
    PayTermsGrpCode: number;
    CreditLimit: number;
    MaxCommitment: number;
    DiscountPercent: number;
    VatLiable: string;
    FederalTaxID: string | null;
    DeductibleAtSource: string;
    DeductionPercent: number;
    DeductionValidUntil: string | null;
    PriceListNum: number;
    IntrestRatePercent: number;
    CommissionPercent: number;
    CommissionGroupCode: number;
    FreeText: string;
    SalesPersonCode: number;
    Currency: string;
    RateDiffAccount: string;
    Cellular: string;
    AvarageLate: number | null;
    City: string;
    County: string;
    Country: string;
    MailCity: string;
    MailCounty: string;
    MailCountry: string;
    EmailAddress: string;
    Picture: string | null;
    DefaultAccount: string | null;
    DefaultBranch: string | null;
    DefaultBankCode: string;
    AdditionalID: string | null;
    Pager: string | null;
    FatherCard: string | null;
    CardForeignName: string;
    FatherType: string;
    DeductionOffice: string | null;
    ExportCode: string | null;
    MinIntrest: number;
    CurrentAccountBalance: number;
    OpenDeliveryNotesBalance: number;
    OpenOrdersBalance: number;
    OpenChecksBalance: number;
    VatGroup: string | null;
    ShippingType: number;
    Password: string | null;
    Indicator: string | null;
    IBAN: string | null;
    CreditCardCode: number;
    CreditCardNum: string | null;
    CreditCardExpiration: string | null;
    DebitorAccount: string;
    OpenOpportunities: string | null;
    Valid: string;
    ValidFrom: string | null;
    ValidTo: string | null;
    ValidRemarks: string | null;
    Frozen: string;
    FrozenFrom: string | null;
    FrozenTo: string | null;
    FrozenRemarks: string | null;
    Block: string;
    BillToState: string;
    ShipToState: string;
    ExemptNum: string | null;
    Priority: number;
    FormCode1099: string | null;
    Box1099: string | null;
    PeymentMethodCode: string;
    BackOrder: string;
    PartialDelivery: string;
    BlockDunning: string;
    BankCountry: string;
    HouseBank: string | null;
    HouseBankCountry: string;
    HouseBankAccount: string | null;
    ShipToDefault: string;
    DunningLevel: string | null;
    DunningDate: string | null;
    CollectionAuthorization: string;
    DME: string | null;
    InstructionKey: string | null;
    SinglePayment: string;
    ISRBillerID: string | null;
    PaymentBlock: string;
    ReferenceDetails: string | null;
    HouseBankBranch: string | null;
    OwnerIDNumber: string | null;
    PaymentBlockDescription: number;
    TaxExemptionLetterNum: string | null;
    MaxAmountOfExemption: number;
    ExemptionValidityDateFrom: string | null;
    ExemptionValidityDateTo: string | null;
    LinkedBusinessPartner: string | null;
    LastMultiReconciliationNum: string | null;
    DeferredTax: string;
    Equalization: string;
    SubjectToWithholdingTax: string;
    CertificateNumber: string | null;
    ExpirationDate: string | null;
    NationalInsuranceNum: string | null;
    AccrualCriteria: string;
    WTCode: string;
    BillToBuildingFloorRoom: string;
    DownPaymentClearAct: string;
    ChannelBP: string | null;
    DefaultTechnician: string | null;
    BilltoDefault: string;
    CustomerBillofExchangDisc: string;
    Territory: string | null;
    ShipToBuildingFloorRoom: string;
    CustomerBillofExchangPres: string;
    ProjectCode: string | null;
    VatGroupLatinAmerica: string | null;
    DunningTerm: string | null;
    Website: string | null;
    OtherReceivablePayable: string | null;
    BillofExchangeonCollection: string | null;
    CompanyPrivate: string;
    LanguageCode: number;
    UnpaidBillofExchange: string | null;
    WithholdingTaxDeductionGroup: number;
    ClosingDateProcedureNumber: string | null;
    Profession: string | null;
    BankChargesAllocationCode: string | null;
    TaxRoundingRule: string;
    Properties1: string;
    Properties64: string;
    CompanyRegistrationNumber: string | null;
    VerificationNumber: string | null;
    DiscountBaseObject: string;
    DiscountRelations: string;
    TypeReport: string;
    ThresholdOverlook: string;
    SurchargeOverlook: string;
    DownPaymentInterimAccount: string | null;
    OperationCode347: string;
    InsuranceOperation347: string;
    HierarchicalDeduction: string;
    ShaamGroup: string;
    WithholdingTaxCertified: string;
    BookkeepingCertified: string;
    PlanningGroup: string | null;
    Affiliate: string;
    Industry: string | null;
    VatIDNum: string | null;
    DatevAccount: string | null;
    DatevFirstDataEntry: string;
    UseShippedGoodsAccount: string;
    GTSRegNo: string | null;
    GTSBankAccountNo: string | null;
    GTSBillingAddrTel: string | null;
    ETaxWebSite: string | null;
    HouseBankIBAN: string;
    VATRegistrationNumber: string | null;
    RepresentativeName: string | null;
    IndustryType: string | null;
    BusinessType: string | null;
    Series: number;
    AutomaticPosting: string | null;
    InterestAccount: string | null;
    FeeAccount: string | null;
    CampaignNumber: string | null;
    AliasName: string | null;
    DefaultBlanketAgreementNumber: string | null;
    EffectiveDiscount: string;
    NoDiscounts: string;
    EffectivePrice: string;
    EffectivePriceConsidersPriceBeforeDiscount: string;
    GlobalLocationNumber: string | null;
    EDISenderID: string | null;
    EDIRecipientID: string | null;
    ResidenNumber: string;
    RelationshipCode: string | null;
    RelationshipDateFrom: string | null;
    RelationshipDateTill: string | null;
    UnifiedFederalTaxID: string | null;
    AttachmentEntry: number;
    TypeOfOperation: string | null;
    EndorsableChecksFromBP: string;
    AcceptsEndorsedChecks: string;
    OwnerCode: string | null;
    BlockSendingMarketingContent: string;
    AgentCode: string;
    PriceMode: string | null;
    EDocGenerationType: string | null;
    EDocStreet: string | null;
    EDocStreetNumber: string | null;
    EDocBuildingNumber: string | null;
    EDocZipCode: string | null;
    EDocCity: string | null;
    EDocCountry: string | null;
    EDocDistrict: string | null;
    EDocRepresentativeFirstName: string | null;
    EDocRepresentativeSurname: string | null;
    EDocRepresentativeCompany: string | null;
    EDocRepresentativeFiscalCode: string | null;
    EDocRepresentativeAdditionalId: string | null;
    EDocPECAddress: string | null;
    IPACodeForPA: string | null;
    UpdateDate: string;
    UpdateTime: string;
    ExemptionMaxAmountValidationType: string;
    ECommerceMerchantID: string | null;
    UseBillToAddrToDetermineTax: string;
    CreateDate: string;
    CreateTime: string;
    DefaultTransporterEntry: string | null;
    DefaultTransporterLineNumber: string | null;
    FCERelevant: string;
    FCEValidateBaseDelivery: string;
    MainUsage: number;
    EBooksVATExemptionCause: string | null;
    LegalText: string | null;
    DataVersion: number;
    ExchangeRateForIncomingPayment: string;
    ExchangeRateForOutgoingPayment: string;
    CertificateDetails: string | null;
    DefaultCurrency: string | null;
    EORINumber: string | null;
    FCEAsPaymentMeans: string;
    U_IB_BoletoGeradoPor: string;
    U_ImprimirBoleto: number;
    U_TX_ProdRural: string | null;
    U_TX_ExImp: string | null;
    U_TX_IndIEDest: string;
    U_TX_SitResp: string | null;
    U_TX_SN: string;
    U_TX_IndFinal: string;
    U_TX_IndNat: string | null;
    U_TX_Pagador: string | null;
    U_TX_Rendimento: string | null;
    U_TX_DCReEmpColigada: string | null;
    U_RSD_PrazoMCont: number;
    U_RSD_MatrizFilial: string | null;
    U_RSD_UsuNivel1: string;
    U_RSD_UsuNivel2: string;
    U_RSD_CodAntSIF: string | null;
    U_RSD_TipoAtividade: string | null;
    U_RSD_TP_CLIENTE: string;
    U_RSD_PossuiIE: string | null;
    U_RSD_PFouPJ: string | null;
    U_RSD_EnqTribut: string | null;
    U_RSD_PagRecDDA: string | null;
    U_RSD_ObsNF: string | null;
    U_RSD_AutImagem: string | null;
    U_RSD_TipoFrete: string | null;
    U_RSD_SegmentoFilho1: string;
    U_RSD_TranspCode: string | null;
    U_RSD_TranspName: string | null;
    U_RSD_MatrizPN: string;
    U_RSD_ValorMinimo: number;
    U_TranspDfl: string | null;
    U_DWUIdCadApp: string | null;
    U_DWUIdDispositivo: string | null;
    U_Latitude: string | null;
    U_Longitude: string | null;
    U_DWU_Origem: string | null;
    U_DWU_IgnoraAlerta: string;
    U_Item: string | null;
    U_Account: string | null;
    U_ContaDesc: string | null;
    U_PDV_CARTAO_FIDELID: string | null;
    U_PDV_EMAIL_PROMO: string;
    U_CONTRIBUINTE: string;
    U_PDV_valorpend: number;
    U_PDV_RG: string | null;
    U_CFID: string | null;
    U_RSD_RegVend: string;
    U_RSD_Desconto: number;
    U_RSD_ClienteHomologado: string;
    U_VL_APR_VND: string | null;
    U_IMOV_PROP: string;
    U_N_COLAB: string | null;
    U_N_CLI_ESTB: string | null;
    U_REF_COMERC: string | null;
    U_N_COLAB_FEM: string | null;
    U_Analise_Cliente: string;
    U_BPLId_Click: number;
    U_Matriz_Click: string;
    U_CD_INPACS_ORBITA: string | null;
    U_Aceita_DDA: string;
    U_IB_Categ_Fin: string | null;
    U_CodSIFPoloSul: string | null;
    U_TX_PrestServ: string | null;
    U_Taxa_Ant_Dia: string | null;
    U_Permite_Contato: string;
    U_PDV_IND_PROF: string;
    U_TX_RF_IPre: string | null;
    U_TX_RF_IsTrFolha: string | null;
    U_CodSIFBrioville: string | null;
    U_TX_RF_IndNif: string | null;
    U_TX_RF_FormaTrib: string | null;
    U_CodSIFRejovel: string | null;
    U_MatrizPN: string | null;
    U_ClasseRisco: string;
    U_DesativadoExterno: string;
    U_PDV_USA_UTILIZAC: string;
    U_PDV_CRIADOR_CAD: string | null;
    U_PDV_DT_NASCIMENTO: string | null;
    U_PDV_CONVENIO: string | null;
    U_IV_BP_PayerID: string | null;
    U_TX_RF_IsenImun: string | null;
    U_TX_RF_CodNatRend: string | null;
    U_TX_RF_TpPessoa: string | null;
    ElectronicProtocols: string[];
    BPAddresses: BPAddress[];
    ContactEmployees: ContactEmployee[];
    BPAccountReceivablePaybleCollection: BPAccountReceivablePayable[];
    BPPaymentMethods: BPPaymentMethod[];
    BPWithholdingTaxCollection: BPWithholdingTax[];
    BPPaymentDates: BPPaymentDate[];
    BPBranchAssignment: BPBranchAssignment[];
    BPBankAccounts: BPBankAccount[];
    BPFiscalTaxIDCollection: BPFiscalTaxID[];
    DiscountGroups: any[];
    BPIntrastatExtension: any;
    BPBlockSendingMarketingContents: any[];
    BPCurrenciesCollection: any[];
}




export interface BPAddress {
    AddressName: string;
    Street: string;
    Block: string;
    ZipCode: string;
    City: string;
    County: string;
    Country: string;
    State: string;
    FederalTaxID: string | null;
    TaxCode: string | null;
    BuildingFloorRoom: string;
    AddressType: string;
    AddressName2: string | null;
    AddressName3: string | null;
    TypeOfAddress: string;
    StreetNo: string;
    BPCode: string;
    RowNum: number;
    GlobalLocationNumber: string | null;
    Nationality: string | null;
    TaxOffice: string | null;
    GSTIN: string | null;
    GstType: string | null;
    CreateDate: string;
    CreateTime: string;
    MYFType: string | null;
    TaasEnabled: string;
    U_TX_IE: string | null;
    U_Latitude: string | null;
    U_Longitude: string | null;
    U_DWU_Obs: string | null;
    U_DWU_Tp_Insc: string | null;
    U_DWU_Dt_Situ_Cad: string | null;
    U_DWU_Situ_CNPJ: string | null;
    U_DWU_Situ_IE: string | null;
    U_DWU_Dt_Ini_Atv: string | null;
    U_DWU_Dt_Fim_Atv: string | null;
    U_DWU_Reg_Trib: string | null;
    U_DWU_Inf_Ie_Dest: string | null;
    U_DWU_Porte_Emp: string | null;
    U_SKILL_indIEDest: string | null;
    U_cidade: string | null;
    U_Aniversario: string | null;
    U_TX_IndFinal: string | null;
    U_TX_IndIEDest: string | null;
    U_TX_CNPJ: string | null;
}

export interface ContactEmployee {
    CardCode: string;
    Name: string;
    Position: string | null;
    Address: string | null;
    Phone1: string | null;
    Phone2: string | null;
    MobilePhone: string;
    Fax: string | null;
    E_Mail: string;
    Pager: string | null;
    Remarks1: string | null;
    Remarks2: string | null;
    Password: string | null;
    InternalCode: number;
    PlaceOfBirth: string;
    DateOfBirth: string | null;
    Gender: string;
    Profession: string | null;
    Title: string | null;
    CityOfBirth: string | null;
    Active: string;
    FirstName: string;
    MiddleName: string | null;
    LastName: string | null;
    EmailGroupCode: string | null;
    BlockSendingMarketingContent: string;
    CreateDate: string;
    CreateTime: string;
    UpdateDate: string;
    UpdateTime: string;
    ConnectedAddressName: string | null;
    ConnectedAddressType: string | null;
    ForeignCountry: string | null;
    U_TX_IdFiscalAut: string | null;
    U_EhBeneficPag: string;
    U_TX_AutRecXml: string | null;
    U_RSD_PorcParticip: number;
    U_RSD_BOLETOEMAIL: string;
    U_TX_RF_RelDep: string | null;
    ContactEmployeeBlockSendingMarketingContents: any[];
}

export interface BPAccountReceivablePayable {
    AccountType: string;
    AccountCode: string;
    BPCode: string;
}

export interface BPPaymentMethod {
    PaymentMethodCode: string;
    RowNumber: number;
    BPCode: string;
}

export interface BPWithholdingTax { }

export interface BPPaymentDate { }

export interface BPBranchAssignment {
    BPCode: string;
    BPLID: number;
    DisabledForBP: string;
}

export interface BPBankAccount { }

export interface BPFiscalTaxID {
    Address: string;
    CNAECode: number;
    TaxId0: string;
    TaxId1: string;
    TaxId2: string;
    TaxId3: string;
    TaxId4: string;
    TaxId5: string;
    TaxId6: string;
    TaxId7: string;
    TaxId8: string;
    TaxId9: string | null;
    TaxId10: string | null;
    TaxId11: string | null;
    BPCode: string;
    AddrType: string;
    TaxId12: string;
    TaxId13: string | null;
    AToRetrNFe: string;
    TaxId14: string | null;
}

export const BusinessPartnerProperties: BusinessPartner = {
    'odata.metadata': 'https://example.com/odata/$metadata',
    'odata.etag': 'W/"etag"',
    CardCode: 'BP12345',
    CardName: 'Business Partner XYZ',
    CardType: 'C',
    GroupCode: 1,
    Address: '123 Business St',
    ZipCode: '12345',
    MailAddress: '123 Business St, Mailbox',
    MailZipCode: '54321',
    Phone1: '123-456-7890',
    Phone2: null,
    Fax: null,
    ContactPerson: 'John Doe',
    Notes: 'Important client.',
    PayTermsGrpCode: 2,
    CreditLimit: 10000,
    MaxCommitment: 5000,
    DiscountPercent: 5,
    VatLiable: 'Y',
    FederalTaxID: '123456789',
    DeductibleAtSource: 'N',
    DeductionPercent: 2,
    DeductionValidUntil: '2025-12-31',
    PriceListNum: 1,
    IntrestRatePercent: 10,
    CommissionPercent: 15,
    CommissionGroupCode: 1,
    FreeText: 'This is a free text field.',
    SalesPersonCode: 101,
    Currency: 'USD',
    RateDiffAccount: '0001',
    Cellular: '987-654-3210',
    AvarageLate: 30,
    City: 'New York',
    County: 'NY',
    Country: 'USA',
    MailCity: 'New York',
    MailCounty: 'NY',
    MailCountry: 'USA',
    EmailAddress: 'contact@businesspartner.com',
    Picture: null,
    DefaultAccount: '12345',
    DefaultBranch: null,
    DefaultBankCode: '001',
    AdditionalID: null,
    Pager: null,
    FatherCard: null,
    CardForeignName: 'Empresa XYZ',
    FatherType: 'Parent',
    DeductionOffice: null,
    ExportCode: 'EX123',
    MinIntrest: 5,
    CurrentAccountBalance: 5000,
    OpenDeliveryNotesBalance: 1000,
    OpenOrdersBalance: 2000,
    OpenChecksBalance: 1500,
    VatGroup: 'A',
    ShippingType: 1,
    Password: null,
    Indicator: null,
    IBAN: 'IBAN123456789',
    CreditCardCode: 123,
    CreditCardNum: '1234-5678-9876-5432',
    CreditCardExpiration: '12/24',
    DebitorAccount: '1234',
    OpenOpportunities: null,
    Valid: 'Y',
    ValidFrom: '2024-01-01',
    ValidTo: '2025-01-01',
    ValidRemarks: 'Valid for 1 year.',
    Frozen: 'N',
    FrozenFrom: null,
    FrozenTo: null,
    FrozenRemarks: null,
    Block: 'N',
    BillToState: 'NY',
    ShipToState: 'NY',
    ExemptNum: null,
    Priority: 1,
    FormCode1099: null,
    Box1099: null,
    PeymentMethodCode: '1',
    BackOrder: 'Y',
    PartialDelivery: 'N',
    BlockDunning: 'N',
    BankCountry: 'USA',
    HouseBank: 'Bank ABC',
    HouseBankCountry: 'USA',
    HouseBankAccount: '9876543210',
    ShipToDefault: 'Y',
    DunningLevel: null,
    DunningDate: null,
    CollectionAuthorization: 'Y',
    DME: null,
    InstructionKey: null,
    SinglePayment: 'Y',
    ISRBillerID: null,
    PaymentBlock: 'N',
    ReferenceDetails: null,
    HouseBankBranch: null,
    OwnerIDNumber: null,
    PaymentBlockDescription: 1,
    TaxExemptionLetterNum: null,
    MaxAmountOfExemption: 1000,
    ExemptionValidityDateFrom: '2024-01-01',
    ExemptionValidityDateTo: '2025-01-01',
    LinkedBusinessPartner: null,
    LastMultiReconciliationNum: null,
    DeferredTax: 'N',
    Equalization: 'N',
    SubjectToWithholdingTax: 'N',
    CertificateNumber: null,
    ExpirationDate: null,
    NationalInsuranceNum: null,
    AccrualCriteria: 'A',
    WTCode: '1',
    BillToBuildingFloorRoom: 'Floor 1',
    DownPaymentClearAct: 'Y',
    ChannelBP: null,
    DefaultTechnician: null,
    BilltoDefault: 'Y',
    CustomerBillofExchangDisc: 'Y',
    Territory: null,
    ShipToBuildingFloorRoom: 'Room 101',
    CustomerBillofExchangPres: 'N',
    ProjectCode: null,
    VatGroupLatinAmerica: null,
    DunningTerm: null,
    Website: null,
    OtherReceivablePayable: null,
    BillofExchangeonCollection: 'N',
    CompanyPrivate: 'N',
    LanguageCode: 1,
    UnpaidBillofExchange: null,
    WithholdingTaxDeductionGroup: 1,
    ClosingDateProcedureNumber: null,
    Profession: null,
    BankChargesAllocationCode: null,
    TaxRoundingRule: 'N',
    Properties1: 'SomeProperty1',
    Properties64: 'SomeProperty64',
    CompanyRegistrationNumber: null,
    VerificationNumber: null,
    DiscountBaseObject: 'Object1',
    DiscountRelations: 'Rel1',
    TypeReport: 'Type1',
    ThresholdOverlook: 'Y',
    SurchargeOverlook: 'Y',
    DownPaymentInterimAccount: null,
    OperationCode347: 'OP347',
    InsuranceOperation347: 'Insurance1',
    HierarchicalDeduction: 'Y',
    ShaamGroup: 'Group1',
    WithholdingTaxCertified: 'N',
    BookkeepingCertified: 'N',
    PlanningGroup: null,
    Affiliate: 'Affiliate1',
    Industry: null,
    VatIDNum: null,
    DatevAccount: null,
    DatevFirstDataEntry: '2024-01-01',
    UseShippedGoodsAccount: 'Y',
    GTSRegNo: null,
    GTSBankAccountNo: null,
    GTSBillingAddrTel: null,
    ETaxWebSite: null,
    HouseBankIBAN: 'IBAN987654321',
    VATRegistrationNumber: null,
    RepresentativeName: null,
    IndustryType: null,
    BusinessType: null,
    Series: 1,
    AutomaticPosting: null,
    InterestAccount: null,
    FeeAccount: null,
    CampaignNumber: null,
    AliasName: null,
    DefaultBlanketAgreementNumber: null,
    EffectiveDiscount: '5%',
    NoDiscounts: 'N',
    EffectivePrice: '100',
    EffectivePriceConsidersPriceBeforeDiscount: 'Y',
    GlobalLocationNumber: null,
    EDISenderID: null,
    EDIRecipientID: null,
    ResidenNumber: 'RN12345',
    RelationshipCode: null,
    RelationshipDateFrom: null,
    RelationshipDateTill: null,
    UnifiedFederalTaxID: null,
    AttachmentEntry: 1,
    TypeOfOperation: null,
    EndorsableChecksFromBP: 'N',
    AcceptsEndorsedChecks: 'N',
    OwnerCode: null,
    BlockSendingMarketingContent: 'Y',
    AgentCode: 'Agent123',
    PriceMode: null,
    EDocGenerationType: null,
    EDocStreet: null,
    EDocStreetNumber: null,
    EDocBuildingNumber: null,
    EDocZipCode: null,
    EDocCity: null,
    EDocCountry: null,
    EDocDistrict: null,
    EDocRepresentativeFirstName: null,
    EDocRepresentativeSurname: null,
    EDocRepresentativeCompany: null,
    EDocRepresentativeFiscalCode: null,
    EDocRepresentativeAdditionalId: null,
    EDocPECAddress: null,
    IPACodeForPA: null,
    UpdateDate: '2024-01-01',
    UpdateTime: '12:00',
    ExemptionMaxAmountValidationType: 'Type1',
    ECommerceMerchantID: null,
    UseBillToAddrToDetermineTax: 'N',
    CreateDate: '2024-01-01',
    CreateTime: '12:00',
    DefaultTransporterEntry: null,
    DefaultTransporterLineNumber: null,
    FCERelevant: 'Y',
    FCEValidateBaseDelivery: 'N',
    MainUsage: 1,
    EBooksVATExemptionCause: null,
    LegalText: null,
    DataVersion: 1,
    ExchangeRateForIncomingPayment: '1.2',
    ExchangeRateForOutgoingPayment: '1.1',
    CertificateDetails: null,
    DefaultCurrency: null,
    EORINumber: null,
    FCEAsPaymentMeans: 'Y',
    U_IB_BoletoGeradoPor: 'User123',
    U_ImprimirBoleto: 1,
    U_TX_ProdRural: null,
    U_TX_ExImp: null,
    U_TX_IndIEDest: '1',
    U_TX_SitResp: null,
    U_TX_SN: '12345ABC',
    U_TX_IndFinal: "FinalValue",
    U_TX_IndNat: null,
    U_TX_Pagador: "John Doe",
    U_TX_Rendimento: "High",
    U_TX_DCReEmpColigada: null,
    U_RSD_PrazoMCont: 30,
    U_RSD_MatrizFilial: "Matriz",
    U_RSD_UsuNivel1: "Admin",
    U_RSD_UsuNivel2: "Manager",
    U_RSD_CodAntSIF: null,
    U_RSD_TipoAtividade: "Commercial",
    U_RSD_TP_CLIENTE: "Regular",
    U_RSD_PossuiIE: null,
    U_RSD_PFouPJ: "PJ",
    U_RSD_EnqTribut: null,
    U_RSD_PagRecDDA: null,
    U_RSD_ObsNF: "Observation",
    U_RSD_AutImagem: null,
    U_RSD_TipoFrete: "FOB",
    U_RSD_SegmentoFilho1: "Segment1",
    U_RSD_TranspCode: null,
    U_RSD_TranspName: null,
    U_RSD_MatrizPN: "MatrizPN123",
    U_RSD_ValorMinimo: 1000,
    U_TranspDfl: null,
    U_DWUIdCadApp: null,
    U_DWUIdDispositivo: null,
    U_Latitude: "40.7128",
    U_Longitude: "-74.0060",
    U_DWU_Origem: null,
    U_DWU_IgnoraAlerta: "Yes",
    U_Item: null,
    U_Account: "Account123",
    U_ContaDesc: null,
    U_PDV_CARTAO_FIDELID: null,
    U_PDV_EMAIL_PROMO: "example@email.com",
    U_CONTRIBUINTE: "123456789",
    U_PDV_valorpend: 500,
    U_PDV_RG: null,
    U_CFID: null,
    U_RSD_RegVend: "Reg123",
    U_RSD_Desconto: 10,
    U_RSD_ClienteHomologado: "Yes",
    U_VL_APR_VND: null,
    U_IMOV_PROP: "Property123",
    U_N_COLAB: null,
    U_N_CLI_ESTB: null,
    U_REF_COMERC: null,
    U_N_COLAB_FEM: null,
    U_Analise_Cliente: "Analysis1",
    U_BPLId_Click: 1,
    U_Matriz_Click: "MatrizClick1",
    U_CD_INPACS_ORBITA: null,
    U_Aceita_DDA: "Yes",
    U_IB_Categ_Fin: null,
    U_CodSIFPoloSul: null,
    U_TX_PrestServ: null,
    U_Taxa_Ant_Dia: null,
    U_Permite_Contato: "Yes",
    U_PDV_IND_PROF: "Professional",
    U_TX_RF_IPre: null,
    U_TX_RF_IsTrFolha: null,
    U_CodSIFBrioville: null,
    U_TX_RF_IndNif: null,
    U_TX_RF_FormaTrib: null,
    U_CodSIFRejovel: null,
    U_MatrizPN: null,
    U_ClasseRisco: "Low",
    U_DesativadoExterno: "No",
    U_PDV_USA_UTILIZAC: "Yes",
    U_PDV_CRIADOR_CAD: null,
    U_PDV_DT_NASCIMENTO: null,
    U_PDV_CONVENIO: null,
    U_IV_BP_PayerID: null,
    U_TX_RF_IsenImun: null,
    U_TX_RF_CodNatRend: null,
    U_TX_RF_TpPessoa: null,
    ElectronicProtocols: [],
    BPAddresses: [],
    ContactEmployees: [],
    BPAccountReceivablePaybleCollection: [],
    BPPaymentMethods: [],
    BPWithholdingTaxCollection: [],
    BPPaymentDates: [],
    BPBranchAssignment: [],
    BPBankAccounts: [],
    BPFiscalTaxIDCollection: [],
    DiscountGroups: [],
    BPIntrastatExtension: null,
    BPBlockSendingMarketingContents: [],
    BPCurrenciesCollection: []
};
