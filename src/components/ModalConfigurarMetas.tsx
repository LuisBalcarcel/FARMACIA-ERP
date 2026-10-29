'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type SucursalMeta = {
  id: string | number;
  nombre: string;
};

type ModalConfigurarMetasProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  sucursales: SucursalMeta[];
};

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

export default function ModalConfigurarMetas({
  isOpen,
  onClose,
  onSaved,
  sucursales,
}: ModalConfigurarMetasProps) {
  const [sucursalId, setSucursalId] = useState<string>('');
  const [mes, setMes] = useState<number>(1);
  const [anio, setAnio] = useState<number>(2024);
  const [metaMonto, setMetaMonto] = useState<string>('0');
  const [bonoCumplimiento, setBonoCumplimiento] = useState<string>('0');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    setMes(currentMonth);
    setAnio(currentYear);
    setMetaMonto('0');
    setBonoCumplimiento('0');
    setError('');
    setLoading(false);

    if (sucursales.length > 0) {
      setSucursalId(String(sucursales[0].id));
    }
  }, [isOpen, sucursales]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sucursalId.trim()) {
      setError('Selecciona una sucursal válida para la meta.');
      return;
    }

    const metaNumero = Number(metaMonto);
    const bonoNumero = Number(bonoCumplimiento);

    if (!Number.isFinite(metaNumero) || metaNumero < 0) {
      setError('La meta mensual debe ser un valor numérico válido.');
      return;
    }

    if (!Number.isFinite(bonoNumero) || bonoNumero < 0) {
      setError('El bono de cumplimiento debe ser un valor numérico válido.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: upsertError } = await supabase
        .from('metas_sucursales')
        .upsert(
          {
            sucursal_id: sucursalId,
            mes,
            anio,
            meta_monto: metaNumero,
            bono_cumplimiento: bonoNumero,
          },
          { onConflict: 'sucursal_id,mes,anio' },
        );

      if (upsertError) {
        throw upsertError;
      }

      onSaved?.();
      onClose();
    } catch (submitError) {
      console.error('Error al guardar la meta de sucursal:', submitError);
      setError('No se pudo guardar la meta de la sucursal. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm">
      <div className="relative mx-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-300">Configuración</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Metas de sucursal</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Cerrar modal de metas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Sucursal</span>
              <select
                value={sucursalId}
                onChange={(event) => setSucursalId(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
              >
                {sucursales.map((sucursal) => (
                  <option key={String(sucursal.id)} value={String(sucursal.id)}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Mes</span>
              <select
                value={mes}
                onChange={(event) => setMes(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
              >
                {monthLabels.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-200">
            <span>Año</span>
            <input
              type="number"
              min="2024"
              step="1"
              value={anio}
              onChange={(event) => setAnio(Number(event.target.value || new Date().getFullYear()))}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Meta mensual (Q)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={metaMonto}
                onChange={(event) => setMetaMonto(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Bono cumplimiento (Q)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bonoCumplimiento}
                onChange={(event) => setBonoCumplimiento(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar meta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
