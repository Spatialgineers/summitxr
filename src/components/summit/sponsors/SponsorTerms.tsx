import React, { useEffect, useState } from 'react';
import { Check, Copy, FileText, Mail, Plus } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { SUMMIT_CONTACT_EMAIL } from '../../../lib/summitDeadlines';
import { SPONSOR_PAYMENT_COMMENT, SPONSOR_TERMS, SPONSOR_TERMS_ANCHOR, SPONSOR_TERMS_FACTS } from '../../../lib/sponsorTerms';
import { goToSectionAnchor, hashIs, scrollToAnchorWhenReady } from '../../../lib/anchorScroll';
import '../sgxGuides.css';

interface SponsorTermsProps {
  /** Heading level id suffix, so the block can live twice in the DOM (page + welcome) without clashes. */
  idPrefix?: string;
  /** The anchor id (only the sponsors page uses #terminos). */
  anchorId?: string;
}

/* "Términos y logística": payment, IVU, materials, categories, the Package
   4–5 license and report, cancellation, force majeure and Day 3. Data in
   lib/sponsorTerms.ts (dates from lib/summitDeadlines.ts). */
export const SponsorTerms: React.FC<SponsorTermsProps> = ({ idPrefix = 'spx', anchorId = SPONSOR_TERMS_ANCHOR }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [copied, setCopied] = useState(false);
  const titleId = `${idPrefix}-terms-title`;

  // Opened as /sponsors#terminos (invite email, the form, the welcome portal): land here.
  useEffect(() => (hashIs(anchorId) ? scrollToAnchorWhenReady(anchorId) : undefined), [anchorId]);

  const copyComment = () => {
    navigator.clipboard?.writeText(es ? SPONSOR_PAYMENT_COMMENT.es : SPONSOR_PAYMENT_COMMENT.en).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <section id={anchorId} className="sgx-guide" aria-labelledby={titleId} tabIndex={-1} data-testid="sponsor-terms">
      <div className="sgx-guide__head">
        <p className="sgx-guide__kicker">{es ? 'Términos y logística' : 'Terms and logistics'}</p>
        <h2 id={titleId} className="sgx-guide__h2">{es ? 'Lo que necesitas antes de pagar' : 'What you need before paying'}</h2>
        <p className="sgx-guide__lead">
          {es
            ? 'Pago, materiales, IVU, cancelación y lo que incluye la licencia de los Paquetes 4 y 5. Todo lo que dice el dossier de auspicio, aquí mismo.'
            : 'Payment, materials, sales tax, cancellation and what the Package 4 and 5 license includes. Everything in the sponsorship dossier, right here.'}
        </p>
      </div>

      <dl className="sgx-guide__facts">
        {SPONSOR_TERMS_FACTS.map((f) => (
          <div key={f.v.es}>
            <dt>{es ? f.v.es : f.v.en}</dt>
            <dd>{es ? f.k.es : f.k.en}</dd>
          </div>
        ))}
      </dl>

      <div className="sgx-guide__list">
        {SPONSOR_TERMS.map((t, i) => (
          <details key={t.id} className="sgx-guide__item" open={i === 0} data-term={t.id}>
            <summary><h3>{es ? t.title.es : t.title.en}</h3><Plus aria-hidden /></summary>
            <div className="sgx-guide__body">
              <ul className="sgx-guide__lines">
                {t.lines.map((l) => <li key={l.es}>{es ? l.es : l.en}</li>)}
              </ul>
              {t.id === 'pago' && (
                <div className="sgx-guide__copy">
                  <code>{es ? SPONSOR_PAYMENT_COMMENT.es : SPONSOR_PAYMENT_COMMENT.en}</code>
                  <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={copyComment} aria-label={es ? 'Copiar el comentario del pago' : 'Copy the payment comment'}>
                    {copied ? <Check aria-hidden /> : <Copy aria-hidden />}{copied ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar' : 'Copy')}
                  </button>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      <p className="sgx-guide__fine">
        {es ? '¿Dudas sobre pago, materiales o el contrato? ' : 'Questions about payment, materials or the contract? '}
        <a href={`mailto:${SUMMIT_CONTACT_EMAIL}?subject=${encodeURIComponent('Spatialgineers Summit 2026 · Auspicio')}`}><Mail aria-hidden style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 4 }} />{SUMMIT_CONTACT_EMAIL}</a>
      </p>
    </section>
  );
};

/** A link to /sponsors#terminos that works inside the app (forms, notes, the welcome portal). */
export const SponsorTermsLink: React.FC<{ className?: string; label?: string }> = ({ className = 'sgx-guide-link', label }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  return (
    <a
      href={`/sponsors#${SPONSOR_TERMS_ANCHOR}`}
      className={className}
      data-testid="sponsor-terms-link"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        goToSectionAnchor('SPONSORS_HUB', SPONSOR_TERMS_ANCHOR);
      }}
    >
      <FileText aria-hidden />{label || (es ? 'Términos y logística' : 'Terms and logistics')}
    </a>
  );
};
