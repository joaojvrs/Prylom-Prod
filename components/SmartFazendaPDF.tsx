import React from 'react';
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import type {
  ReportData,
  ScoreCriterio,
} from '../services/smartFazendaReport';

// ─── Font registration ────────────────────────────────────────────────────────
// TTF files are served from public/fonts/ via Vite (same-origin, no CORS)

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf',   fontWeight: 400 },
    { src: '/fonts/Montserrat-SemiBold.ttf',  fontWeight: 600 },
    { src: '/fonts/Montserrat-Bold.ttf',      fontWeight: 700 },
    { src: '/fonts/Montserrat-ExtraBold.ttf', fontWeight: 800 },
  ],
});

// Suppress hyphenation (keeps words intact in PDF)
Font.registerHyphenationCallback(word => [word]);

// ─── Brand ────────────────────────────────────────────────────────────────────

const C = {
  dark:       '#2c5363',
  darkDeep:   '#1e3a47',
  darkMid:    '#3a6a7d',
  gold:       '#bba219',
  goldLight:  '#d4bc40',
  goldDim:    '#8a7612',
  white:      '#ffffff',
  offWhite:   '#f8fafc',
  pageBg:     '#ffffff',
  panelBg:    '#f0f5f7',
  border:     '#dce8ed',
  borderMid:  '#c4d8e0',
  textDark:   '#1a2b33',
  textMid:    '#3d5a66',
  textMuted:  '#6b8a96',
  textLight:  '#9ab4be',
  okGreen:    '#15803d',
  okBg:       '#f0fdf4',
  okBorder:   '#22c55e',
  errRed:     '#b91c1c',
  errBg:      '#fff1f1',
  errBorder:  '#ef4444',
  warnAmber:  '#b45309',
  warnBg:     '#fffbeb',
  warnBorder: '#f59e0b',
  infoBlue:   '#0369a1',
  infoBg:     '#f0f9ff',
  infoBorder: '#38bdf8',
} as const;

