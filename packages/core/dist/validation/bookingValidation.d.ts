export function getNextIstDateIso(date?: Date): string;
export function isTatkalQuota(quota: any): boolean;
export function getTatkalJourneyDateWarning(journey?: {}): string | null;
export function isChairClass(travelClass: any): boolean;
export function isBerthMeaningfulForClass(travelClass: any, berth: any): boolean;
export function getClassBerthWarnings(config?: {}): {
    journey: string | null;
    passengers: any;
    blockingMessage: any;
    tab: string | null;
    focusId: null;
    focusSelector: string | null;
};
/**
 * Returns null when valid, or { tab, focusId?, focusSelector?, message }.
 */
export function validateBookingConfig(config: any): {
    tab: string;
    focusId: string;
    message: string;
    focusSelector?: undefined;
} | {
    tab: string | null;
    focusId: null;
    focusSelector: string | null;
    message: any;
} | {
    tab: string;
    focusSelector: string;
    message: string;
    focusId?: undefined;
} | null;
//# sourceMappingURL=bookingValidation.d.ts.map