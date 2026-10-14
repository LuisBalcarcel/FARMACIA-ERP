'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Plus,
  Receipt,
  Search,
  Store,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import ModalAnularRegistro from '@/components/ModalAnularRegistro';
import ModalConfigurarMetas from '@/components/ModalConfigurarMetas';
import ModalNuevaSucursal from '@/components/ModalNuevaSucursal';
import ModalNuevaVenta from '@/components/ModalNuevaVenta';
import ModalNuevoGasto from '@/components/ModalNuevoGasto';
import ModalRegistrarDeposito from '@/components/ModalRegistrarDeposito';
import PanelLateralCRM from '@/components/PanelLateralCRM';
import Sidebar, { type SectionKey } from '@/components/Sidebar';
import { exportarReporteExcel, exportarReportePDF, type ExportReporteData } from '@/lib/exportUtils';
import { supabase } from '@/lib/supabase';

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
  no_paquete_remesa?: string | null;
  notas_recaudacion?: string | null;
  monto_bruto?: number;
  costo_inversion?: number;
  anulado?: boolean;
  motivo_anulacion?: string;
  anulado_en?: string;
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
  motivo_anulacion?: string;
  anulado_en?: string;
};

type ItemAAnular = {
  id: string;
  tipo: 'Venta' | 'Gasto';
  detalle: string;
};

type MetaSucursal = {
  id?: string | number;
  sucursal_id: string | number | null;
  mes: number;
  anio: number;
  meta_monto: number;
  bono_cumplimiento: number;
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
  notas?: string | null;
};

