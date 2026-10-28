import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { 
  Camera, 
  QrCode, 
  BookUser, 
  ScanLine, 
  Zap, 
  RefreshCw, 
  Download, 
  UserPlus, 
  FileText, 
  Trash2, 
  ExternalLink, 
  Check, 
  Search, 
  Sparkles, 
  X,
  Upload,
  Phone,
  Mail,
  Linkedin,
  Twitter,
  Building2,
  Award,
  AlertCircle
} from 'lucide-react';
import { playScanSuccessSound, playUiChirp, playCyberBurstSound } from '../../lib/cyberAudioEngine';
import { useAuth } from '../../context/AuthContext';
import { PILLAR_COLORS } from './AttendeeAvatarGenerator';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { parsePassQr, passQrUrl } from '../../identity/sgxIdentity';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

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
  initialTab?: 'SCANNER' | 'MY_BADGE' | 'ROLODEX';
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
  const [activeTab, setActiveTab] = useState<'SCANNER' | 'MY_BADGE' | 'ROLODEX'>(initialTab);

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
        role: 'Spatialgineer Attendee',
        company: 'Spatialgineers Community',
        pillar: playerProfile?.tenantId?.includes('synthesize') ? 'SGX.SYNTHESIZE' : 'SGX.STAGE',
        email: user?.email || 'asistente@spatialgineers.com',
        linkedin: `linkedin.com/in/${userName.toLowerCase()}`,
        twitter: `@${userName.toLowerCase()}`,
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
        throw new Error('Cámara no compatible con este navegador.');
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
        alert((es ? 'La linterna no está disponible en este dispositivo o cámara.' : 'The flashlight isn\'t available on this device or camera.'));
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
    if (!file) return;

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
            alert((es ? 'No se detectó un código QR válido en la imagen seleccionada.' : 'No valid QR code was detected in the selected image.'));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-mono">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-[#0f0f0f] border-2 border-[var(--sgx-secondary)] shadow-2xl flex flex-col overflow-hidden text-xs"
        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
      >
        {/* Header */}
        <div className="p-3 bg-gradient-to-r from-slate-950 via-[#1A1A1A] to-black border-b border-[var(--sgx-secondary)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ScanLine className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div>
              <div className="text-sm font-black text-white flex items-center space-x-2">
                <span>{es ? 'NETWORKING QR & LIBRETA DE CONTACTOS' : 'NETWORKING QR & CONTACT BOOK'}</span>
                <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
                  SAN JUAN 2026
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                {es ? 'Escanea credenciales presenciales, comparte tu QR y exporta a tu móvil (.vcf)' : 'Scan in-person credentials, share your QR and export to your phone (.vcf)'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Toast for XP */}
        {justEarnedXp && (
          <div className="bg-gradient-to-r from-amber-950 via-[#262626] to-amber-950 border-b border-[#FDCC0D] p-2 text-center text-[#FDCC0D] font-bold flex items-center justify-center space-x-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{justEarnedXp}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 bg-[#151515] border-b border-[var(--sgx-secondary)] text-center text-xs">
          <button
            onClick={() => {
              setActiveTab('SCANNER');
              playUiChirp(600);
            }}
            className={`py-2.5 font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'SCANNER'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{es ? 'ESCANEAR CÁMARA' : 'CAMERA SCAN'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('MY_BADGE');
              playUiChirp(600);
            }}
            className={`py-2.5 font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'MY_BADGE'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{es ? 'MI CREDENCIAL QR' : 'MY QR CREDENTIAL'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ROLODEX');
              playUiChirp(600);
            }}
            className={`py-2.5 font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'ROLODEX'
                ? 'border-[#FDCC0D] text-[#FDCC0D] bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookUser className="w-3.5 h-3.5" />
            <span>{es ? 'LIBRETA (' : 'CONTACT BOOK ('}{contacts.length})</span>
          </button>
        </div>

        {/* Body Views */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* TAB 1: CAMERA SCANNER */}
          {activeTab === 'SCANNER' && (
            <div className="space-y-4">
              {!scannedResult ? (
                <div className="flex flex-col items-center space-y-3">
                  {/* Viewfinder Video Feed */}
                  <div className="relative w-full max-w-md aspect-[4/3] bg-black border-2 border-cyan-500/80 shadow-2xl overflow-hidden flex items-center justify-center">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Cyber HUD Reticle Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                      {/* Top corners */}
                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
                        <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
                      </div>

                      {/* Center Target Box with Moving Laser Sweep */}
                      <div className="relative self-center w-52 h-52 border border-cyan-400/40 rounded-sm flex items-center justify-center">
                        <div className="w-4 h-4 border border-amber-400/60 rounded-full animate-ping" />
                        <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full" />
                        {/* Scanning Laser */}
                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00DDFF] animate-bounce" />
                      </div>

                      {/* Bottom corners */}
                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
                        <div className="w-6 h-6 border-b-2 border-r-2 border-cyan-400" />
                      </div>
                    </div>

                    {/* Camera Status Notification */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-amber-400" />
                        <span className="text-slate-300 text-xs">{cameraError}</span>
                      </div>
                    )}
                  </div>

                  {/* Hardware Controls (Torch, Switch Camera, File Upload) */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleTorch}
                      className={`px-3 py-1.5 border font-bold flex items-center space-x-1 transition-colors ${
                        torchOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{torchOn ? (es ? 'LINTERNA ON' : 'FLASHLIGHT ON') : (es ? 'LINTERNA' : 'FLASHLIGHT')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                        playUiChirp(700);
                      }}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 font-bold flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{es ? 'CAMBIAR CÁMARA' : 'SWITCH CAMERA'}</span>
                    </button>

                    <label className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-[#FDCC0D] text-[#FDCC0D] font-bold flex items-center space-x-1 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{es ? 'SUBIR IMAGEN' : 'UPLOAD IMAGE'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                </div>
              ) : (
                /* Detected Contact Result Card */
                <div className="max-w-lg mx-auto bg-[#191919] border-2 border-[#FDCC0D] p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#FDCC0D] rounded-full animate-ping" />
                      <span className="text-xs font-black text-[#FDCC0D] uppercase tracking-wider">
                        {es ? '¡CREDENCIAL ESCANEADA CON ÉXITO! (+50 XP)' : 'CREDENTIAL SCANNED SUCCESSFULLY! (+50 XP)'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{scannedResult.scannedAt}</span>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-14 h-14 bg-black border-2 border-[#FDCC0D] flex items-center justify-center text-2xl shrink-0">
                      {scannedResult.avatar ? (
                        <img src={scannedResult.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>🚀</span>
                      )}
                    </div>

                    <div className="flex-1 overflow-hidden space-y-1">
                      <div className="text-base font-black text-white">{scannedResult.name}</div>
                      <div className="text-xs text-cyan-300 font-bold">{loc(scannedResult, 'role', language)}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Building2 className="w-3 h-3" />
                        <span>{loc(scannedResult, 'company', language)}</span>
                      </div>
                      <div className="inline-block px-2 py-0.5 bg-amber-950/60 border border-amber-400 text-amber-300 text-[10px] font-bold mt-1">
                        {scannedResult.pillar}
                      </div>
                    </div>
                  </div>

                  {loc(scannedResult, 'bio', language) && (
                    <div className="p-2.5 bg-black/60 border border-slate-800 text-[11px] text-slate-300 italic">
                      "{loc(scannedResult, 'bio', language)}"
                    </div>
                  )}

                  {/* Private Notes Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">
                      {es ? 'Nota privada para el seguimiento:' : 'Private follow-up note:'}
                    </label>
                    <textarea
                      value={scannedNotesInput}
                      onChange={e => setScannedNotesInput(e.target.value)}
                      placeholder={es ? 'Ej: Hablamos en el panel de WebXR, quiere demo de shaders o inversión...' : 'E.g. We talked at the WebXR panel, wants a shader demo or investment...'}
                      rows={2}
                      className="w-full p-2 bg-black border border-slate-700 text-white text-xs focus:border-[#FDCC0D] outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={handleSaveScannedContact}
                      className="p-2.5 bg-[#FDCC0D] hover:bg-[#E5B80B] text-black font-extrabold flex items-center justify-center space-x-1.5 shadow-lg hover:scale-[1.02] transition-transform"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{es ? 'GUARDAR EN LIBRETA' : 'SAVE TO CONTACT BOOK'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setScannedResult(null);
                        startCamera();
                      }}
                      className="p-2.5 bg-[#232323] border border-slate-700 text-slate-300 hover:text-white font-bold flex items-center justify-center space-x-1"
                    >
                      <span>{es ? 'ESCANEAR OTRO' : 'SCAN ANOTHER'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY QR BADGE */}
          {activeTab === 'MY_BADGE' && (
            <div className="max-w-md mx-auto space-y-4">
              {/* Virtual Badge Card */}
              <div className="bg-[#181818] border-2 border-[var(--sgx-neon)] p-5 relative overflow-hidden shadow-2xl space-y-4">
                {/* Lanyard Ring Decoration */}
                <div className="w-12 h-2.5 bg-slate-700 mx-auto rounded-full border border-slate-500 mb-2" />

                {/* Top Header */}
                <div className="text-center space-y-1">
                  <div className="text-[10px] tracking-widest text-cyan-400 font-mono uppercase">
                    SPATIALGINEERS SUMMIT 2026
                  </div>
                  <div className="text-lg font-black text-white">
                    {playerProfile?.nickname || user?.email?.split('@')[0] || 'ASISTENTE_SGX'}
                  </div>
                  <div className="text-xs text-amber-300 font-bold">
                    {playerProfile?.prizeTier || 'EXPLORER CADET'} • SAN JUAN, PR
                  </div>
                </div>

                {/* Real Generated QR Code */}
                <div className="flex justify-center p-3 bg-black border-2 border-cyan-400 shadow-inner">
                  {myQrDataUrl ? (
                    <img 
                      src={myQrDataUrl} 
                      alt={es ? 'Mi Credencial QR' : 'My QR Credential'} 
                      className="w-56 h-56 object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-500">
                      {es ? 'Generando QR...' : 'Generating QR...'}
                    </div>
                  )}
                </div>

                {/* Badge Bottom Metadata */}
                <div className="text-center text-[10px] text-slate-400 space-y-1">
                  <div>{es ? 'Muestra este código para que otros participantes te agreguen a su libreta.' : 'Show this code so other participants can add you to their contact book.'}</div>
                  <div className="text-[#FDCC0D] font-mono font-bold">
                    ID: {user?.uid ? user.uid.slice(0, 12) : 'SGX-LIVE-2026'}
                  </div>
                </div>
              </div>

              {/* Share & Copy Link */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopiedLink(true);
                    playUiChirp(840);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex-1 p-2.5 bg-[#202020] border border-cyan-400 text-cyan-300 font-bold flex items-center justify-center space-x-1.5 hover:bg-cyan-950/40 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{copiedLink ? (es ? '¡ENLACE COPIADO!' : 'LINK COPIED!') : (es ? 'COPIAR LINK DE ASISTENTE' : 'COPY ATTENDEE LINK')}</span>
                </button>

                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.download = `SGX_Badge_${playerProfile?.nickname || 'Attendee'}.png`;
                    a.href = myQrDataUrl;
                    a.click();
                  }}
                  className="p-2.5 bg-[#202020] border border-amber-400 text-amber-300 font-bold flex items-center space-x-1"
                  title={es ? 'Descargar imagen QR' : 'Download QR image'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{es ? 'BAJAR QR' : 'DOWNLOAD QR'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CONTACTS BOOK (ROLODEX) */}
          {activeTab === 'ROLODEX' && (
            <div className="space-y-4">
              {/* Search & Export Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#181818] p-2.5 border border-slate-800">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={es ? 'Buscar por nombre, cargo...' : 'Search by name, title...'}
                    className="w-full pl-8 pr-3 py-1.5 bg-black border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <select
                    value={selectedPillarFilter}
                    onChange={e => setSelectedPillarFilter(e.target.value)}
                    className="p-1.5 bg-black border border-slate-700 text-slate-300 text-xs outline-none"
                  >
                    <option value="ALL">{es ? 'Todos los Pilares' : 'All Pillars'}</option>
                    <option value="SGX.SYNTHESIZE">SGX.SYNTHESIZE</option>
                    <option value="SGX.STAGE">SGX.STAGE</option>
                    <option value="SGX.SYSTEM">SGX.SYSTEM</option>
                    <option value="SGX.SHOWCASE">SGX.SHOWCASE</option>
                  </select>

                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 bg-[#232323] hover:bg-[#313131] border border-slate-700 hover:border-cyan-400 text-cyan-300 font-bold flex items-center space-x-1"
                    title={es ? 'Exportar todos los contactos a Excel / CSV' : 'Export all contacts to Excel / CSV'}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Contacts Grid */}
              {filteredContacts.length === 0 ? (
                <div className="text-center p-8 bg-black/40 border border-slate-800 space-y-2">
                  <BookUser className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-slate-400 text-xs">{es ? 'No hay contactos guardados con ese filtro.' : 'No saved contacts match that filter.'}</div>
                  <button
                    onClick={() => setActiveTab('SCANNER')}
                    className="px-3 py-1.5 bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold"
                  >
                    {es ? 'Escanear primer contacto' : 'Scan your first contact'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="p-3 bg-[#1A1A1A] border border-slate-800 hover:border-cyan-500/70 transition-all space-y-2 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <div className="w-10 h-10 bg-black border border-cyan-400/50 flex items-center justify-center text-lg shrink-0">
                            {contact.avatar ? (
                              <img src={contact.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>👨‍🚀</span>
                            )}
                          </div>
                          <div>
                            <div className="font-black text-white text-xs">{contact.name}</div>
                            <div className="text-[11px] text-cyan-300 font-bold">{loc(contact, 'role', language)}</div>
                            <div className="text-[10px] text-slate-400">{loc(contact, 'company', language)}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1">
                          <span className="px-1.5 py-0.5 bg-amber-950/40 border border-amber-500/60 text-amber-300 text-[9px] font-bold">
                            {contact.pillar}
                          </span>
                          <span className="text-[9px] text-slate-500">{contact.scannedAt}</span>
                        </div>
                      </div>

                      {/* Notes / Follow-up */}
                      {loc(contact, 'notes', language) && (
                        <div className="p-2 bg-black/50 border border-slate-800 text-[10px] text-slate-300 italic">
                          "{loc(contact, 'notes', language)}"
                        </div>
                      )}

                      {/* Contact Channels & Export vCard */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-2 text-slate-400">
                          {contact.email && (
                            <a 
                              href={`mailto:${contact.email}`} 
                              className="hover:text-cyan-400 transition-colors"
                              title={contact.email}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {contact.linkedin && (
                            <a 
                              href={`https://${contact.linkedin}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="hover:text-blue-400 transition-colors"
                              title="LinkedIn"
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {contact.twitter && (
                            <a 
                              href={`https://x.com/${contact.twitter.replace('@', '')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="hover:text-sky-400 transition-colors"
                              title="X / Twitter"
                            >
                              <Twitter className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleExportVCard(contact)}
                            className="px-2.5 py-1 bg-[#232323] hover:bg-amber-950/60 border border-slate-700 hover:border-[#FDCC0D] text-[#FDCC0D] font-bold text-[10px] flex items-center space-x-1 transition-colors"
                            title={es ? 'Guardar directo en tus contactos del celular' : 'Save directly to your phone contacts'}
                          >
                            <Phone className="w-3 h-3" />
                            <span>{es ? 'AÑADIR A CONTACTOS (.VCF)' : 'ADD TO CONTACTS (.VCF)'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title={es ? 'Eliminar de libreta' : 'Remove from contact book'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-black border-t border-[var(--sgx-secondary)] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>{es ? 'Los contactos y notas se guardan de forma privada en tu dispositivo y perfil.' : 'Contacts and notes are saved privately on your device and profile.'}</span>
          </span>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 bg-[var(--sgx-bg)] border border-slate-700 hover:border-[var(--sgx-neon)] text-white text-xs font-bold transition-colors"
          >
            {es ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
