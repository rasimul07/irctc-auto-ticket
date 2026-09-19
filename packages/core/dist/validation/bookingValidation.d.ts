/**
 * Returns null when valid, or { tab, focusId?, focusSelector?, message }.
 */
export function validateBookingConfig(config: any): {
    tab: string;
    focusId: string;
    message: string;
    focusSelector?: undefined;
} | {
    tab: string;
    focusSelector: string;
    message: string;
    focusId?: undefined;
} | null;
//# sourceMappingURL=bookingValidation.d.ts.map