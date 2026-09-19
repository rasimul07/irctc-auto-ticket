/**
 * Platform message bridge for bot ↔ host (Chrome extension background or Ionic WebView).
 */
export function createPlatformBridge(): {
    sendMessage(type: any, payload?: {}): Promise<never>;
    onMessage(handler: any): () => boolean;
    _dispatch(msg: any, sendResponse: any): boolean;
};
export function createChromeBridge(): {
    sendMessage(type: any, payload?: {}): Promise<never>;
    onMessage(handler: any): () => boolean;
    _dispatch(msg: any, sendResponse: any): boolean;
};
export function createWebViewBridge(): {
    sendMessage(type: any, payload?: {}): Promise<never>;
    onMessage(handler: any): () => boolean;
    _dispatch(msg: any, sendResponse: any): boolean;
};
//# sourceMappingURL=bridge.d.ts.map