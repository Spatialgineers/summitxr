import type { FirebaseApp } from 'firebase/app';
import type { AppCheck } from 'firebase/app-check';

/* Firebase App Check: proves requests come from this app in a real browser
   (reCAPTCHA), so scripts can't fill the sponsor form, the chat or the votes.
   Firestore enforcement is switched on in the Firebase console; the live
   engine verifies the token itself (src/server/security/appCheck.ts).

   Off until a site key exists: `recaptchaSiteKey` in firebase-applet-config.json
   (or VITE_RECAPTCHA_SITE_KEY). reCAPTCHA Enterprise by default;
   VITE_RECAPTCHA_PROVIDER=v3 for a classic reCAPTCHA v3 key. */

let appCheck: AppCheck | null = null;
let ready: Promise<AppCheck | null> = Promise.resolve(null);

export function initAppCheck(app: FirebaseApp, siteKey: string | undefined, useEmulators: boolean) {
  const env = (import.meta as any).env || {};
  const key = siteKey || env.VITE_RECAPTCHA_SITE_KEY;
  if (!key || typeof window === 'undefined' || useEmulators) return;
  ready = import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider }) => {
    // Local debugging against the real project: register the printed debug token in the console.
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    const provider = env.VITE_RECAPTCHA_PROVIDER === 'v3' ? new ReCaptchaV3Provider(key) : new ReCaptchaEnterpriseProvider(key);
    appCheck = initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
    return appCheck;
  }).catch((err) => {
    console.warn('[SGX] App Check unavailable:', err);
    return null;
  });
}

/** A current App Check token, or null when App Check is off or failed. */
export async function getAppCheckToken(): Promise<string | null> {
  const ac = appCheck || await ready;
  if (!ac) return null;
  try {
    const { getToken } = await import('firebase/app-check');
    return (await getToken(ac, false)).token;
  } catch {
    return null;
  }
}

/** Headers for our own API calls. */
export async function appCheckHeaders(): Promise<Record<string, string>> {
  const token = await getAppCheckToken();
  return token ? { 'X-Firebase-AppCheck': token } : {};
}
