import type { IrctcConfig } from '../types/config.js';
export type SetupStepId = 'login' | 'journey' | 'passengers' | 'payment';
export type SetupStep = {
    id: SetupStepId;
    label: string;
    done: boolean;
    hint: string;
};
export type SetupCompletion = {
    done: number;
    total: number;
    ready: boolean;
    steps: SetupStep[];
};
export declare function getSetupSteps(config: IrctcConfig): SetupStep[];
export declare function getSetupCompletion(config: IrctcConfig): SetupCompletion;
//# sourceMappingURL=setupProgress.d.ts.map