'use client';

export const dynamic = 'force-dynamic';

import NextDynamic from 'next/dynamic';
import { Menu, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import VentasRecaudacionesDashboard from '../components/VentasRecaudacionesDashboard';
import ModalAnularRegistro from '@/components/ModalAnularRegistro';
import ModalNuevoGasto from '@/components/ModalNuevoGasto';
import ModalNuevoColaborador from '@/components/ModalNuevoColaborador';
import ModalNuevaSucursal from '@/components/ModalNuevaSucursal';
import Sidebar, { type SectionKey } from '@/components/Sidebar';
import {
  calculateCascade,
  getOverlapDays,
  isDateInRange,
  normalizeCategoria,
  overlapsRange,
  parseGastoVigencia,
  type BonusCascade,
  type CategoriaGasto,
} from '@/lib/contabilidad';
import { getDateRangeFromPreset, type MoneyFilterMode, useVentasFilter } from '@/hooks/useVentasFilter';
import { supabase } from '@/lib/supabase';

const ModalNuevaVentaDynamic = NextDynamic(() => import('@/components/ModalNuevaVenta'), { ssr: false });

type Sucursal = {
  id: string | number;
  nombre: string;
  direccion?: string | null;
  es_matriz?: boolean;
  activa?: boolean;
};

type Empleado = {
  id: string | number;
  nombre_completo: string;
  area: string;
  sucursal_id: string | number | null;
  activo?: boolean;
};

type Colaborador = {
  id: string | number;
  nombre: string;
  area: 'farmacia' | 'bodega' | 'admon' | 'otros';
  puesto: string;
  sucursal_id: string | number | null;
  salario_base_quincenal: number;
  aplica_igss: boolean;
  activo?: boolean;
};

type ColaboradorRowRaw = {
  id?: string | number;
  nombre?: string | null;
  area?: string | null;
  puesto?: string | null;
  sucursal_id?: string | number | null;
  sucursal_id_defecto?: string | number | null;
  salario_base_quincenal?: number | string | null;
  aplica_igss?: boolean | null;
  activo?: boolean | null;
};

type Venta = {
  id: string | number;
  sucursal_id?: string | number | null;
  empleado_id?: string | number | null;
  area?: string;
  fecha_venta?: string;
  fecha_inicio_corte?: string;
  fecha_fin_corte?: string;
  tipo_periodo?: string;
  notas_recaudacion?: string | null;
  monto_bruto?: number;
  anulado?: boolean;
};

type Gasto = {
  id: string | number;
  sucursal_id?: string | number | null;
  categoria?: string;
  descripcion?: string;
  fecha_gasto?: string;
  monto?: number;
  es_gasto_general?: boolean;
  anulado?: boolean;
};

type PlanillaQuincenal = {
  id: string | number;
  quincena: QuincenaKey;
  sucursal_id?: string | number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  salario_neto?: number | null;
  estado?: string | null;
};

type PlanillaQuincenalRowRaw = {
  id?: string | number;
  colaborador_id?: string | number | null;
  sucursal_id?: string | number | null;
  anio?: number | string | null;
  mes?: number | string | null;
  quincena?: string | null;
  tipo_quincena?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  fecha_inicio_corte?: string | null;
  fecha_fin_corte?: string | null;
  fecha_pago?: string | null;
  salario_base?: number | string | null;
  igss?: number | string | null;
  bono_sugerido?: number | string | null;
  bono_manual?: number | string | null;
  bono_aplicado?: number | string | null;
  salario_neto?: number | string | null;
  estado?: string | null;
  estado_cierre?: string | null;
};

type ItemAAnular = {
  id: string;
  tipo: 'Venta' | 'Gasto';
  detalle: string;
};

type GastoAplicado = {
  gasto: Gasto;
  categoria: CategoriaGasto;
  montoAplicado: number;
  descripcionVisible: string;
  esRango: boolean;
  fechaInicio: string | null;
  fechaFinVigencia: string | null;
};

type PlanillaRow = {
  colaboradorId: string;
  colaborador: string;
  area: 'farmacia' | 'bodega' | 'admon' | 'otros';
  puesto: string;
  sucursalAsignadaId: string;
  sucursal: string;
  ventasSucursal: number;
  salarioBase: number;
  aplicaIgss: boolean;
  igss: number;
  bonoSugerido: number;
  bonoManual: number | null;
  bonoAplicado: number;
  esBonoManual: boolean;
  salarioNeto: number;
};

type QuincenaKey = 'Q1' | 'Q2';

type QuincenaRange = {
  desde: string;
  hasta: string;
  fechaPago: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const getMonthRange = (monthRef: string) => {
  const [yearRaw, monthRaw] = monthRef.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const now = new Date();
  const safeYear = Number.isFinite(year) ? year : now.getFullYear();
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1;

  const start = new Date(safeYear, safeMonth - 1, 1);
  const end = new Date(safeYear, safeMonth, 0);
  return { from: toIsoDate(start), to: toIsoDate(end) };
};

const buildPlanillaRange = (monthRef: string, quincena: QuincenaKey): QuincenaRange => {
  const [rawYear, rawMonth] = monthRef.split('-');
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const safeNow = new Date();
  const safeYear = Number.isFinite(year) ? year : safeNow.getFullYear();
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : safeNow.getMonth() + 1;

  const monthStart = new Date(safeYear, safeMonth - 1, 1);

  if (quincena === 'Q1') {
    return {
      desde: toIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 9)),
      hasta: toIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 22)),
      fechaPago: toIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 23)),
    };
  }

  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  return {
    desde: toIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 23)),
    hasta: toIsoDate(new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), 8)),
    fechaPago: toIsoDate(new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), 9)),
  };
};

const isVentaWithinRange = (venta: Venta, range: QuincenaRange): boolean => {
  const inicio = venta.fecha_inicio_corte?.slice(0, 10);
  const fin = venta.fecha_fin_corte?.slice(0, 10);

  if (inicio && fin) {
    return inicio >= range.desde && fin <= range.hasta;
  }

  const fechaVenta = venta.fecha_venta?.slice(0, 10);
  if (!fechaVenta) return false;
  return fechaVenta >= range.desde && fechaVenta <= range.hasta;
};

const logSupabaseError = (context: string, error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as {
      message?: string;
      details?: string;
      hint?: string;
    };
    console.error(`${context}:`, supabaseError.message, supabaseError.details, supabaseError.hint);
    return;
  }

  console.error(`${context}:`, error);
};

