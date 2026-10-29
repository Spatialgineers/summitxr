import React from 'react';
import { ArrowRight, Mail, Plus } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

interface SponsorProcessProps {
  onApply: () => void;
}

/* How it works (apply → confirmation → materials → live), the short FAQ and
   the closing call to action. Facts only from the dossier and the form. */
export const SponsorProcess: React.FC<SponsorProcessProps> = ({ onApply }) => {
  const { language } = useLanguage();
  const es = language === 'es';

  const steps = es ? [
    { when: 'Hoy', title: 'Solicita', body: 'Elige un nivel y envía el formulario. Recibes un código de seguimiento al instante.' },
    { when: 'Tras la revisión', title: 'Confirmación', body: 'El equipo de Spatialgineers revisa tu propuesta y te escribe por correo. Rige un contrato corto de auspicio firmado por ambas partes.' },
    { when: '14 nov · 30 nov', title: 'Pago y materiales', body: 'Pago total a más tardar el 14 de noviembre. Materiales de tu marca hasta el 30 de noviembre.' },
    { when: '11–13 dic', title: 'En vivo', body: 'Tu marca en la webapp, la transmisión y el Día 3. Tiers 4 y 5 reciben el reporte final a los 30 días.' },
  ] : [
    { when: 'Today', title: 'Apply', body: 'Pick a tier and send the form. You get a tracking code right away.' },
    { when: 'After review', title: 'Confirmation', body: 'The Spatialgineers team reviews your proposal and emails you. A short sponsorship contract signed by both parties governs.' },
    { when: 'Nov 14 · Nov 30', title: 'Payment and materials', body: 'Full payment by November 14. Your brand materials by November 30.' },
    { when: 'Dec 11–13', title: 'Live', body: 'Your brand on the web app, the broadcast and Day 3. Tiers 4 and 5 get the final report at 30 days.' },
  ];

  const faq = es ? [
    { q: '¿El precio es fijo?', a: 'No. Cada nivel tiene un rango en USD y el precio exacto se acuerda según el presupuesto del sponsor. El Tier 5 no tiene precio público.' },
    { q: '¿Garantizan vistas, asistencia o clics?', a: 'No. Spatialgineers no garantiza un número de vistas, asistentes ni clics. Los Tiers 4 y 5 reciben un reporte final a los 30 días con vistas, asistencia, clics y participación, sin datos personales.' },
    { q: '¿Cómo es el Día 3?', a: 'Es el SGX Showcase en Chroma Space Studios, San Juan: presencial, por invitación y con cupo limitado (40 a 60 personas). Los Días 1 y 2 son gratis por YouTube Live, junto a Los Mismos TV.' },
    { q: '¿Qué es la licencia de 365 días?', a: 'Tiers 4 y 5 mantienen su acceso a la webapp y a sus espacios de promoción y contenido en redes por 365 días desde noviembre. No hay transferencia de código.' },
    { q: '¿Puedo aportar en especie?', a: 'Sí, con el Tier 5: venue, internet, comida u otros servicios esenciales, en especie o monetario. Los beneficios se pactan por escrito con cada aliado.' },
    { q: '¿Hay exclusividad por categoría?', a: 'Sí, en los Tiers 4 y 5: una sola marca de su sector.' },
  ] : [
    { q: 'Is the price fixed?', a: "No. Each tier has a range in USD and the exact price is agreed based on the sponsor's budget. Tier 5 has no public price." },
    { q: 'Do you guarantee views, attendance or clicks?', a: 'No. Spatialgineers does not guarantee a number of views, attendees or clicks. Tiers 4 and 5 receive a final report at 30 days with views, attendance, clicks and participation, with no personal data.' },
    { q: 'What is Day 3 like?', a: 'It is the SGX Showcase at Chroma Space Studios, San Juan: in person, by invitation and with limited capacity (40 to 60 people). Days 1 and 2 are free on YouTube Live, with Los Mismos TV.' },
    { q: 'What is the 365-day license?', a: 'Tiers 4 and 5 keep their access to the web app and its promotion and social content spaces for 365 days starting in November. No code transfer.' },
    { q: 'Can I contribute in kind?', a: 'Yes, with Tier 5: venue, internet, food or other essential services, in kind or monetary. Benefits are agreed in writing with each partner.' },
    { q: 'Is there category exclusivity?', a: 'Yes, in Tiers 4 and 5: only one brand from your sector.' },
  ];

  return (
    <>
      <section className="spx-section" aria-labelledby="spx-steps-title">
        <div className="spx-head">
          <p className="spx-kicker">{es ? 'Cómo funciona' : 'How it works'}</p>
          <h2 id="spx-steps-title" className="spx-h2">{es ? 'De la solicitud al aire' : 'From request to on air'}</h2>
        </div>
        <ol className="spx-steps">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="spx-steps__n" aria-hidden="true">{i + 1}</span>
              <p className="spx-steps__when">{s.when}</p>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="spx-section" aria-labelledby="spx-faq-title">
        <div className="spx-head">
          <p className="spx-kicker">FAQ</p>
          <h2 id="spx-faq-title" className="spx-h2">{es ? 'Preguntas frecuentes' : 'Frequently asked questions'}</h2>
        </div>
        <div className="spx-faq">
          {faq.map((f) => (
            <details key={f.q}>
              <summary><span>{f.q}</span><Plus aria-hidden /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="spx-final" aria-labelledby="spx-final-title">
        <div>
          <h2 id="spx-final-title" className="spx-final__title">{es ? '¿Hablamos de tu marca?' : "Let's talk about your brand."}</h2>
          <p>
            {es
              ? 'Envía tu solicitud desde aquí, o escríbenos para pedir una propuesta formal o el Media Kit completo en PDF.'
              : 'Send your request from here, or write to us for a formal proposal or the full Media Kit as a PDF.'}
          </p>
        </div>
        <div className="spx-final__cta">
          <button type="button" className="sgx-btn" onClick={onApply}>
            {es ? 'Solicitar auspicio' : 'Request sponsorship'}<ArrowRight aria-hidden />
          </button>
          <a className="sgx-btn sgx-btn--ground" href="mailto:info@spatialgineers.com?subject=Spatialgineers%20Summit%202026%20%C2%B7%20Auspicio">
            <Mail aria-hidden />info@spatialgineers.com
          </a>
        </div>
      </section>
    </>
  );
};
