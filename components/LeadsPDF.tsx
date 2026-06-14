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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: '#3b6cf8',
    paddingBottom: 8,
    marginBottom: 18,
  },
  appName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#3b6cf8' },
  leadNum: { fontSize: 8, color: '#999' },
  fullName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111', marginBottom: 3 },
  company: { fontSize: 11, color: '#3b6cf8', marginBottom: 14 },
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
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { width: 130, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#555' },
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
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-CA');
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={S.row}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value}</Text>
    </View>
  );
}

export function buildLeadsDoc(leads: SolutionExpress[], label: string) {
  const generated = new Date().toLocaleDateString('fr-CA');
  return (
    <Document title={`Leads — ${label}`} author="SecureFlow CRM">
      {leads.map((l, idx) => (
        <Page key={l.id} size="A4" style={S.page}>

          {/* Header */}
          <View style={S.header}>
            <Text style={S.appName}>SecureFlow CRM</Text>
            <Text style={S.leadNum}>
              {`Fiche ${idx + 1} / ${leads.length}  ·  ${label}  ·  ${generated}`}
            </Text>
          </View>

          {/* Identité */}
          <Text style={S.fullName}>
            {[l.prenom, l.nom].filter(Boolean).join(' ') || '—'}
          </Text>
          {l.entreprise ? <Text style={S.company}>{l.entreprise}</Text> : null}

          {/* Contact */}
          <Text style={S.section}>Contact</Text>
          <Row label="Email"     value={l.email} />
          <Row label="Téléphone" value={l.telephone} />
          <Row label="Adresse"   value={[l.adresse, l.ville].filter(Boolean).join(', ') || null} />

          {/* Qualification */}
          <Text style={S.section}>Qualification</Text>
          <Row label="Type client" value={(l.typeClient || '').toUpperCase()} />
          <Row label="Statut"      value={STATUS_LABEL[l.status] || l.status} />
          {l.produits?.length > 0 && (
            <Row label="Produits" value={l.produits.join(', ')} />
          )}
          {l.motifAnnulation ? (
            <Row label="Motif annulation" value={l.motifAnnulation} />
          ) : null}

          {/* Financier */}
          <Text style={S.section}>Financier</Text>
          <Row label="Date de vente" value={fmt(l.dateVente)} />
          {l.montantContrat > 0 && (
            <Row label="Montant contrat" value={`${l.montantContrat} TND`} />
          )}
          {l.commissionTotale > 0 && (
            <Row
              label="Commission"
              value={`${l.commissionTotale} TND · ${l.commissionPayee ? 'Payée' : 'En attente'}`}
            />
          )}
          {l.datePaiementCommission ? (
            <Row label="Date paiement" value={fmt(l.datePaiementCommission)} />
          ) : null}

          {/* Notes */}
          {l.notes?.length > 0 && (
            <>
              <Text style={S.section}>{`Notes (${l.notes.length})`}</Text>
              {l.notes.slice(0, 8).map((n, ni) => (
                <Text key={ni} style={S.note}>{n}</Text>
              ))}
            </>
          )}

          {/* Footer */}
          <View style={S.footer} fixed>
            <Text>SecureFlow CRM — Solution Express Québec</Text>
            <Text>{`${idx + 1} / ${leads.length}`}</Text>
          </View>

        </Page>
      ))}
    </Document>
  );
}
