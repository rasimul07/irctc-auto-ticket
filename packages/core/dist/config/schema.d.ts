export function cloneDefaultConfig(): any;
export function mergeConfig(current: any, partial: any): any;
export namespace DEFAULT_CONFIG {
    namespace credentials {
        let username: string;
        let password: string;
    }
    namespace journey {
        let from: string;
        let fromCode: string;
        let to: string;
        let toCode: string;
        let date: string;
        let trainNo: string;
        let trainName: string;
        let travelClass: string;
        let quota: string;
    }
    let passengers: {
        name: string;
        age: string;
        gender: string;
        berth: string;
        food: string;
    }[];
    namespace schedule {
        let enabled: boolean;
        let type: string;
    }
    namespace preferences {
        let bookingSite: string;
        let loyaltyChoice: string;
        let paymentMethod: string;
        let cardsProvider: string;
        let upiProvider: string;
        namespace debitCard {
            let name: string;
            let number: string;
            let expiry: string;
            let cvv: string;
        }
        namespace creditCard {
            let name_1: string;
            export { name_1 as name };
            let number_1: string;
            export { number_1 as number };
            let expiry_1: string;
            export { expiry_1 as expiry };
            let cvv_1: string;
            export { cvv_1 as cvv };
        }
        let autoPayEnabled: boolean;
        let autoPayType: string;
    }
    namespace access {
        let deviceId: string;
        let email: string;
        let apiBase: string;
        let status: null;
    }
    namespace state {
        let status_1: string;
        export { status_1 as status };
        export let lastRun: null;
        export let currentStep: string;
        export let running: boolean;
        export let paused: boolean;
        export let message: string;
        export let passengersDone: boolean;
        export let paymentDone: boolean;
        export let autoRestartCount: number;
        export let paymentPhase: null;
        export let paymentGateway: null;
        export let awaitingGateway: boolean;
        export let bookingSessionId: null;
        export let tokenConsumed: boolean;
    }
}
export const CONFIG_VERSION: 2;
export const STORAGE_KEY: "irctcConfig";
export { createEmptySet, createFreshStore, migrateToV2, normalizeStore, resolveActiveConfig, persistActiveSet, listSets, setActiveSet, createSet, duplicateSet, renameSet, deleteSet, getActiveSet, nextSetName } from "./sets.js";
//# sourceMappingURL=schema.d.ts.map