/**
 * @param {{ preferences: { get: (opts: { key: string }) => Promise<{ value?: string }>, set: (opts: { key: string, value: string }) => Promise<void>, remove: (opts: { key: string }) => Promise<void> }, clientType: string }} options
 */
export function createCapacitorCore({ preferences, clientType }: {
    preferences: {
        get: (opts: {
            key: string;
        }) => Promise<{
            value?: string;
        }>;
        set: (opts: {
            key: string;
            value: string;
        }) => Promise<void>;
        remove: (opts: {
            key: string;
        }) => Promise<void>;
    };
    clientType: string;
}): {
    storage: {
        _cachedStore: null;
        _loadStore(): Promise<{
            version: number;
            activeSetId: any;
            sets: any;
            access: any;
            state: any;
        }>;
        _saveStore(store: any): Promise<{
            version: number;
            activeSetId: any;
            sets: any;
            access: any;
            state: any;
        }>;
        getStore(): Promise<{
            version: number;
            activeSetId: any;
            sets: any;
            access: any;
            state: any;
        }>;
        get(): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        set(config: any): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        update(partial: any): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        updateState(updates: any): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        listSets(): Promise<any>;
        switchSet(id: any): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        addSet(name: any): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        duplicateSet(id: any): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        removeSet(id: any): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        renameSet(id: any, name: any): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
        clear(): Promise<{
            credentials: any;
            journey: any;
            passengers: any;
            preferences: any;
            schedule: any;
            access: any;
            state: any;
            activeSetId: any;
            activeSetName: any;
        }>;
    };
    bridge: {
        sendMessage(type: any, payload?: {}): Promise<never>;
        onMessage(handler: any): () => boolean;
        _dispatch(msg: any, sendResponse: any): boolean;
    };
    accessApi: {
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
    network: typeof network;
    validateBookingConfig: typeof validateBookingConfig;
    AccessConfig: {
        CLIENT_TYPE: string;
        getApiBase: (config: any) => any;
        API_BASE_DEV: string;
        API_BASE_PROD: string;
        BMC_URL: string;
        USE_PROD_API: boolean;
    };
    BookingValidation: {
        validate: typeof validateBookingConfig;
    };
};
export function resolveMobileClientType(platform: any): string;
import * as network from '../api/network.js';
import { validateBookingConfig } from '../validation/bookingValidation.js';
//# sourceMappingURL=capacitor.d.ts.map