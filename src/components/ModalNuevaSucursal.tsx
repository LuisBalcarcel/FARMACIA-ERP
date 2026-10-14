'use client';

import { Loader2, Store, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type ModalNuevaSucursalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ModalNuevaSucursal({ isOpen, onClose, onSuccess }: ModalNuevaSucursalProps) {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setNombre('');
    setDireccion('');
    setTelefono('');
    setError('');
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    resetForm();
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError('El nombre de la farmacia es obligatorio.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('sucursales').insert({
        nombre: nombreLimpio.toUpperCase(),
        direccion: direccion.trim() || null,
        telefono: telefono.trim() || null,
      });

      if (insertError) {
        throw insertError;
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (insertError) {
      console.error('Error al crear la sucursal:', insertError);
      setError('No se pudo registrar la farmacia. Verifica la información e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange-300">Administración</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Registrar nueva farmacia</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Cerrar modal de nueva farmacia"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="block space-y-2 text-sm text-slate-200">
            <span>Nombre de la Farmacia</span>
            <input
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value.toUpperCase())}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-400"
              placeholder="AMATITLAN"
              autoComplete="organization"
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>Dirección / Ubicación</span>
            <input
              type="text"
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-400"
              placeholder="Calle principal 12-34, zona 1"
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>Teléfono / Contacto</span>
            <input
              type="text"
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-400"
              placeholder="+502 1234-5678"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/40 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Store className="h-4 w-4" />
                  Crear Farmacia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
