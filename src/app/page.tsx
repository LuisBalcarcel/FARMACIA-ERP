'use client';

export const dynamic = 'force-dynamic';

import NextDynamic from 'next/dynamic';
import { Menu, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import VentasRecaudacionesDashboard from '../components/VentasRecaudacionesDashboard';
import ModalAnularRegistro from '@/components/ModalAnularRegistro';
import ModalNuevoGasto from '@/components/ModalNuevoGasto';
import ModalRegistrarDeposito from '@/components/ModalRegistrarDeposito';
import Sidebar, { type SectionKey } from '@/components/Sidebar';
import {
  calculateCascade,
  getOverlapDays,
  getQuincenaRange,
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
  activa?: boolean;
};

type Empleado = {
  id: string | number;
  nombre_completo: string;
  area: string;
  sucursal_id: string | number | null;
  activo?: boolean;
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

type DepositoRemesa = {
  id?: string | number;
  sucursal_id?: string | number | null;
  banco_receptor?: string | null;
  no_boleta?: string | null;
  fecha_deposito?: string | null;
  fecha_inicio_corte?: string | null;
  fecha_fin_corte?: string | null;
  monto_depositado?: number | null;
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
  empleadoId: string;
  colaborador: string;
  area: string;
  sucursal: string;
  salarioBase: number;
  igss: number;
  bonoSugerido: number;
  bonoAplicado: number;
  esBonoManual: boolean;
  salarioNeto: number;
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

const salaryByArea = (area: string): number => {
  if (area === 'Ventas') return 2200;
  if (area === 'Farmacia') return 1950;
  if (area === 'Regencia') return 1800;
  return 1600;
};

const isDependienteArea = (area: string): boolean => {
  const normalized = area.toLowerCase();
  return normalized.includes('farmacia') || normalized.includes('mostrador') || normalized.includes('venta');
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('ventas');
  const [modalVentaAbierto, setModalVentaAbierto] = useState(false);
  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [modalDepositoAbierto, setModalDepositoAbierto] = useState(false);
  const [itemAAnular, setItemAAnular] = useState<ItemAAnular | null>(null);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [depositosRemesas, setDepositosRemesas] = useState<DepositoRemesa[]>([]);

  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedFarmaciaId, setSelectedFarmaciaId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState<'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado'>('mes');
  const [moneyFilterMode, setMoneyFilterMode] = useState<MoneyFilterMode>('none');
  const [moneyFilterValue, setMoneyFilterValue] = useState('');
  const [quincenaActiva, setQuincenaActiva] = useState<'Q1' | 'Q2'>('Q1');
  const [manualBonos, setManualBonos] = useState<Record<string, number>>({});
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

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);

    try {
      const [sucursalesResponse, empleadosResponse, ventasResponse, gastosResponse] = await Promise.all([
        supabase.from('sucursales').select('id, nombre, activa').order('nombre', { ascending: true }),
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
        const { data: depositosData, error: depositosError } = await supabase
          .from('depositos_remesas')
          .select('*')
          .order('fecha_deposito', { ascending: false });

        if (depositosError) {
          throw depositosError;
        }

        setDepositosRemesas((depositosData as DepositoRemesa[] | null) ?? []);
      } catch (depositosError) {
        console.error('Error cargando depósitos/remesas:', depositosError);
        setDepositosRemesas([]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setSucursales([]);
      setEmpleados([]);
      setVentas([]);
      setGastos([]);
      setDepositosRemesas([]);
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
      setActiveDatePreset(preset);
    },
    [fechaDesde, fechaHasta],
  );

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

  const quincenaRange = useMemo(() => {
    const base = fechaHasta || new Date().toISOString().slice(0, 10);
    return getQuincenaRange(base, quincenaActiva);
  }, [fechaHasta, quincenaActiva]);

  const ventasQuincena = useMemo(() => {
    return ventasDashboard.ventasActivas.filter((venta) => {
      const date = venta.fecha_fin_corte ?? venta.fecha_venta;
      if (!date) return false;
      return isDateInRange(date, quincenaRange.desde, quincenaRange.hasta);
    });
  }, [ventasDashboard.ventasActivas, quincenaRange.desde, quincenaRange.hasta]);

  const totalVentasQuincena = useMemo(
    () => ventasQuincena.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0),
    [ventasQuincena],
  );

  const cascadeQuincena = useMemo(() => calculateCascade(totalVentasQuincena), [totalVentasQuincena]);

  const empleadosActivos = useMemo(() => {
    if (selectedBranch === 'all' || selectedBranch === 'corporativo') {
      return empleados.filter((empleado) => empleado.activo !== false);
    }

    return empleados.filter(
      (empleado) =>
        empleado.activo !== false && String(empleado.sucursal_id ?? '') === String(selectedBranch),
    );
  }, [empleados, selectedBranch]);

  const ventaSucursalMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const venta of ventasQuincena) {
      const key = String(venta.sucursal_id ?? '');
      map[key] = (map[key] ?? 0) + Number(venta.monto_bruto ?? 0);
    }
    return map;
  }, [ventasQuincena]);

  const dependientesSucursalMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const empleado of empleadosActivos) {
      if (!isDependienteArea(empleado.area)) continue;
      const key = String(empleado.sucursal_id ?? '');
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [empleadosActivos]);

  const makeManualKey = useCallback(
    (empleadoId: string | number) => `${String(empleadoId)}_${quincenaRange.desde}_${quincenaRange.hasta}`,
    [quincenaRange.desde, quincenaRange.hasta],
  );

  const planillaRows = useMemo<PlanillaRow[]>(() => {
    return empleadosActivos.map((empleado) => {
      const base = salaryByArea(empleado.area);
      const sucursalKey = String(empleado.sucursal_id ?? '');
      const ventaSucursal = ventaSucursalMap[sucursalKey] ?? 0;
      const share = totalVentasQuincena > 0 ? ventaSucursal / totalVentasQuincena : 0;
      const poolSucursal = cascadeQuincena.bonoDependientes * share;
      const countDependientes = dependientesSucursalMap[sucursalKey] ?? 1;
      const bonoSugerido = isDependienteArea(empleado.area) ? poolSucursal / countDependientes : 0;

      const key = makeManualKey(empleado.id);
      const manual = manualBonos[key];
      const esManual = Number.isFinite(manual);
      const bonoAplicado = esManual ? manual : bonoSugerido;

      const igss = base * 0.0483;
      const bonificacionLey = 250;
      const salarioNeto = base + bonificacionLey + bonoAplicado - igss;

      return {
        empleadoId: String(empleado.id),
        colaborador: empleado.nombre_completo,
        area: empleado.area,
        sucursal: sucursales.find((item) => String(item.id) === sucursalKey)?.nombre ?? 'Sucursal',
        salarioBase: base,
        igss,
        bonoSugerido,
        bonoAplicado,
        esBonoManual: esManual,
        salarioNeto,
      };
    });
  }, [empleadosActivos, ventaSucursalMap, totalVentasQuincena, cascadeQuincena.bonoDependientes, dependientesSucursalMap, makeManualKey, manualBonos, sucursales]);

  const persistManualBonos = useCallback((next: Record<string, number>) => {
    setManualBonos(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('planilla_bonos_manual_v1', JSON.stringify(next));
    }
  }, []);

  const handleBonoManualChange = (empleadoId: string, value: string) => {
    const key = makeManualKey(empleadoId);
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

  const resetBonoAutomatico = (empleadoId: string) => {
    const key = makeManualKey(empleadoId);
    const next = { ...manualBonos };
    delete next[key];
    persistManualBonos(next);
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

  const planillaTotalQuincena = useCallback(
    (quincena: 'Q1' | 'Q2') => {
      const period = getQuincenaRange(fechaHasta || new Date().toISOString().slice(0, 10), quincena);
      const ventasPeriodo = ventasDashboard.ventasActivas.filter((venta) => {
        const date = venta.fecha_fin_corte ?? venta.fecha_venta;
        return Boolean(date) && isDateInRange(String(date), period.desde, period.hasta);
      });

      const totalVentasPeriodo = ventasPeriodo.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);
      const cascade = calculateCascade(totalVentasPeriodo);

      const ventaSucursal: Record<string, number> = {};
      for (const venta of ventasPeriodo) {
        const key = String(venta.sucursal_id ?? '');
        ventaSucursal[key] = (ventaSucursal[key] ?? 0) + Number(venta.monto_bruto ?? 0);
      }

      const dependientes: Record<string, number> = {};
      for (const empleado of empleadosActivos) {
        if (!isDependienteArea(empleado.area)) continue;
        const key = String(empleado.sucursal_id ?? '');
        dependientes[key] = (dependientes[key] ?? 0) + 1;
      }

      return empleadosActivos.reduce((sum, empleado) => {
        const base = salaryByArea(empleado.area);
        const sucursalKey = String(empleado.sucursal_id ?? '');
        const venta = ventaSucursal[sucursalKey] ?? 0;
        const share = totalVentasPeriodo > 0 ? venta / totalVentasPeriodo : 0;
        const pool = cascade.bonoDependientes * share;
        const count = dependientes[sucursalKey] ?? 1;
        const bono = isDependienteArea(empleado.area) ? pool / count : 0;
        const igss = base * 0.0483;
        return sum + (base + 250 + bono - igss);
      }, 0);
    },
    [fechaHasta, ventasDashboard.ventasActivas, empleadosActivos],
  );

  const salariosQ1 = useMemo(() => planillaTotalQuincena('Q1'), [planillaTotalQuincena]);
  const salariosQ2 = useMemo(() => planillaTotalQuincena('Q2'), [planillaTotalQuincena]);

  const totalGastosMes = useMemo(() => {
    const subtotalSalarios = salariosQ1 + salariosQ2;
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
  }, [gastosPorCategoria, salariosQ1, salariosQ2]);

  const presupuestoGastos = useMemo(() => ventasDashboard.totalGeneral / 3, [ventasDashboard.totalGeneral]);
  const balanceGastos = useMemo(() => presupuestoGastos - totalGastosMes, [presupuestoGastos, totalGastosMes]);

  const conciliacionRows = useMemo(() => {
    const sucursalesFiltradas =
      selectedBranch === 'all' || selectedBranch === 'corporativo'
        ? sucursales
        : sucursales.filter((item) => String(item.id) === selectedBranch);

    return sucursalesFiltradas.map((sucursal) => {
      const sucursalId = String(sucursal.id);
      const totalRecaudado = ventasDashboard.ventasActivas
        .filter((venta) => String(venta.sucursal_id ?? '') === sucursalId)
        .reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);

      const totalDepositado = depositosRemesas
        .filter((deposito) => String(deposito.sucursal_id ?? '') === sucursalId)
        .filter((deposito) => isDateInRange(deposito.fecha_deposito ?? '', fechaDesde, fechaHasta))
        .reduce((sum, deposito) => sum + Number(deposito.monto_depositado ?? 0), 0);

      return {
        sucursalId,
        sucursal: sucursal.nombre,
        totalRecaudado,
        totalDepositado,
        diferencia: totalDepositado - totalRecaudado,
      };
    });
  }, [sucursales, selectedBranch, ventasDashboard.ventasActivas, depositosRemesas, fechaDesde, fechaHasta]);

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

  const sectionTitleMap: Record<SectionKey, string> = {
    ventas: 'Ventas y Recaudaciones',
    planilla: 'Planilla y Bonificaciones',
    gastos: 'Gastos y Gastos Fijos',
    consolidado: 'Consolidado Mensual de Gastos',
    conciliacion: 'Conciliación Bancaria',
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

          {activeSection === 'planilla' && (
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Corte activo</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {quincenaActiva === 'Q1' ? 'Quincena 1 (09 al 22)' : 'Quincena 2 (23 al 08)'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(quincenaRange.desde)} - {formatDate(quincenaRange.hasta)}</p>
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
                      <th className="px-4 py-3">Sucursal</th>
                      <th className="px-4 py-3 text-right">Salario Base</th>
                      <th className="px-4 py-3 text-right">IGSS</th>
                      <th className="px-4 py-3 text-right">Bono Sugerido</th>
                      <th className="px-4 py-3">Bono Manual</th>
                      <th className="px-4 py-3 text-right">Bono Aplicado</th>
                      <th className="px-4 py-3 text-right">Salario Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planillaRows.map((row) => (
                      <tr key={row.empleadoId} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">
                          <div className="font-medium text-white">{row.colaborador}</div>
                          <div className="text-[11px] text-slate-400">{row.area}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{row.sucursal}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.salarioBase)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.igss)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.bonoSugerido)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.esBonoManual ? String(row.bonoAplicado) : ''}
                              onChange={(event) => handleBonoManualChange(row.empleadoId, event.target.value)}
                              placeholder="Automático"
                              className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => resetBonoAutomatico(row.empleadoId)}
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
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === 'gastos' && (
            <section className="space-y-4">
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
                      { label: 'Salarios Quincena 1 (09 al 22)', value: salariosQ1 },
                      { label: 'Salarios Quincena 2 (23 al 08)', value: salariosQ2 },
                      { label: 'Subtotal Salarios', value: salariosQ1 + salariosQ2 },
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

          {activeSection === 'conciliacion' && (
            <section className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setModalDepositoAbierto(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Registrar Boleta de Depósito
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
                <table className="min-w-[960px] w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Sucursal</th>
                      <th className="px-4 py-3 text-right">Total Recaudado</th>
                      <th className="px-4 py-3 text-right">Total Depositado</th>
                      <th className="px-4 py-3 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conciliacionRows.map((row) => (
                      <tr key={row.sucursalId} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">{row.sucursal}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.totalRecaudado)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.totalDepositado)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.diferencia)}</td>
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

      <ModalRegistrarDeposito
        isOpen={modalDepositoAbierto}
        onClose={() => setModalDepositoAbierto(false)}
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
