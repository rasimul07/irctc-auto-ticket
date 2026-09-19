export function isBrowserOnline(): boolean;
export function isNetworkError(err: any): boolean;
export function toUserNetworkMessage(err: any, fallback?: string): any;
export function watchOnlineStatus(onOnline: any, onOffline: any): () => void;
export const OFFLINE_MESSAGE: "You are offline. Connect to the internet and try again.";
//# sourceMappingURL=network.d.ts.map