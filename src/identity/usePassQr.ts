import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { passQrUrl } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';

/* The pass QR (opens doors on Day 3 and swaps contacts). It is drawn on the
   back of the Holo Card, the one and only SGX Pass. */
export function usePassQr(dark = '#050505', light = '#FDCC0D'): string | null {
  const { identity, myUid } = useSgxIdentity();
  const [qr, setQr] = useState<string | null>(null);
  const pass = identity.pass;
  useEffect(() => {
    if (!pass) { setQr(null); return; }
    const url = passQrUrl({
      c: pass.code, n: pass.fullName, s: identity.callsign, p: identity.affinity,
      r: pass.roleTitle, o: pass.organization, u: myUid || undefined,
    });
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark, light } })
      .then((d) => { if (alive) setQr(d); })
      .catch(() => { if (alive) setQr(null); });
    return () => { alive = false; };
  }, [pass, identity.callsign, identity.affinity, myUid, dark, light]);
  return qr;
}