const normalizeColaboradorRows = (rows: ColaboradorRowRaw[] | null): Colaborador[] => {
  if (!rows?.length) return [];

  const normalized: Colaborador[] = [];

  for (const row of rows) {
    const id = row.id;
    if (id === undefined || id === null) {
      continue;
    }

    const sucursalId = row.sucursal_id ?? row.sucursal_id_defecto ?? null;
    const areaRaw = String(row.area ?? '').toLowerCase();
    const area: 'farmacia' | 'bodega' | 'admon' | 'otros' =
      areaRaw === 'farmacia' || areaRaw === 'bodega' || areaRaw === 'admon' || areaRaw === 'otros'
        ? areaRaw
        : 'otros';

    normalized.push({
      id,
      nombre: String(row.nombre ?? '').trim(),
      area,
      puesto: String(row.puesto ?? 'Dependiente').trim() || 'Dependiente',
      sucursal_id: sucursalId,
      salario_base_quincenal: Number(row.salario_base_quincenal ?? 0),
      aplica_igss: row.aplica_igss !== false,
      activo: row.activo !== false,
    });
  }

  return normalized;
};

const normalizePlanillaRows = (rows: PlanillaQuincenalRowRaw[] | null): PlanillaQuincenal[] => {
  if (!rows?.length) return [];

  const normalized: PlanillaQuincenal[] = [];

  for (const row of rows) {
    const id = row.id;
    if (id === undefined || id === null) {
      continue;
    }

    const quincenaValor = String(row.quincena ?? row.tipo_quincena ?? '').toUpperCase();
    const quincena: QuincenaKey = quincenaValor === 'Q2' ? 'Q2' : 'Q1';

    normalized.push({
      id,
      quincena,
      sucursal_id: row.sucursal_id ?? null,
      fecha_inicio: row.fecha_inicio ?? row.fecha_inicio_corte ?? null,
      fecha_fin: row.fecha_fin ?? row.fecha_fin_corte ?? null,
      salario_neto: Number(row.salario_neto ?? 0),
      estado: row.estado ?? row.estado_cierre ?? null,
    });
  }

  return normalized;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('ventas');
  const [modalVentaAbierto, setModalVentaAbierto] = useState(false);
  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [modalSucursalAbierto, setModalSucursalAbierto] = useState(false);
  const [modalColaboradorAbierto, setModalColaboradorAbierto] = useState(false);
  const [itemAAnular, setItemAAnular] = useState<ItemAAnular | null>(null);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [planillasQuincenales, setPlanillasQuincenales] = useState<PlanillaQuincenal[]>([]);

  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedFarmaciaId, setSelectedFarmaciaId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState<'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado'>('mes');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [moneyFilterMode, setMoneyFilterMode] = useState<MoneyFilterMode>('none');
  const [moneyFilterValue, setMoneyFilterValue] = useState('');
  const [areaFilterPlanilla, setAreaFilterPlanilla] = useState<'all' | 'farmacia' | 'bodega' | 'admon' | 'otros'>('all');
  const [quincenaActiva, setQuincenaActiva] = useState<QuincenaKey>('Q1');
  const [mesPlanilla, setMesPlanilla] = useState(new Date().toISOString().slice(0, 7));
  const [manualBonos, setManualBonos] = useState<Record<string, number>>({});
  const [sucursalAsignadaQuincena, setSucursalAsignadaQuincena] = useState<Record<string, string>>({});
  const [isConsolidandoPlanilla, setIsConsolidandoPlanilla] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const range = getDateRangeFromPreset('mes');
    setFechaDesde(range.from);
    setFechaHasta(range.to);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      const raw = window.localStorage.getItem('planilla_bonos_manual_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      setManualBonos(parsed);
    } catch (error) {
      console.error('No se pudo recuperar bonos manuales:', error);
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    try {
      const raw = window.localStorage.getItem('planilla_sucursal_asignada_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      setSucursalAsignadaQuincena(parsed);
    } catch (error) {
      console.error('No se pudo recuperar asignaciones de sucursal por quincena:', error);
    }
  }, [mounted]);

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);

    try {
      const [sucursalesResponse, empleadosResponse, ventasResponse, gastosResponse] = await Promise.all([
        supabase.from('sucursales').select('id, nombre, direccion, es_matriz, activa').order('nombre', { ascending: true }),
        supabase.from('empleados').select('id, sucursal_id, nombre_completo, area, activo').order('nombre_completo', { ascending: true }),
        supabase
          .from('ventas')
          .select('id, sucursal_id, empleado_id, area, fecha_venta, fecha_inicio_corte, fecha_fin_corte, tipo_periodo, notas_recaudacion, monto_bruto, anulado')
          .order('fecha_venta', { ascending: false }),
        supabase
          .from('gastos')
          .select('id, sucursal_id, categoria, descripcion, fecha_gasto, monto, es_gasto_general, anulado')
          .order('fecha_gasto', { ascending: false }),
      ]);

      if (sucursalesResponse.error) throw sucursalesResponse.error;
      if (empleadosResponse.error) throw empleadosResponse.error;
      if (ventasResponse.error) throw ventasResponse.error;
      if (gastosResponse.error) throw gastosResponse.error;

      const activeSucursales = ((sucursalesResponse.data as Sucursal[] | null) ?? []).filter(
        (sucursal) => sucursal.activa !== false,
      );

      setSucursales(activeSucursales);
      setEmpleados((empleadosResponse.data as Empleado[] | null) ?? []);
      setVentas((ventasResponse.data as Venta[] | null) ?? []);
      setGastos((gastosResponse.data as Gasto[] | null) ?? []);

      try {
        const { data: colaboradoresData, error: colaboradoresError } = await supabase
          .from('colaboradores')
          .select('*')
          .order('nombre', { ascending: true });

        if (colaboradoresError) {
          throw colaboradoresError;
        }

        setColaboradores(normalizeColaboradorRows((colaboradoresData as ColaboradorRowRaw[] | null) ?? []));
      } catch (colaboradoresError) {
        logSupabaseError('Detalle error Supabase (colaboradores)', colaboradoresError);
        setColaboradores([]);
      }

      try {
        const { data: planillasData, error: planillasError } = await supabase
          .from('planillas_quincenales')
          .select('id, colaborador_id, sucursal_id, anio, mes, tipo_quincena, fecha_inicio_corte, fecha_fin_corte, fecha_pago, salario_base, igss, bono_sugerido, bono_manual, bono_aplicado, salario_neto, estado_cierre')
          .order('fecha_inicio_corte', { ascending: false });

        if (planillasError) {
          throw planillasError;
        }

        setPlanillasQuincenales(normalizePlanillaRows((planillasData as PlanillaQuincenalRowRaw[] | null) ?? []));
      } catch (planillasError) {
        logSupabaseError('Detalle error Supabase (planillas_quincenales)', planillasError);
        setPlanillasQuincenales([]);
      }
    } catch (error) {
      logSupabaseError('Detalle error Supabase (carga principal)', error);
      setSucursales([]);
      setEmpleados([]);
      setColaboradores([]);
      setVentas([]);
      setGastos([]);
      setPlanillasQuincenales([]);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!isFrozen) {
      void fetchData();
    }
  }, [fetchData, isFrozen]);

  useEffect(() => {
    if (!selectedFarmaciaId && sucursales.length > 0) {
      setSelectedFarmaciaId(String(sucursales[0].id));
    }
  }, [selectedFarmaciaId, sucursales]);

  const applyDatePreset = useCallback(
    (preset: 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado') => {
      if (preset === 'personalizado') {
        const today = new Date().toISOString().slice(0, 10);
        setFechaDesde(fechaDesde || today);
        setFechaHasta(fechaHasta || today);
        setActiveDatePreset('personalizado');
        return;
      }

      const range = getDateRangeFromPreset(preset);
      setFechaDesde(range.from);
      setFechaHasta(range.to);
      setMonthFilter(range.from.slice(0, 7));
      setActiveDatePreset(preset);
    },
    [fechaDesde, fechaHasta],
  );

  const applyMonthFilter = useCallback((monthRef: string) => {
    setMonthFilter(monthRef);
    const range = getMonthRange(monthRef);
    setFechaDesde(range.from);
    setFechaHasta(range.to);
    setActiveDatePreset('personalizado');
  }, []);

  const ventasDashboard = useVentasFilter({
    ventas,
    sucursales,
    fechaDesde,
    fechaHasta,
    sucursalId: selectedBranch,
    moneyMode: moneyFilterMode,
    moneyValue: moneyFilterValue,
  });

  const cascadeGlobal = useMemo<BonusCascade>(() => {
    return calculateCascade(ventasDashboard.totalGeneral);
  }, [ventasDashboard.totalGeneral]);

  const cascadePorSucursal = useMemo<Record<string, BonusCascade>>(() => {
    const result: Record<string, BonusCascade> = {};
    for (const row of ventasDashboard.resumenPorSucursal) {
      result[row.sucursalId] = calculateCascade(row.totalRecaudado);
    }
    return result;
  }, [ventasDashboard.resumenPorSucursal]);

  const gastosAplicados = useMemo<GastoAplicado[]>(() => {
    return gastos
      .filter((gasto) => !gasto.anulado)
      .filter((gasto) => {
        const matchesBranch =
          selectedBranch === 'all' ||
          (selectedBranch === 'corporativo' && gasto.sucursal_id === null) ||
          String(gasto.sucursal_id ?? '') === selectedBranch;

        if (!matchesBranch) return false;

        const metadata = parseGastoVigencia(gasto.descripcion);
        if (metadata.esRango && metadata.fechaInicio && metadata.fechaFinVigencia) {
          return overlapsRange(fechaDesde, fechaHasta, metadata.fechaInicio, metadata.fechaFinVigencia);
        }

        return isDateInRange(gasto.fecha_gasto ?? '', fechaDesde, fechaHasta);
      })
      .map((gasto) => {
        const metadata = parseGastoVigencia(gasto.descripcion);
        const montoBase = Number(gasto.monto ?? 0);

        let montoAplicado = montoBase;
        if (metadata.esRango && metadata.fechaInicio && metadata.fechaFinVigencia && metadata.prorratear) {
          const overlap = getOverlapDays(fechaDesde, fechaHasta, metadata.fechaInicio, metadata.fechaFinVigencia);
          if (overlap.totalDays > 0) {
            montoAplicado = (montoBase * overlap.overlapDays) / overlap.totalDays;
          }
        }

        return {
          gasto,
          categoria: normalizeCategoria(gasto.categoria),
          montoAplicado,
          descripcionVisible: metadata.descripcionVisible,
          esRango: metadata.esRango,
          fechaInicio: metadata.fechaInicio,
          fechaFinVigencia: metadata.fechaFinVigencia,
        };
      });
  }, [gastos, selectedBranch, fechaDesde, fechaHasta]);

  const quincenaRange = useMemo(() => buildPlanillaRange(mesPlanilla, quincenaActiva), [mesPlanilla, quincenaActiva]);

  const makePlanillaKey = useCallback(
    (colaboradorId: string | number, range: QuincenaRange) => `${String(colaboradorId)}_${range.desde}_${range.hasta}`,
    [],
  );

  const ventasQuincena = useMemo(() => {
    return ventas
      .filter((venta) => !venta.anulado)
      .filter((venta) => isVentaWithinRange(venta, quincenaRange));
  }, [ventas, quincenaRange]);

  const totalVentasQuincena = useMemo(
    () => ventasQuincena.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0),
    [ventasQuincena],
  );

  const cascadeQuincena = useMemo(() => calculateCascade(totalVentasQuincena), [totalVentasQuincena]);

  const colaboradoresActivos = useMemo(
    () => colaboradores.filter((colaborador) => colaborador.activo !== false),
    [colaboradores],
  );

  const ventasPorSucursalQuincena = useMemo(() => {
    const map: Record<string, number> = {};
    for (const venta of ventasQuincena) {
      const key = String(venta.sucursal_id ?? '');
      if (!key) continue;
      map[key] = (map[key] ?? 0) + Number(venta.monto_bruto ?? 0);
    }
    return map;
  }, [ventasQuincena]);

  const sucursalAsignadaPorColaborador = useMemo(() => {
    const map: Record<string, string> = {};
    for (const colaborador of colaboradoresActivos) {
      const key = makePlanillaKey(colaborador.id, quincenaRange);
      const override = sucursalAsignadaQuincena[key];
      map[String(colaborador.id)] = override ?? String(colaborador.sucursal_id ?? '');
    }
    return map;
  }, [colaboradoresActivos, makePlanillaKey, quincenaRange, sucursalAsignadaQuincena]);

  const colaboradoresFarmaciaPorSucursal = useMemo(() => {
    const map: Record<string, number> = {};
    for (const colaborador of colaboradoresActivos) {
      if (colaborador.area !== 'farmacia') continue;
      const assigned = sucursalAsignadaPorColaborador[String(colaborador.id)] ?? '';
      if (!assigned) continue;
      map[assigned] = (map[assigned] ?? 0) + 1;
    }
    return map;
  }, [colaboradoresActivos, sucursalAsignadaPorColaborador]);

  const totalColaboradoresBodega = useMemo(
    () => colaboradoresActivos.filter((colaborador) => colaborador.area === 'bodega').length,
    [colaboradoresActivos],
  );

  const planillaRows = useMemo<PlanillaRow[]>(() => {
    return colaboradoresActivos.map((colaborador) => {
      const colaboradorId = String(colaborador.id);
      const sucursalAsignadaId = sucursalAsignadaPorColaborador[colaboradorId] ?? String(colaborador.sucursal_id ?? '');
      const ventasSucursal = ventasPorSucursalQuincena[sucursalAsignadaId] ?? 0;
      const bonoTotalSucursal = ventasSucursal * 0.01;
      const bonoDependientesSucursal = bonoTotalSucursal * 0.6;
      const cantidadFarmacia = colaboradoresFarmaciaPorSucursal[sucursalAsignadaId] ?? 0;

      const bonoSugerido = (() => {
        if (colaborador.area === 'farmacia') {
          return cantidadFarmacia > 0 ? bonoDependientesSucursal / cantidadFarmacia : 0;
        }

        if (colaborador.area === 'bodega') {
          const bonoBodegaGlobal = totalVentasQuincena * 0.01 * 0.4;
          return totalColaboradoresBodega > 0 ? bonoBodegaGlobal / totalColaboradoresBodega : 0;
        }

        return 0;
      })();

      const manualKey = makePlanillaKey(colaborador.id, quincenaRange);
      const bonoManualRaw = manualBonos[manualKey];
      const esBonoManual = Number.isFinite(bonoManualRaw);
      const bonoManual = esBonoManual ? Number(bonoManualRaw) : null;
      const bonoAplicado = esBonoManual ? Number(bonoManualRaw) : bonoSugerido;

      const salarioBase = Number(colaborador.salario_base_quincenal ?? 0);
      const aplicaIgss = colaborador.aplica_igss !== false;
      const igss = aplicaIgss ? Number((salarioBase * 0.0483).toFixed(2)) : 0;
      const salarioNeto = salarioBase - igss + bonoAplicado;

      return {
        colaboradorId,
        colaborador: colaborador.nombre,
        area: colaborador.area,
        puesto: colaborador.puesto,
        sucursalAsignadaId,
        sucursal: sucursales.find((item) => String(item.id) === sucursalAsignadaId)?.nombre ?? 'Sin sucursal',
        ventasSucursal,
        salarioBase,
        aplicaIgss,
        igss,
        bonoSugerido,
        bonoManual,
        bonoAplicado,
        esBonoManual,
        salarioNeto,
      };
    });
  }, [colaboradoresActivos, sucursalAsignadaPorColaborador, ventasPorSucursalQuincena, colaboradoresFarmaciaPorSucursal, makePlanillaKey, quincenaRange, manualBonos, sucursales, totalVentasQuincena, totalColaboradoresBodega]);

  const planillaRowsFiltradas = useMemo(() => {
    if (areaFilterPlanilla === 'all') {
      return planillaRows;
    }

    return planillaRows.filter((row) => row.area === areaFilterPlanilla);
  }, [planillaRows, areaFilterPlanilla]);

  const persistManualBonos = useCallback((next: Record<string, number>) => {
    setManualBonos(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('planilla_bonos_manual_v1', JSON.stringify(next));
    }
  }, []);

  const handleBonoManualChange = (colaboradorId: string, value: string) => {
    const key = makePlanillaKey(colaboradorId, quincenaRange);
    if (!value.trim()) {
      const cleaned = { ...manualBonos };
      delete cleaned[key];
      persistManualBonos(cleaned);
      return;
    }

    const parsed = Number(value);
    const next = { ...manualBonos };

    if (!Number.isFinite(parsed)) {
      delete next[key];
      persistManualBonos(next);
      return;
    }

    next[key] = parsed;
    persistManualBonos(next);
  };

  const resetBonoAutomatico = (colaboradorId: string) => {
    const key = makePlanillaKey(colaboradorId, quincenaRange);
    const next = { ...manualBonos };
    delete next[key];
    persistManualBonos(next);
  };

  const persistSucursalAsignada = useCallback((next: Record<string, string>) => {
    setSucursalAsignadaQuincena(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('planilla_sucursal_asignada_v1', JSON.stringify(next));
    }
  }, []);

  const handleSucursalAsignadaChange = (colaboradorId: string, sucursalId: string) => {
    const key = makePlanillaKey(colaboradorId, quincenaRange);
    const next = { ...sucursalAsignadaQuincena, [key]: sucursalId };
    persistSucursalAsignada(next);
  };

  const totalPlanilla = useMemo(
    () => planillaRows.reduce((sum, row) => sum + row.salarioNeto, 0),
    [planillaRows],
  );

  const totalIgssPlanilla = useMemo(
    () => planillaRows.reduce((sum, row) => sum + row.igss, 0),
    [planillaRows],
  );

  const totalBonoPlanilla = useMemo(
    () => planillaRows.reduce((sum, row) => sum + row.bonoAplicado, 0),
    [planillaRows],
  );

  const gastosPorCategoria = useMemo(() => {
    const map: Record<CategoriaGasto, number> = {
      RENTAS: 0,
      LUZ: 0,
      REGENCIA: 0,
      SEGUROS: 0,
      REPARACION_VEHICULOS: 0,
      CUOTAS_IGSS: 0,
      BASURA: 0,
      MULTAS: 0,
      REPARACION_FARMACIAS: 0,
      PAGOS_TERCEROS_ALBANIL: 0,
      EQUIPO_COMPUTO_CAMARAS: 0,
      VARIOS: 0,
    };

    for (const item of gastosAplicados) {
      map[item.categoria] += item.montoAplicado;
    }

    return map;
  }, [gastosAplicados]);

  const computePlanillaTotalQuincena = useCallback(
    (quincena: QuincenaKey) => {
      const range = buildPlanillaRange(mesPlanilla, quincena);

      const ventasPeriodo = ventas
        .filter((venta) => !venta.anulado)
        .filter((venta) => isVentaWithinRange(venta, range));

      const ventasPorSucursal: Record<string, number> = {};
      for (const venta of ventasPeriodo) {
        const key = String(venta.sucursal_id ?? '');
        if (!key) continue;
        ventasPorSucursal[key] = (ventasPorSucursal[key] ?? 0) + Number(venta.monto_bruto ?? 0);
      }

      const asignadosPorSucursal: Record<string, number> = {};
      let totalBodega = 0;
      for (const colaborador of colaboradoresActivos) {
        const keyAsignacion = makePlanillaKey(colaborador.id, range);
        const sucursalAsignada = sucursalAsignadaQuincena[keyAsignacion] ?? String(colaborador.sucursal_id ?? '');

        if (colaborador.area === 'farmacia') {
          if (!sucursalAsignada) continue;
          asignadosPorSucursal[sucursalAsignada] = (asignadosPorSucursal[sucursalAsignada] ?? 0) + 1;
          continue;
        }

        if (colaborador.area === 'bodega') {
          totalBodega += 1;
        }
      }

      const totalVentasPeriodo = ventasPeriodo.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);
      const bonoBodegaGlobal = totalVentasPeriodo * 0.01 * 0.4;

      return colaboradoresActivos.reduce((sum, colaborador) => {
        const keyAsignacion = makePlanillaKey(colaborador.id, range);
        const sucursalAsignada = sucursalAsignadaQuincena[keyAsignacion] ?? String(colaborador.sucursal_id ?? '');
        const ventasSucursal = ventasPorSucursal[sucursalAsignada] ?? 0;

        const bonoSugerido = (() => {
          if (colaborador.area === 'farmacia') {
            return (ventasSucursal * 0.01 * 0.6) / Math.max(1, asignadosPorSucursal[sucursalAsignada] ?? 0);
          }

          if (colaborador.area === 'bodega') {
            return totalBodega > 0 ? bonoBodegaGlobal / totalBodega : 0;
          }

          return 0;
        })();

        const manualKey = makePlanillaKey(colaborador.id, range);
        const bonoManual = manualBonos[manualKey];
        const bonoAplicado = Number.isFinite(bonoManual) ? Number(bonoManual) : bonoSugerido;
        const base = Number(colaborador.salario_base_quincenal ?? 0);
        const igss = colaborador.aplica_igss !== false ? Number((base * 0.0483).toFixed(2)) : 0;
        return sum + (base - igss + bonoAplicado);
      }, 0);
    },
    [mesPlanilla, ventas, colaboradoresActivos, makePlanillaKey, sucursalAsignadaQuincena, manualBonos],
  );

  const salariosQ1 = useMemo(() => computePlanillaTotalQuincena('Q1'), [computePlanillaTotalQuincena]);
  const salariosQ2 = useMemo(() => computePlanillaTotalQuincena('Q2'), [computePlanillaTotalQuincena]);

  const salariosConsolidadoQ1 = useMemo(() => {
    return planillasQuincenales
      .filter((row) => String(row.quincena ?? '').toUpperCase() === 'Q1')
      .filter((row) => {
        const fechaInicio = String(row.fecha_inicio ?? '').slice(0, 10);
        if (!fechaInicio) return false;
        if (fechaInicio < fechaDesde || fechaInicio > fechaHasta) return false;
        if (selectedBranch === 'all' || selectedBranch === 'corporativo') return true;
        return String(row.sucursal_id ?? '') === selectedBranch;
      })
      .reduce((sum, row) => sum + Number(row.salario_neto ?? 0), 0);
  }, [planillasQuincenales, fechaDesde, fechaHasta, selectedBranch]);

  const salariosConsolidadoQ2 = useMemo(() => {
    return planillasQuincenales
      .filter((row) => String(row.quincena ?? '').toUpperCase() === 'Q2')
      .filter((row) => {
        const fechaInicio = String(row.fecha_inicio ?? '').slice(0, 10);
        if (!fechaInicio) return false;
        if (fechaInicio < fechaDesde || fechaInicio > fechaHasta) return false;
        if (selectedBranch === 'all' || selectedBranch === 'corporativo') return true;
        return String(row.sucursal_id ?? '') === selectedBranch;
      })
      .reduce((sum, row) => sum + Number(row.salario_neto ?? 0), 0);
  }, [planillasQuincenales, fechaDesde, fechaHasta, selectedBranch]);

  const totalGastosMes = useMemo(() => {
    const subtotalSalarios = salariosConsolidadoQ1 + salariosConsolidadoQ2;
    return (
      subtotalSalarios +
      gastosPorCategoria.RENTAS +
      gastosPorCategoria.LUZ +
      gastosPorCategoria.REGENCIA +
      gastosPorCategoria.SEGUROS +
      gastosPorCategoria.REPARACION_VEHICULOS +
      gastosPorCategoria.CUOTAS_IGSS +
      gastosPorCategoria.REPARACION_FARMACIAS +
      gastosPorCategoria.PAGOS_TERCEROS_ALBANIL +
      gastosPorCategoria.MULTAS +
      gastosPorCategoria.BASURA +
      gastosPorCategoria.EQUIPO_COMPUTO_CAMARAS +
      gastosPorCategoria.VARIOS
    );
  }, [gastosPorCategoria, salariosConsolidadoQ1, salariosConsolidadoQ2]);

  const presupuestoGastos = useMemo(() => ventasDashboard.totalGeneral / 3, [ventasDashboard.totalGeneral]);
  const balanceGastos = useMemo(() => presupuestoGastos - totalGastosMes, [presupuestoGastos, totalGastosMes]);

  const handleQuickAction = (action: 'venta' | 'gasto') => {
    if (action === 'venta') {
      setModalVentaAbierto(true);
      return;
    }

    setModalGastoAbierto(true);
  };

  const handleConfirmarAnulacion = async (motivo: string) => {
    if (!itemAAnular) return;

    const table = itemAAnular.tipo === 'Venta' ? 'ventas' : 'gastos';
    const { error } = await supabase
      .from(table)
      .update({
        anulado: true,
        motivo_anulacion: motivo,
        anulado_en: new Date().toISOString(),
      })
      .eq('id', itemAAnular.id);

    if (error) {
      throw error;
    }

    setItemAAnular(null);
    await fetchData();
  };

  const handleSucursalCreated = (nuevaSucursal: Sucursal) => {
    setSucursales((current) => {
      const next = [...current, nuevaSucursal];
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    });

    setModalSucursalAbierto(false);
    if (typeof window !== 'undefined') {
      window.alert('Sucursal registrada con éxito');
    }
  };

  const handleColaboradorCreated = (nuevoColaborador: Colaborador) => {
    setColaboradores((current) => {
      const next = [...current, nuevoColaborador];
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    });

    setModalColaboradorAbierto(false);
    if (typeof window !== 'undefined') {
      window.alert('Colaborador registrado con éxito');
    }
  };

  const handleConsolidarPlanilla = async () => {
    if (planillaRows.length === 0) {
      if (typeof window !== 'undefined') {
        window.alert('No hay colaboradores para consolidar en la quincena activa.');
      }
      return;
    }

    setIsConsolidandoPlanilla(true);

    try {
      const payload = planillaRows.map((row) => ({
        colaborador_id: row.colaboradorId,
        colaborador_nombre: row.colaborador,
        area: row.area,
        puesto: row.puesto,
        sucursal_id: row.sucursalAsignadaId || null,
        sucursal_nombre: row.sucursal,
        quincena: quincenaActiva,
        mes_referencia: mesPlanilla,
        fecha_inicio: quincenaRange.desde,
        fecha_fin: quincenaRange.hasta,
        fecha_pago: quincenaRange.fechaPago,
        ventas_sucursal: row.ventasSucursal,
        salario_base_quincenal: row.salarioBase,
        aplica_igss: row.aplicaIgss,
        igss: row.igss,
        bono_sugerido: row.bonoSugerido,
        bono_manual: row.bonoManual,
        bono_aplicado: row.bonoAplicado,
        salario_neto: row.salarioNeto,
        estado: 'CONSOLIDADO',
        consolidado_en: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('planillas_quincenales')
        .upsert(payload, { onConflict: 'colaborador_id,fecha_inicio,fecha_fin' });

      if (error) {
        throw error;
      }

      if (typeof window !== 'undefined') {
        window.alert('Planilla consolidada exitosamente para reportería.');
      }
    } catch (consolidarError) {
      console.error('Error consolidando planilla:', consolidarError);
      const detail =
        consolidarError instanceof Error
          ? consolidarError.message
          : typeof consolidarError === 'object' && consolidarError !== null && 'message' in consolidarError
            ? String((consolidarError as { message?: string }).message ?? '')
            : 'No se pudo consolidar la planilla.';

      if (typeof window !== 'undefined') {
        window.alert(`Error al consolidar planilla: ${detail}`);
      }
    } finally {
      setIsConsolidandoPlanilla(false);
    }
  };

  const sectionTitleMap: Record<SectionKey, string> = {
    ventas: 'Ventas y Recaudaciones',
    planilla: 'Planilla y Bonificaciones',
    gastos: 'Gastos y Gastos Fijos',
    consolidado: 'Consolidado Mensual de Gastos',
  };

  const ventasSinDatos = sucursales.length === 0 && ventas.length === 0;

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        activeSection={activeSection}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSection={(section) => {
          setActiveSection(section);
          setIsSidebarOpen(false);
        }}
        onQuickAction={handleQuickAction}
      />

      <div className="w-full min-h-screen pl-0 lg:pl-64">
        <header className="border-b border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20 backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((value) => !value)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-orange-400 hover:text-orange-300 lg:hidden"
                aria-label="Abrir menú lateral"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-300">ERP farmacéutico</p>
                <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{sectionTitleMap[activeSection]}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setModalSucursalAbierto(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                + Nueva Farmacia / Sucursal
              </button>

              <button
                type="button"
                onClick={() => setModalColaboradorAbierto(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" />
                + Nuevo Colaborador
              </button>

              <button
                type="button"
                onClick={() => setModalVentaAbierto(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                <Plus className="h-4 w-4" />
                + Registrar Venta / Corte
              </button>

              <button
                type="button"
                onClick={() => setModalGastoAbierto(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                + Registrar Gasto
              </button>

              <select
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-orange-400"
              >
                <option value="all">Todas las sucursales</option>
                {sucursales.map((sucursal) => (
                  <option key={String(sucursal.id)} value={String(sucursal.id)}>
                    {sucursal.nombre}
                  </option>
                ))}
                <option value="corporativo">Gastos corporativos</option>
              </select>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {isLoadingData && (
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
              Actualizando información del ERP...
            </div>
          )}

          {activeSection === 'ventas' && (
            <div className="space-y-4">
              {ventasSinDatos && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300 shadow-xl shadow-slate-950/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Sin datos disponibles</p>
                  <p className="mt-3 text-base text-slate-100">
                    No hay sucursales ni cortes registrados en este período. Registra tu primera venta o carga el catálogo.
                  </p>
                </div>
              )}

              <VentasRecaudacionesDashboard
                sucursales={sucursales}
                resumenPorSucursal={ventasDashboard.resumenPorSucursal}
                ventasActivas={ventasDashboard.ventasActivas}
                totalGeneral={ventasDashboard.totalGeneral}
                selectedFarmaciaId={selectedFarmaciaId}
                onSelectFarmacia={setSelectedFarmaciaId}
                onAbrirRegistroVenta={() => setModalVentaAbierto(true)}
                onVerHistorial={setSelectedFarmaciaId}
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}
                onChangeFechaDesde={(value: string) => {
                  setFechaDesde(value);
                  setActiveDatePreset('personalizado');
                }}
                onChangeFechaHasta={(value: string) => {
                  setFechaHasta(value);
                  setActiveDatePreset('personalizado');
                }}
                moneyMode={moneyFilterMode}
                onMoneyModeChange={setMoneyFilterMode}
                moneyValue={moneyFilterValue}
                onMoneyValueChange={setMoneyFilterValue}
                activeDatePreset={activeDatePreset}
                onApplyDatePreset={applyDatePreset}
                isFrozen={isFrozen}
                onToggleFreeze={() => setIsFrozen((value) => !value)}
                cascadeGlobal={cascadeGlobal}
                cascadePorSucursal={cascadePorSucursal}
              />
            </div>
          )}

          <ModalNuevaSucursal
            isOpen={modalSucursalAbierto}
            onClose={() => setModalSucursalAbierto(false)}
            onSuccess={handleSucursalCreated}
          />

          <ModalNuevoColaborador
            isOpen={modalColaboradorAbierto}
            onClose={() => setModalColaboradorAbierto(false)}
            onSuccess={handleColaboradorCreated}
            sucursales={sucursales}
          />

          {activeSection === 'planilla' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="space-y-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                  <span>Mes de planilla</span>
                  <input
                    type="month"
                    value={mesPlanilla}
                    onChange={(event) => setMesPlanilla(event.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleConsolidarPlanilla}
                  disabled={isConsolidandoPlanilla}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isConsolidandoPlanilla ? 'Consolidando...' : 'Cargar Reporte Quincenal / Mensual'}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Corte activo</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {quincenaActiva === 'Q1' ? 'Quincena 1 (09 al 22)' : 'Quincena 2 (23 al 08)'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(quincenaRange.desde)} - {formatDate(quincenaRange.hasta)} | Pago: {formatDate(quincenaRange.fechaPago)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bono Total (1%)</p>
                  <p className="mt-2 font-mono text-xl font-bold text-emerald-400">{formatCurrency(cascadeQuincena.bonoTotalFarmacias)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bono Bodega (40%)</p>
                  <p className="mt-2 font-mono text-xl font-bold text-emerald-400">{formatCurrency(cascadeQuincena.bonoBodega)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bono Dependientes (60%)</p>
                  <p className="mt-2 font-mono text-xl font-bold text-emerald-400">{formatCurrency(cascadeQuincena.bonoDependientes)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setQuincenaActiva('Q1')}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                    quincenaActiva === 'Q1'
                      ? 'border-orange-500/40 bg-orange-500/10 text-orange-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  Quincena 1 (09-22)
                </button>
                <button
                  type="button"
                  onClick={() => setQuincenaActiva('Q2')}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                    quincenaActiva === 'Q2'
                      ? 'border-orange-500/40 bg-orange-500/10 text-orange-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  Quincena 2 (23-08)
                </button>

                <select
                  value={areaFilterPlanilla}
                  onChange={(event) => setAreaFilterPlanilla(event.target.value as 'all' | 'farmacia' | 'bodega' | 'admon' | 'otros')}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 outline-none transition focus:border-indigo-400"
                >
                  <option value="all">Todas las áreas</option>
                  <option value="farmacia">Farmacia</option>
                  <option value="bodega">Bodega</option>
                  <option value="admon">Administración</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Planilla</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(totalPlanilla)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">IGSS Total</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(totalIgssPlanilla)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bono Aplicado</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(totalBonoPlanilla)}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
                <table className="min-w-[1280px] w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Sucursal Quincenal</th>
                      <th className="px-4 py-3 text-right">Ventas Sucursal</th>
                      <th className="px-4 py-3 text-right">Salario Base</th>
                      <th className="px-4 py-3 text-right">IGSS</th>
                      <th className="px-4 py-3 text-right">Bono Sugerido</th>
                      <th className="px-4 py-3">Bono Manual</th>
                      <th className="px-4 py-3 text-right">Bono Aplicado</th>
                      <th className="px-4 py-3 text-right">Salario Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planillaRowsFiltradas.map((row) => (
                      <tr key={row.colaboradorId} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{row.colaborador}</span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                row.area === 'farmacia'
                                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                                  : row.area === 'bodega'
                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                    : row.area === 'admon'
                                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                                      : 'border-slate-500/40 bg-slate-500/10 text-slate-300'
                              }`}
                            >
                              {row.area}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{row.puesto}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <select
                            value={row.sucursalAsignadaId}
                            onChange={(event) => handleSucursalAsignadaChange(row.colaboradorId, event.target.value)}
                            className="w-full min-w-[220px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-400"
                          >
                            <option value="">Sin asignar</option>
                            {sucursales.map((sucursal) => (
                              <option key={String(sucursal.id)} value={String(sucursal.id)}>
                                {sucursal.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.ventasSucursal)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.salarioBase)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.igss)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.bonoSugerido)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.esBonoManual ? String(row.bonoManual ?? '') : ''}
                              onChange={(event) => handleBonoManualChange(row.colaboradorId, event.target.value)}
                              placeholder="Automático"
                              className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => resetBonoAutomatico(row.colaboradorId)}
                              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-orange-400 hover:text-orange-200"
                            >
                              Restablecer a cálculo automático
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">
                          {formatCurrency(row.bonoAplicado)}
                          {row.esBonoManual && (
                            <span className="ml-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-300">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">{formatCurrency(row.salarioNeto)}</td>
                      </tr>
                    ))}
                    {planillaRowsFiltradas.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-5 text-center text-sm text-slate-400">
                          No hay colaboradores activos para la quincena seleccionada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === 'gastos' && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-slate-950/30">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                      <span>Mes a Mes</span>
                      <input
                        type="month"
                        value={monthFilter}
                        onChange={(event) => applyMonthFilter(event.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                      />
                    </label>

                    <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                      {[
                        { key: 'hoy', label: 'Hoy' },
                        { key: 'semana', label: 'Esta Semana' },
                        { key: 'mes', label: 'Este Mes' },
                        { key: 'anio', label: 'Este Ano' },
                        { key: 'personalizado', label: 'Rango Libre' },
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => applyDatePreset(preset.key as 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado')}
                          className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            activeDatePreset === preset.key
                              ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-blue-400 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                      <span>Desde</span>
                      <input
                        type="date"
                        value={fechaDesde}
                        onChange={(event) => {
                          setFechaDesde(event.target.value);
                          setActiveDatePreset('personalizado');
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                      />
                    </label>

                    <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                      <span>Hasta</span>
                      <input
                        type="date"
                        value={fechaHasta}
                        onChange={(event) => {
                          setFechaHasta(event.target.value);
                          setActiveDatePreset('personalizado');
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                      />
                    </label>

                    <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300 sm:col-span-1 lg:col-span-2">
                      <span>Sucursal Activa</span>
                      <select
                        value={selectedBranch}
                        onChange={(event) => setSelectedBranch(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                      >
                        <option value="all">Todas las sucursales</option>
                        {sucursales.map((sucursal) => (
                          <option key={String(sucursal.id)} value={String(sucursal.id)}>
                            {sucursal.nombre}
                          </option>
                        ))}
                        <option value="corporativo">Gastos corporativos</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gastos Aplicados</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(gastosAplicados.reduce((sum, item) => sum + item.montoAplicado, 0))}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Registros en Rango</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{gastosAplicados.filter((item) => item.esRango).length}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Registros Simples</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{gastosAplicados.filter((item) => !item.esRango).length}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
                <table className="min-w-[1280px] w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Sucursal</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Vigencia</th>
                      <th className="px-4 py-3 text-right">Monto Base</th>
                      <th className="px-4 py-3 text-right">Monto Aplicado</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosAplicados.map((item) => {
                      const gasto = item.gasto;
                      const sucursal =
                        gasto.sucursal_id === null
                          ? 'Corporativo'
                          : sucursales.find((s) => String(s.id) === String(gasto.sucursal_id))?.nombre ?? 'Sucursal';

                      return (
                        <tr key={String(gasto.id)} className="border-t border-slate-800">
                          <td className="px-4 py-3 text-slate-200">{sucursal}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                              {item.categoria.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{item.descripcionVisible || 'Sin descripción'}</td>
                          <td className="px-4 py-3 text-slate-300">
                            {item.esRango ? `${formatDate(item.fechaInicio ?? undefined)} - ${formatDate(item.fechaFinVigencia ?? undefined)}` : formatDate(gasto.fecha_gasto)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(Number(gasto.monto ?? 0))}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(item.montoAplicado)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setItemAAnular({
                                  id: String(gasto.id),
                                  tipo: 'Gasto',
                                  detalle: `Gasto ${item.categoria} por ${formatCurrency(Number(gasto.monto ?? 0))}`,
                                })
                              }
                              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-rose-500 hover:text-rose-300"
                            >
                              Anular
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === 'consolidado' && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-slate-950/30">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                      <span>Mes a Mes</span>
                      <input
                        type="month"
                        value={monthFilter}
                        onChange={(event) => applyMonthFilter(event.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                      />
                    </label>

                    <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                      {[
                        { key: 'hoy', label: 'Hoy' },
                        { key: 'semana', label: 'Esta Semana' },
                        { key: 'mes', label: 'Este Mes' },
                        { key: 'anio', label: 'Este Ano' },
                        { key: 'personalizado', label: 'Rango Libre' },
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => applyDatePreset(preset.key as 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado')}
                          className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            activeDatePreset === preset.key
                              ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-blue-400 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                      <span>Desde</span>
                      <input
                        type="date"
                        value={fechaDesde}
                        onChange={(event) => {
                          setFechaDesde(event.target.value);
                          setActiveDatePreset('personalizado');
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                      />
                    </label>

                    <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                      <span>Hasta</span>
                      <input
                        type="date"
                        value={fechaHasta}
                        onChange={(event) => {
                          setFechaHasta(event.target.value);
                          setActiveDatePreset('personalizado');
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                      />
                    </label>

                    <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300 sm:col-span-1 lg:col-span-2">
                      <span>Sucursal Activa</span>
                      <select
                        value={selectedBranch}
                        onChange={(event) => setSelectedBranch(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                      >
                        <option value="all">Todas las sucursales</option>
                        {sucursales.map((sucursal) => (
                          <option key={String(sucursal.id)} value={String(sucursal.id)}>
                            {sucursal.nombre}
                          </option>
                        ))}
                        <option value="corporativo">Gastos corporativos</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ventas Totales del Período</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(ventasDashboard.totalGeneral)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Presupuesto para Gastos (Ventas / 3)</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(presupuestoGastos)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Balance / Diferencia</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(balanceGastos)}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
                <table className="min-w-[960px] w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Concepto Contable</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Salarios Quincena 1 (09 al 22)', value: salariosConsolidadoQ1 },
                      { label: 'Salarios Quincena 2 (23 al 08)', value: salariosConsolidadoQ2 },
                      { label: 'Subtotal Salarios', value: salariosConsolidadoQ1 + salariosConsolidadoQ2 },
                      { label: 'Pagos Totales de Rentas', value: gastosPorCategoria.RENTAS },
                      { label: 'Pago Total de Luz', value: gastosPorCategoria.LUZ },
                      { label: 'Pago Total de Regencia', value: gastosPorCategoria.REGENCIA },
                      { label: 'Pago de Seguros', value: gastosPorCategoria.SEGUROS },
                      { label: 'Reparación de Camionetas / Vehículos', value: gastosPorCategoria.REPARACION_VEHICULOS },
                      { label: 'Cuotas IGSS', value: gastosPorCategoria.CUOTAS_IGSS },
                      { label: 'Reparaciones de Farmacias / Albañil', value: gastosPorCategoria.REPARACION_FARMACIAS + gastosPorCategoria.PAGOS_TERCEROS_ALBANIL },
                      { label: 'Multas (SAT / Municipales)', value: gastosPorCategoria.MULTAS },
                      { label: 'Pagos de Basura', value: gastosPorCategoria.BASURA },
                      { label: 'Equipos de Cómputo / Cámaras', value: gastosPorCategoria.EQUIPO_COMPUTO_CAMARAS },
                      { label: 'Gastos Varios Totales', value: gastosPorCategoria.VARIOS },
                      { label: 'TOTAL DE GASTOS DEL MES', value: totalGastosMes },
                      { label: 'PRESUPUESTO PARA GASTOS', value: presupuestoGastos },
                      { label: 'BALANCE / DIFERENCIA', value: balanceGastos },
                    ].map((row) => (
                      <tr key={row.label} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">{row.label}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">{formatCurrency(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      <ModalNuevaVentaDynamic
        isOpen={modalVentaAbierto}
        onClose={() => setModalVentaAbierto(false)}
        onSuccess={() => {
          void fetchData();
        }}
        sucursales={sucursales}
        empleados={empleados}
      />

      <ModalNuevoGasto
        isOpen={modalGastoAbierto}
        onClose={() => setModalGastoAbierto(false)}
        onSuccess={() => {
          void fetchData();
        }}
        sucursales={sucursales}
      />

      <ModalAnularRegistro
        isOpen={Boolean(itemAAnular)}
        onClose={() => setItemAAnular(null)}
        onConfirm={handleConfirmarAnulacion}
        tipo={itemAAnular?.tipo}
        detalle={itemAAnular?.detalle}
      />
    </main>
  );
}
