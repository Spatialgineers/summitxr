import { jsPDF } from 'jspdf';
import { PILLAR_BY_KEY } from '../lib/sgxPillars';
import type { SgxIdentity } from './sgxIdentity';
import { inlineSvgImages } from './pilotAvatar';

/* The PDF is an export of the SGX Pass, not a separate ticket: same code,
   same QR, same portrait. 210 × 95 mm, SGX dark with 45° cuts. */

async function svgToPng(svg: SVGSVGElement, size = 360): Promise<string | null> {
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    await inlineSvgImages(clone);
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = url; });
    const c = document.createElement('canvas');
    c.width = size; c.height = Math.round(size * 1.2);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export async function exportPassPdf(id: SgxIdentity, qrDataUrl: string | null, rank: string, portraitSvg?: SVGSVGElement | null): Promise<void> {
  const pass = id.pass;
  if (!pass) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [210, 95] });
  const yellow = hex('#FDCC0D');
  const cyan = hex('#00DDFF');
  const accent = pass.tier === 'SHOWCASE' ? yellow : cyan;

  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, 210, 95, 'F');
  // 45° cut frame
  doc.setFillColor(26, 26, 26);
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.6);
  const cut = 7;
  doc.rect(5, 5, 200, 85, 'F');
  doc.setFillColor(5, 5, 5);
  doc.triangle(5, 5, 5 + cut, 5, 5, 5 + cut, 'F');
  doc.triangle(205, 90, 205 - cut, 90, 205, 90 - cut, 'F');
  // outline: TL cut → top → right → BR cut → bottom → left
  doc.line(5 + cut, 5, 205, 5);
  doc.line(205, 5, 205, 90 - cut);
  doc.line(205, 90 - cut, 205 - cut, 90);
  doc.line(205 - cut, 90, 5, 90);
  doc.line(5, 90, 5, 5 + cut);
  doc.line(5, 5 + cut, 5 + cut, 5);
  // header
  doc.setTextColor(...yellow);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SGX PASS', 14, 17);
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text('SPATIALGINEERS SUMMIT 2026 · 11–13 DICIEMBRE', 14, 22);
  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...accent);
  doc.text(`#${pass.serial}`, 196, 17, { align: 'right' });

  // portrait
  // the portrait is always the avatar
  const portrait = portraitSvg ? await svgToPng(portraitSvg) : null;
  if (portrait) {
    try { doc.addImage(portrait, 'PNG', 14, 28, 34, 40.8); } catch { /* bad image */ }
  }
  doc.setDrawColor(...accent);
  doc.rect(14, 28, 34, 40.8, 'S');

  // who
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('CREADOR', 54, 32);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(doc.splitTextToSize(pass.fullName.toUpperCase(), 92).slice(0, 2), 54, 39);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...cyan);
  doc.text(id.callsign, 54, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 220);
  const pillar = id.affinity ? PILLAR_BY_KEY[id.affinity].name : '';
  doc.text([pillar && `Pilar: ${pillar}`, `Rango: ${rank}`, pass.organization && `Organización: ${pass.organization}`].filter(Boolean) as string[], 54, 57);

  // tier strip
  doc.setFillColor(...accent);
  doc.rect(14, 74, 134, 8, 'F');
  doc.setTextColor(5, 5, 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    pass.tier === 'SHOWCASE'
      ? (pass.status === 'PENDING' ? 'DÍA 3 · CHROMA SPACE STUDIOS · SOLICITUD EN REVISIÓN (POR INVITACIÓN)' : 'DÍA 3 · CHROMA SPACE STUDIOS · SAN JUAN')
      : 'DIGITAL GLOBAL · DÍAS 1 Y 2 POR YOUTUBE LIVE',
    17, 79.3,
  );

  // QR stub
  doc.setDrawColor(80, 80, 80);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(154, 8, 154, 87);
  doc.setLineDashPattern([], 0);
  if (qrDataUrl) {
    try { doc.addImage(qrDataUrl, 'PNG', 161, 26, 38, 38); } catch { /* ignore */ }
  }
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...yellow);
  doc.text(pass.code, 180, 70, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(170, 170, 170);
  doc.text(['Entrada · contacto · premios', 'Un solo QR para todo el Summit'], 180, 75, { align: 'center' });

  doc.save(`SGX-Pass-${pass.serial}.pdf`);
}
