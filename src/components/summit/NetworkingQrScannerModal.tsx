import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Camera, QrCode, BookUser, RefreshCw, Download, UserPlus, FileText, Trash2, Check, Copy, Search, Upload, Phone, Mail, Linkedin, AtSign, AlertCircle, Flashlight } from 'lucide-react';
import { playScanSuccessSound, playUiChirp, playCyberBurstSound } from '../../lib/cyberAudioEngine';
import { useAuth } from '../../context/AuthContext';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { parsePassQr, passQrUrl, PILLAR_ACCENT } from '../../identity/sgxIdentity';
import { SGX_PILLARS, findPillar } from '../../lib/sgxPillars';
import { SgxDialog } from '../common/SgxDialog';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import './sgxModals.css';

/* NETWORKING QR: scan another pass, show yours and keep a private contact
   book (localStorage + the pass Rolodex), exportable as .vcf / CSV. */

type QrTab = 'SCANNER' | 'MY_BADGE' | 'ROLODEX';

export interface SummitContact {
  id: string;
  name: string;
  role: string;
  company: string;
  pillar: string;
  email: string;
  linkedin?: string;
  twitter?: string;
  bio?: string;
  avatar?: string;
  notes?: string;
  scannedAt: string;
  tags?: string[];
  roleEn?: string;
  companyEn?: string;
  bioEn?: string;
  notesEn?: string;
  tagsEn?: string[];
}


interface NetworkingQrScannerModalProps {
  onClose: () => void;
  onAwardXp?: (amount: number, reason: string) => void;
  initialTab?: QrTab;
}

