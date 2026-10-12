import type { SolutionExpress, Settings } from '@/types';
import { STATUS_LABEL, STATUS_COLOR } from '@/types';

/* Export Excel (.xlsx) mis en forme — exécuté uniquement dans le navigateur. */

const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase();

const C = {
  navy:   argb('#0b1020'),
  navy2:  argb('#141b34'),
  green:  argb('#12b76a'),
  teal:   argb('#0e9aa7'),
  white:  argb('#ffffff'),
  zebra:  argb('#f3f6fb'),
  border: argb('#d5dbe8'),
  text:   argb('#1f2937'),
  muted:  argb('#6b7280'),
  orange: argb('#f79009'),
  red:    argb('#be123c'),
};

const thin = { style: 'thin' as const, color: { argb: C.border } };
const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

const toDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
};

export async function exportLeadsExcel(leads: SolutionExpress[], settings: Settings): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;

  const lbl = (list: { key: string; label: string }[], key?: string) =>
    list.find(x => x.key === key)?.label ?? (key === 'inconnu' ? 'Inconnu' : key ?? '');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SecureFlow CRM';
  wb.created = new Date();

  /* ═══════════════ Feuille 1 : Leads ═══════════════ */
  const ws = wb.addWorksheet('Leads', { views: [{ state: 'frozen', ySplit: 4, xSplit: 1 }] });

  type Col = { header: string; width: number; get: (l: SolutionExpress) => string | number | Date | null; fmt?: string; align?: 'left' | 'center' | 'right'; wrap?: boolean };
  const cols: Col[] = [
    { header: 'Entreprise',        width: 30, get: l => l.entreprise },
    { header: 'Contact',           width: 24, get: l => [l.prenom, l.nom].filter(Boolean).join(' ') },
    { header: 'Email',             width: 30, get: l => l.email },
    { header: 'Téléphone',         width: 17, get: l => l.telephone },
    { header: 'Ville',             width: 17, get: l => l.ville },
    { header: 'Adresse',           width: 30, get: l => l.adresse, wrap: true },
    { header: 'Type client',       width: 11, get: l => (l.typeClient || '').toUpperCase(), align: 'center' },
    { header: 'Commerce',          width: 26, get: l => lbl(settings.typeCommerce, l.typeCommerce) },
    { header: 'Type de lead',      width: 22, get: l => lbl(settings.typeLead, l.leadType) },
    { header: 'Système actuel',    width: 34, get: l => lbl(settings.qualificationSysteme, l.qualificationSysteme), wrap: true },
    { header: 'Statut',            width: 14, get: l => STATUS_LABEL[l.status] || l.status, align: 'center' },
    { header: 'Urgence',           width: 10, get: l => (l.urgencyScore > 0 ? l.urgencyScore : null), align: 'center' },
    { header: 'Produits',          width: 26, get: l => (l.produits || []).join(', '), wrap: true },
    { header: 'Date de vente',     width: 15, get: l => toDate(l.dateVente), fmt: 'dd/mm/yyyy', align: 'center' },
    { header: 'Commission fixe',   width: 16, get: l => l.commissionFixe,  fmt: '#,##0.00 "TND"', align: 'right' },
    { header: 'Commission extra',  width: 16, get: l => l.commissionExtra, fmt: '#,##0.00 "TND"', align: 'right' },
    { header: 'Commission totale', width: 18, get: l => l.commissionTotale, fmt: '#,##0.00 "TND"', align: 'right' },
    { header: 'Payée',             width: 11, get: l => (l.commissionTotale > 0 ? (l.commissionPayee ? 'Payée' : 'En attente') : ''), align: 'center' },
    { header: 'Date paiement',     width: 15, get: l => toDate(l.datePaiementCommission), fmt: 'dd/mm/yyyy', align: 'center' },
    { header: 'Partagé avec',      width: 24, get: l => (l.partageAvec || []).join(', ') },
    { header: 'Appels de service', width: 46, get: l => (l.appelsService || []).map(a => `${a.paye ? '✔ Payé' : '✘ Pas payé'} : ${a.description || '—'}`).join('\n'), wrap: true },
    { header: 'Résumé',            width: 46, get: l => l.summary, wrap: true },
    { header: 'Notes',             width: 46, get: l => (l.notes || []).join('\n'), wrap: true },
    { header: 'Créé le',           width: 13, get: l => toDate(l.createdAt), fmt: 'dd/mm/yyyy', align: 'center' },
  ];
  const last = cols.length;
  ws.columns = cols.map(c => ({ width: c.width }));

  // Titre
  ws.mergeCells(1, 1, 1, last);
  const t = ws.getCell(1, 1);
  t.value = 'SecureFlow CRM — Export des leads';
  t.font = { name: 'Calibri', size: 22, bold: true, color: { argb: C.white } };
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  ws.getRow(1).height = 40;

  // Sous-titre
  ws.mergeCells(2, 1, 2, last);
  const s = ws.getCell(2, 1);
  const now = new Date();
  s.value = `Exporté le ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}   ·   ${leads.length} lead${leads.length > 1 ? 's' : ''}`;
  s.font = { name: 'Calibri', size: 12, color: { argb: 'FFB8C2DC' } };
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy2 } };
  ws.getRow(2).height = 24;

  // Séparateur vert
  ws.mergeCells(3, 1, 3, last);
  ws.getCell(3, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
  ws.getRow(3).height = 5;

  // En-têtes
  const hr = ws.getRow(4);
  cols.forEach((c, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.teal } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = borderAll;
  });
  hr.height = 30;

  // Lignes
  leads.forEach((l, idx) => {
    const row = ws.getRow(5 + idx);
    const zebra = idx % 2 === 1;
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      const v = c.get(l);
      cell.value = v === '' ? null : v;
      cell.font = { name: 'Calibri', size: 11, color: { argb: C.text } };
      cell.alignment = { vertical: 'top', horizontal: c.align ?? 'left', wrapText: !!c.wrap };
      cell.border = borderAll;
      if (c.fmt) cell.numFmt = c.fmt;
      if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } };
    });

    // Statut en couleur
    const sc = ws.getCell(5 + idx, cols.findIndex(c => c.header === 'Statut') + 1);
    const hex = STATUS_COLOR[l.status] || '#6b7280';
    sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } };
    sc.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };

    // Commission payée / en attente
    const pc = ws.getCell(5 + idx, cols.findIndex(c => c.header === 'Payée') + 1);
    if (l.commissionTotale > 0) {
      pc.font = { name: 'Calibri', size: 11, bold: true, color: { argb: l.commissionPayee ? C.green : C.orange } };
    }
    // Total de la commission en gras vert
    const tc = ws.getCell(5 + idx, cols.findIndex(c => c.header === 'Commission totale') + 1);
    tc.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.green } };

    // Partagé : bleu
    const pa = ws.getCell(5 + idx, cols.findIndex(c => c.header === 'Partagé avec') + 1);
    if ((l.partageAvec || []).length > 0) pa.font = { name: 'Calibri', size: 11, bold: true, color: { argb: argb('#0284c7') } };

    // Appels de service : orange si impayé, vert sinon
    const ap = ws.getCell(5 + idx, cols.findIndex(c => c.header === 'Appels de service') + 1);
    const aps = l.appelsService || [];
    if (aps.length > 0) ap.font = { name: 'Calibri', size: 11, bold: true, color: { argb: aps.some(a => !a.paye) ? C.orange : C.green } };

    // Ligne annulée : texte atténué
    if (l.status === 'installation_annulee') {
      cols.forEach((c, i) => {
        if (['Statut', 'Commission totale', 'Payée', 'Partagé avec', 'Appels de service'].includes(c.header)) return;
        const cell = row.getCell(i + 1);
        cell.font = { name: 'Calibri', size: 11, color: { argb: C.muted }, italic: true };
      });
    }
    row.height = Math.max(20, Math.min(110, 18 * Math.max(1, (cols[20].get(l) as string).split('\n').length, (cols[22].get(l) as string).split('\n').length)));
  });

  // Filtres automatiques sur l'en-tête
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: last } };

  // Ligne de totaux
  if (leads.length > 0) {
    const totalRow = ws.getRow(5 + leads.length);
    const colIdx = (h: string) => cols.findIndex(c => c.header === h) + 1;
    const first = 5, lastRow = 4 + leads.length;
    totalRow.getCell(1).value = 'TOTAL';
    for (const h of ['Commission fixe', 'Commission extra', 'Commission totale']) {
      const ci = colIdx(h);
      const letter = ws.getColumn(ci).letter;
      totalRow.getCell(ci).value = { formula: `SUBTOTAL(109,${letter}${first}:${letter}${lastRow})` };
      totalRow.getCell(ci).numFmt = '#,##0.00 "TND"';
    }
    totalRow.eachCell({ includeEmpty: true }, (cell, n) => {
      if (n > last) return;
      cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: C.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
      cell.alignment = { vertical: 'middle', horizontal: n === 1 ? 'left' : 'right' };
    });
    totalRow.height = 26;
  }

  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  /* ═══════════════ Feuille 2 : Résumé ═══════════════ */
  const rs = wb.addWorksheet('Résumé', { views: [{ showGridLines: false }] });
  rs.columns = [{ width: 4 }, { width: 34 }, { width: 18 }, { width: 4 }];
  rs.mergeCells('B1:C1');
  const rt = rs.getCell('B1');
  rt.value = 'Résumé';
  rt.font = { name: 'Calibri', size: 22, bold: true, color: { argb: C.white } };
  rt.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  rt.alignment = { vertical: 'middle', indent: 1 };
  rs.getRow(1).height = 40;

  let r = 3;
  const section = (title: string) => {
    rs.mergeCells(r, 2, r, 3);
    const c = rs.getCell(r, 2);
    c.value = title;
    c.font = { name: 'Calibri', size: 12, bold: true, color: { argb: C.white } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.teal } };
    c.alignment = { vertical: 'middle', indent: 1 };
    rs.getRow(r).height = 24;
    r++;
  };
  const line = (label: string, value: number | string, opts: { color?: string; fmt?: string } = {}) => {
    const a = rs.getCell(r, 2), b = rs.getCell(r, 3);
    a.value = label; b.value = value;
    a.font = { name: 'Calibri', size: 11, color: { argb: C.text } };
    b.font = { name: 'Calibri', size: 11, bold: true, color: { argb: opts.color ?? C.text } };
    b.alignment = { horizontal: 'right' };
    if (opts.fmt) b.numFmt = opts.fmt;
    a.border = borderAll; b.border = borderAll;
    if (r % 2 === 0) { a.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } }; b.fill = a.fill; }
    r++;
  };

  section('Fiches (nombre de leads enregistrés)');
  line('Total des fiches', leads.length);
  (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).forEach(k => {
    line(STATUS_LABEL[k], leads.filter(l => l.status === k).length, { color: argb(STATUS_COLOR[k]) });
  });
  line('Fiches partagées', leads.filter(l => (l.partageAvec || []).length > 0).length, { color: argb('#0284c7') });
  r++;

  const actives = leads.filter(l => l.status !== 'installation_annulee');
  const sum = (a: SolutionExpress[]) => a.reduce((n, l) => n + (l.commissionTotale || 0), 0);
  section('Commissions (hors leads annulés)');
  line('Total gagné',  sum(actives), { color: C.green, fmt: '#,##0.00 "TND"' });
  line('Payées',       sum(actives.filter(l => l.commissionPayee)), { color: argb('#3b6cf8'), fmt: '#,##0.00 "TND"' });
  line('En attente',   sum(actives.filter(l => !l.commissionPayee)), { color: C.orange, fmt: '#,##0.00 "TND"' });
  r++;

  const allAps = leads.flatMap(l => l.appelsService || []);
  section('Appels de service');
  line('Total', allAps.length);
  line('Payés', allAps.filter(a => a.paye).length, { color: C.green });
  line('Pas payés', allAps.filter(a => !a.paye).length, { color: C.orange });

  /* ═══════════════ Téléchargement ═══════════════ */
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-secureflow-${now.toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
