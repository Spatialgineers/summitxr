import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SgxDialog } from '../common/SgxDialog';
import { useLanguage } from '../../context/LanguageContext';
import { SGX_EMAIL } from '../../lib/sgxLinks';
import './summitFooter.css';

/* Privacy policy in plain language. It describes what the app really does
   (SGX Pass, Firebase, browser storage, Apps Script mailer, visit radar,
   error reports). Update it whenever a feature starts storing something new. */

interface SummitPrivacyPolicyModalProps {
  onClose: () => void;
}

type Bi = { es: string; en: string };
interface PolicySection { id: string; title: Bi; intro?: Bi; items?: Bi[]; outro?: Bi }

const SECTIONS: PolicySection[] = [
  {
    id: 'who',
    title: { es: 'Quiénes somos', en: 'Who we are' },
    intro: {
      es: 'Spatialgineers LLC, en San Juan, Puerto Rico, organiza el Spatialgineers Summit 2026 y opera esta web app. Para cualquier pregunta sobre tus datos, escríbenos a info@spatialgineers.com.',
      en: 'Spatialgineers LLC, in San Juan, Puerto Rico, runs the Spatialgineers Summit 2026 and operates this web app. For any question about your data, write to info@spatialgineers.com.',
    },
  },
  {
    id: 'collect',
    title: { es: 'Qué datos recogemos', en: 'What we collect' },
    items: [
      { es: 'Cuando forjas tu SGX Pass: tu nombre completo, tu correo, tu rol y tu organización (opcionales), el pilar que eliges y tu consentimiento de imagen (si aceptas que aparezcas en fotos y video del evento).', en: 'When you forge your SGX Pass: your full name, your email, your role and organization (optional), the pillar you choose and your image consent (whether you agree to appear in event photos and video).' },
      { es: 'Si entras con Google (opcional): el identificador de tu cuenta, tu nombre y tu correo de Google. No vemos tu contraseña.', en: 'If you sign in with Google (optional): your account identifier, your Google name and email. We never see your password.' },
      { es: 'Lo que haces en la app: tu XP, misiones y sellos, tu avatar, los contactos que intercambias y, si los usas, tus votos, mensajes en los foros y tu perfil de SGX.Match.', en: 'What you do in the app: your XP, missions and stamps, your avatar, the contacts you exchange and, if you use them, your votes, forum messages and SGX.Match profile.' },
      { es: 'Día 3: el registro de tu entrada (check-in) cuando escaneamos tu pase en Chroma Space Studios.', en: 'Day 3: your entry record (check-in) when we scan your pass at Chroma Space Studios.' },
      { es: 'Visitas: contamos visitas por región aproximada (municipio, estado o país). Para saber la región, tu navegador consulta un servicio de ubicación por IP (geojs.io o ipapi.co). No guardamos tu IP ni tu ubicación exacta.', en: 'Visits: we count visits by approximate region (municipality, state or country). To find the region, your browser asks an IP location service (geojs.io or ipapi.co). We don\'t store your IP or exact location.' },
      { es: 'Errores: si algo falla, la app envía un reporte técnico (el error, la página y el navegador). No incluye datos personales, salvo tu identificador de usuario (uid) si tienes uno.', en: 'Errors: if something breaks, the app sends a technical report (the error, the page and the browser). It has no personal data, except your user identifier (uid) if you have one.' },
    ],
  },
  {
    id: 'where',
    title: { es: 'Dónde se guardan', en: 'Where it is stored' },
    items: [
      { es: 'En tu navegador: tu pase, tu XP, tu avatar y tus contactos, para que la app funcione aunque no tengas cuenta. Si borras los datos del navegador, se borran de ahí.', en: 'In your browser: your pass, XP, avatar and contacts, so the app works even without an account. If you clear your browser data, they are removed from there.' },
      { es: 'En Firebase (Google Cloud): tu inscripción; un índice de correos de pases guardado como hash SHA-256 (no el correo en texto) para evitar pases duplicados y recuperar el tuyo; tu perfil de creador y tu lugar en el leaderboard; los intercambios de contacto, que solo se completan cuando ambas personas escanean; los check-ins del Día 3, y los reportes de errores.', en: 'In Firebase (Google Cloud): your registration; an index of pass emails stored as a SHA-256 hash (not the plain email) to prevent duplicate passes and recover yours; your creator profile and leaderboard position; contact exchanges, which only complete when both people scan; Day 3 check-ins, and error reports.' },
    ],
  },
  {
    id: 'email',
    title: { es: 'Correos que te enviamos', en: 'Emails we send you' },
    intro: { es: 'Desde info@spatialgineers.com, y solo sobre el evento:', en: 'From info@spatialgineers.com, and only about the event:' },
    items: [
      { es: 'La confirmación de tu SGX Pass.', en: 'Your SGX Pass confirmation.' },
      { es: 'La invitación al Día 3, si te invitamos.', en: 'The Day 3 invitation, if you are invited.' },
      { es: 'Recordatorios antes del Summit y antes del Día 3.', en: 'Reminders before the Summit and before Day 3.' },
      { es: 'El aviso de que tu Holo Card está lista (speakers y sponsors).', en: 'A notice that your Holo Card is ready (speakers and sponsors).' },
    ],
    outro: { es: 'Si no quieres recibirlos, escríbenos y te sacamos de la lista.', en: 'If you don\'t want them, write to us and we\'ll take you off the list.' },
  },
  {
    id: 'use',
    title: { es: 'Para qué los usamos', en: 'What we use it for' },
    items: [
      { es: 'Para darte tu pase, tu XP y tus premios, y para organizar la entrada al Día 3.', en: 'To give you your pass, XP and prizes, and to organize Day 3 entry.' },
      { es: 'Para mostrar el leaderboard (tu nombre de creador y tu XP) y el mapa de visitas por región.', en: 'To show the leaderboard (your creator name and XP) and the visit map by region.' },
      { es: 'Para arreglar errores y mejorar la app.', en: 'To fix errors and improve the app.' },
      { es: 'Nunca vendemos ni alquilamos tus datos a nadie.', en: 'We never sell or rent your data to anyone.' },
    ],
  },
  {
    id: 'rights',
    title: { es: 'Tus derechos', en: 'Your rights' },
    intro: {
      es: 'Puedes pedirnos ver, corregir o borrar tus datos (tu inscripción, tu pase y tu perfil) escribiendo a info@spatialgineers.com. Esta política se rige por las leyes de Puerto Rico.',
      en: 'You can ask us to see, correct or delete your data (your registration, pass and profile) by writing to info@spatialgineers.com. This policy is governed by the laws of Puerto Rico.',
    },
  },
];

