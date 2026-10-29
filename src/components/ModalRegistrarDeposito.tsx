'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Sucursal = {
  id: string | number;
  nombre: string;
};

type ModalRegistrarDepositoProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sucursales: Sucursal[];
};

const bancoOptions = ['Banrural', 'Banco Industrial', 'G&T Continental', 'BAC Credomatic', 'Otro'] as const;

const getToday = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return new Date().toISOString().split('T')[0];
};

export default function ModalRegistrarDeposito({
  isOpen,
  onClose,
  onSuccess,
  sucursales,
}: ModalRegistrarDepositoProps) {
  const [sucursalId, setSucursalId] = useState<string>('');
  const [bancoReceptor, setBancoReceptor] = useState<string>('Banrural');
  const [noBoleta, setNoBoleta] = useState('');
  const [fechaDeposito, setFechaDeposito] = useState('');
  const [fechaInicioCorte, setFechaInicioCorte] = useState('');
  const [fechaFinCorte, setFechaFinCorte] = useState('');
  const [montoDepositado, setMontoDepositado] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setSucursalId(sucursales[0] ? String(sucursales[0].id) : '');
    setBancoReceptor('Banrural');
    setNoBoleta('');
    setFechaDeposito(getToday());
    setFechaInicioCorte('');
    setFechaFinCorte('');
    setMontoDepositado('');
    setNotas('');
    setError('');
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    resetForm();
  }, [isOpen, sucursales]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sucursalId.trim()) {
      setError('Selecciona una sucursal para registrar el depósito.');
      return;
    }

    if (!noBoleta.trim()) {
      setError('El número de boleta o referencia bancaria es obligatorio.');
      return;
    }

    if (!fechaDeposito) {
      setError('La fecha del depósito es obligatoria.');
      return;
    }

    if (!fechaInicioCorte || !fechaFinCorte) {
      setError('Debes definir el rango del corte que cubre el depósito.');
      return;
    }

    const montoNumero = Number(montoDepositado);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('El monto depositado debe ser un valor mayor a 0.');
      return;
    }

    const fechaInicio = new Date(fechaInicioCorte);
    const fechaFinal = new Date(fechaFinCorte);
    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFinal.getTime()) || fechaFinal < fechaInicio) {
      setError('La fecha fin del corte no puede ser anterior a la fecha de inicio.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('depositos_remesas').insert({
        sucursal_id: sucursalId,
        banco_receptor: bancoReceptor,
        no_boleta: noBoleta.trim(),
        fecha_deposito: fechaDeposito,
        fecha_inicio_corte: fechaInicioCorte,
        fecha_fin_corte: fechaFinCorte,
        monto_depositado: montoNumero,
        notas: notas.trim() || null,
      });

      if (insertError) {
        throw insertError;
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (insertError) {
      console.error('Error al registrar el depósito:', insertError);
      setError('No se pudo guardar la boleta bancaria. Revisa los datos e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm">
      <div className="relative mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">Conciliación bancaria</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Registrar boleta de depósito</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Cerrar modal de depósito"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Farmacia</span>
              <select
                value={sucursalId}
                onChange={(event) => setSucursalId(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
              >
                {sucursales.map((sucursal) => (
                  <option key={String(sucursal.id)} value={String(sucursal.id)}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Banco receptor</span>
              <select
                value={bancoReceptor}
                onChange={(event) => setBancoReceptor(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
              >
                {bancoOptions.map((banco) => (
                  <option key={banco} value={banco}>
                    {banco}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-200">
            <span>Referencia Bancaria</span>
            <input
              type="text"
              value={noBoleta}
              onChange={(event) => setNoBoleta(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
              placeholder="Ej. 7845213 o DEP-2026-001"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Fecha de depósito en banco</span>
              <input
                type="date"
                value={fechaDeposito}
                onChange={(event) => setFechaDeposito(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Monto depositado (Q)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={montoDepositado}
                onChange={(event) => setMontoDepositado(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Fecha inicio corte</span>
              <input
                type="date"
                value={fechaInicioCorte}
                onChange={(event) => setFechaInicioCorte(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Fecha fin corte</span>
              <input
                type="date"
                value={fechaFinCorte}
                onChange={(event) => setFechaFinCorte(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-200">
            <span>Notas u observaciones</span>
            <textarea
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
              placeholder="Observaciones de la remesa, registro manual, corte de caja, etc."
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar boleta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
