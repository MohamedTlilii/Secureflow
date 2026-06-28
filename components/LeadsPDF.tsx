import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { SolutionExpress } from '@/types';
import { STATUS_LABEL } from '@/types';

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#222',
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 36,
    backgroundColor: '#ffffff',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: '#3b6cf8',
    paddingBottom: 8,
    marginBottom: 18,
  },
  appName:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#3b6cf8' },
  leadNum:  { fontSize: 8, color: '#999' },
  fullName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111', marginBottom: 3 },
  company:  { fontSize: 11, color: '#3b6cf8', marginBottom: 12 },
  section: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3,
    marginTop: 14,
    marginBottom: 7,
  },
  row:   { flexDirection: 'row', marginBottom: 5 },
  label: { width: 140, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#555' },
  value: { flex: 1, fontSize: 10, color: '#111' },
  note: {
    fontSize: 9,
    color: '#444',
    marginBottom: 4,
    padding: 6,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 2,
    borderLeftColor: '#3b6cf8',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#bbb',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 5,
  },
});

function fmt(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-CA');
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  const v = value === 0 ? '0' : value;
  if (!v && v !== 0) return null;
  return (
    <View style={S.row}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{String(v)}</Text>
    </View>
  );
}

export function buildLeadsDoc(leads: SolutionExpress[], label: string) {
  const generated = new Date().toLocaleDateString('fr-CA');
  return (
    <Document title={`Leads — ${label}`} author="SecureFlow CRM">
      {leads.map((l, idx) => (
        <Page key={l.id} size="A4" style={S.page}>

          {/* ── Header ── */}
          <View style={S.pageHeader}>
            <Text style={S.appName}>SecureFlow CRM</Text>
            <Text style={S.leadNum}>{`Fiche ${idx + 1} / ${leads.length}  ·  ${label}  ·  ${generated}`}</Text>
          </View>

          {/* ── Identité ── */}
          <Text style={S.fullName}>{[l.prenom, l.nom].filter(Boolean).join(' ') || '—'}</Text>
          {l.entreprise ? <Text style={S.company}>{l.entreprise}</Text> : null}

          {/* ── Contact ── */}
          <Text style={S.section}>Contact</Text>
          <Row label="Email"            value={l.email} />
          <Row label="Téléphone"        value={l.telephone} />
          <Row label="Sexe"             value={l.sexe && l.sexe !== 'inconnu' ? l.sexe : null} />
          <Row label="Adresse"          value={l.adresse} />
          <Row label="Ancienne adresse" value={l.ancienneAdresse} />
          <Row label="Ville"            value={l.ville} />

          {/* ── Qualification ── */}
          <Text style={S.section}>Qualification</Text>
          <Row label="Type client"         value={(l.typeClient || '').toUpperCase()} />
          <Row label="Type commerce"       value={l.typeCommerce} />
          <Row label="Type lead"           value={l.leadType} />
          <Row label="Qualification syst." value={l.qualificationSysteme} />
          <Row label="Statut"              value={STATUS_LABEL[l.status] || l.status} />
          <Row label="Score urgence"       value={l.urgencyScore > 0 ? `${l.urgencyScore} / 10` : null} />
          {l.produits?.length > 0 && (
            <Row label="Produits" value={l.produits.join(', ')} />
          )}
          {l.motifAnnulation ? <Row label="Motif annulation" value={l.motifAnnulation} /> : null}

          {/* ── Fournisseurs ── */}
          {l.fournisseurs && Object.values(l.fournisseurs).some(v => v?.actuel || v?.propose) ? (
            <>
              <Text style={S.section}>Fournisseurs</Text>
              {Object.entries(l.fournisseurs).map(([key, val]) =>
                val && (val.actuel || val.propose) ? (
                  <View key={key}>
                    {val.actuel  && <Row label={`${key.charAt(0).toUpperCase() + key.slice(1)} actuel`}  value={val.actuel} />}
                    {val.propose && <Row label={`${key.charAt(0).toUpperCase() + key.slice(1)} proposé`} value={val.propose} />}
                  </View>
                ) : null
              )}
            </>
          ) : null}

          {/* ── Source ── */}
          {(l.sourceText || l.sourceUrl) ? (
            <>
              <Text style={S.section}>Source</Text>
              <Row label="Source"     value={l.sourceText} />
              <Row label="URL source" value={l.sourceUrl} />
            </>
          ) : null}

          {/* ── Résumé ── */}
          {l.summary ? (
            <>
              <Text style={S.section}>Résumé</Text>
              <Text style={{ ...S.note, borderLeftColor: '#12b76a' }}>{l.summary}</Text>
            </>
          ) : null}

          {/* ── Financier ── */}
          <Text style={S.section}>Financier</Text>
          <Row label="Date de vente"     value={fmt(l.dateVente)} />
          <Row label="Montant contrat"   value={l.montantContrat   > 0 ? `${l.montantContrat} TND`   : null} />
          <Row label="Commission fixe"   value={l.commissionFixe   > 0 ? `${l.commissionFixe} TND`   : null} />
          <Row label="Commission extra"  value={l.commissionExtra  > 0 ? `${l.commissionExtra} TND`  : null} />
          <Row label="Commission totale" value={l.commissionTotale > 0 ? `${l.commissionTotale} TND` : null} />
          <Row label="Statut paiement"   value={l.commissionTotale > 0 ? (l.commissionPayee ? 'Payée' : 'En attente') : null} />
          <Row label="Date paiement"     value={fmt(l.datePaiementCommission)} />

          {/* ── Infos système ── */}
          <Text style={S.section}>Informations système</Text>
          <Row label="ID"           value={l.id} />
          <Row label="Créé le"      value={fmt(l.createdAt)} />
          <Row label="Modifié le"   value={fmt(l.updatedAt)} />

          {/* ── Notes ── */}
          {l.notes?.length > 0 && (
            <>
              <Text style={S.section}>{`Notes (${l.notes.length})`}</Text>
              {l.notes.map((n, ni) => (
                <Text key={ni} style={S.note}>{n}</Text>
              ))}
            </>
          )}

          {/* ── Footer ── */}
          <View style={S.footer} fixed>
            <Text>SecureFlow CRM — Solution Express Québec</Text>
            <Text>{`${idx + 1} / ${leads.length}`}</Text>
          </View>

        </Page>
      ))}
    </Document>
  );
}
