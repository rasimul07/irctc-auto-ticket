export function isMobileClient(): boolean;
export function checkMobileBookingAllowed(): boolean;
export function buildMobileBookingMessage(): string;
export function createAccessApi({ storage, clientType, defaults }?: {
    defaults?: {
        API_BASE_DEV: string;
        API_BASE_PROD: string;
        BMC_URL: string;
        USE_PROD_API: boolean;
    } | undefined;
}): {
    readonly apiBase: string;
    readonly CLIENT_TYPE: any;
    readonly BMC_URL: string;
    headers(extra?: {}): {
        'Content-Type': string;
    };
    getDeviceId(): Promise<string>;
    request(): Promise<{
        allowed: boolean;
        tier: string;
        unlimited: boolean;
        tokensRemaining: number;
        expiresAt: null;
        status: string;
    }>;
    registerAccess(): Promise<{
        allowed: boolean;
        tier: string;
        unlimited: boolean;
        tokensRemaining: number;
        expiresAt: null;
        status: string;
    }>;
    getAccessStatus(): Promise<{
        allowed: boolean;
        tier: string;
        unlimited: boolean;
        tokensRemaining: number;
        expiresAt: null;
        status: string;
    }>;
    linkEmail(): Promise<{
        allowed: boolean;
        tier: string;
        unlimited: boolean;
        tokensRemaining: number;
        expiresAt: null;
        status: string;
    }>;
    consumeToken(): Promise<{
        ok: boolean;
        allowed: boolean;
        tier: string;
        unlimited: boolean;
    }>;
    formatDisplayDate(): string;
    isStatusAllowed(): boolean;
    isMobileBookingAllowed(): boolean;
    formatMobileBookingMessage(): string;
    isStatusStale(): boolean;
    ensureAccess(): Promise<{
        allowed: boolean;
        tier: string;
        unlimited: boolean;
        tokensRemaining: number;
        expiresAt: null;
        status: string;
    }>;
    formatStatusMessage(): string;
    formatTier(): string;
    formatValidUntil(): string;
    formatActive(): string;
};
//# sourceMappingURL=accessApi.d.ts.map