export const NetworkingQrScannerModal: React.FC<NetworkingQrScannerModalProps> = ({
  onClose,
  onAwardXp,
  initialTab = 'SCANNER'
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { user, playerProfile, savePlayerProfile } = useAuth();
  const sgx = useOptionalSgxIdentity();
  const [activeTab, setActiveTab] = useState<QrTab>(initialTab);
  const [notice, setNotice] = useState<string | null>(null);

  // Contacts storage
  const [contacts, setContacts] = useState<SummitContact[]>(() => {
    try {
      const saved = localStorage.getItem('sgx_summit_contacts_book');
      if (saved) return JSON.parse(saved);
    } catch {}
    return []; // Real scans only: the Rolodex starts empty
  });

  // The pass Rolodex (incl. people who scanned you) shows up here too.
  useEffect(() => {
    const fromPass = sgx?.identity.contacts || [];
    if (!fromPass.length) return;
    setContacts((prev) => {
      const known = new Set(prev.map((c) => c.id));
      const added: SummitContact[] = fromPass.filter((c) => !known.has(c.code)).map((c) => ({
        id: c.code,
        name: c.name,
        role: c.role || c.callsign || 'SGX Pass',
        company: c.organization || 'Spatialgineers Summit 2026',
        pillar: c.pillar ? `SGX.${c.pillar}` : 'SGX.SYNTHESIZE',
        email: '',
        linkedin: c.linkedin,
        scannedAt: new Date(c.at).toLocaleDateString('es-ES'),
        tags: [c.via === 'received' ? 'Te escaneó' : 'SGX Pass'],
      }));
      return added.length ? [...added, ...prev] : prev;
    });
  }, [sgx?.identity.contacts]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPillarFilter, setSelectedPillarFilter] = useState('ALL');

  // Scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [scannedResult, setScannedResult] = useState<SummitContact | null>(null);
  const [scannedNotesInput, setScannedNotesInput] = useState('');
  const [justEarnedXp, setJustEarnedXp] = useState<string | null>(null);
  const scanningLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // My QR Code
  const [myQrDataUrl, setMyQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Save contacts to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('sgx_summit_contacts_book', JSON.stringify(contacts));
    } catch {}
  }, [contacts]);

  // Generate My QR Code
  useEffect(() => {
    const generatePersonalQr = async () => {
      const userName = playerProfile?.nickname || (user?.email ? user.email.split('@')[0] : 'Asistente_SanJuan');
      const payload: SummitContact = {
        id: user?.uid || `sgx_${Date.now()}`,
        name: userName,
        role: es ? 'Asistente del Summit' : 'Summit attendee',
        company: 'Spatialgineers Summit 2026',
        pillar: playerProfile?.tenantId?.includes('synthesize') ? 'SGX.SYNTHESIZE' : 'SGX.STAGE',
        email: user?.email || 'asistente@spatialgineers.com',
        bio: (es ? 'Participante oficial en Spatialgineers Summit 2026 San Juan & Global Live.' : 'Official participant at the Spatialgineers Summit 2026 San Juan & Global Live.'),
        scannedAt: new Date().toLocaleDateString('es-ES')
      };

      try {
        // With a forged SGX Pass, "my badge" is the pass QR itself: one QR for everything.
        const pass = sgx?.identity.pass;
        const qrString = pass
          ? passQrUrl({ c: pass.code, n: pass.fullName, s: sgx!.identity.callsign, p: sgx!.identity.affinity, r: pass.roleTitle, o: pass.organization, u: sgx!.myUid || undefined })
          : `sgx:contact?data=${encodeURIComponent(JSON.stringify(payload))}`;
        const url = await QRCode.toDataURL(qrString, {
          width: 320,
          margin: 2,
          color: {
            dark: '#00DDFF',
            light: '#0C0C0C'
          }
        });
        setMyQrDataUrl(url);
      } catch (err) {
        console.error('QR code generation error:', err);
      }
    };

    generatePersonalQr();
  }, [user, playerProfile, sgx?.identity.pass, sgx?.identity.callsign, sgx?.identity.affinity, sgx?.myUid]);

  // Camera start & stop hooks
  useEffect(() => {
    if (activeTab === 'SCANNER' && !scannedResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, facingMode, scannedResult]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('camera unsupported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera stream notice:', err);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? (es ? 'Permiso de cámara denegado en el navegador. Puedes subir una foto del QR de la credencial.' : 'Camera permission denied by the browser. You can upload a photo of the credential QR.')
          : (es ? 'No se pudo iniciar la cámara en este dispositivo. Puedes subir una foto del QR.' : 'Couldn\'t start the camera on this device. You can upload a photo of the QR.')
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanningLoopRef.current) {
      cancelAnimationFrame(scanningLoopRef.current);
      scanningLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
        playUiChirp(840);
      } else {
        setNotice(es ? 'La linterna no está disponible en este dispositivo o cámara.' : "The light isn't available on this device or camera.");
      }
    } catch (err) {
      console.warn('Torch toggle notice:', err);
    }
  };

  const startScanningLoop = () => {
    const scan = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });

            if (code && code.data) {
              handleProcessQrData(code.data);
              return; // Stop scanning once found
            }
          }
        }
      }
      scanningLoopRef.current = requestAnimationFrame(scan);
    };

    scanningLoopRef.current = requestAnimationFrame(scan);
  };

  const handleProcessQrData = (rawData: string) => {
    playScanSuccessSound();
    stopCamera();

    let parsedContact: SummitContact;

    const sgxPass = parsePassQr(rawData);
    try {
      if (sgxPass) {
        // An SGX Pass: lands in both Rolodexes through SgxIdentity (+50 XP there).
        sgx?.addContact(sgxPass);
        parsedContact = {
          id: sgxPass.c,
          name: sgxPass.n,
          role: sgxPass.r || sgxPass.s || 'SGX Pass',
          company: sgxPass.o || 'Spatialgineers Summit 2026',
          pillar: sgxPass.p ? `SGX.${sgxPass.p}` : 'SGX.SYNTHESIZE',
          email: '',
          scannedAt: new Date().toLocaleDateString('es-ES'),
          tags: ['SGX Pass'],
        };
      } else if (rawData.startsWith('sgx:contact?data=')) {
        const jsonStr = decodeURIComponent(rawData.replace('sgx:contact?data=', ''));
        parsedContact = JSON.parse(jsonStr);
      } else if (rawData.startsWith('{')) {
        parsedContact = JSON.parse(rawData);
      } else {
        throw new Error('not an SGX card');
      }
      if (!parsedContact || !parsedContact.name) throw new Error('empty card');
    } catch {
      // Never invent a contact: tell the pilot what happened and keep scanning.
      setCameraError(es ? 'Ese QR no es un SGX Pass ni una tarjeta del Summit. Escanea el QR del pase de la otra persona.' : "That QR isn't an SGX Pass or a Summit card. Scan the other person's pass QR.");
      return;
    }

    setScannedResult(parsedContact);
    setScannedNotesInput('');

    // Award +50 XP for networking!
    const earnedXp = 50;
    if (onAwardXp) {
      onAwardXp(earnedXp, `Networking QR: ${parsedContact.name}`);
    }
    if (savePlayerProfile && playerProfile) {
      savePlayerProfile({
        totalScore: (playerProfile.totalScore || 0) + earnedXp,
        totalInteractions: (playerProfile.totalInteractions || 0) + 1
      });
    }

    setJustEarnedXp((es ? `+${earnedXp} XP Networking Desbloqueado` : `+${earnedXp} XP Networking Unlocked`));
    setTimeout(() => setJustEarnedXp(null), 3500);
  };

  const handleSaveScannedContact = () => {
    if (!scannedResult) return;
    playCyberBurstSound('kudos');

    const finalizedContact: SummitContact = {
      ...scannedResult,
      notes: scannedNotesInput || scannedResult.notes || (es ? 'Contacto escaneado en San Juan Summit 2026' : 'Contact scanned at the San Juan Summit 2026')
    };

    // Check if already in list
    setContacts(prev => {
      const filtered = prev.filter(c => c.id !== finalizedContact.id);
      return [finalizedContact, ...filtered];
    });

    setScannedResult(null);
    setActiveTab('ROLODEX');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNotice(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleProcessQrData(code.data);
          } else {
            setNotice(es ? 'No encontramos un código QR en esa imagen. Prueba con una foto más nítida.' : "We couldn't find a QR code in that image. Try a sharper photo.");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleExportVCard = (contact: SummitContact) => {
    playUiChirp(880);
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name}`,
      `TITLE:${contact.role}`,
      `ORG:${contact.company}`,
      `EMAIL:${contact.email}`,
      contact.linkedin ? `URL;type=LinkedIn:${contact.linkedin}` : '',
      contact.twitter ? `X-SOCIALPROFILE;type=twitter:${contact.twitter}` : '',
      `NOTE:${loc(contact, 'notes', language) || ''} [Spatialgineers Summit 2026 - ${contact.pillar}]`,
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${contact.name.replace(/\s+/g, '_')}_Spatialgineers.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCsv = () => {
    playUiChirp(840);
    const headers = [(es ? 'Nombre' : 'Name'), (es ? 'Cargo' : 'Title'), (es ? 'Empresa' : 'Company'), (es ? 'Pilar' : 'Pillar'), 'Email', 'LinkedIn', 'Twitter', (es ? 'Notas' : 'Notes'), (es ? 'Fecha' : 'Date')];
    const rows = contacts.map(c => [
      `"${c.name}"`,
      `"${c.role}"`,
      `"${c.company}"`,
      `"${c.pillar}"`,
      `"${c.email}"`,
      `"${c.linkedin || ''}"`,
      `"${c.twitter || ''}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${c.scannedAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Spatialgineers_Summit_Contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteContact = (id: string) => {
    playUiChirp(440);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const filteredContacts = contacts.filter(c => {
    const matchesQuery = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPillar = selectedPillarFilter === 'ALL' || c.pillar === selectedPillarFilter;
    return matchesQuery && matchesPillar;
  });

  const tabs: { key: QrTab; icon: React.ReactNode; label: string; count?: number }[] = [
    { key: 'SCANNER', icon: <Camera size={16} aria-hidden />, label: es ? 'Escanear' : 'Scan' },
    { key: 'MY_BADGE', icon: <QrCode size={16} aria-hidden />, label: es ? 'Mi QR' : 'My QR' },
    { key: 'ROLODEX', icon: <BookUser size={16} aria-hidden />, label: es ? 'Libreta' : 'Contacts', count: contacts.length },
  ];
  const pillarTag = (pillar: string) => {
    const p = findPillar(pillar);
    return p
      ? <span className="sgx-m-tag" style={{ color: PILLAR_ACCENT[p.key], boxShadow: `inset 0 0 0 1px ${PILLAR_ACCENT[p.key]}` }}>{p.name}</span>
      : <span className="sgx-m-tag sgx-m-tag--mute">{pillar}</span>;
  };
  const faceOf = (c: SummitContact, lg = false) => {
    const p = findPillar(c.pillar);
    return (
      <span className={`sgx-qr__face ${lg ? 'sgx-qr__face--lg' : ''}`}>
        {c.avatar ? <img src={c.avatar} alt="" /> : <img src={`/holo/${(p?.key || 'SYNTHESIZE').toLowerCase()}.png`} alt="" style={{ objectFit: 'contain', padding: 6 }} />}
      </span>
    );
  };
  const myName = sgx?.identity.pass?.fullName || playerProfile?.nickname || user?.displayName || (user?.email ? user.email.split('@')[0] : '');

  return (
    <SgxDialog
      onClose={onClose}
      title={es ? 'Networking QR' : 'Networking QR'}
      kicker={es ? 'Escanea pases, comparte tu QR y guarda contactos (.vcf)' : 'Scan passes, share your QR and save contacts (.vcf)'}
      icon={<img src="/holo/guild.png" alt="" />}
      size="md"
      toolbar={
        <div className="sgx-m-tabs" role="tablist" aria-label={es ? 'Secciones' : 'Sections'}>
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={activeTab === t.key} onClick={() => { setActiveTab(t.key); playUiChirp(600); }}>
              {t.icon}<span>{t.label}</span>{t.count !== undefined && <b>{t.count}</b>}
            </button>
          ))}
        </div>
      }
      footer={
        <>
          <p className="sgx-m-fine sgx-m-footnote">{es ? 'Tus contactos y notas se guardan en este dispositivo y en tu pase.' : 'Your contacts and notes are saved on this device and in your pass.'}</p>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>
        </>
      }
    >
      <div className="sgx-m sgx-m-stack">
        {justEarnedXp && <div className="sgx-qr__xp" role="status">{justEarnedXp}</div>}
        {notice && (
          <div className="sgx-m-note sgx-m-note--warn" role="alert">
            <AlertCircle size={18} aria-hidden />
            <div>{notice}</div>
            <button type="button" className="sgx-m-iconbtn" aria-label={es ? 'Cerrar aviso' : 'Dismiss'} onClick={() => setNotice(null)}>✕</button>
          </div>
        )}

        {activeTab === 'SCANNER' && (
          !scannedResult ? (
            <>
              <div className="sgx-qr__finder">
                <video ref={videoRef} playsInline muted aria-label={es ? 'Vista de la cámara' : 'Camera view'} />
                <canvas ref={canvasRef} hidden />
                {cameraActive && (
                  <div className="sgx-qr__reticle" aria-hidden="true"><i /><i /><i /><i /><span className="sgx-qr__sweep" /></div>
                )}
                {(cameraError || !cameraActive) && (
                  <div className="sgx-qr__state" role={cameraError ? 'alert' : 'status'}>
                    {cameraError ? <AlertCircle size={28} aria-hidden /> : <Camera size={28} aria-hidden />}
                    <p className="sgx-m-p">{cameraError || (es ? 'Iniciando la cámara…' : 'Starting the camera…')}</p>
                  </div>
                )}
              </div>
              <div className="sgx-qr__controls">
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" aria-pressed={torchOn} onClick={toggleTorch} disabled={!cameraActive}>
                  <Flashlight size={14} aria-hidden /> {torchOn ? (es ? 'Linterna encendida' : 'Light on') : (es ? 'Linterna' : 'Light')}
                </button>
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { setFacingMode(prev => prev === 'environment' ? 'user' : 'environment'); playUiChirp(700); }}>
                  <RefreshCw size={14} aria-hidden /> {es ? 'Cambiar cámara' : 'Switch camera'}
                </button>
                <label className="sgx-btn sgx-btn--sm sgx-sp__upload">
                  <Upload size={14} aria-hidden /> {es ? 'Subir foto del QR' : 'Upload QR photo'}
                  <input type="file" accept="image/*" onChange={handleFileUpload} aria-label={es ? 'Subir foto del QR' : 'Upload QR photo'} />
                </label>
              </div>
            </>
          ) : (
            <div className="sgx-m-card sgx-m-card--gold" style={{ maxWidth: 560, marginInline: 'auto', width: '100%' }}>
              <div className="sgx-m-row sgx-m-row--between">
                <span className="sgx-m-tag sgx-m-tag--solid">{es ? 'Pase escaneado · +50 XP' : 'Pass scanned · +50 XP'}</span>
                <span className="sgx-m-fine">{scannedResult.scannedAt}</span>
              </div>
              <div className="sgx-m-row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 12 }}>
                {faceOf(scannedResult, true)}
                <div style={{ minWidth: 0 }}>
                  <h3 className="sgx-m-h">{scannedResult.name}</h3>
                  <p className="sgx-m-kicker" style={{ marginTop: 4 }}>{loc(scannedResult, 'role', language)}</p>
                  <p className="sgx-m-fine">{loc(scannedResult, 'company', language)}</p>
                  <div style={{ marginTop: 6 }}>{pillarTag(scannedResult.pillar)}</div>
                </div>
              </div>
              {loc(scannedResult, 'bio', language) && <p className="sgx-m-p">{loc(scannedResult, 'bio', language)}</p>}
              <label className="sgx-m-field">
                <span>{es ? 'Nota privada para el seguimiento' : 'Private follow-up note'}</span>
                <textarea className="sgx-m-input" rows={2} value={scannedNotesInput} onChange={(e) => setScannedNotesInput(e.target.value)}
                  placeholder={es ? 'Ej: Hablamos en el panel de WebXR; quiere ver una demo.' : 'E.g. We talked at the WebXR panel; wants to see a demo.'} />
              </label>
              <div className="sgx-m-row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { setScannedResult(null); startCamera(); }}>{es ? 'Escanear otro' : 'Scan another'}</button>
                <button type="button" className="sgx-btn sgx-btn--sm" onClick={handleSaveScannedContact}><UserPlus size={14} aria-hidden /> {es ? 'Guardar en la libreta' : 'Save to contacts'}</button>
              </div>
            </div>
          )
        )}

        {activeTab === 'MY_BADGE' && (
          <div className="sgx-qr__badge">
            <p className="sgx-m-kicker">Spatialgineers Summit 2026</p>
            {myName && <h3 className="sgx-m-h" style={{ fontSize: '1.2rem' }}>{myName}</h3>}
            {sgx?.identity.pass && <p className="sgx-m-fine">{sgx.identity.callsign} · {sgx.identity.pass.code}</p>}
            <div className="sgx-qr__code">
              {myQrDataUrl
                ? <img src={myQrDataUrl} alt={es ? 'Tu código QR de contacto' : 'Your contact QR code'} />
                : <p className="sgx-m-fine" style={{ width: 240, padding: '100px 0' }}>{es ? 'Generando QR…' : 'Generating QR…'}</p>}
            </div>
            <p className="sgx-m-p">{es ? 'Muestra este código para que otras personas te agreguen a su libreta.' : 'Show this code so others can add you to their contacts.'}</p>
            {!sgx?.identity.pass && <p className="sgx-m-fine">{es ? 'Con tu SGX Pass este QR es el mismo de tu pase.' : 'With your SGX Pass this QR is the same as your pass QR.'}</p>}
            <div className="sgx-m-row" style={{ justifyContent: 'center' }}>
              <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" disabled={!myQrDataUrl} onClick={() => {
                const a = document.createElement('a');
                a.download = `SGX_QR_${(myName || 'Summit').replace(/\s+/g, '_')}.png`;
                a.href = myQrDataUrl;
                a.click();
              }}>
                <Download size={14} aria-hidden /> {es ? 'Descargar QR' : 'Download QR'}
              </button>
              <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                setCopiedLink(true);
                playUiChirp(840);
                setTimeout(() => setCopiedLink(false), 2000);
              }}>
                {copiedLink ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copiedLink ? (es ? 'Enlace copiado' : 'Link copied') : (es ? 'Copiar enlace' : 'Copy link')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ROLODEX' && (
          <>
            <div className="sgx-m-row">
              <label className="sgx-m-search">
                <Search size={16} aria-hidden />
                <input type="search" className="sgx-m-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={es ? 'Buscar contacto' : 'Search contacts'} placeholder={es ? 'Buscar por nombre, cargo…' : 'Search by name, title…'} />
              </label>
              <select className="sgx-m-input" style={{ width: 'auto', minHeight: 40, fontSize: '0.85rem' }} value={selectedPillarFilter} onChange={(e) => setSelectedPillarFilter(e.target.value)} aria-label={es ? 'Filtrar por pilar' : 'Filter by pillar'}>
                <option value="ALL">{es ? 'Todos los pilares' : 'All pillars'}</option>
                {SGX_PILLARS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={handleExportCsv} disabled={!contacts.length} title={es ? 'Exportar todos los contactos a CSV' : 'Export all contacts to CSV'}>
                <FileText size={14} aria-hidden /> CSV
              </button>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="sgx-m-empty">
                <img src="/holo/guild.png" alt="" />
                <p className="sgx-m-p">{contacts.length ? (es ? 'Ningún contacto coincide con ese filtro.' : 'No contacts match that filter.') : (es ? 'Tu libreta está vacía. Escanea el QR del pase de otra persona para empezar.' : 'Your contact book is empty. Scan someone’s pass QR to start.')}</p>
                <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => setActiveTab('SCANNER')}>{es ? 'Escanear un pase' : 'Scan a pass'}</button>
              </div>
            ) : (
              <div className="sgx-m-grid">
                {filteredContacts.map((contact) => (
                  <article key={contact.id} className="sgx-m-card">
                    <div className="sgx-m-row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 10 }}>
                      {faceOf(contact)}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 className="sgx-m-h" style={{ fontSize: '0.9rem', overflowWrap: 'anywhere' }}>{contact.name}</h3>
                        <p className="sgx-m-kicker" style={{ marginTop: 2, letterSpacing: '0.06em' }}>{loc(contact, 'role', language)}</p>
                        <p className="sgx-m-fine">{loc(contact, 'company', language)}</p>
                      </div>
                    </div>
                    <div className="sgx-m-row sgx-m-row--between">
                      {pillarTag(contact.pillar)}
                      <span className="sgx-m-fine">{contact.scannedAt}</span>
                    </div>
                    {loc(contact, 'notes', language) && <p className="sgx-m-p" style={{ fontSize: '0.82rem' }}>“{loc(contact, 'notes', language)}”</p>}
                    <div className="sgx-m-row sgx-m-row--between" style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="sgx-qr__links">
                        {contact.email && <a href={`mailto:${contact.email}`} aria-label={`${es ? 'Escribir a' : 'Email'} ${contact.email}`} title={contact.email}><Mail size={15} aria-hidden /></a>}
                        {contact.linkedin && <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={15} aria-hidden /></a>}
                        {contact.twitter && <a href={`https://x.com/${contact.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" aria-label="X"><AtSign size={15} aria-hidden /></a>}
                      </div>
                      <div className="sgx-m-row" style={{ gap: 6 }}>
                        <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => handleExportVCard(contact)} title={es ? 'Guardar en los contactos del celular' : 'Save to your phone contacts'}>
                          <Phone size={14} aria-hidden /> .vcf
                        </button>
                        <button type="button" className="sgx-m-iconbtn sgx-m-iconbtn--danger" onClick={() => handleDeleteContact(contact.id)} aria-label={es ? `Quitar a ${contact.name} de la libreta` : `Remove ${contact.name} from contacts`}>
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SgxDialog>
  );
};
