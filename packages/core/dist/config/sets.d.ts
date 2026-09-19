export function createEmptySet(name?: string): {
    id: string;
    name: string;
    credentials: any;
    journey: any;
    passengers: any;
    preferences: any;
    schedule: any;
};
export function createFreshStore(): {
    version: number;
    activeSetId: string;
    sets: {
        id: string;
        name: string;
        credentials: any;
        journey: any;
        passengers: any;
        preferences: any;
        schedule: any;
    }[];
    access: any;
    state: any;
};
export function isV2Store(raw: any): boolean;
export function migrateToV2(raw: any): {
    version: number;
    activeSetId: any;
    sets: any;
    access: any;
    state: any;
};
export function normalizeStore(store: any): {
    version: number;
    activeSetId: any;
    sets: any;
    access: any;
    state: any;
};
export function getActiveSet(store: any): any;
export function resolveActiveConfig(store: any): {
    credentials: any;
    journey: any;
    passengers: any;
    preferences: any;
    schedule: any;
    access: any;
    state: any;
    activeSetId: any;
    activeSetName: any;
};
export function persistActiveSet(store: any, flatConfig: any): {
    version: number;
    activeSetId: any;
    sets: any;
    access: any;
    state: any;
};
export function listSets(store: any): any;
export function nextSetName(store: any): string;
export function setActiveSet(store: any, id: any): {
    version: number;
    activeSetId: any;
    sets: any;
    access: any;
    state: any;
};
export function createSet(store: any, name: any): {
    version: number;
    activeSetId: any;
    sets: any;
    access: any;
    state: any;
};
export function duplicateSet(store: any, id: any): {
    version: number;
    activeSetId: any;
    sets: any;
    access: any;
    state: any;
};
export function renameSet(store: any, id: any, name: any): {
    version: number;
    activeSetId: any;
    sets: any;
    access: any;
    state: any;
};
export function deleteSet(store: any, id: any): {
    version: number;
    activeSetId: any;
    sets: any;
    access: any;
    state: any;
};
export const CONFIG_VERSION: 2;
//# sourceMappingURL=sets.d.ts.map