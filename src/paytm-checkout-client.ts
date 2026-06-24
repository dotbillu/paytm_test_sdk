declare global {
  interface Window {
    Paytm?: {
      CheckoutJS: {
        init: (config: unknown) => Promise<void>;
        invoke: () => void;
        close: () => void;
      };
    };
  }
}

export function resolvePaytmHost(callbackUrl?: string): string {
  const PROD = "https://secure.paytmpayments.com";
  const STAGE = "https://securestage.paytmpayments.com";
  // For the manual portal, we guess from callbackUrl if it contains "stage"
  if (callbackUrl?.includes("securegw-stage")) return STAGE;
  if (callbackUrl?.includes("stage") || callbackUrl?.includes("test")) return STAGE;
  return PROD;
}

export function loadPaytmScript(mid: string, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Paytm?.CheckoutJS) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-paytm-mid="${mid}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Script load failed")),
      );
      return;
    }
    const s = document.createElement("script");
    s.type = "application/javascript";
    s.crossOrigin = "anonymous";
    s.src = `${host}/merchantpgpui/checkoutjs/merchants/${mid}.js`;
    s.dataset.paytmMid = mid;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paytm SDK"));
    document.head.appendChild(s);
  });
}

export function waitForCheckoutJs(ms = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).Paytm?.CheckoutJS?.init) {
        resolve();
        return;
      }
      if (Date.now() - start > ms) {
        reject(new Error("Paytm CheckoutJS timed out"));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}
