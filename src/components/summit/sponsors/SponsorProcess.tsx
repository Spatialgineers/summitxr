import React from 'react';
import { ArrowRight, Mail, Plus } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { deadlineDay, deadlineShort } from '../../../lib/summitDeadlines';

interface SponsorProcessProps {
  onApply: () => void;
}

/* How it works (apply → confirmation → materials → live), the short FAQ and
   the closing call to action. Facts only from the dossier and the form. */
export const SponsorProcess: React.FC<SponsorProcessProps> = ({ onApply }) => {
  const { language } = useLanguage();
  const es = language === 'es';

  const steps = es ? [
    { when: `Hasta el ${deadlineShort('sponsorApplications', 'es')}`, title: 'Solicita', body: `Elige un paquete y envía el formulario a más tardar el ${deadlineDay('sponsorApplications', 'es')}. Recibes un código de seguimiento al instante.` },
    { when: 'Tras la revisión', title: 'Confirmación', body: 'El equipo de Spatialgineers revisa tu propuesta y te escribe por correo. Rige un contrato corto de auspicio firmado por ambas partes.' },
    { when: deadlineShort('sponsorPayment', 'es'), title: 'Pago y materiales', body: `Pago total y materiales de tu marca a más tardar el ${deadlineDay('sponsorPayment', 'es')}.` },
    { when: '11–13 dic', title: 'En vivo', body: 'Tu marca en la webapp, la transmisión y el Día 3. Paquetes 4 y 5 reciben el reporte final a los 30 días.' },
  ] : [
    { when: `By ${deadlineShort('sponsorApplications', 'en')}`, title: 'Apply', body: `Pick a package and send the form by ${deadlineDay('sponsorApplications', 'en')}. You get a tracking code right away.` },
    { when: 'After review', title: 'Confirmation', body: 'The Spatialgineers team reviews your proposal and emails you. A short sponsorship contract signed by both parties governs.' },
    { when: deadlineShort('sponsorPayment', 'en'), title: 'Payment and materials', body: `Full payment and your brand materials no later than ${deadlineDay('sponsorPayment', 'en')}.` },
    { when: 'Dec 11–13', title: 'Live', body: 'Your brand on the web app, the broadcast and Day 3. Packages 4 and 5 get the final report at 30 days.' },
  ];

  const faq = es ? [
    { q: '¿El precio es fijo?', a: 'No. Cada nivel tiene un rango en USD y el precio exacto se acuerda según el presupuesto del sponsor. El Paquete 5 no tiene precio público.' },
    { q: '¿Garantizan vistas, asistencia o clics?', a: 'No. Spatialgineers no garantiza un número de vistas, asistentes ni clics. Los Paquetes 4 y 5 reciben un reporte final a los 30 días con vistas, asistencia, clics y participación, sin datos personales.' },
    { q: '¿Cómo es el Día 3?', a: 'Es el SGX Showcase en Chroma Space Studios, San Juan: presencial, por invitación y con cupo limitado (40 a 60 personas). Los Días 1 y 2 son gratis por YouTube Live, junto a Los Mismos TV.' },
    { q: '¿Qué es la licencia de 365 días?', a: 'Paquetes 4 y 5 mantienen su acceso a la webapp y a sus espacios de promoción y contenido en redes por 365 días desde noviembre. No hay transferencia de código.' },
    { q: '¿Puedo aportar en especie?', a: 'Sí, con el Paquete 5: venue, internet, comida u otros servicios esenciales, en especie o monetario. Los beneficios se pactan por escrito con cada aliado.' },
    { q: '¿Hay exclusividad por categoría?', a: 'Sí, en los Paquetes 4 y 5: una sola marca de su sector.' },
  ] : [
    { q: 'Is the price fixed?', a: "No. Each package has a range in USD and the exact price is agreed based on the sponsor's budget. Package 5 has no public price." },
    { q: 'Do you guarantee views, attendance or clicks?', a: 'No. Spatialgineers does not guarantee a number of views, attendees or clicks. Packages 4 and 5 receive a final report at 30 days with views, attendance, clicks and participation, with no personal data.' },
    { q: 'What is Day 3 like?', a: 'It is the SGX Showcase at Chroma Space Studios, San Juan: in person, by invitation and with limited capacity (40 to 60 people). Days 1 and 2 are free on YouTube Live, with Los Mismos TV.' },
    { q: 'What is the 365-day license?', a: 'Packages 4 and 5 keep their access to the web app and its promotion and social content spaces for 365 days starting in November. No code transfer.' },
    { q: 'Can I contribute in kind?', a: 'Yes, with Package 5: venue, internet, food or other essential services, in kind or monetary. Benefits are agreed in writing with each partner.' },
    { q: 'Is there category exclusivity?', a: 'Yes, in Packages 4 and 5: only one brand from your sector.' },
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
