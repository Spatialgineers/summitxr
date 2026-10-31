import { auth } from '../lib/firebase';

/* Talks to /api/companion: one POST per question, the answer streams back as
   server-sent events (text deltas, actions, done or error). The browser only
   sends its Firebase ID token and its pass; the Claude key stays on the server. */

export type CompanionMode = 'live' | 'mock' | 'off';

let statusP: Promise<CompanionMode> | null = null;

/** Is the companion on in this deploy? Asked once per page load. */
export function companionStatus(): Promise<CompanionMode> {
  if (!statusP) {
    statusP = fetch('/api/companion/status')
      .then((r) => (r.ok ? r.json() : { mode: 'off' }))
      .then((j: { mode?: string }) => (j.mode === 'live' || j.mode === 'mock' ? j.mode : 'off') as CompanionMode)
      .catch(() => { statusP = null; return 'off' as CompanionMode; });
  }
  return statusP;
}

export interface CompanionTurn { role: 'user' | 'assistant'; text: string }
export interface CompanionContext {
  path: string;
  page: string;
  lang: 'es' | 'en';
  name: string;
  pillar: string;
  targets: { id: string; label: string }[];
}
export type CompanionAction = { type: 'ir_a' | 'senalar'; id: string };

export interface AskHandlers {
  onText: (t: string) => void;
  onAction: (a: CompanionAction) => void;
  /** Ends every call exactly once: an error code (with a message to show), or null when it went well. */
  onEnd: (error: { code: string; message?: string } | null) => void;
}

export async function askCompanion(
  input: { messages: CompanionTurn[]; context: CompanionContext; email: string; code: string },
  h: AskHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let ended = false;
  const end = (e: { code: string; message?: string } | null) => { if (!ended) { ended = true; h.onEnd(e); } };
  try {
    const user = auth.currentUser;
    if (!user) { end({ code: 'NO_ACCOUNT' }); return; }
    const idToken = await user.getIdToken();
    const r = await fetch('/api/companion/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, email: input.email, code: input.code, messages: input.messages, context: input.context }),
      signal,
    });
    if (!r.ok || !r.body) {
      const j = await r.json().catch(() => ({} as { error?: string; message?: string }));
      end({ code: j.error || `HTTP_${r.status}`, message: j.message });
      return;
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let cut: number;
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, cut);
        buf = buf.slice(cut + 2);
        const ev = /^event: (.+)$/m.exec(chunk)?.[1];
        const raw = /^data: (.*)$/m.exec(chunk)?.[1];
        if (!ev || raw == null) continue;
        let data: any = {};
        try { data = JSON.parse(raw); } catch { continue; }
        if (ev === 'text' && typeof data.t === 'string') h.onText(data.t);
        else if (ev === 'action' && (data.type === 'ir_a' || data.type === 'senalar') && typeof data.id === 'string') h.onAction(data);
        else if (ev === 'error') end({ code: 'SERVER', message: data.message });
        else if (ev === 'done') end(null);
      }
    }
    end(null);
  } catch (err) {
    end({ code: (err as Error)?.name === 'AbortError' ? 'ABORTED' : 'NETWORK' });
  }
}
