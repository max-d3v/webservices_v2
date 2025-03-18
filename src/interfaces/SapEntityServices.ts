export interface SapEntityServices<Entity> {
    validateRequiredFieldsForService(requiredFields: (keyof Entity)[], Entity: Entity): boolean
}