const formatCurrency = (value: number) =>
  `Q ${value.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const monthLabels = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const fallbackSucursales: Sucursal[] = [
  { id: '11111111-1111-4111-8111-111111111111', nombre: 'Sucursal Central' },
  { id: '22222222-2222-4222-8222-222222222222', nombre: 'Sucursal Norte' },
  { id: '33333333-3333-4333-8333-333333333333', nombre: 'Sucursal Sur' },
];

const fallbackEmpleados: Empleado[] = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', nombre_completo: 'María López', area: 'Ventas', sucursal_id: '11111111-1111-4111-8111-111111111111', activo: true },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', nombre_completo: 'Carlos Ruiz', area: 'Mostrador', sucursal_id: '11111111-1111-4111-8111-111111111111', activo: true },
  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', nombre_completo: 'Ana Gómez', area: 'Farmacia', sucursal_id: '22222222-2222-4222-8222-222222222222', activo: true },
  { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', nombre_completo: 'José Pérez', area: 'Regencia', sucursal_id: '33333333-3333-4333-8333-333333333333', activo: true },
];

const fallbackVentas: Venta[] = [
  { id: 1, sucursal_id: '11111111-1111-4111-8111-111111111111', empleado_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', area: 'Ventas', fecha_venta: '2026-10-10', monto_bruto: 8200, costo_inversion: 5300, anulado: false },
  { id: 2, sucursal_id: '22222222-2222-4222-8222-222222222222', empleado_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', area: 'Farmacia', fecha_venta: '2026-10-11', monto_bruto: 6300, costo_inversion: 4100, anulado: false },
  { id: 3, sucursal_id: '33333333-3333-4333-8333-333333333333', empleado_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', area: 'Regencia', fecha_venta: '2026-10-12', monto_bruto: 5400, costo_inversion: 3300, anulado: true, motivo_anulacion: 'Duplicado por ajuste del cierre', anulado_en: '2026-10-13T00:00:00.000Z' },
];

const fallbackGastos: Gasto[] = [
  { id: 1, sucursal_id: '11111111-1111-4111-8111-111111111111', categoria: 'luz', descripcion: 'Servicio eléctrico mensual', fecha_gasto: '2026-10-09', monto: 1250, es_gasto_general: false, anulado: false },
  { id: 2, sucursal_id: '11111111-1111-4111-8111-111111111111', categoria: 'mantenimiento_farmacia', descripcion: 'Reparación de cierre de farmacia', fecha_gasto: '2026-10-08', monto: 660, es_gasto_general: false, anulado: true, motivo_anulacion: 'Factura duplicada', anulado_en: '2026-10-13T00:00:00.000Z' },
  { id: 3, sucursal_id: null, categoria: 'seguros', descripcion: 'Seguro del vehículo corporativo', fecha_gasto: '2026-10-07', monto: 1750, es_gasto_general: true, anulado: false },
];

export default function Home() {
  const [modalVentaAbierto, setModalVentaAbierto] = useState(false);
  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [modalMetasAbierto, setModalMetasAbierto] = useState(false);
  const [modalSucursalAbierto, setModalSucursalAbierto] = useState(false);
  const [modalDepositoAbierto, setModalDepositoAbierto] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [itemAAnular, setItemAAnular] = useState<ItemAAnular | null>(null);
  const [crmAbierto, setCrmAbierto] = useState(false);
  const [selectedFarmaciaId, setSelectedFarmaciaId] = useState<string>('');
  const [explorerStartDate, setExplorerStartDate] = useState('');
  const [explorerEndDate, setExplorerEndDate] = useState('');
  const [sucursales, setSucursales] = useState<Sucursal[]>(fallbackSucursales);
  const [empleados, setEmpleados] = useState<Empleado[]>(fallbackEmpleados);
  const [ventas, setVentas] = useState<Venta[]>(fallbackVentas);
  const [gastos, setGastos] = useState<Gasto[]>(fallbackGastos);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [activeTable, setActiveTable] = useState<'ventas' | 'gastos' | 'nomina' | 'conciliacion'>('ventas');
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'all' | 'active' | 'anulados'>('all');
  const [metasSucursales, setMetasSucursales] = useState<MetaSucursal[]>([]);
  const [depositosRemesas, setDepositosRemesas] = useState<DepositoRemesa[]>([]);
  const [currentDateInfo, setCurrentDateInfo] = useState({ month: 1, year: 2024, iso: '2024-01-01' });
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState<'hoy' | 'semana' | 'mes' | 'personalizado'>('mes');
  const [isFrozen, setIsFrozen] = useState(false);
  const [sucursalToDelete, setSucursalToDelete] = useState<{ id: string | number; nombre: string } | null>(null);

  useEffect(() => {
    setMounted(true);

    const now = new Date();
    const relativeStart = new Date(now);
    relativeStart.setDate(now.getDate() - 29);
    const isoToday = now.toISOString().slice(0, 10);
    const isoStart = relativeStart.toISOString().slice(0, 10);

    setCurrentDateInfo({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      iso: isoToday,
    });
    setFechaDesde(isoStart);
    setFechaHasta(isoToday);
    setActiveDatePreset('mes');
  }, []);

  const applyDatePreset = useCallback((preset: 'hoy' | 'semana' | 'mes' | 'personalizado') => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (preset === 'hoy') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'semana') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'mes') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      setFechaDesde(fechaDesde || now.toISOString().slice(0, 10));
      setFechaHasta(fechaHasta || now.toISOString().slice(0, 10));
      setActiveDatePreset('personalizado');
      return;
    }

    setFechaDesde(start.toISOString().slice(0, 10));
    setFechaHasta(end.toISOString().slice(0, 10));
    setActiveDatePreset(preset);
  }, [fechaDesde, fechaHasta]);

  const parseDateOnly = (value?: string) => {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isWithinDateRange = (value?: string) => {
    if (!fechaDesde && !fechaHasta) {
      return true;
    }

    if (!value) {
      return false;
    }

    const targetDate = parseDateOnly(value);
    if (!targetDate) {
      return false;
    }

    const startDate = parseDateOnly(fechaDesde);
    const endDate = parseDateOnly(fechaHasta);

    if (startDate && targetDate < startDate) {
      return false;
    }

    if (endDate && targetDate > endDate) {
      return false;
    }

    return true;
  };

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);

    try {
      const [sucursalesResponse, empleadosResponse, ventasResponse, gastosResponse, metasResponse] = await Promise.all([
        supabase.from('sucursales').select('id, nombre, activa').order('nombre', { ascending: true }),
        supabase.from('empleados').select('id, sucursal_id, nombre_completo, area, activo').order('nombre_completo', { ascending: true }),
        supabase
          .from('ventas')
          .select(
            'id, sucursal_id, empleado_id, area, fecha_venta, fecha_inicio_corte, fecha_fin_corte, tipo_periodo, no_paquete_remesa, notas_recaudacion, monto_bruto, costo_inversion, anulado, motivo_anulacion, anulado_en',
          )
          .order('fecha_venta', { ascending: false }),
        supabase.from('gastos').select('id, sucursal_id, categoria, descripcion, fecha_gasto, monto, es_gasto_general, anulado, motivo_anulacion, anulado_en').order('fecha_gasto', { ascending: false }),
        supabase.from('metas_sucursales').select('id, sucursal_id, mes, anio, meta_monto, bono_cumplimiento').order('anio', { ascending: false }),
      ]);

      if (sucursalesResponse.error) throw sucursalesResponse.error;
      if (empleadosResponse.error) throw empleadosResponse.error;
      if (ventasResponse.error) throw ventasResponse.error;
      if (gastosResponse.error) throw gastosResponse.error;
      if (metasResponse.error) throw metasResponse.error;

      let depositosData: DepositoRemesa[] = [];
      try {
        const { data: depData, error: depError } = await supabase
          .from('depositos_remesas')
          .select('*');

        if (!depError && depData) {
          depositosData = depData as DepositoRemesa[];
        }
      } catch (e) {
        console.warn('Tabla depositos_remesas no disponible aún, usando arreglo vacío');
      }

      const activeSucursales = ((sucursalesResponse.data as Sucursal[] | null) ?? []).filter(
        (sucursal) => sucursal.activa !== false,
      );

      setSucursales(activeSucursales.length ? activeSucursales : fallbackSucursales.map((item) => ({ ...item, activa: true })));
      setEmpleados((empleadosResponse.data as Empleado[] | null)?.length ? (empleadosResponse.data as Empleado[]) : fallbackEmpleados);
      setVentas((ventasResponse.data as Venta[] | null)?.length ? (ventasResponse.data as Venta[]) : fallbackVentas);
      setGastos((gastosResponse.data as Gasto[] | null)?.length ? (gastosResponse.data as Gasto[]) : fallbackGastos);
      setMetasSucursales((metasResponse.data as MetaSucursal[] | null) ?? []);
      setDepositosRemesas(depositosData);
    } catch (error) {
      console.error('Error detallado:', JSON.stringify(error, null, 2));
      setSucursales(fallbackSucursales);
      setEmpleados(fallbackEmpleados);
      setVentas(fallbackVentas);
      setGastos(fallbackGastos);
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

  useEffect(() => {
    if (!explorerStartDate && !explorerEndDate && ventas.length > 0) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate());
      const start = new Date(maxDate);
      start.setDate(start.getDate() - 30);
      setExplorerStartDate(start.toISOString().slice(0, 10));
      setExplorerEndDate(maxDate.toISOString().slice(0, 10));
    }
  }, [explorerEndDate, explorerStartDate, ventas.length]);

  const filteredVentas = useMemo(() => {
    const normalizedSearch = tableSearch.trim().toLowerCase();

    return ventas.filter((venta) => {
      const branchMatch = selectedBranch === 'all' || String(venta.sucursal_id) === selectedBranch;
      const monthMatch =
        selectedMonth === 'all' ||
        (venta.fecha_venta && new Date(venta.fecha_venta).getMonth() + 1 === Number(selectedMonth));
      const dateRangeMatch = isWithinDateRange(venta.fecha_inicio_corte ?? venta.fecha_venta);
      const statusMatch =
        tableStatusFilter === 'all' ||
        (tableStatusFilter === 'active' && !venta.anulado) ||
        (tableStatusFilter === 'anulados' && Boolean(venta.anulado));
      const sucursalName =
        sucursales.find((item) => String(item.id) === String(venta.sucursal_id))?.nombre?.toLowerCase() ?? '';
      const notesMatch = String(venta.notas_recaudacion ?? '').toLowerCase();
      const searchMatch =
        !normalizedSearch ||
        sucursalName.includes(normalizedSearch) ||
        String(venta.area ?? '').toLowerCase().includes(normalizedSearch) ||
        notesMatch.includes(normalizedSearch);

      return branchMatch && monthMatch && dateRangeMatch && statusMatch && searchMatch;
    });
  }, [ventas, selectedBranch, selectedMonth, sucursales, tableSearch, tableStatusFilter, fechaDesde, fechaHasta]);

  const filteredGastos = useMemo(() => {
    const normalizedSearch = tableSearch.trim().toLowerCase();

    return gastos.filter((gasto) => {
      const branchMatch =
        selectedBranch === 'all' ||
        (gasto.sucursal_id === null && selectedBranch === 'corporativo') ||
        String(gasto.sucursal_id) === selectedBranch;
      const monthMatch =
        selectedMonth === 'all' ||
        (gasto.fecha_gasto && new Date(gasto.fecha_gasto).getMonth() + 1 === Number(selectedMonth));
      const dateRangeMatch = isWithinDateRange(gasto.fecha_gasto);
      const statusMatch =
        tableStatusFilter === 'all' ||
        (tableStatusFilter === 'active' && !gasto.anulado) ||
        (tableStatusFilter === 'anulados' && Boolean(gasto.anulado));
      const categoriaLabel = (gasto.categoria ?? '').replace(/_/g, ' ').toLowerCase();
      const descripcion = String(gasto.descripcion ?? '').toLowerCase();
      const sucursalName =
        gasto.sucursal_id === null
          ? 'corporativo'
          : sucursales.find((item) => String(item.id) === String(gasto.sucursal_id))?.nombre?.toLowerCase() ?? '';
      const searchMatch =
        !normalizedSearch ||
        categoriaLabel.includes(normalizedSearch) ||
        descripcion.includes(normalizedSearch) ||
        sucursalName.includes(normalizedSearch);

      return branchMatch && monthMatch && dateRangeMatch && statusMatch && searchMatch;
    });
  }, [gastos, selectedBranch, selectedMonth, sucursales, tableSearch, tableStatusFilter, fechaDesde, fechaHasta]);

  const ventasActivas = filteredVentas.filter((venta) => !venta.anulado);
  const gastosActivos = filteredGastos.filter((gasto) => !gasto.anulado);

  const nominaRows = useMemo(() => {
    const selectedMes = selectedMonth === 'all' ? currentDateInfo.month : Number(selectedMonth || currentDateInfo.month);
    const selectedYear = currentDateInfo.year;
    const filteredBySucursal =
      selectedBranch === 'all'
        ? empleados.filter((empleado) => empleado.activo !== false)
        : empleados.filter(
            (empleado) =>
              empleado.activo !== false && String(empleado.sucursal_id ?? '') === String(selectedBranch),
          );

    return filteredBySucursal.map((empleado) => {
      const baseSalario =
        empleado.area === 'Ventas' ? 2200 : empleado.area === 'Farmacia' ? 1950 : empleado.area === 'Regencia' ? 1800 : 1600;
      const porcentajeComision =
        empleado.area === 'Ventas' ? 0.08 : empleado.area === 'Farmacia' ? 0.05 : empleado.area === 'Regencia' ? 0.04 : 0.03;

      const ventaEmpleado = ventas.filter((venta) => {
        if (venta.anulado) {
          return false;
        }

        const matchesBranch =
          selectedBranch === 'all' || String(venta.sucursal_id ?? '') === String(selectedBranch);
        const matchesMonth =
          selectedMonth === 'all' ||
          (venta.fecha_venta && new Date(venta.fecha_venta).getMonth() + 1 === Number(selectedMonth));

        return (
          matchesBranch &&
          matchesMonth &&
          String(venta.empleado_id ?? '') === String(empleado.id)
        );
      }).reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);

      const ventaSucursal = ventas.filter((venta) => {
        if (venta.anulado) {
          return false;
        }

        const matchesBranch = String(venta.sucursal_id ?? '') === String(empleado.sucursal_id ?? '');
        const matchesMonth =
          selectedMonth === 'all' ||
          (venta.fecha_venta && new Date(venta.fecha_venta).getMonth() + 1 === Number(selectedMonth));

        return matchesBranch && matchesMonth;
      }).reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);

      const metaSucursal = metasSucursales.find(
        (meta) =>
          String(meta.sucursal_id ?? '') === String(empleado.sucursal_id ?? '') &&
          Number(meta.mes) === selectedMes &&
          Number(meta.anio) === selectedYear,
      );

      const metaMonto = metaSucursal?.meta_monto ?? 0;
      const bonoCumplimiento = metaSucursal?.bono_cumplimiento ?? 0;
      const porcentajeMeta = metaMonto > 0 ? (ventaSucursal / metaMonto) * 100 : 0;
      const comisionGanada = ventaEmpleado * porcentajeComision;
      const bonoMeta = metaMonto > 0 && ventaSucursal >= metaMonto ? bonoCumplimiento : 0;
      const retencionIgss = baseSalario * 0.0483;
      const bonificacionLey = 250;
      const liquido = baseSalario + bonificacionLey + comisionGanada + bonoMeta - retencionIgss;

      return {
        colaborador: empleado.nombre_completo,
        puesto: empleado.area,
        area: empleado.area,
        sucursal: sucursales.find((item) => String(item.id) === String(empleado.sucursal_id))?.nombre ?? 'Sucursal',
        salarioBase: baseSalario,
        ventaRegistrada: ventaEmpleado,
        porcentajeMeta,
        comisionGanada,
        bonoMeta,
        retencionIgss,
        liquidoPagar: liquido,
      };
    });
  }, [currentDateInfo.month, currentDateInfo.year, empleados, metasSucursales, selectedBranch, selectedMonth, sucursales, ventas]);

  const totalSalariosBase = nominaRows.reduce((sum, item) => sum + item.salarioBase, 0);
  const totalComisionesGeneradas = nominaRows.reduce((sum, item) => sum + item.comisionGanada, 0);
  const totalRetencionIgss = nominaRows.reduce((sum, item) => sum + item.retencionIgss, 0);
  const granTotalPlanillaDevengada = nominaRows.reduce((sum, item) => sum + item.liquidoPagar, 0);

  const conciliacionRows = useMemo(() => {
    const rows = sucursales
      .filter((sucursal) => String(sucursal.id) !== 'corporativo')
      .map((sucursal) => {
        const ventasSucursal = ventas.filter((venta) => {
          if (venta.anulado) {
            return false;
          }

          const sameSucursal = String(venta.sucursal_id ?? '') === String(sucursal.id);
          const monthMatch =
            selectedMonth === 'all' ||
            (venta.fecha_venta && new Date(venta.fecha_venta).getMonth() + 1 === Number(selectedMonth));

          return sameSucursal && monthMatch;
        });

        const totalRecaudado = ventasSucursal.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);
        const depositosSucursal = depositosRemesas.filter((deposito) => {
          const sameSucursal = String(deposito.sucursal_id ?? '') === String(sucursal.id);
          const monthMatch =
            selectedMonth === 'all' ||
            (deposito.fecha_deposito && new Date(deposito.fecha_deposito).getMonth() + 1 === Number(selectedMonth));

          return sameSucursal && monthMatch;
        });

        const totalDepositado = depositosSucursal.reduce(
          (sum, deposito) => sum + Number(deposito.monto_depositado ?? 0),
          0,
        );
        const diferencia = totalDepositado - totalRecaudado;

        return {
          sucursalId: String(sucursal.id),
          sucursal: sucursal.nombre,
          periodo: selectedMonth === 'all' ? 'Todo el período' : `${monthLabels[Number(selectedMonth) - 1] ?? 'Mes'} ${currentDateInfo.year}`,
          totalRecaudado,
          totalDepositado,
          diferencia,
          detalle: depositosSucursal.map((deposito) => ({
            banco: deposito.banco_receptor ?? 'Banco no especificado',
            noBoleta: deposito.no_boleta ?? 'Sin referencia',
          })),
        };
      });

    return selectedBranch === 'all' || selectedBranch === 'corporativo'
      ? rows
      : rows.filter((row) => row.sucursalId === String(selectedBranch));
  }, [currentDateInfo.year, depositosRemesas, selectedBranch, selectedMonth, sucursales, ventas]);

  const totalVentaEsperada = conciliacionRows.reduce((sum, row) => sum + row.totalRecaudado, 0);
  const totalDepositadoVerificado = conciliacionRows.reduce((sum, row) => sum + row.totalDepositado, 0);
  const saldoNetoDescuadrado = conciliacionRows.reduce((sum, row) => sum + row.diferencia, 0);

  const totalVentas = ventasActivas.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);
  const totalInversion = ventasActivas.reduce((sum, venta) => sum + Number(venta.costo_inversion ?? 0), 0);
  const gananciaBruta = totalVentas - totalInversion;
  const totalGastosGlobales = gastosActivos.reduce((sum, gasto) => sum + Number(gasto.monto ?? 0), 0);
  const comisiones = 0;
  const margen = totalVentas - totalGastosGlobales;
  const rendimiento = totalVentas > 0 ? (gananciaBruta / totalVentas) * 100 : 0;

  const formatearFechaCorta = (value?: string) => {
    if (!value) return 'Sin fecha';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsedDate);
  };

  const renderFechaVenta = (venta: Venta) => {
    const inicio = venta.fecha_inicio_corte ?? venta.fecha_venta;
    const fin = venta.fecha_fin_corte ?? venta.fecha_venta;

    if (inicio && fin && inicio !== fin) {
      return (
        <div className="space-y-1">
          <div className="text-slate-200">Del {formatearFechaCorta(inicio)} al {formatearFechaCorta(fin)}</div>
          <span className="inline-flex rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
            {venta.tipo_periodo ?? 'Rango'}
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="text-slate-200">{formatearFechaCorta(venta.fecha_venta ?? inicio ?? fin)}</div>
        {venta.tipo_periodo && (
          <span className="inline-flex rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            {venta.tipo_periodo}
          </span>
        )}
      </div>
    );
  };

  const handleDeleteSucursal = async (sucursalId: string | number, nombreSucursal: string) => {
    const hasSales = ventas.some((venta) => String(venta.sucursal_id ?? '') === String(sucursalId));

    if (!hasSales) {
      const { error } = await supabase.from('sucursales').delete().eq('id', String(sucursalId));
      if (error) {
        console.error('Error al eliminar la sucursal:', JSON.stringify(error, null, 2));
        return;
      }
    } else {
      const { error } = await supabase.from('sucursales').update({ activa: false }).eq('id', String(sucursalId));
      if (error) {
        console.error('Error al desactivar la sucursal:', JSON.stringify(error, null, 2));
        return;
      }
    }

    setSucursalToDelete(null);
    void fetchData();
  };

  const exportData = useMemo<ExportReporteData>(() => {
    const ventasBrutas = ventasActivas.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);
    const inversion = ventasActivas.reduce((sum, venta) => sum + Number(venta.costo_inversion ?? 0), 0);
    const gananciaBrutaLocal = ventasBrutas - inversion;
    const gastosTotales = gastosActivos.reduce((sum, gasto) => sum + Number(gasto.monto ?? 0), 0);
    const gananciaNeta = gananciaBrutaLocal - gastosTotales;
    const limiteTercio = ventasBrutas * 0.333;
    const cumplimiento = gastosTotales <= limiteTercio ? 'Dentro del límite' : 'Sobre el límite';

    const fechas = [
      ...ventasActivas.map((venta) => venta.fecha_venta).filter((value): value is string => Boolean(value)),
      ...gastosActivos.map((gasto) => gasto.fecha_gasto).filter((value): value is string => Boolean(value)),
    ];

    const fechasOrdenadas = fechas
      .map((date) => new Date(date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const fechaInicio = fechasOrdenadas.length > 0 ? fechasOrdenadas[0].toISOString().slice(0, 10) : currentDateInfo.iso;
    const fechaFin = fechasOrdenadas.length > 0 ? fechasOrdenadas[fechasOrdenadas.length - 1].toISOString().slice(0, 10) : currentDateInfo.iso;

    const nomina = nominaRows.map((row) => ({
      colaborador: row.colaborador,
      puesto: row.puesto,
      area: row.area,
      sucursal: row.sucursal,
      ventaIndividual: row.ventaRegistrada,
      salarioBase: row.salarioBase,
      porcentajeComision: row.comisionGanada > 0 && row.ventaRegistrada > 0 ? row.comisionGanada / row.ventaRegistrada : 0,
      comisionGanada: row.comisionGanada,
      bonoMeta: row.bonoMeta,
      retencionIgss: row.retencionIgss,
      liquidoPagar: row.liquidoPagar,
      porcentajeMeta: row.porcentajeMeta,
      totalDevengado: row.salarioBase + row.comisionGanada + row.bonoMeta,
    }));

    const gastosReporte = gastosActivos.map((gasto) => ({
      fecha: gasto.fecha_gasto ?? currentDateInfo.iso,
      categoria: gasto.categoria ?? 'Sin categoría',
      descripcion: gasto.descripcion ?? 'Sin descripción',
      tipo: (gasto.es_gasto_general ? 'Corporativo' : 'Local') as 'Local' | 'Corporativo',
      monto: Number(gasto.monto ?? 0),
    }));

    const selectedBranchLabel =
      selectedBranch === 'all' ? 'Todas las sucursales' : selectedBranch === 'corporativo' ? 'Gastos corporativos' : sucursales.find((item) => String(item.id) === selectedBranch)?.nombre ?? 'Sucursal';

    return {
      fechaInicio,
      fechaFin,
      rangoTexto: selectedMonth === 'all' ? 'Todo el período' : `${monthLabels[Number(selectedMonth) - 1] ?? 'Periodo'} ${currentDateInfo.year}`,
      sucursal: selectedBranchLabel,
      resumen: {
        ventasBrutas,
        inversion,
        gananciaBruta: gananciaBrutaLocal,
        gastosTotales,
        gananciaNeta,
        limiteTercio,
        cumplimiento,
      },
      nomina,
      gastos: gastosReporte,
      ventas: ventasActivas.map((venta) => ({
        fechaInicio: venta.fecha_inicio_corte ?? venta.fecha_venta ?? currentDateInfo.iso,
        fechaFin: venta.fecha_fin_corte ?? venta.fecha_venta ?? currentDateInfo.iso,
        tipoPeriodo: venta.tipo_periodo ?? 'Rango',
        sucursal: sucursales.find((item) => String(item.id) === String(venta.sucursal_id))?.nombre ?? 'Sucursal',
        monto: Number(venta.monto_bruto ?? 0),
        notas: venta.notas_recaudacion ?? `Venta ${venta.tipo_periodo ?? 'general'}`,
      })),
      conciliacion: conciliacionRows.map((row) => ({
        sucursal: row.sucursal,
        periodo: row.periodo,
        totalRecaudado: row.totalRecaudado,
        totalDepositado: row.totalDepositado,
        diferencia: row.diferencia,
        detalle: row.detalle,
      })),
    };
  }, [conciliacionRows, currentDateInfo.iso, currentDateInfo.year, gastosActivos, selectedBranch, selectedMonth, sucursales, ventasActivas, empleados]);

  const handleExportarExcel = async (): Promise<void> => {
    console.log('Click Excel');

    if (exportando) {
      return;
    }

    setExportando(true);

    try {
      console.log('Inicio export Excel');
      exportarReporteExcel(exportData);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
    } finally {
      setExportando(false);
    }
  };

  const handleExportarPDF = async (): Promise<void> => {
    console.log('Click PDF');

    if (exportando) {
      return;
    }

    setExportando(true);

    try {
      exportarReportePDF(exportData);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
    } finally {
      setExportando(false);
    }
  };

  const handleConfirmarAnulacion = useCallback(
    async (motivo: string) => {
      if (!itemAAnular) {
        return;
      }

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
    },
    [fetchData, itemAAnular],
  );

  const handleBotonVenta = () => {
    console.log('Click Venta');
    setModalVentaAbierto(true);
  };

  const handleBotonGasto = () => {
    console.log('Click Gasto');
    setModalGastoAbierto(true);
  };

  const abrirModalAnulacion = (id: string | number, tipo: 'Venta' | 'Gasto', descripcion: string) => {
    setItemAAnular({
      id: String(id),
      tipo,
      detalle: descripcion,
    });
  };

  const farmaciaData = useMemo(() => {
    const activeRows = ventasActivas.filter((venta) => {
      if (!selectedFarmaciaId) {
        return true;
      }

      const sameFarmacia = String(venta.sucursal_id) === selectedFarmaciaId;
      if (!sameFarmacia) {
        return false;
      }

      const inicio = venta.fecha_inicio_corte ?? venta.fecha_venta;
      const fin = venta.fecha_fin_corte ?? venta.fecha_venta;

      if (!explorerStartDate || !explorerEndDate) {
        return true;
      }

      if (!inicio || !fin) {
        return true;
      }

      return inicio <= explorerEndDate && fin >= explorerStartDate;
    });

    const totalVendido = activeRows.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);
    const inversion = activeRows.reduce((sum, venta) => sum + Number(venta.costo_inversion ?? 0), 0);
    const margenLocal = totalVendido - inversion;
    const promedioDiario = activeRows.length > 0 ? totalVendido / Math.max(1, activeRows.length) : 0;

    return {
      totalVendido,
      inversion,
      margenLocal,
      promedioDiario,
      entregas: activeRows.length,
      rows: activeRows,
    };
  }, [explorerEndDate, explorerStartDate, selectedFarmaciaId, ventasActivas]);

  const selectedFarmaciaName =
    sucursales.find((item) => String(item.id) === selectedFarmaciaId)?.nombre ?? 'Farmacia';

  const sectionTitleMap: Record<SectionKey, string> = {
    dashboard: 'Dashboard Financiero',
    crm: 'Explorador CRM Farmacias',
    nomina: 'Nómina y Comisiones',
    conciliacion: 'Conciliación Bancaria',
  };

  const handleSidebarSection = (section: SectionKey) => {
    setActiveSection(section);

    if (section === 'crm') {
      setCrmAbierto(true);
      return;
    }

    if (section === 'dashboard') {
      setActiveTable('ventas');
      return;
    }

    if (section === 'nomina') {
      setActiveTable('nomina');
      return;
    }

    if (section === 'conciliacion') {
      setActiveTable('conciliacion');
    }
  };

  const handleQuickAction = (action: 'venta' | 'gasto' | 'farmacia') => {
    if (action === 'venta') {
      handleBotonVenta();
      return;
    }

    if (action === 'gasto') {
      handleBotonGasto();
      return;
    }

    setModalSucursalAbierto(true);
  };

  const selectedSectionTitle = sectionTitleMap[activeSection];

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSidebarSection}
        onQuickAction={handleQuickAction}
        onExportExcel={() => {
          void handleExportarExcel();
        }}
        onExportPdf={() => {
          void handleExportarPDF();
        }}
      />

      <div className="pl-64">
        <header className="border-b border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20 backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-300">ERP farmacéutico</p>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{selectedSectionTitle}</h1>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex flex-wrap items-center gap-2">
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

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 p-2">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(event) => {
                      setFechaDesde(event.target.value);
                      setActiveDatePreset('personalizado');
                    }}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(event) => {
                      setFechaHasta(event.target.value);
                      setActiveDatePreset('personalizado');
                    }}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'hoy', label: 'Hoy' },
                  { key: 'semana', label: 'Semana' },
                  { key: 'mes', label: 'Mes' },
                  { key: 'personalizado', label: 'Personalizado' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyDatePreset(preset.key as 'hoy' | 'semana' | 'mes' | 'personalizado')}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                      activeDatePreset === preset.key
                        ? 'border-orange-500/40 bg-orange-500/10 text-orange-200'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsFrozen((current) => !current)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    isFrozen
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-400 hover:text-white'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  {isFrozen ? 'Descongelar Vista' : 'Congelar Vista'}
                </button>
              </div>
            </div>
          </div>

          {isFrozen && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200">
              <Lock className="h-3.5 w-3.5" />
              Vista Congelada para Auditoría
            </div>
          )}
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {isLoadingData && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
            Actualizando información del ERP...
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Ventas activas', value: formatCurrency(totalVentas), accent: 'blue', icon: DollarSign },
            { label: 'Inversión total', value: formatCurrency(totalInversion), accent: 'blue', icon: Receipt },
            { label: 'Ganancia bruta', value: formatCurrency(gananciaBruta), accent: 'amber', icon: DollarSign },
            { label: 'Gastos operativos', value: formatCurrency(totalGastosGlobales), accent: 'rose', icon: Receipt },
            { label: 'Rendimiento', value: `${rendimiento.toFixed(1)}%`, accent: 'cyan', icon: DollarSign },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-950/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                  <span className={`rounded-lg border p-2 ${card.accent === 'emerald' ? 'border-blue-500/40 bg-blue-950/40 text-blue-300' : card.accent === 'blue' ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : card.accent === 'amber' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : card.accent === 'rose' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className={`mt-4 text-xl font-semibold ${card.accent === 'emerald' ? 'text-emerald-400' : card.accent === 'blue' ? 'text-blue-300' : card.accent === 'amber' ? 'text-amber-300' : card.accent === 'rose' ? 'text-rose-400' : 'text-cyan-300'}`}>
                  {card.value}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mt-6">
          {(() => {
            const gananciaBrutaValida = gananciaBruta > 0 ? gananciaBruta : 0;
            const gastoRatio = gananciaBrutaValida > 0 ? (totalGastosGlobales / gananciaBrutaValida) * 100 : 0;

            let estado: 'SALUDABLE' | 'PRECAUCIÓN' | 'CRÍTICO' = 'SALUDABLE';
            let borderClass = 'border-blue-500/40 bg-blue-950/40 text-blue-100';
            let labelClass = 'text-blue-300';
            let leyenda = `Los gastos operativos representan el ${gastoRatio.toFixed(1)}% del margen. Se encuentra dentro del límite presupuestario.`;

            if (gananciaBruta <= 0 || gastoRatio > 45) {
              estado = 'CRÍTICO';
              borderClass = 'border-rose-500/40 bg-rose-500/10 text-rose-200';
              labelClass = 'text-rose-300';
              leyenda = `Gastos operativos excesivos (${gastoRatio.toFixed(1)}%). Requiere auditoría inmediata.`;
            } else if (gastoRatio > 33.3) {
              estado = 'PRECAUCIÓN';
              borderClass = 'border-amber-500/40 bg-amber-500/10 text-amber-200';
              labelClass = 'text-amber-300';
              leyenda = `Los gastos operativos representan el ${gastoRatio.toFixed(1)}% y exceden el tercio sugerido.`;
            }

            return (
              <div className={`rounded-2xl border p-4 shadow-lg shadow-slate-950/30 ${borderClass}`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">Diagnóstico financiero</p>
                    <div className={`mt-2 inline-flex rounded-full border border-current bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${labelClass}`}>
                      {estado}
                    </div>
                  </div>
                  <div className="text-sm text-slate-100">
                    <span className="font-semibold">Gastos:</span> {formatCurrency(totalGastosGlobales)}
                    <span className="mx-2 text-slate-400">•</span>
                    <span className="font-semibold">Margen bruto:</span> {formatCurrency(gananciaBruta)}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-200">{leyenda}</p>
              </div>
            );
          })()}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-950/30 backdrop-blur">
          <div className="border-b border-slate-800 bg-slate-950/60 p-3 sm:p-4">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="inline-flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/90 p-1.5">
                {[
                  { key: 'ventas', label: 'Ventas y Recaudaciones', count: filteredVentas.length },
                  { key: 'gastos', label: 'Gastos Operativos', count: filteredGastos.length },
                  { key: 'nomina', label: 'Nómina y Colaboradores', count: nominaRows.length },
                  { key: 'conciliacion', label: 'Conciliación Bancaria y Cuadres', count: conciliacionRows.length },
                ].map((tab) => {
                  const isActive = activeTable === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTable(tab.key as 'ventas' | 'gastos' | 'nomina' | 'conciliacion')}
                      className={`whitespace-nowrap flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-orange-600/90 text-white font-semibold shadow-sm shadow-orange-950/40'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex w-full items-center gap-3 xl:w-auto">
                {activeTable === 'conciliacion' ? (
                  <button
                    type="button"
                    onClick={() => setModalDepositoAbierto(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/40 transition hover:bg-cyan-400"
                  >
                    <Plus className="h-4 w-4" />
                    Registrar Boleta de Depósito
                  </button>
                ) : (
                  <>
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(event) => setTableSearch(event.target.value)}
                      placeholder={
                        activeTable === 'ventas'
                          ? 'Buscar sucursal, área o notas...'
                          : activeTable === 'gastos'
                            ? 'Buscar categoría, descripción o sucursal...'
                            : 'Buscar colaborador, sucursal o área...'
                      }
                      className="relative flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none xl:w-72"
                    />

                    <select
                      value={tableStatusFilter}
                      onChange={(event) => setTableStatusFilter(event.target.value as 'all' | 'active' | 'anulados')}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="all">Todos</option>
                      <option value="active">Solo activos</option>
                      <option value="anulados">Solo anulados</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTable === 'ventas' ? (
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Período / Fecha</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Sucursal</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Notas / Arqueo</th>
                    <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Total Venta</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 font-medium text-center whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVentas.map((venta) => {
                    const isAnulado = Boolean(venta.anulado);
                    const sucursalNombre =
                      sucursales.find((item) => String(item.id) === String(venta.sucursal_id))?.nombre ?? 'Sucursal';
                    const notas = venta.notas_recaudacion?.trim() || '-';

                    return (
                      <tr
                        key={String(venta.id)}
                        className={`${isAnulado ? 'opacity-40 line-through' : ''} border-t border-slate-800 bg-slate-900/40 align-top`}
                      >
                        <td className="px-4 py-3 text-slate-200">
                          <div className="space-y-1 whitespace-nowrap">
                            <div className="font-medium text-slate-100">
                              {venta.fecha_inicio_corte && venta.fecha_fin_corte && venta.fecha_inicio_corte !== venta.fecha_fin_corte
                                ? `${formatearFechaCorta(venta.fecha_inicio_corte)} - ${formatearFechaCorta(venta.fecha_fin_corte)}`
                                : formatearFechaCorta(venta.fecha_venta ?? venta.fecha_inicio_corte ?? venta.fecha_fin_corte)}
                            </div>
                            {venta.tipo_periodo && (
                              <span className="inline-flex rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                                {venta.tipo_periodo}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-200">
                          <div className="max-w-[220px] whitespace-nowrap font-semibold text-slate-100">{sucursalNombre}</div>
                          {venta.area && <div className="mt-1 text-[11px] text-slate-400">{venta.area}</div>}
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          <div className="max-w-xs truncate" title={notas === '-' ? undefined : notas}>
                            {notas}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold whitespace-nowrap">
                          {formatCurrency(Number(venta.monto_bruto ?? 0))}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {isAnulado ? (
                            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                              Anulado
                            </span>
                          ) : (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                              Activo
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isAnulado}
                            onClick={() => abrirModalAnulacion(venta.id, 'Venta', `Venta por ${formatCurrency(Number(venta.monto_bruto ?? 0))}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-rose-500 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {isAnulado ? 'Anulado' : 'Anular'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : activeTable === 'gastos' ? (
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Fecha</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Categoría</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Descripción</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Tipo</th>
                    <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Monto</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 font-medium text-center whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGastos.map((gasto) => {
                    const isAnulado = Boolean(gasto.anulado);
                    const categoriaLabel = (gasto.categoria ?? 'otros').replace(/_/g, ' ');
                    const descripcion = gasto.descripcion ?? 'Sin descripción';

                    return (
                      <tr
                        key={String(gasto.id)}
                        className={`${isAnulado ? 'opacity-40 line-through' : ''} border-t border-slate-800 bg-slate-900/40 align-top`}
                      >
                        <td className="px-4 py-3 text-slate-200 whitespace-nowrap">{formatearFechaCorta(gasto.fecha_gasto)}</td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                            {categoriaLabel}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          <div className="max-w-md truncate" title={descripcion}>{descripcion}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                            gasto.es_gasto_general
                              ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          }`}>
                            {gasto.es_gasto_general ? 'Corporativo' : 'Local'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-rose-400 font-semibold whitespace-nowrap">
                          {formatCurrency(Number(gasto.monto ?? 0))}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {isAnulado ? (
                            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                              Anulado
                            </span>
                          ) : (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                              Activo
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isAnulado}
                            onClick={() => abrirModalAnulacion(gasto.id, 'Gasto', `Gasto de ${gasto.descripcion ?? 'gasto'} por ${formatCurrency(Number(gasto.monto ?? 0))}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-rose-500 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {isAnulado ? 'Anulado' : 'Anular'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : activeTable === 'nomina' ? (
              <div className="p-4">
                <div className="mb-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Salario base</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(totalSalariosBase)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Comisiones</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-300">{formatCurrency(totalComisionesGeneradas)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">IGSS</p>
                    <p className="mt-2 text-lg font-semibold text-amber-300">{formatCurrency(totalRetencionIgss)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Neto</p>
                    <p className="mt-2 text-lg font-semibold text-cyan-300">{formatCurrency(granTotalPlanillaDevengada)}</p>
                  </div>
                </div>

                <table className="min-w-[1200px] w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Colaborador</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Sucursal</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Área</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Venta</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Salario</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">% Meta</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Comisión</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Bono Meta</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">IGSS</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nominaRows.map((row) => (
                      <tr key={`${row.colaborador}-${row.sucursal}`} className="border-t border-slate-800 bg-slate-900/40 align-top">
                        <td className="px-4 py-3 text-slate-200">
                          <div className="font-medium text-white">{row.colaborador}</div>
                          <div className="text-[11px] text-slate-400">{row.puesto}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{row.sucursal}</td>
                        <td className="px-4 py-3 text-slate-300">{row.area}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.ventaRegistrada)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">{formatCurrency(row.salarioBase)}</td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-300">{`${(row.porcentajeMeta || 0).toFixed(1)}%`}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-300">{formatCurrency(row.comisionGanada)}</td>
                        <td className="px-4 py-3 text-right font-mono text-violet-300">{formatCurrency(row.bonoMeta)}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-300">{formatCurrency(row.retencionIgss)}</td>
                        <td className="px-4 py-3 text-right font-mono text-white font-semibold">{formatCurrency(row.liquidoPagar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <div className="mb-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Total venta esperada</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-300">{formatCurrency(totalVentaEsperada)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Total depositado</p>
                    <p className="mt-2 text-lg font-semibold text-cyan-300">{formatCurrency(totalDepositadoVerificado)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Saldo neto descuadrado</p>
                    <p className={`mt-2 text-lg font-semibold ${saldoNetoDescuadrado === 0 ? 'text-emerald-300' : saldoNetoDescuadrado < 0 ? 'text-rose-300' : 'text-blue-300'}`}>
                      {formatCurrency(saldoNetoDescuadrado)}
                    </p>
                  </div>
                </div>

                <table className="min-w-[1200px] w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Farmacia / Sucursal</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Período de Corte</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Total Recaudado / Ventas Sistema</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Total Depositado en Banco</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Diferencia</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Detalle de Boletas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conciliacionRows.map((row) => {
                      const diferencia = row.diferencia;
                      const badgeClass =
                        diferencia === 0
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : diferencia < 0
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                            : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200';

                      const badgeLabel =
                        diferencia === 0
                          ? 'CUADRADO PERFECTO (Q 0.00)'
                          : diferencia < 0
                            ? `FALTANTE (-Q ${Math.abs(diferencia).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                            : `SOBRANTE (+Q ${Math.abs(diferencia).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;

                      return (
                        <tr key={row.sucursalId} className="border-t border-slate-800 bg-slate-900/40 align-top">
                          <td className="px-4 py-3 text-slate-200">
                            <div className="font-medium text-white">{row.sucursal}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{row.periodo}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-300">{formatCurrency(row.totalRecaudado)}</td>
                          <td className="px-4 py-3 text-right font-mono text-cyan-300">{formatCurrency(row.totalDepositado)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-100">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {row.detalle.length > 0 ? (
                              <div className="space-y-1">
                                {row.detalle.slice(0, 3).map((detalle, index) => (
                                  <div key={`${detalle.banco}-${detalle.noBoleta}-${index}`} className="text-xs">
                                    {detalle.banco} • {detalle.noBoleta}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">Sin boletas registradas</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>

      <PanelLateralCRM
        isOpen={crmAbierto}
        onClose={() => setCrmAbierto(false)}
        sucursales={sucursales}
        ventas={ventasActivas}
        gastos={gastosActivos}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        onDeleteSucursal={(sucursalId, nombreSucursal) => {
          setSucursalToDelete({ id: sucursalId, nombre: nombreSucursal });
        }}
      />

      {sucursalToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60">
            <div className="border-b border-slate-700 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-300">Confirmación</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Eliminar farmacia</h3>
            </div>
            <div className="space-y-4 px-5 py-5 text-sm text-slate-200">
              <p>
                ¿Estás seguro de que deseas eliminar la farmacia <span className="font-semibold text-white">{sucursalToDelete.nombre}</span>?
              </p>
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100">
                Si tiene ventas registradas, pasará a estado inactivo para preservar el récord contable histórico.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSucursalToDelete(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleDeleteSucursal(sucursalToDelete.id, sucursalToDelete.nombre);
                  }}
                  className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-400"
                >
                  Confirmar eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalNuevaVenta
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

      <ModalConfigurarMetas
        isOpen={modalMetasAbierto}
        onClose={() => setModalMetasAbierto(false)}
        onSaved={() => {
          void fetchData();
        }}
        sucursales={sucursales}
      />

      <ModalNuevaSucursal
        isOpen={modalSucursalAbierto}
        onClose={() => setModalSucursalAbierto(false)}
        onSuccess={() => {
          void fetchData();
        }}
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
        isOpen={!!itemAAnular}
        onClose={() => setItemAAnular(null)}
        onConfirm={handleConfirmarAnulacion}
        tipo={itemAAnular?.tipo}
        detalle={itemAAnular?.detalle}
      />
    </main>
  );
}
