// WS => SL
//THESE ONLY APPLY TO NON USER FIELDS
export enum SapB1FieldTranslations {
    Free_Text = 'FreeText',
    CardCode = "CardCode",
    TaxId0 = "TaxId0",
    GroupCode = "GroupCode",
    validFor = "Valid"
}
// WS => SL
//THESE ONLY APPLY TO NON USER FIELDS And will not work with numerical values 
export enum SapB1ValueTranslations {
    N = "tNO",
    Y = "tYES",
}

export type WebServiceField = string;
export type ServiceLayerField = string;

export type WebServiceValue = string;
export type ServiceLayerValue = string;

export interface IFieldMapper {
    translateIntoServiceLayerField(field: WebServiceField): ServiceLayerField;
    translateIntoWebServiceField(field: ServiceLayerField): WebServiceField;
    
    //The values will return themselfs if no translation is found!
    //Will ask for field to make sure it does not translate any user fields.
    translateIntoServiceLayerValue(field: string, value: WebServiceValue): ServiceLayerValue | WebServiceValue;
    translateIntoWebServiceValue(field: string, value: ServiceLayerValue): WebServiceValue | ServiceLayerValue;
    
    translateObject<T extends Object>(sapObject: Partial<T>, translationTarget: "SL" | "WS"): Partial<T>;
    translateData<T extends Object>(sapData: Array<Partial<T>>, translationTarget: "SL" | "WS"): Array<Partial<T>>
}
