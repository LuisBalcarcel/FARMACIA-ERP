export const CATEGORIAS_GASTO = [
  'RENTAS',
  'LUZ',
  'REGENCIA',
  'SEGUROS',
  'REPARACION_VEHICULOS',
  'CUOTAS_IGSS',
  'BASURA',
  'MULTAS',
  'REPARACION_FARMACIAS',
  'PAGOS_TERCEROS_ALBANIL',
  'EQUIPO_COMPUTO_CAMARAS',
  'VARIOS',
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export type BonusCascade = {
  totalVentasRango: number;
  bonoTotalFarmacias: number;
  bonoBodega: number;
  bonoDependientes: number;
};

export type GastoVigencia = {
  esRango: boolean;
  fechaInicio: string | null;
  fechaFinVigencia: string | null;
  prorratear: boolean;
  descripcionVisible: string;
};

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

export const normalizeCategoria = (value?: string | null): CategoriaGasto => {
  const normalized = String(value ?? 'VARIOS').trim().toUpperCase();
  if (CATEGORIAS_GASTO.includes(normalized as CategoriaGasto)) {
    return normalized as CategoriaGasto;
  }

  if (normalized.includes('RENTA')) return 'RENTAS';
  if (normalized.includes('LUZ')) return 'LUZ';
  if (normalized.includes('REGENCIA')) return 'REGENCIA';
  if (normalized.includes('SEGURO')) return 'SEGUROS';
  if (normalized.includes('VEHICULO')) return 'REPARACION_VEHICULOS';
  if (normalized.includes('IGSS')) return 'CUOTAS_IGSS';
  if (normalized.includes('BASURA')) return 'BASURA';
  if (normalized.includes('MULTA')) return 'MULTAS';
  if (normalized.includes('FARMACIA')) return 'REPARACION_FARMACIAS';
  if (normalized.includes('ALBANIL')) return 'PAGOS_TERCEROS_ALBANIL';
  if (normalized.includes('CAMARA') || normalized.includes('COMPUTO')) return 'EQUIPO_COMPUTO_CAMARAS';

  return 'VARIOS';
};

export const buildDescripcionConVigencia = (
  descripcion: string,
  fechaInicio: string,
  fechaFinVigencia: string,
  prorratear: boolean,
): string => {
  const marker = `[VIGENCIA|${fechaInicio}|${fechaFinVigencia}|${prorratear ? 'PRORRATEAR' : 'COMPLETO'}]`;
  return `${marker} ${descripcion.trim()}`.trim();
};

export const parseGastoVigencia = (descripcion?: string | null): GastoVigencia => {
  const raw = String(descripcion ?? '');
  const match = raw.match(/^\[VIGENCIA\|([^|]+)\|([^|]+)\|(PRORRATEAR|COMPLETO)\]\s*/i);

  if (!match) {
    return {
      esRango: false,
      fechaInicio: null,
      fechaFinVigencia: null,
      prorratear: false,
      descripcionVisible: raw,
    };
  }

  return {
    esRango: true,
    fechaInicio: match[1] || null,
    fechaFinVigencia: match[2] || null,
    prorratear: String(match[3]).toUpperCase() === 'PRORRATEAR',
    descripcionVisible: raw.replace(match[0], '').trim(),
  };
};

export const overlapsRange = (
  queryStart: string,
  queryEnd: string,
  itemStart: string,
  itemEnd: string,
): boolean => {
  const qStart = toDate(queryStart);
  const qEnd = toDate(queryEnd);
  const iStart = toDate(itemStart);
  const iEnd = toDate(itemEnd);

  if (!qStart || !qEnd || !iStart || !iEnd) return false;
  return iStart <= qEnd && iEnd >= qStart;
};

export const getOverlapDays = (
  queryStart: string,
  queryEnd: string,
  itemStart: string,
  itemEnd: string,
): { overlapDays: number; totalDays: number } => {
  const qStart = toDate(queryStart);
  const qEnd = toDate(queryEnd);
  const iStart = toDate(itemStart);
  const iEnd = toDate(itemEnd);

  if (!qStart || !qEnd || !iStart || !iEnd) {
    return { overlapDays: 0, totalDays: 0 };
  }

  const start = qStart > iStart ? qStart : iStart;
  const end = qEnd < iEnd ? qEnd : iEnd;

  if (end < start) {
    return { overlapDays: 0, totalDays: 0 };
  }

  const overlapDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const totalDays = Math.floor((iEnd.getTime() - iStart.getTime()) / 86400000) + 1;
  return { overlapDays, totalDays };
};

export const calculateCascade = (totalVentasRango: number): BonusCascade => {
  const bonoTotalFarmacias = totalVentasRango * 0.01;
  const bonoBodega = bonoTotalFarmacias * 0.4;
  const bonoDependientes = bonoTotalFarmacias - bonoBodega;

  return {
    totalVentasRango,
    bonoTotalFarmacias,
    bonoBodega,
    bonoDependientes,
  };
};

export const getQuincenaRange = (baseDateIso: string, quincena: 'Q1' | 'Q2'): { desde: string; hasta: string } => {
  const baseDate = toDate(baseDateIso) ?? new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  if (quincena === 'Q1') {
    const desde = new Date(year, month, 9);
    const hasta = new Date(year, month, 22);
    return { desde: toIsoDate(desde), hasta: toIsoDate(hasta) };
  }

  const desde = new Date(year, month, 23);
  const hasta = new Date(year, month + 1, 8);
  return { desde: toIsoDate(desde), hasta: toIsoDate(hasta) };
};

export const isDateInRange = (target: string, desde: string, hasta: string): boolean => {
  const t = toDate(target);
  const d = toDate(desde);
  const h = toDate(hasta);
  if (!t || !d || !h) return false;
  return t >= d && t <= h;
};
