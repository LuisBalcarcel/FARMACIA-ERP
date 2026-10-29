'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildDescripcionConVigencia, CATEGORIAS_GASTO, normalizeCategoria, type CategoriaGasto } from '@/lib/contabilidad';
import { supabase } from '@/lib/supabase';

type Sucursal = {
  id: string | number;
  nombre: string;
};

type ModalNuevoGastoProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sucursales: Sucursal[];
};

const categoriasGasto = CATEGORIAS_GASTO.map((categoria) => ({
  value: categoria,
  label: categoria.replace(/_/g, ' '),
}));

const categoriaParaSupabase: Record<CategoriaGasto, string> = {
  RENTAS: 'renta',
  LUZ: 'luz',
  REGENCIA: 'regencia',
  SEGUROS: 'seguros',
  REPARACION_VEHICULOS: 'camionetas',
  CUOTAS_IGSS: 'cuotas_igss',
  BASURA: 'basura',
  MULTAS: 'multas',
  REPARACION_FARMACIAS: 'reparaciones_farmacias',
  PAGOS_TERCEROS_ALBANIL: 'pagos_terceros_albanil',
  EQUIPO_COMPUTO_CAMARAS: 'equipo_computo_camaras',
  VARIOS: 'varios',
};

const getSupabaseErrorDetail = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return '';
  }

  const supabaseError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return [supabaseError.message, supabaseError.details, supabaseError.hint, supabaseError.code ? `code: ${supabaseError.code}` : '']
    .filter((value) => Boolean(value && String(value).trim()))
    .join(' | ');
};

const getToday = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return new Date().toISOString().split('T')[0];
};

export default function ModalNuevoGasto({
  isOpen,
  onClose,
  onSuccess,
  sucursales,
}: ModalNuevoGastoProps) {
  const [esGeneral, setEsGeneral] = useState(false);
  const [esRangoRecurrente, setEsRangoRecurrente] = useState(false);
  const [prorratear, setProrratear] = useState(true);
  const [sucursalId, setSucursalId] = useState<string>('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('RENTAS');
  const [descripcion, setDescripcion] = useState('');
  const [fechaGasto, setFechaGasto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFinVigencia, setFechaFinVigencia] = useState('');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setEsGeneral(false);
    setEsRangoRecurrente(false);
    setProrratear(true);
    setSucursalId('');
    setCategoria('RENTAS');
    setDescripcion('');
    setFechaGasto(getToday());
    setFechaInicio(getToday());
    setFechaFinVigencia(getToday());
    setMonto('');
    setError('');
  };

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!esGeneral && !sucursalId) {
      setError('Selecciona una sucursal para el gasto operativo.');
      return;
    }

    if (!descripcion.trim()) {
      setError('Escribe una breve descripción del gasto.');
      return;
    }

    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('El monto del gasto debe ser mayor a 0.');
      return;
    }

    if (!fechaGasto) {
      setError('La fecha del gasto es obligatoria.');
      return;
    }

    if (esRangoRecurrente) {
      if (!fechaInicio || !fechaFinVigencia) {
        setError('Define fecha de inicio y fecha de fin de vigencia.');
        return;
      }

      if (new Date(`${fechaInicio}T00:00:00`) > new Date(`${fechaFinVigencia}T00:00:00`)) {
        setError('La fecha fin de vigencia no puede ser menor a la fecha de inicio.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const sucursalUuid = esGeneral ? null : String(sucursalId).trim();
      if (!esGeneral && !sucursalUuid) {
        throw new Error('Falta la sucursal válida para el gasto.');
      }

      const categoriaNormalizada = normalizeCategoria(categoria);
      const categoriaParaGuardar = categoriaParaSupabase[categoriaNormalizada] ?? categoriaNormalizada.toLowerCase();
      const descripcionNormalizada = esRangoRecurrente
        ? buildDescripcionConVigencia(descripcion.trim(), fechaInicio, fechaFinVigencia, prorratear)
        : descripcion.trim();

      const payloadBase = {
        sucursal_id: sucursalUuid,
        categoria: categoriaParaGuardar,
        descripcion: descripcionNormalizada,
        fecha_gasto: fechaGasto,
        monto: montoNumero,
        es_gasto_general: esGeneral,
      };

      if (esRangoRecurrente) {
        const { error: insertExtendedError } = await supabase.from('gastos').insert({
          ...payloadBase,
          fecha_inicio: fechaInicio,
          fecha_fin_vigencia: fechaFinVigencia,
          es_rango_recurrente: true,
          prorratear_en_rango: prorratear,
        });

        if (insertExtendedError) {
          const { error: fallbackError } = await supabase.from('gastos').insert(payloadBase);
          if (fallbackError) {
            throw fallbackError;
          }
        }
      } else {
        const { error: insertError } = await supabase.from('gastos').insert(payloadBase);
        if (insertError) {
          throw insertError;
        }
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (insertError) {
      console.error('Error al guardar el gasto:', insertError);
      const detalleError = getSupabaseErrorDetail(insertError);
      setError(
        detalleError
          ? `No se pudo registrar el gasto. ${detalleError}`
          : 'No se pudo registrar el gasto. Revisa la información e intenta nuevamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm">
      <div className="relative mx-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-300">Registro rápido</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Nuevo gasto</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-200">
            <span>¿Es un gasto corporativo/general?</span>
            <input
              type="checkbox"
              checked={esGeneral}
              onChange={(event) => setEsGeneral(event.target.checked)}
              className="h-4 w-4 accent-rose-500"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-200">
            <span>¿Gasto recurrente?</span>
            <input
              type="checkbox"
              checked={esRangoRecurrente}
              onChange={(event) => setEsRangoRecurrente(event.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
          </label>

          {!esGeneral && (
            <label className="space-y-2 text-sm text-slate-200">
              <span>Sucursal</span>
              <select
                value={sucursalId}
                onChange={(event) => setSucursalId(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-rose-400"
              >
                <option value="">Selecciona una sucursal</option>
                {sucursales.map((sucursal) => (
                  <option key={String(sucursal.id)} value={String(sucursal.id)}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Categoría</span>
              <select
                value={categoria}
                onChange={(event) => setCategoria(normalizeCategoria(event.target.value))}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-rose-400"
              >
                {categoriasGasto.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Fecha</span>
              <input
                type="date"
                value={fechaGasto}
                onChange={(event) => setFechaGasto(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-rose-400"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-200">
            <span>Descripción</span>
            <input
              type="text"
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-rose-400"
              placeholder="Ej. Pago de servicios, compra de insumos..."
            />
          </label>

          {esRangoRecurrente && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-200">
                  <span>Fecha inicio de vigencia</span>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(event) => setFechaInicio(event.target.value)}
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-200">
                  <span>Fecha fin de vigencia</span>
                  <input
                    type="date"
                    value={fechaFinVigencia}
                    onChange={(event) => setFechaFinVigencia(event.target.value)}
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-200">
                <span>Prorratear por traslape en cortes</span>
                <input
                  type="checkbox"
                  checked={prorratear}
                  onChange={(event) => setProrratear(event.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
              </label>
            </>
          )}

          <label className="space-y-2 text-sm text-slate-200">
            <span>Monto (Q)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-rose-400"
              placeholder="0.00"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar gasto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