export const SummitPrivacyPolicyModal: React.FC<SummitPrivacyPolicyModalProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const t = (b: Bi) => (es ? b.es : b.en);

  return (
    <SgxDialog
      size="md"
      onClose={onClose}
      title={es ? 'Política de privacidad' : 'Privacy policy'}
      kicker={es ? 'Spatialgineers LLC · actualizada en octubre de 2026' : 'Spatialgineers LLC · updated October 2026'}
      icon={<ShieldCheck className="w-6 h-6 text-[#00DDFF] shrink-0" aria-hidden="true" />}
      footer={
        <>
          <a className="sgx-btn sgx-btn--sm sgx-btn--ground" href={`mailto:${SGX_EMAIL}`}>{SGX_EMAIL}</a>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={onClose}>{es ? 'Entendido' : 'Got it'}</button>
        </>
      }
    >
      <div className="sgx-privacy">
        <p className="sgx-privacy__lead">
          {es
            ? 'En corto: para darte tu SGX Pass guardamos tu nombre y tu correo, y lo que haces en la app. Lo usamos solo para el Summit y nunca lo vendemos.'
            : 'In short: to give you your SGX Pass we keep your name and email, and what you do in the app. We use it only for the Summit and never sell it.'}
        </p>
        {SECTIONS.map((sec, i) => (
          <section key={sec.id} className="sgx-privacy__sec" aria-labelledby={`sgx-privacy-${sec.id}`}>
            <h3 id={`sgx-privacy-${sec.id}`}><span>0{i + 1}</span>{t(sec.title)}</h3>
            {sec.intro && <p>{t(sec.intro)}</p>}
            {sec.items && <ul>{sec.items.map((it) => <li key={it.es}>{t(it)}</li>)}</ul>}
            {sec.outro && <p>{t(sec.outro)}</p>}
          </section>
        ))}
      </div>
    </SgxDialog>
  );
};

export default SummitPrivacyPolicyModal;