const PAD = 40;

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({

  // ── Pages ──
  page: {
    fontFamily: 'Montserrat',
    fontWeight: 400,
    backgroundColor: C.pageBg,
    paddingTop: 34,
    paddingBottom: 56,
    paddingHorizontal: PAD,
  },
  coverPage: {
    fontFamily: 'Montserrat',
    fontWeight: 400,
    backgroundColor: C.dark,
    padding: 0,
  },

  // ── Cover ──
  coverTop: {
    paddingTop: 44,
    paddingHorizontal: PAD,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: C.darkMid,
  },
  coverLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  coverDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.gold },
  coverBrand: { fontSize: 18, fontWeight: 800, color: C.white, letterSpacing: 4 },
  coverSubBrand: { fontSize: 7.5, fontWeight: 600, color: C.goldLight, letterSpacing: 2.5, marginTop: 1 },
  coverReportNum: { fontSize: 7, fontWeight: 400, color: C.textLight, marginTop: 2 },

  coverHero: {
    paddingHorizontal: PAD,
    paddingTop: 36,
    paddingBottom: 32,
    flex: 1,
  },
  coverLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: C.gold,
    letterSpacing: 3,
    marginBottom: 10,
  },
  coverPropertyName: {
    fontSize: 22,
    fontWeight: 800,
    color: C.white,
    lineHeight: 1.25,
    marginBottom: 6,
  },
  coverMunic: {
    fontSize: 11,
    fontWeight: 600,
    color: C.goldLight,
    marginBottom: 28,
  },

  coverScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 28,
  },
  coverScoreBox: {
    width: 90,
    height: 90,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverScoreNum: { fontSize: 34, fontWeight: 800, color: C.dark, lineHeight: 1 },
  coverScoreOf:  { fontSize: 7.5, fontWeight: 700, color: C.darkDeep, marginTop: 2 },
  coverScoreRight: { flex: 1 },
  coverScoreClass: { fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 5 },
  coverScoreDesc: { fontSize: 7.5, fontWeight: 400, color: C.textLight, lineHeight: 1.5 },

  coverStatsRow: { flexDirection: 'row', gap: 9, marginTop: 4 },
  coverStatBox: {
    flex: 1,
    backgroundColor: C.darkMid,
    borderRadius: 4,
    padding: 10,
  },
  coverStatLbl: { fontSize: 5.5, fontWeight: 700, color: C.goldLight, letterSpacing: 0.8, marginBottom: 4 },
  coverStatVal: { fontSize: 10, fontWeight: 700, color: C.white },

  coverBottom: {
    paddingHorizontal: PAD,
    paddingBottom: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: C.darkMid,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  coverBottomLbl: { fontSize: 5.5, fontWeight: 700, color: C.textLight, letterSpacing: 1, marginBottom: 2 },
  coverBottomVal: { fontSize: 7.5, fontWeight: 600, color: C.textMuted },
  coverDisclaimer: {
    fontSize: 5.5,
    fontWeight: 400,
    color: C.textLight,
    textAlign: 'right',
    maxWidth: 200,
    lineHeight: 1.5,
  },

  // ── Header (fixed) ──
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
    marginBottom: 18,
  },
  hdrLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hdrDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  hdrBrand:{ fontSize: 11, fontWeight: 800, color: C.dark, letterSpacing: 2.5 },
  hdrSub:  { fontSize: 5.5, fontWeight: 600, color: C.gold, letterSpacing: 1.5, marginTop: 1 },
  hdrRight:{ alignItems: 'flex-end' },
  hdrNum:  { fontSize: 7, fontWeight: 700, color: C.dark },
  hdrMeta: { fontSize: 5.5, fontWeight: 400, color: C.textMuted, marginTop: 1 },
  hdrBadge:{
    fontSize: 5,
    fontWeight: 600,
    color: C.textLight,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    marginTop: 2,
  },

  // ── Footer (fixed) ──
  ftr: {
    position: 'absolute',
    bottom: 18,
    left: PAD,
    right: PAD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 5,
  },
  ftrLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ftrDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: C.gold },
  ftrTxt:  { fontSize: 5.5, fontWeight: 400, color: C.textLight },
  ftrBold: { fontSize: 5.5, fontWeight: 700, color: C.textMuted },

  // ── Watermark ──
  watermark: {
    position: 'absolute',
    bottom: 230,
    right: -65,
    fontSize: 5,
    fontWeight: 400,
    color: '#e4ecef',
    transform: 'rotate(90deg)',
    width: 260,
    textAlign: 'center',
  },

  // ── Section headers ──
  secBlock: {
    backgroundColor: C.panelBg,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  secNum: { fontSize: 7, fontWeight: 800, color: C.gold, letterSpacing: 0.5, width: 18 },
  secTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: C.dark,
    letterSpacing: 1,
    flex: 1,
  },
  secSub: {
    fontSize: 7.5,
    fontWeight: 600,
    color: C.textMid,
    marginBottom: 7,
    marginTop: 8,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },

  // ── Cards ──
  card: {
    backgroundColor: C.panelBg,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 11,
    marginBottom: 10,
  },

  // ── Data rows ──
  dRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  dRowLast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3.5,
  },
  dLbl:     { fontSize: 6.5, fontWeight: 600, color: C.textMuted, letterSpacing: 0.3, width: 130, flexShrink: 0, marginTop: 0.5 },
  dVal:     { fontSize: 8, fontWeight: 400, color: C.textDark, flex: 1 },
  dValBold: { fontSize: 8, fontWeight: 700, color: C.dark, flex: 1 },
  dValGold: { fontSize: 8, fontWeight: 700, color: C.gold, flex: 1 },

  // ── Score box ──
  scoreWrap: {
    backgroundColor: C.dark,
    borderRadius: 5,
    padding: 16,
    marginBottom: 12,
  },
  scoreTopRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  scoreLeft:   { alignItems: 'center', width: 100 },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  scoreNum:     { fontSize: 28, fontWeight: 800, color: C.white, lineHeight: 1 },
  scoreOf:      { fontSize: 6.5, fontWeight: 400, color: C.textLight, marginTop: 2 },
  scoreClassBadge: { borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  scoreClassTxt:   { fontSize: 7, fontWeight: 700, color: C.dark },
  scoreRight:      { flex: 1 },
  scoreRightLbl:   { fontSize: 6.5, fontWeight: 700, color: C.gold, letterSpacing: 1, marginBottom: 8 },
  critRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 },
  critName:     { fontSize: 6.5, fontWeight: 400, color: '#b8cdd4', width: 130, flexShrink: 0 },
  critBarTrack: { flex: 1, height: 5, backgroundColor: '#1a3d4d', borderRadius: 2, overflow: 'hidden' },
  critBarFill:  { height: 5, borderRadius: 2 },
  critPts:      { fontSize: 6.5, fontWeight: 700, color: '#b8cdd4', width: 50, textAlign: 'right' },

  scoreTotalBar: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreTotalLbl:   { fontSize: 6, fontWeight: 400, color: C.textLight, width: 80 },
  scoreTotalTrack: { flex: 1, height: 8, backgroundColor: '#1a3d4d', borderRadius: 3, overflow: 'hidden' },
  scoreTotalFill:  { height: 8, borderRadius: 3 },
  scoreTotalPct:   { fontSize: 7, fontWeight: 700, color: C.gold, width: 35, textAlign: 'right' },
  scoreObs: {
    fontSize: 5.5,
    fontWeight: 400,
    color: C.textLight,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#1a3d4d',
    lineHeight: 1.5,
    textAlign: 'center',
  },

  // ── Tables ──
  tbl: { borderWidth: 0.5, borderColor: C.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  tblHdr: { flexDirection: 'row', backgroundColor: C.dark, paddingVertical: 5.5, paddingHorizontal: 9 },
  tblHdrCell: { fontSize: 6.5, fontWeight: 700, color: C.white, letterSpacing: 0.3 },
  tblRow:    { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 9, borderTopWidth: 0.5, borderTopColor: C.border },
  tblRowAlt: { backgroundColor: C.offWhite },
  tblCell:     { fontSize: 7.5, fontWeight: 400, color: C.textDark },
  tblCellBold: { fontSize: 7.5, fontWeight: 700, color: C.dark },
  tblCellMuted:{ fontSize: 7,   fontWeight: 400, color: C.textMuted },
  tblCellGold: { fontSize: 7.5, fontWeight: 700, color: C.goldDim },

  // ── Alert boxes ──
  alert: { borderRadius: 3, padding: 9, marginBottom: 8, flexDirection: 'row', gap: 8, borderLeftWidth: 3 },
  alertOk:   { backgroundColor: C.okBg,   borderLeftColor: C.okBorder },
  alertErr:  { backgroundColor: C.errBg,  borderLeftColor: C.errBorder },
  alertWarn: { backgroundColor: C.warnBg, borderLeftColor: C.warnBorder },
  alertInfo: { backgroundColor: C.infoBg, borderLeftColor: C.infoBorder },
  alertMark: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 0.5 },
  alertMarkOk:   { backgroundColor: C.okBorder },
  alertMarkErr:  { backgroundColor: C.errBorder },
  alertMarkWarn: { backgroundColor: C.warnBorder },
  alertMarkInfo: { backgroundColor: C.infoBorder },
  alertMarkTxt:  { fontSize: 8, fontWeight: 700, color: C.white },
  alertBody:  { flex: 1 },
  alertTitle: { fontSize: 7.5, fontWeight: 700, color: C.textDark, marginBottom: 2 },
  alertText:  { fontSize: 7, fontWeight: 400, color: C.textDark, lineHeight: 1.4 },

  // ── Embargo card ──
  embCard: {
    borderWidth: 0.5,
    borderColor: '#fca5a5',
    borderRadius: 3,
    padding: 10,
    marginBottom: 7,
    backgroundColor: '#fff5f5',
    borderLeftWidth: 3,
    borderLeftColor: C.errBorder,
  },
  embTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  embNum:    { fontSize: 7, fontWeight: 700, color: C.errRed },
  embStatus: {
    fontSize: 6, fontWeight: 700, color: C.errRed,
    borderWidth: 0.5, borderColor: '#fca5a5', borderRadius: 2,
    paddingHorizontal: 4, paddingVertical: 1.5,
  },
  embMotivo:  { fontSize: 7.5, fontWeight: 400, color: '#7f1d1d', marginBottom: 5, lineHeight: 1.4 },
  embMetaRow: { flexDirection: 'row', gap: 16 },
  embMeta:    { fontSize: 6.5, fontWeight: 700, color: '#b91c1c' },

  // ── Nota técnica ──
  nota: {
    borderRadius: 3, padding: 8, marginTop: 3, marginBottom: 8,
    backgroundColor: '#f1f5f6', borderLeftWidth: 2, borderLeftColor: C.borderMid,
  },
  notaLbl: { fontSize: 5.5, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  notaTxt: { fontSize: 6.5, fontWeight: 400, color: C.textMuted, lineHeight: 1.5 },

  // ── Divider ──
  divider: { height: 0.5, backgroundColor: C.border, marginVertical: 12 },

  // ── Bar chart ──
  barRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4.5, gap: 6 },
  barLbl:   { fontSize: 7, fontWeight: 400, color: C.textDark, width: 95, textAlign: 'right' },
  barTrack: { flex: 1, height: 13, backgroundColor: C.panelBg, borderRadius: 2, overflow: 'hidden', borderWidth: 0.5, borderColor: C.border },
  barFill:  { height: 13, backgroundColor: C.dark, borderRadius: 2 },
  barVal:   { fontSize: 6.5, fontWeight: 400, color: C.textMuted, width: 72, marginLeft: 3 },

  // ── Climate table ──
  climHdr:      { flexDirection: 'row', backgroundColor: C.dark, paddingVertical: 5.5, paddingHorizontal: 9 },
  climHdrCell:  { fontSize: 6.5, fontWeight: 700, color: C.white, textAlign: 'center', flex: 1 },
  climRow:      { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 9, borderTopWidth: 0.5, borderTopColor: C.border },
  climCell:     { fontSize: 7.5, fontWeight: 400, color: C.textDark, textAlign: 'center', flex: 1 },
  climCellBold: { fontSize: 7.5, fontWeight: 700, color: C.dark, flex: 1, textAlign: 'center' },

  // ── Columns ──
  cols2: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  col2:  { flex: 1 },
  cols3: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  col3:  { flex: 1 },

  // ── Stat boxes ──
  statBox: {
    backgroundColor: C.panelBg, borderRadius: 4,
    borderWidth: 0.5, borderColor: C.border, padding: 10, alignItems: 'center',
  },
  statLbl:  { fontSize: 6, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textAlign: 'center', marginBottom: 4 },
  statVal:  { fontSize: 12, fontWeight: 700, color: C.dark, textAlign: 'center' },
  statUnit: { fontSize: 6.5, fontWeight: 400, color: C.textMuted, textAlign: 'center', marginTop: 1 },

  // ── Final page ──
  finalTxt: { fontSize: 8, fontWeight: 400, color: C.textDark, lineHeight: 1.7, marginBottom: 8, textAlign: 'justify' },
  refItem:  { flexDirection: 'row', gap: 5, marginBottom: 4, alignItems: 'flex-start' },
  refDot:   { fontSize: 8, fontWeight: 700, color: C.gold, flexShrink: 0 },
  refLbl:   { fontSize: 7.5, fontWeight: 700, color: C.dark },
  refTxt:   { fontSize: 7.5, fontWeight: 400, color: C.textDark, flex: 1, lineHeight: 1.4 },

  // ── Score detail row ──
  scoreDetailRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 9,
    borderTopWidth: 0.5, borderTopColor: C.border, alignItems: 'flex-start',
  },
});

