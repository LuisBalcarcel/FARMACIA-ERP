'use client';

import { Loader2, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type ModalAnularRegistroProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
  tipo?: 'Venta' | 'Gasto';
  detalle?: string;
};

export default function ModalAnularRegistro({
  isOpen,
  onClose,
  onConfirm,
  tipo = 'Venta',
  detalle = 'Registro',
}: ModalAnularRegistroProps) {
  const [motivo, setMotivo] = useState('ERROR');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setMotivo('ERROR');
    setError('');
    setLoading(false);
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const motivoTrimmed = motivo.trim();
    if (motivoTrimmed.length === 0) {
      setError('El motivo no puede estar vacío.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm(motivoTrimmed);
      onClose();
    } catch (confirmError) {
      console.error(`Error al anular ${tipo.toLowerCase()}:`, confirmError);
      setError('No se pudo anular el registro. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-rose-700/50 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-300">Acción sensible</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Anular {tipo}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Cerrar modal de anulación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Estás por anular este registro: <span className="font-semibold">{detalle}</span>
              </p>
            </div>
          </div>

          <label className="block text-sm text-slate-200">
            <span className="mb-2 block">Motivo o justificación de la anulación</span>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-rose-400"
              placeholder="Ej. Registro duplicado, ajuste de cierre, error de captura..."
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
              onClick={onClose}
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
                  Anulando...
                </>
              ) : (
                'Confirmar anulación'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
