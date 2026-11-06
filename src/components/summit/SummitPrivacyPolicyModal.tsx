import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SgxDialog } from '../common/SgxDialog';
import { useLanguage } from '../../context/LanguageContext';
import { SGX_EMAIL } from '../../lib/sgxLinks';
import './summitFooter.css';
import { PRIVACY_SECTIONS as SECTIONS, PRIVACY_LEAD, PRIVACY_UPDATED, type Bi } from '../../lib/privacyPolicy';

/* Privacy policy in plain language. It describes what the app really does
   (SGX Pass, Firebase, browser storage, Apps Script mailer, visit radar,
   error reports). Update it whenever a feature starts storing something new. */

interface SummitPrivacyPolicyModalProps {
  onClose: () => void;
}

export const SummitPrivacyPolicyModal: React.FC<SummitPrivacyPolicyModalProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const t = (b: Bi) => (es ? b.es : b.en);

  return (
    <SgxDialog
      size="md"
      onClose={onClose}
      title={es ? 'Política de privacidad' : 'Privacy policy'}
      kicker={`Spatialgineers LLC · ${t(PRIVACY_UPDATED)}`}
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
          {t(PRIVACY_LEAD)}
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