// ─── Color helpers ────────────────────────────────────────────────────────────

function criterioColor(pontos: number, max: number): string {
  const pct = pontos / max;
  if (pct >= 0.85) return C.okBorder;
  if (pct >= 0.55) return '#0d9488';
  if (pct >= 0.35) return C.warnBorder;
  return C.errBorder;
}

function scoreColor(total: number): string {
  if (total >= 800) return C.okBorder;
  if (total >= 650) return '#0d9488';
  if (total >= 500) return C.warnBorder;
  return C.errBorder;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PageHeader: React.FC<{ data: ReportData }> = ({ data }) => (
  <View style={s.hdr} fixed>
    <View style={s.hdrLeft}>
      <View style={s.hdrDot} />
      <View>
        <Text style={s.hdrBrand}>PRYLOM</Text>
        <Text style={s.hdrSub}>SMART FAZENDAS</Text>
      </View>
    </View>
    <View style={s.hdrRight}>
      <Text style={s.hdrNum}>Relatório nº {data.numeroPDF}</Text>
      <Text style={s.hdrMeta}>{data.usuarioEmail}</Text>
      <Text style={s.hdrBadge}>CONFIDENCIAL · {data.dataEmissao}</Text>
    </View>
  </View>
);

const PageFooter: React.FC<{ data: ReportData }> = ({ data }) => (
  <View style={s.ftr} fixed>
    <View style={s.ftrLeft}>
      <View style={s.ftrDot} />
      <Text style={s.ftrTxt}>Prylom Smart Fazendas · Rel. nº {data.numeroPDF}</Text>
    </View>
    <Text
      style={s.ftrBold}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  </View>
);

const Watermark: React.FC<{ data: ReportData }> = ({ data }) => (
  <Text style={s.watermark} fixed>
    {`Usuário: ${data.usuarioEmail} · ${data.dataEmissao} · Rel. ${data.numeroPDF} · CONFIDENCIAL`}
  </Text>
);

const SectionTitle: React.FC<{ num: string; children: string }> = ({ num, children }) => (
  <View style={s.secBlock}>
    <Text style={s.secNum}>{num}</Text>
    <Text style={s.secTitle}>{children}</Text>
  </View>
);

const SecSub: React.FC<{ children: string }> = ({ children }) => (
  <Text style={s.secSub}>{children}</Text>
);

const DataRow: React.FC<{ label: string; value: string; bold?: boolean; gold?: boolean; last?: boolean }> = (
  { label, value, bold, gold, last },
) => (
  <View style={last ? s.dRowLast : s.dRow}>
    <Text style={s.dLbl}>{label}</Text>
    <Text style={gold ? s.dValGold : bold ? s.dValBold : s.dVal}>{value}</Text>
  </View>
);

const AlertBox: React.FC<{
  type: 'ok' | 'err' | 'warn' | 'info';
  title: string;
  text?: string;
}> = ({ type, title, text }) => {
  const styles = { ok: s.alertOk, err: s.alertErr, warn: s.alertWarn, info: s.alertInfo };
  const marks  = { ok: s.alertMarkOk, err: s.alertMarkErr, warn: s.alertMarkWarn, info: s.alertMarkInfo };
  const icons  = { ok: '✓', err: '!', warn: '!', info: 'i' };
  return (
    <View style={[s.alert, styles[type]]}>
      <View style={[s.alertMark, marks[type]]}>
        <Text style={s.alertMarkTxt}>{icons[type]}</Text>
      </View>
      <View style={s.alertBody}>
        <Text style={s.alertTitle}>{title}</Text>
        {text && <Text style={s.alertText}>{text}</Text>}
      </View>
    </View>
  );
};

const Nota: React.FC<{ children: string }> = ({ children }) => (
  <View style={s.nota}>
    <Text style={s.notaLbl}>NOTA TÉCNICA</Text>
    <Text style={s.notaTxt}>{children}</Text>
  </View>
);

const Divider = () => <View style={s.divider} />;

const StatBox: React.FC<{ label: string; value: string; unit?: string }> = ({ label, value, unit }) => (
  <View style={s.statBox}>
    <Text style={s.statLbl}>{label}</Text>
    <Text style={s.statVal}>{value}</Text>
    {unit && <Text style={s.statUnit}>{unit}</Text>}
  </View>
);

const BarChart: React.FC<{
  items: { label: string; value: number; unit: string }[];
  maxValue: number;
  color?: string;
}> = ({ items, maxValue, color }) => (
  <View>
    {items.slice(0, 9).map((item, i) => (
      <View key={i} style={s.barRow}>
        <Text style={s.barLbl}>{item.label}</Text>
        <View style={s.barTrack}>
          <View
            style={[
              s.barFill,
              {
                width: maxValue > 0 ? `${Math.min((item.value / maxValue) * 100, 100)}%` : '2%',
                backgroundColor: color ?? C.dark,
              },
            ]}
          />
        </View>
        <Text style={s.barVal}>
          {item.value.toLocaleString('pt-BR')} {item.unit}
        </Text>
      </View>
    ))}
  </View>
);

// ─── PAGE 0 — Capa ────────────────────────────────────────────────────────────

const Pg0Cover: React.FC<{ data: ReportData }> = ({ data }) => {
  const { car, score, sigef } = data;
  const col = scoreColor(score.total);

  return (
    <Page size="A4" style={s.coverPage}>
      {/* Topo — logo */}
      <View style={s.coverTop}>
        <View style={s.coverLogoRow}>
          <View style={s.coverDot} />
          <View>
            <Text style={s.coverBrand}>PRYLOM</Text>
            <Text style={s.coverSubBrand}>SMART FAZENDAS</Text>
          </View>
        </View>
        <Text style={s.coverReportNum}>
          {`Relatório Técnico nº ${data.numeroPDF} · ${data.dataEmissao} às ${data.horaEmissao}`}
        </Text>
      </View>

      {/* Hero */}
      <View style={s.coverHero}>
        <Text style={s.coverLabel}>PROPRIEDADE ANALISADA</Text>
        <Text style={s.coverPropertyName}>{car.nomeImovel}</Text>
        <Text style={s.coverMunic}>{`${car.municipio} · ${car.estado}`}</Text>

        {/* Score */}
        <View style={s.coverScoreRow}>
          <View style={[s.coverScoreBox, { backgroundColor: col }]}>
            <Text style={s.coverScoreNum}>{score.total}</Text>
            <Text style={s.coverScoreOf}>/ 1.000 pts</Text>
          </View>
          <View style={s.coverScoreRight}>
            <Text style={s.coverScoreClass}>{score.classificacao}</Text>
            <Text style={s.coverScoreDesc}>
              Score calculado com 6 critérios objetivos: situação do CAR, embargos IBAMA, certificação SIGEF/INCRA, focos de incêndio, sobreposições socioambientais e passivo ambiental. Quanto maior, melhor a conformidade da propriedade.
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.coverStatsRow}>
          <View style={s.coverStatBox}>
            <Text style={s.coverStatLbl}>ÁREA TOTAL</Text>
            <Text style={s.coverStatVal}>
              {`${car.areaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} ha`}
            </Text>
          </View>
          <View style={s.coverStatBox}>
            <Text style={s.coverStatLbl}>SITUAÇÃO CAR</Text>
            <Text style={s.coverStatVal}>{car.situacao}</Text>
          </View>
          <View style={s.coverStatBox}>
            <Text style={s.coverStatLbl}>EMBARGOS IBAMA</Text>
            <Text style={[s.coverStatVal, { color: data.embargos.length > 0 ? '#ef9e9e' : '#7de8a8' }]}>
              {data.embargos.length === 0 ? 'Nenhum' : `${data.embargos.length} ativo(s)`}
            </Text>
          </View>
          {sigef && (
            <View style={s.coverStatBox}>
              <Text style={s.coverStatLbl}>SIGEF / INCRA</Text>
              <Text style={s.coverStatVal}>{sigef.situacaoCertificacao}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Rodapé */}
      <View style={s.coverBottom}>
        <View>
          <Text style={s.coverBottomLbl}>SOLICITANTE</Text>
          <Text style={s.coverBottomVal}>{data.usuarioEmail}</Text>
          <Text style={[s.coverBottomLbl, { marginTop: 6 }]}>CAR FEDERAL</Text>
          <Text style={[s.coverBottomVal, { fontSize: 6.5, maxWidth: 240 }]}>{car.codigo}</Text>
        </View>
        <Text style={s.coverDisclaimer}>
          Relatório gerado automaticamente pela plataforma Prylom com base em dados públicos e APIs governamentais. Nao substitui due diligence ambiental e juridica completa.
        </Text>
      </View>
    </Page>
  );
};

// ─── PAGE 1 — Dados Cadastrais ────────────────────────────────────────────────

const Pg1Dados: React.FC<{ data: ReportData }> = ({ data }) => {
  const { car, sigef, municipioData, reservaLegal, vegetacaoNativa, coordenadas } = data;
  const fmtHa  = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`;
  const fmtNum = (v: number | null) => v != null ? v.toLocaleString('pt-BR') : '—';

  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <Watermark data={data} />

      <SectionTitle num="01">Dados Cadastrais do Imóvel</SectionTitle>

      <View style={s.cols3}>
        <StatBox
          label="ÁREA TOTAL"
          value={car.areaTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          unit="hectares"
        />
        {reservaLegal?.area_rl_ha != null ? (
          <StatBox
            label="RESERVA LEGAL"
            value={reservaLegal.area_rl_ha.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            unit="hectares"
          />
        ) : (
          <StatBox label="MUNICÍPIO" value={car.municipio} unit={car.estado} />
        )}
        {reservaLegal?.area_app_ha != null ? (
          <StatBox
            label="APP TOTAL"
            value={reservaLegal.area_app_ha.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            unit="hectares"
          />
        ) : (
          <StatBox label="SITUAÇÃO CAR" value={car.situacao} />
        )}
      </View>

      <View style={s.card}>
        <DataRow label="Número CAR Federal" value={car.codigo} bold />
        <DataRow label="Município / UF" value={`${car.municipio} / ${car.estado}`} bold />
        <DataRow label="Área Total Declarada" value={fmtHa(car.areaTotal)} bold />
        <DataRow label="Situação CAR" value={car.situacao} />
        {reservaLegal?.area_rl_ha != null && (
          <DataRow label="Reserva Legal (SICAR)" value={fmtHa(reservaLegal.area_rl_ha)} />
        )}
        {reservaLegal?.area_app_ha != null && (
          <DataRow label="APP (SICAR)" value={fmtHa(reservaLegal.area_app_ha)} />
        )}
        {vegetacaoNativa?.area_ha != null && (
          <DataRow
            label="Vegetacao Nativa (SICAR)"
            value={`${fmtHa(vegetacaoNativa.area_ha)} · ${((vegetacaoNativa.area_ha / car.areaTotal) * 100).toFixed(1)}% da area`}
          />
        )}
        {coordenadas && (
          <DataRow
            label="Coordenadas (aprox.)"
            value={`Lat ${coordenadas.lat.toFixed(5)}, Lon ${coordenadas.lng.toFixed(5)}`}
          />
        )}
        <DataRow label="Fonte" value="SICAR — Sistema Nacional de Cadastro Ambiental Rural" last />
      </View>

      <SectionTitle num="02">Documentação Fundiária · SIGEF / INCRA</SectionTitle>
      {sigef ? (
        <View style={s.card}>
          <DataRow label="Número CCIR" value={sigef.numeroCCIR} bold />
          <DataRow label="Certificação SIGEF" value={sigef.situacaoCertificacao} bold />
          <DataRow label="Área Certificada" value={fmtHa(sigef.areaCertificada)} last />
        </View>
      ) : (
        <AlertBox
          type="info"
          title="Dados SIGEF/INCRA não disponíveis para este imóvel."
          text="A parcela não foi localizada no SIGEF. Isso pode indicar que o imóvel ainda não foi certificado junto ao INCRA."
        />
      )}

      {municipioData && (municipioData.populacao != null || municipioData.pib_mil_reais != null) && (
        <>
          <SectionTitle num="03">Contexto Socioeconômico do Município</SectionTitle>
          <View style={s.cols3}>
            {municipioData.populacao != null && (
              <StatBox
                label={`POPULAÇÃO (${municipioData.ano_populacao})`}
                value={fmtNum(municipioData.populacao)}
                unit="habitantes"
              />
            )}
            {municipioData.pib_mil_reais != null && (
              <StatBox
                label={`PIB (${municipioData.ano_pib})`}
                value={fmtNum(municipioData.pib_mil_reais)}
                unit="x R$ 1.000"
              />
            )}
            {municipioData.pib_per_capita != null && (
              <StatBox
                label="PIB PER CAPITA"
                value={fmtNum(municipioData.pib_per_capita)}
                unit="R$ / habitante"
              />
            )}
          </View>
          <Nota>
            {`Fonte: IBGE SIDRA. Populacao: tabela 6579 (${municipioData.ano_populacao}). PIB: tabela 5938 (${municipioData.ano_pib}). Dados municipais como contexto macroeconomico regional.`}
          </Nota>
        </>
      )}

      <PageFooter data={data} />
    </Page>
  );
};

// ─── PAGE 2 — Score ───────────────────────────────────────────────────────────

const Pg2Score: React.FC<{ data: ReportData }> = ({ data }) => {
  const { score } = data;
  const pct = score.total / 1000;
  const col = scoreColor(score.total);

  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <Watermark data={data} />

      <SectionTitle num="04">Score Prylom · Smart Fazendas</SectionTitle>

      <View style={s.scoreWrap}>
        <View style={s.scoreTopRow}>
          <View style={s.scoreLeft}>
            <View style={[s.scoreCircle, { borderColor: col }]}>
              <Text style={s.scoreNum}>{score.total}</Text>
              <Text style={s.scoreOf}>/ 1.000</Text>
            </View>
            <View style={[s.scoreClassBadge, { backgroundColor: col }]}>
              <Text style={s.scoreClassTxt}>{score.classificacao}</Text>
            </View>
          </View>

          <View style={s.scoreRight}>
            <Text style={s.scoreRightLbl}>DETALHAMENTO POR CRITÉRIO</Text>
            {score.criterios.map((c: ScoreCriterio, i: number) => {
              const cor = c.disponivel ? criterioColor(c.pontos, c.maxPontos) : '#3d6a7d';
              return (
                <View key={i} style={s.critRow}>
                  <Text style={s.critName}>{c.nome}</Text>
                  <View style={s.critBarTrack}>
                    <View style={[s.critBarFill, { width: `${(c.pontos / c.maxPontos) * 100}%`, backgroundColor: cor }]} />
                  </View>
                  <Text style={s.critPts}>{c.pontos}/{c.maxPontos}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.scoreTotalBar}>
          <Text style={s.scoreTotalLbl}>Pontuacao total</Text>
          <View style={s.scoreTotalTrack}>
            <View style={[s.scoreTotalFill, { width: `${pct * 100}%`, backgroundColor: col }]} />
          </View>
          <Text style={s.scoreTotalPct}>{Math.round(pct * 100)}%</Text>
        </View>

        <Text style={s.scoreObs}>
          {`Metodologia Prylom Smart Fazendas · 6 criterios · 1.000 pontos · Criterios sem dados em tempo real recebem 50% do maximo (neutro). Classificacoes: Excelente >=800 · Muito Bom >=650 · Bom >=500 · Regular >=350 · Atencao >=200 · Critico <200. Score de carater informativo — nao substitui due diligence ambiental e juridica.`}
        </Text>
      </View>

      <SectionTitle num="05">Critérios e Justificativas</SectionTitle>

      <View style={s.tbl}>
        <View style={s.tblHdr}>
          <Text style={[s.tblHdrCell, { flex: 2.2 }]}>Critério</Text>
          <Text style={[s.tblHdrCell, { flex: 0.7, textAlign: 'center' }]}>Pts</Text>
          <Text style={[s.tblHdrCell, { flex: 0.7, textAlign: 'center' }]}>Max</Text>
          <Text style={[s.tblHdrCell, { flex: 0.8, textAlign: 'center' }]}>Status</Text>
          <Text style={[s.tblHdrCell, { flex: 3.5 }]}>Descricao</Text>
        </View>
        {score.criterios.map((c: ScoreCriterio, i: number) => (
          <View key={i} style={[s.scoreDetailRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
            <Text style={[s.tblCellBold, { flex: 2.2 }]}>{c.nome}</Text>
            <Text style={[s.tblCell, { flex: 0.7, textAlign: 'center', fontWeight: 700, color: c.disponivel ? criterioColor(c.pontos, c.maxPontos) : C.textMuted }]}>
              {c.pontos}
            </Text>
            <Text style={[s.tblCellMuted, { flex: 0.7, textAlign: 'center' }]}>{c.maxPontos}</Text>
            <Text style={[s.tblCell, { flex: 0.8, textAlign: 'center', color: c.disponivel ? C.okBorder : C.warnBorder, fontSize: 6.5, fontWeight: 700 }]}>
              {c.disponivel ? 'Real' : 'Neutro'}
            </Text>
            <Text style={[s.tblCellMuted, { flex: 3.5, fontSize: 6.5, lineHeight: 1.35 }]}>
              {c.descricao}
            </Text>
          </View>
        ))}
      </View>

      <PageFooter data={data} />
    </Page>
  );
};

// ─── PAGE 3 — Produção Agrícola ───────────────────────────────────────────────

const Pg3Agro: React.FC<{ data: ReportData }> = ({ data }) => {
  const temp   = data.culturasTemporarias;
  const perma  = data.culturasPerma;
  const maxT   = Math.max(...temp.map(c => c.produtividade), 1);
  const maxP   = Math.max(...perma.map(c => c.produtividade), 1);
  const anoRef = temp[0]?.ano || perma[0]?.ano || '—';

  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <Watermark data={data} />

      <SectionTitle num="06">Producao Agricola Municipal · IBGE PAM</SectionTitle>

      <SecSub>{`Lavouras temporarias — produtividade em ${data.car.municipio}/${data.car.estado} (${anoRef}):`}</SecSub>
      {temp.length > 0 ? (
        <BarChart
          items={temp.map(c => ({ label: c.ativo, value: c.produtividade, unit: c.unidade_prod || 'kg/ha' }))}
          maxValue={maxT}
          color={C.dark}
        />
      ) : (
        <AlertBox type="info" title="Nenhuma lavoura temporaria registrada neste municipio." />
      )}
      <Nota>{`Produtividade em kg/ha·ano. Fonte: IBGE PAM — tabela 1612. Dados municipais, nao refletem necessariamente as culturas do imovel.`}</Nota>

      <Divider />

      <SecSub>{`Lavouras permanentes — produtividade em ${data.car.municipio}/${data.car.estado} (${anoRef}):`}</SecSub>
      {perma.length > 0 ? (
        <BarChart
          items={perma.map(c => ({ label: c.ativo, value: c.produtividade, unit: c.unidade_prod || 'kg/ha' }))}
          maxValue={maxP}
          color={C.darkMid}
        />
      ) : (
        <AlertBox type="info" title="Nenhuma lavoura permanente registrada neste municipio." />
      )}
      <Nota>{`Ciclo produtivo continuo (cafe, laranja, banana etc.). Fonte: IBGE PAM — tabela 1613.`}</Nota>

      <PageFooter data={data} />
    </Page>
  );
};

// ─── PAGE 4 — Rebanhos e Silvicultura ────────────────────────────────────────

const Pg4Pecuaria: React.FC<{ data: ReportData }> = ({ data }) => {
  const { silvicultura, rebanhos, car } = data;

  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <Watermark data={data} />

      <SectionTitle num="07">Rebanhos e Pecuaria · IBGE PPM</SectionTitle>

      <SecSub>{`Efetivo de rebanhos em ${car.municipio}/${car.estado}:`}</SecSub>
      <View style={s.tbl}>
        <View style={s.tblHdr}>
          <Text style={[s.tblHdrCell, { flex: 3 }]}>Tipo de Rebanho</Text>
          <Text style={[s.tblHdrCell, { flex: 2, textAlign: 'right' }]}>Efetivo (cabecas)</Text>
        </View>
        {rebanhos.length > 0 ? rebanhos.map((r, i) => (
          <View key={i} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
            <Text style={[s.tblCellBold, { flex: 3 }]}>{r.tipo}</Text>
            <Text style={[s.tblCell, { flex: 2, textAlign: 'right' }]}>
              {r.quantidade.toLocaleString('pt-BR')}
            </Text>
          </View>
        )) : (
          <View style={s.tblRow}>
            <Text style={[s.tblCellMuted, { flex: 1 }]}>Sem registro de rebanhos neste municipio.</Text>
          </View>
        )}
      </View>
      <Nota>{`Fonte: IBGE PPM — tabela 3939. Efetivo dos rebanhos por tipo, ultimo ano disponivel.`}</Nota>

      <Divider />

      <SectionTitle num="08">Silvicultura · IBGE PEVS</SectionTitle>

      <SecSub>{`Producao silvicultural em ${car.municipio}/${car.estado}:`}</SecSub>
      <View style={s.tbl}>
        <View style={s.tblHdr}>
          <Text style={[s.tblHdrCell, { flex: 4 }]}>Especie / Produto</Text>
          <Text style={[s.tblHdrCell, { flex: 2, textAlign: 'right' }]}>Producao</Text>
          <Text style={[s.tblHdrCell, { flex: 1, textAlign: 'right' }]}>Unid.</Text>
        </View>
        {silvicultura.length > 0 ? silvicultura.map((item, i) => (
          <View key={i} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
            <Text style={[s.tblCell, { flex: 4 }]}>{item.descricao}</Text>
            <Text style={[s.tblCellGold, { flex: 2, textAlign: 'right' }]}>
              {item.producao.toLocaleString('pt-BR')}
            </Text>
            <Text style={[s.tblCellMuted, { flex: 1, textAlign: 'right' }]}>{item.unidade}/ano</Text>
          </View>
        )) : (
          <View style={s.tblRow}>
            <Text style={[s.tblCellMuted, { flex: 1 }]}>Sem registro de silvicultura neste municipio.</Text>
          </View>
        )}
      </View>
      <Nota>{`Fonte: IBGE PEVS — tabela 289 (producao da extracao vegetal e da silvicultura).`}</Nota>

      <PageFooter data={data} />
    </Page>
  );
};

// ─── PAGE 5 — Embargos e Risco Ambiental ─────────────────────────────────────

const Pg5Ambiental: React.FC<{ data: ReportData }> = ({ data }) => {
  const { embargos, focosIncendio5Anos: focos, desmatamento, car } = data;
  const fmtHa = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`;
  const pctDesmat = desmatamento !== null && car.areaTotal > 0
    ? (desmatamento.total_ha / car.areaTotal) * 100
    : null;

  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <Watermark data={data} />

      <SectionTitle num="09">Embargos Ambientais · IBAMA</SectionTitle>

      {embargos.length === 0 ? (
        <AlertBox
          type="ok"
          title="Nenhum embargo ativo encontrado para este CAR."
          text="A consulta a base de dados de embargos do IBAMA nao retornou registros ativos vinculados ao codigo CAR informado."
        />
      ) : (
        <>
          <AlertBox
            type="err"
            title={`${embargos.length} embargo(s) ativo(s) identificado(s).`}
            text="Existencia de embargos IBAMA representa risco significativo. Recomenda-se analise aprofundada junto ao IBAMA antes de qualquer negociacao."
          />
          {embargos.map((e, i) => (
            <View key={i} style={s.embCard}>
              <View style={s.embTopRow}>
                <Text style={s.embNum}>Auto n° {e.numero}</Text>
                <Text style={s.embStatus}>{e.situacao}</Text>
              </View>
              <Text style={s.embMotivo}>{e.motivo}</Text>
              <View style={s.embMetaRow}>
                <Text style={s.embMeta}>Data: {e.data}</Text>
                <Text style={s.embMeta}>Area: {e.areaEmbargada.toLocaleString('pt-BR')} ha</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <AlertBox
        type="info"
        title="Autos de Infracao Ambiental (AIA) — consulta nao disponivel em tempo real."
        text="Verifique manualmente em ibama.gov.br (CTF/APP) e SINAFLOR."
      />
      <Nota>{`Fonte: IBAMA via Supabase Edge Function. Em caso de divergencia, consulte diretamente ibama.gov.br ou o portal CAR Federal.`}</Nota>

      <Divider />

      <SectionTitle num="10">Risco de Incendio · INPE Queimadas</SectionTitle>

      {focos === null ? (
        <AlertBox
          type="info"
          title="Dado nao disponivel para este municipio."
          text="Consulte manualmente em queimadas.dgi.inpe.br (BDQueimadas)."
        />
      ) : focos === 0 ? (
        <AlertBox type="ok" title="Nenhum foco de incendio detectado nos ultimos 5 anos neste municipio." />
      ) : (
        <AlertBox
          type={focos <= 3 ? 'warn' : 'err'}
          title={`${focos} foco(s) de calor/incendio detectado(s) no municipio nos ultimos 5 anos.`}
          text={
            focos <= 3
              ? 'Nivel baixo. Recomenda-se monitoramento continuo via INPE.'
              : 'Presenca significativa de focos. Recomenda-se analise do historico de queimadas e verificacao de passsivos ambientais.'
          }
        />
      )}

      {desmatamento === null ? (
        <AlertBox
          type="info"
          title="Desmatamento (SICAR) — dado nao disponivel para este imovel."
          text="Consulte terrabrasilis.dpi.inpe.br para analise PRODES/DETER sobre o poligono."
        />
      ) : desmatamento.total_ha === 0 ? (
        <AlertBox
          type="ok"
          title="Nenhum poligono de desmatamento detectado no imovel (fonte: SICAR)."
        />
      ) : (
        <View style={s.card}>
          <AlertBox
            type={pctDesmat !== null && pctDesmat < 5 ? 'warn' : 'err'}
            title={`${fmtHa(desmatamento.total_ha)} de desmatamento detectado (${desmatamento.qty} poligono(s)).`}
            text="Recomenda-se verificacao adicional no TerraBrasilis/PRODES e consulta ao IBAMA."
          />
          <DataRow label="Area desmatada" value={fmtHa(desmatamento.total_ha)} bold />
          <DataRow label="Poligonos detectados" value={String(desmatamento.qty)} />
          <DataRow
            label="% da area total"
            value={pctDesmat !== null ? `${pctDesmat.toFixed(1)}%` : '—'}
          />
          {desmatamento.ano_mais_recente && (
            <DataRow label="Deteccao mais recente" value={desmatamento.ano_mais_recente} last />
          )}
        </View>
      )}
      <Nota>{`Fonte: INPE BDQueimadas — focos de calor nos ultimos 5 anos no municipio. Desmatamento: SICAR /desmatamentos (poligonos detectados no imovel).`}</Nota>

      <PageFooter data={data} />
    </Page>
  );
};

// ─── PAGE 6 — Socioambiental ──────────────────────────────────────────────────

const Pg6Socio: React.FC<{ data: ReportData }> = ({ data }) => (
  <Page size="A4" style={s.page}>
    <PageHeader data={data} />
    <Watermark data={data} />

    <SectionTitle num="11">Sobreposicoes Socioambientais</SectionTitle>

    <AlertBox
      type="info"
      title="Dados nao disponiveis em tempo real — comportamento esperado."
      text="A verificacao de sobreposicao com areas protegidas requer analise espacial do poligono CAR contra bases governamentais (FUNAI, MMA, INCRA). Essas APIs nao oferecem consulta programatica em tempo real. Os campos abaixo indicam onde realizar a verificacao manual obrigatoria."
    />

    <View style={s.tbl}>
      <View style={s.tblHdr}>
        <Text style={[s.tblHdrCell, { flex: 3.5 }]}>Criterio</Text>
        <Text style={[s.tblHdrCell, { flex: 3.5 }]}>Portal de Verificacao Manual</Text>
      </View>
      {[
        { c: 'Unidades de Conservacao (ICMBio / MMA)', f: 'sistemas.mma.gov.br/cnuc' },
        { c: 'Terras Indigenas (FUNAI)', f: 'funai.gov.br / terrasindigenas.org.br' },
        { c: 'Territorios Quilombolas (INCRA)', f: 'incra.gov.br' },
        { c: 'Patrimonio Arqueologico (IPHAN)', f: 'iphan.gov.br' },
        { c: 'Assentamentos Federais (INCRA)', f: 'acervofundiario.incra.gov.br' },
        { c: 'Faixa de Fronteira (CDIF)', f: 'retaguarda.cdif.gov.br' },
      ].map((row, i) => (
        <View key={i} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
          <Text style={[s.tblCellBold, { flex: 3.5 }]}>{row.c}</Text>
          <Text style={[s.tblCellMuted, { flex: 3.5, fontSize: 7 }]}>{row.f}</Text>
        </View>
      ))}
    </View>

    <Nota>{`Verificacao manual obrigatoria: SICAR Consulta Publica (car.gov.br), MapBiomas Alert e GeoServer ICMBio. A ausencia de sobreposicao nao e confirmada automaticamente — requer analise espacial do poligono.`}</Nota>

    <Divider />

    <SectionTitle num="12">Dados do Meio Fisico</SectionTitle>

    <AlertBox
      type="info"
      title="Dados de solo, declividade e hidrografia nao consultados nesta versao."
      text="Requer processamento geoespacial do poligono do imovel. Funcionalidade em desenvolvimento."
    />

    <View style={{ marginTop: 6 }}>
      {[
        { l: 'Tipos de Solo Predominantes', f: 'geoinfo.cnps.embrapa.br', d: 'Mapa de Solos EMBRAPA/CNPS' },
        { l: 'Declividade e Relevo (SRTM 30m)', f: 'opentopography.org', d: 'Modelo Digital de Elevacao' },
        { l: 'Hidrografia Nacional', f: 'snirh.gov.br — ANA HidroWeb', d: 'Rede Hidrografica ANA' },
        { l: 'Aptidao Agricola', f: 'geoinfo.cnps.embrapa.br', d: 'Zoneamento Agricola EMBRAPA' },
      ].map((row, i) => (
        <View key={i} style={[s.dRow, { paddingVertical: 5, paddingHorizontal: 2 }]}>
          <Text style={[s.dLbl, { width: 160 }]}>{row.l}</Text>
          <Text style={[s.dVal, { flex: 1 }]}>{row.d}</Text>
          <Text style={[s.tblCellMuted, { width: 140, textAlign: 'right', fontSize: 6.5 }]}>{row.f}</Text>
        </View>
      ))}
    </View>

    <PageFooter data={data} />
  </Page>
);

// ─── PAGE 7 — Clima ───────────────────────────────────────────────────────────

const Pg7Clima: React.FC<{ data: ReportData }> = ({ data }) => {
  const { clima, car } = data;

  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <Watermark data={data} />

      <SectionTitle num="13">Climatologia Historica · NASA POWER</SectionTitle>

      {!clima ? (
        <AlertBox
          type="info"
          title="Dados climaticos nao disponiveis para este imovel."
          text="Nao foi possivel geocodificar o municipio para consultar a API NASA POWER."
        />
      ) : (
        <>
          <SecSub>
            {`Medias historicas (1981-2023) para ${car.municipio}/${car.estado} · Lat ${clima.lat.toFixed(3)}, Lon ${clima.lng.toFixed(3)}:`}
          </SecSub>

          <View style={[s.cols2, { marginBottom: 10 }]}>
            <StatBox
              label="PRECIPITACAO ANUAL"
              value={clima.anual.chuva_total.toLocaleString('pt-BR')}
              unit="mm/ano"
            />
            <StatBox
              label="TEMPERATURA MEDIA ANUAL"
              value={`${clima.anual.temp_media.toFixed(1)} °C`}
            />
          </View>

          <View style={s.tbl}>
            <View style={s.climHdr}>
              <Text style={s.climHdrCell}>Mes</Text>
              <Text style={s.climHdrCell}>Precipitacao (mm)</Text>
              <Text style={s.climHdrCell}>Temperatura (°C)</Text>
            </View>
            {clima.meses.map((m, i) => (
              <View key={i} style={[s.climRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
                <Text style={s.climCellBold}>{m.mes}</Text>
                <Text style={s.climCell}>
                  {m.chuva_mm.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                </Text>
                <Text style={s.climCell}>{m.temp_c.toFixed(1)}</Text>
              </View>
            ))}
          </View>

          <Nota>{`Fonte: NASA POWER (power.larc.nasa.gov) — climatologia historica (1981-2023), community AG. PRECTOTCORR = precipitacao corrigida (mm/dia x dias do mes); T2M = temperatura a 2m. Dados para o centroide do municipio.`}</Nota>
        </>
      )}

      <PageFooter data={data} />
    </Page>
  );
};

// ─── PAGE 8 — Considerações Finais ───────────────────────────────────────────

const Pg8Final: React.FC<{ data: ReportData }> = ({ data }) => (
  <Page size="A4" style={s.page}>
    <PageHeader data={data} />
    <Watermark data={data} />

    <SectionTitle num="14">Consideracoes Finais e Recomendacoes</SectionTitle>

    <Text style={s.finalTxt}>
      Este relatorio tecnico foi gerado automaticamente pela plataforma Prylom com base em dados publicos e APIs governamentais, visando oferecer uma analise abrangente e objetiva do imovel rural avaliado. A Prylom mantem as fontes de dados atualizadas e monitora continuamente a disponibilidade dos servicos.
    </Text>
    <Text style={s.finalTxt}>
      Em virtude da natureza dinamica do setor rural e das possiveis atualizacoes nos registros publicos, recomenda-se que o interessado utilize este relatorio como parte de um processo amplo de due diligence ambiental e juridica. A verificacao de todos os aspectos ambientais e legais e essencial para assegurar a seguranca de qualquer transacao imobiliaria rural.
    </Text>
    <Text style={s.finalTxt}>
      Criterios marcados como "Neutro" no score Prylom nao possuem dados em tempo real disponiveis e recebem 50% da pontuacao maxima por padrao metodologico. A obtencao desses dados requer analise geoespacial avancada do poligono do imovel ou consulta direta aos orgaos competentes.
    </Text>

    <Divider />

    <SectionTitle num="15">Referencias e Fontes de Dados</SectionTitle>

    {[
      { label: 'IBAMA', desc: 'Base de dados de embargos ambientais — ibama.gov.br' },
      { label: 'SICAR', desc: 'Sistema Nacional de Cadastro Ambiental Rural — car.gov.br' },
      { label: 'SIGEF / INCRA', desc: 'Sistema de Gestao Fundiaria — sigef.incra.gov.br' },
      { label: 'ICMBio', desc: 'Instituto Chico Mendes de Conservacao da Biodiversidade — icmbio.gov.br' },
      { label: 'INPE', desc: 'BDQueimadas / TerraBrasilis — queimadas.dgi.inpe.br' },
      { label: 'IBGE SIDRA', desc: 'PAM (tab. 1612/1613), PPM (tab. 3939), PEVS (tab. 289), PIB (tab. 5938), Pop. (tab. 6579)' },
      { label: 'NASA POWER', desc: 'Dados climatologicos historicos para agricultura — power.larc.nasa.gov' },
      { label: 'OpenStreetMap', desc: 'Geocodificacao de municipios via Nominatim — openstreetmap.org' },
    ].map((ref, i) => (
      <View key={i} style={[s.dRow, { paddingVertical: 4, paddingHorizontal: 2 }]}>
        <Text style={[s.dLbl, { width: 120, color: C.dark, fontWeight: 700 }]}>{ref.label}</Text>
        <Text style={[s.dVal, { flex: 1, fontSize: 7.5 }]}>{ref.desc}</Text>
      </View>
    ))}

    <Divider />

    <View style={s.card}>
      <DataRow label="Relatorio n°" value={data.numeroPDF} bold />
      <DataRow label="Data de Emissao" value={`${data.dataEmissao} as ${data.horaEmissao}`} />
      <DataRow label="Solicitante" value={data.usuarioEmail} />
      <DataRow label="Imovel (CAR)" value={data.car.codigo} last />
    </View>

    <PageFooter data={data} />
  </Page>
);

// ─── Document export ──────────────────────────────────────────────────────────

const SmartFazendaPDF: React.FC<{ data: ReportData }> = ({ data }) => (
  <Document
    title={`Prylom Smart Fazendas — Relatorio n° ${data.numeroPDF}`}
    author="Prylom"
    subject={`Analise Rural — ${data.car.municipio}/${data.car.estado}`}
    creator="Prylom Smart Fazendas"
    keywords="prylom, smart fazendas, CAR, ambiental, rural"
  >
    <Pg0Cover     data={data} />
    <Pg1Dados     data={data} />
    <Pg2Score     data={data} />
    <Pg3Agro      data={data} />
    <Pg4Pecuaria  data={data} />
    <Pg5Ambiental data={data} />
    <Pg6Socio     data={data} />
    <Pg7Clima     data={data} />
    <Pg8Final     data={data} />
  </Document>
);

export default SmartFazendaPDF;
