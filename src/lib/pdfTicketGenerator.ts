import { jsPDF } from 'jspdf';
import { SummitPassRecord } from '../components/summit/SummitTicketModal';

/**
 * Generates an on-brand, high-fidelity PDF pass for Spatialgineers Summit 2026.
 * Layout: Standard High-Tech Event Ticket (210mm x 95mm Landscape).
 */
export function generateSummitPassPDF(pass: SummitPassRecord): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [210, 95],
  });

  const isDigital = pass.ticketType === 'DIGITAL';
  const primaryRgb: [number, number, number] = isDigital ? [0, 240, 255] : [255, 184, 0]; // Cyan vs Amber
  const secondaryRgb: [number, number, number] = [100, 116, 139];
  const bgDark: [number, number, number] = [8, 13, 26];
  const cardBg: [number, number, number] = [14, 23, 42];

  // 1. Base Dark Background
  doc.setFillColor(...bgDark);
  doc.rect(0, 0, 210, 95, 'F');

  // 2. Cyberpunk Accent Grids & Card Panel
  doc.setFillColor(...cardBg);
  doc.rect(5, 5, 200, 85, 'F');

  // Outer Border with corner notches
  doc.setDrawColor(...primaryRgb);
  doc.setLineWidth(0.8);
  doc.rect(5, 5, 200, 85, 'S');

  // Corner Accent Brackets
  doc.setLineWidth(1.6);
  // Top-Left
  doc.line(4, 12, 4, 4);
  doc.line(4, 4, 12, 4);
  // Top-Right
  doc.line(206, 4, 206, 12);
  doc.line(198, 4, 206, 4);
  // Bottom-Left
  doc.line(4, 83, 4, 91);
  doc.line(4, 91, 12, 91);
  // Bottom-Right
  doc.line(206, 83, 206, 91);
  doc.line(198, 91, 206, 91);

  // 3. Perforated Ticket Stub Divider at X = 152
  doc.setDrawColor(51, 65, 85);
  doc.setLineDashPattern([2, 2], 0);
  doc.setLineWidth(0.6);
  doc.line(152, 5, 152, 90);
  doc.setLineDashPattern([], 0); // reset

  // Stub Cutout Semicircles
  doc.setFillColor(...bgDark);
  doc.circle(152, 5, 3.5, 'F');
  doc.circle(152, 90, 3.5, 'F');

  // 4. Header Bar (Main Pass)
  doc.setFillColor(15, 23, 42);
  doc.rect(6, 6, 145, 14, 'F');
  doc.setDrawColor(...primaryRgb);
  doc.setLineWidth(0.3);
  doc.line(6, 20, 151, 20);

  // Logo Brand Mark & Title
  doc.setTextColor(...primaryRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SPATIALGINEERS SUMMIT 2026', 10, 13);

  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPUTACIÓN ESPACIAL • TRANSMEDIA • WEBXR • LIVE ENGINE', 10, 17.5);

  // Type Pill Badge
  doc.setFillColor(...primaryRgb);
  doc.rect(106, 9, 41, 7, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const badgeLabel = isDigital ? 'PASE DIGITAL GLOBAL' : 'SHOWCASE PRESENCIAL';
  doc.text(badgeLabel, 126.5, 13.8, { align: 'center' });

  // 5. Attendee Information Details
  // Name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('TITULAR REGISTRADO / ATTENDEE NAME:', 10, 27);

  // Dynamic font sizing for attendee name so it fits completely without run-off or truncation
  const nameText = pass.fullName.trim().toUpperCase();
  let nameFontSize = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(nameFontSize);
  while (doc.getTextWidth(nameText) > 135 && nameFontSize > 7.5) {
    nameFontSize -= 0.5;
    doc.setFontSize(nameFontSize);
  }
  doc.setTextColor(255, 255, 255);
  doc.text(nameText, 10, 33);

  // Email & Organization
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CORREO ELECTRÓNICO:', 10, 39.5);

  const emailText = pass.email.trim();
  doc.setFont('helvetica', 'bold');
  let emailFontSize = 8.5;
  doc.setFontSize(emailFontSize);
  while (doc.getTextWidth(emailText) > 65 && emailFontSize > 6) {
    emailFontSize -= 0.5;
    doc.setFontSize(emailFontSize);
  }
  doc.setTextColor(...primaryRgb);
  doc.text(emailText, 10, 44);

  if (pass.organization || pass.roleTitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('PERFIL / ENTIDAD:', 80, 39.5);

    doc.setFont('helvetica', 'bold');
    let orgFontSize = 8;
    doc.setFontSize(orgFontSize);
    const orgText = [pass.roleTitle, pass.organization].filter(Boolean).join(' • ');
    while (doc.getTextWidth(orgText) > 65 && orgFontSize > 6) {
      orgFontSize -= 0.5;
      doc.setFontSize(orgFontSize);
    }
    doc.setTextColor(255, 255, 255);
    // Split text cleanly to available width so nothing is sliced or clipped
    const splitOrg = doc.splitTextToSize(orgText, 66);
    doc.text(splitOrg, 80, 44);
  }

  // Event Location & Dates Grid
  doc.setFillColor(10, 16, 31);
  doc.rect(10, 50, 137, 18, 'F');
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.rect(10, 50, 137, 18, 'S');

  // Left column: Fechas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...primaryRgb);
  doc.text('FECHAS OFICIALES:', 14, 55);

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DICIEMBRE 11 – 13, 2026', 14, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Días 1–2 digitales · YouTube Live', 14, 64.5);

  // Right column: Sede
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...primaryRgb);
  doc.text('DÍA 3 · SGX SHOWCASE:', 75, 55);

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('CHROMA SPACE STUDIOS', 75, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('San Juan, PR · Por invitación', 75, 64.5);

  // Bottom Notice / Hash
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  const authHash = `AUTH-VERIFIED:${pass.referenceCode} • ISSUED_ON:${new Date(pass.registeredAt).toISOString().split('T')[0]} • SGX-ENGINE-V2.6`;
  doc.text(authHash, 10, 75);

  // Security line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Presenta este comprobante o código digital para acceso en vivo y votaciones interactivas. Día 3 presencial: por invitación y cupo limitado.', 10, 81);

  // 6. Right Side Ticket Stub (X = 153 to 205)
  // Stub Header
  doc.setFillColor(15, 23, 42);
  doc.rect(153, 6, 51, 14, 'F');
  doc.setTextColor(...primaryRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CONTROL DE ACCESO', 178.5, 12, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(isDigital ? 'VERIFICACIÓN DIGITAL' : 'SHOWCASE ADMISSION', 178.5, 16.5, { align: 'center' });

  // Large Reference Code Box
  doc.setFillColor(10, 16, 31);
  doc.rect(156, 23, 45, 16, 'F');
  doc.setDrawColor(...primaryRgb);
  doc.setLineWidth(0.4);
  doc.rect(156, 23, 45, 16, 'S');

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(pass.referenceCode, 178.5, 31, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text('CÓDIGO DE REGISTRO', 178.5, 36, { align: 'center' });

  // Simulated High-Tech QR / Barcode Block
  const qrX = 166;
  const qrY = 43;
  doc.setFillColor(255, 255, 255);
  doc.rect(qrX, qrY, 25, 25, 'F');
  
  // Draw simulated QR finder patterns
  doc.setFillColor(0, 0, 0);
  // Top-left
  doc.rect(qrX + 2, qrY + 2, 6, 6, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(qrX + 3.2, qrY + 3.2, 3.6, 3.6, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(qrX + 4.2, qrY + 4.2, 1.6, 1.6, 'F');

  // Top-right
  doc.rect(qrX + 17, qrY + 2, 6, 6, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(qrX + 18.2, qrY + 3.2, 3.6, 3.6, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(qrX + 19.2, qrY + 4.2, 1.6, 1.6, 'F');

  // Bottom-left
  doc.rect(qrX + 2, qrY + 17, 6, 6, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(qrX + 3.2, qrY + 18.2, 3.6, 3.6, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(qrX + 4.2, qrY + 19.2, 1.6, 1.6, 'F');

  // Matrix pattern dots
  const matrixDots = [
    [10, 3], [12, 3], [14, 5], [10, 7], [13, 8],
    [3, 10], [5, 12], [7, 10], [8, 13], [10, 11],
    [12, 11], [14, 13], [11, 15], [15, 15], [10, 18],
    [12, 19], [14, 18], [18, 10], [20, 12], [19, 14],
    [18, 18], [21, 20], [17, 21]
  ];
  matrixDots.forEach(([dx, dy]) => {
    doc.rect(qrX + dx, qrY + dy, 1.3, 1.3, 'F');
  });

  // Simulated Barcode below QR
  doc.setFillColor(...primaryRgb);
  doc.rect(156, 72, 45, 10, 'F');

  doc.setFillColor(0, 0, 0);
  const barWidths = [1, 2, 0.8, 1.5, 0.5, 2.2, 1.2, 0.7, 1.8, 1, 2.5, 0.9, 1.4, 0.6, 2, 1.1, 0.8, 1.7, 1];
  let currentBarX = 158;
  barWidths.forEach(w => {
    doc.rect(currentBarX, 73.5, w, 7, 'F');
    currentBarX += w + 1;
  });

  // Status text on stub
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...primaryRgb);
  doc.text(pass.status === 'CONFIRMED' ? 'ESTADO: CONFIRMADO' : 'ESTADO: EN REVISIÓN', 178.5, 86, { align: 'center' });

  // Save the PDF
  const filenameSafe = pass.fullName.trim().replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`SGX_Summit2026_Pass_${filenameSafe}_${pass.referenceCode}.pdf`);
}
