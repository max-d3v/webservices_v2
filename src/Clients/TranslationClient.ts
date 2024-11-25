import { 
    SapB1FieldTranslations,
    SapB1ValueTranslations,
    WebServiceField,
    ServiceLayerField,
    IFieldMapper,
    ServiceLayerValue,
    WebServiceValue
} from '../interfaces/SapTranslation';


/*
    This class presumes all translations are correcty given, if none is found will throw direct error.
*/
export class SapB1FieldTranslator implements IFieldMapper {
    private FieldTranslations: Record<WebServiceField, ServiceLayerField>;
    private ValueTranslations: Record<WebServiceValue, ServiceLayerValue>;

    constructor(customTranslations?: Partial<Record<WebServiceField, ServiceLayerField>>) {
        this.FieldTranslations = {
            ...SapB1FieldTranslations,
            ...customTranslations
        };
        this.ValueTranslations = {
            ...SapB1ValueTranslations
        }
    }

    translateIntoServiceLayerField(sapField: WebServiceField): ServiceLayerField {
        if (sapField.startsWith("U_")) {
            return sapField;
        }
        const field = this.FieldTranslations[sapField];
        if (!field) {
            throw new Error(`O campo ${sapField} não tem tradução`)
        }
        return this.FieldTranslations[sapField];
    }

    //Create reversed enum later.
    translateIntoWebServiceField(sapField: ServiceLayerField): WebServiceField {
        if (sapField.startsWith("U_")) {
            return sapField;
        }
        const entry = Object.entries(this.FieldTranslations).find(([_, ServiceLayerField]) => ServiceLayerField === sapField);
        if (!entry) {
            throw new Error(`O campo ${sapField} não tem tradução`)
        }
        return (entry[0] as WebServiceField);
    }

    //Will not need user checks
    translateIntoWebServiceValue(field: string, value: ServiceLayerValue): WebServiceValue | ServiceLayerValue {
        if (field.startsWith("U_")) {
            return value;
        }
        const entry = Object.entries(this.ValueTranslations).find(([_, ServiceLayerValue]) => ServiceLayerValue === value);
        if (!entry) {
            return value
        }
        return (entry[0] as WebServiceValue);
    }
    translateIntoServiceLayerValue(field: string, value: WebServiceValue): ServiceLayerValue | WebServiceValue {
        if (field.startsWith("U_")) {
            return value;
        }
        const translation = this.ValueTranslations[value];
        if (!translation) {
            return value;
        }
        return translation;
    }

    translateObject<Entity extends Object>(sapObject: Partial<Entity>, translationTarget: "WS" | "SL"): Partial<Entity> {
        const translatedObject: Partial<Entity> = {};
        const entries = Object.entries(sapObject) as [keyof Entity, Entity[keyof Entity]][];

        const translationFunction = translationTarget === "WS" 
            ? this.translateIntoWebServiceField.bind(this)
            : this.translateIntoServiceLayerField.bind(this);

        for (const [key, value] of entries) {
            const translatedKey = translationFunction(key as ServiceLayerField & WebServiceField);
            translatedObject[translatedKey as keyof Entity] = value;
        }

        return translatedObject;
    }

    translateData<Entity extends Object>(sapData: Array<Partial<Entity>>, translationTarget: "WS" | "SL"): Array<Partial<Entity>> {
        return sapData
            .filter(Boolean)
            .map(data => this.translateObject(data, translationTarget));
    }

    translateArray<Entity extends Object>(fieldsToTranslate: string[], translationTarget: "WS" | "SL") {
        console.log("iniciou a func")
        console.log(fieldsToTranslate);
        const translatedArray = [];
        const translationFunction = translationTarget === "WS" 
            ? this.translateIntoWebServiceField.bind(this)
            : this.translateIntoServiceLayerField.bind(this);

        for (const field of fieldsToTranslate) {
            const fieldTranslated = translationFunction(field);
            translatedArray.push(fieldTranslated);
        }  

        return translatedArray as (keyof Entity)[] ;
    }
}