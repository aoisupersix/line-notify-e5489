import { z } from 'zod'

const collationCondition = z.object({
    departureStation: z.string(),
    arrivalStation: z.string(),
    boardingDate: z.number(),
    boardingHour: z.number(),
    boardingMinutes: z.number(),
})

/**
 * Collation conditions of vacancy.
 */
export type CollationCondition = z.infer<typeof collationCondition>

/**
 * Create collation condition from JSON string.
 * @param jsonString JSON string indicating an collation condition.
 * @returns created collation condition.
 */
export const createCollationConditionFromJsonString = (jsonString: string): CollationCondition => {
    const json = JSON.parse(jsonString)
    const condition = collationCondition.parse(json)
    return condition
}
