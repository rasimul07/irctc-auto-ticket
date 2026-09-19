export function isMobileClient(clientType: any): boolean;
export function checkMobileBookingAllowed(status: any, clientType: any): boolean;
export function buildMobileBookingMessage(status: any, clientType: any): string;
export function createAccessApi({ storage, clientType, defaults }: {
    storage: any;
    clientType: any;
    defaults?: {
        API_BASE_DEV: string;
        API_BASE_PROD: string;
        BMC_URL: string;
        USE_PROD_API: boolean;
    } | undefined;
}): {
    readonly apiBase: any;
    readonly CLIENT_TYPE: any;
    readonly BMC_URL: string;
    headers(extra?: {}): {
        'Content-Type': string;
        'X-Client-Type': any;
    };
    getDeviceId(): Promise<any>;
    request(path: any, options?: {}): Promise<any>;
    registerAccess(): Promise<any>;
    getAccessStatus(): Promise<any>;
    linkEmail(email: any): Promise<any>;
    consumeToken(usageKey: any): Promise<any>;
    formatDisplayDate(value: any): string;
    isStatusAllowed(status: any): boolean;
    isMobileBookingAllowed(status: any): boolean;
    formatMobileBookingMessage(status: any): string;
    isStatusStale(status: any): boolean;
    ensureAccess({ forceRefresh }?: {
        forceRefresh?: boolean | undefined;
    }): Promise<any>;
    formatStatusMessage(status: any): string;
    formatTier(status: any): any;
    formatValidUntil(status: any): string;
    formatActive(status: any): "—" | "Active" | "Not active";
};
//# sourceMappingURL=accessApi.d.ts.map