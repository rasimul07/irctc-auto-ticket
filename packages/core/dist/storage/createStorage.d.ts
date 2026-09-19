/**
 * @param {{ getItem: () => Promise<object|null>, setItem: (config: object) => Promise<void>, removeItem?: () => Promise<void> }} adapter
 */
export function createStorage(adapter: {
    getItem: () => Promise<object | null>;
    setItem: (config: object) => Promise<void>;
    removeItem?: () => Promise<void>;
}): {
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
//# sourceMappingURL=createStorage.d.ts.map