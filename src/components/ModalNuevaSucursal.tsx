'use client';

import { Loader2, Store, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Sucursal = {
  id: string | number;
  nombre: string;
  direccion?: string | null;
  es_matriz?: boolean;
  activa?: boolean;
  usar_plantilla_fija?: boolean;
  cantidad_colaboradores?: number | null;
};

type ModalNuevaSucursalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sucursal: Sucursal) => void;
  sucursal?: Sucursal | null;
};

export default function ModalNuevaSucursal({ isOpen, onClose, onSuccess, sucursal = null }: ModalNuevaSucursalProps) {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [esMatriz, setEsMatriz] = useState(false);
  const [activa, setActiva] = useState(true);
  const [usarPlantillaFija, setUsarPlantillaFija] = useState(false);
  const [cantidadColaboradores, setCantidadColaboradores] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setNombre('');
    setDireccion('');
    setEsMatriz(false);
    setActiva(true);
    setUsarPlantillaFija(false);
    setCantidadColaboradores('1');
    setError('');
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (sucursal) {
      setNombre(sucursal.nombre);
      setDireccion(sucursal.direccion ?? '');
      setEsMatriz(sucursal.es_matriz === true);
      setActiva(sucursal.activa !== false);
      setUsarPlantillaFija(sucursal.usar_plantilla_fija === true);
      setCantidadColaboradores(String(Math.max(1, Number(sucursal.cantidad_colaboradores ?? 1))));
      setError('');
      return;
    }

    resetForm();
  }, [isOpen, sucursal]);

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

    const cantidad = Number(cantidadColaboradores);
    if (usarPlantillaFija && (!Number.isInteger(cantidad) || cantidad < 1)) {
      setError('La cantidad de colaboradores debe ser un entero mayor o igual a 1.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        nombre: nombreLimpio.toUpperCase(),
        direccion: direccion.trim() || null,
        es_matriz: esMatriz,
        activa,
        usar_plantilla_fija: usarPlantillaFija,
        cantidad_colaboradores: usarPlantillaFija ? cantidad : null,
      };

      const response = sucursal
        ? await supabase.from('sucursales').update(payload).eq('id', sucursal.id).select().single()
        : await supabase.from('sucursales').insert([payload]).select().single();

      if (response.error) {
        throw response.error;
      }

      if (!response.data) {
        throw new Error('Supabase no devolvió la sucursal guardada.');
      }

      resetForm();
      onSuccess(response.data as Sucursal);
      onClose();
    } catch (insertError) {
      console.error('Error al crear la sucursal:', insertError);
      const detalle =
        insertError instanceof Error
          ? insertError.message
          : typeof insertError === 'object' && insertError !== null && 'message' in insertError
            ? String((insertError as { message?: string }).message ?? '')
            : '';

      setError(detalle ? `No se pudo registrar la farmacia. ${detalle}` : 'No se pudo registrar la farmacia. Verifica la información e intenta nuevamente.');
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
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange-300">Administración</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{sucursal ? 'Editar farmacia' : 'Registrar nueva farmacia'}</h2>
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
              required
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-400"
              placeholder="AMATITLAN"
              autoComplete="organization"
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>Dirección y Ubicación</span>
            <textarea
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-400"
              placeholder="Calle principal 12-34, zona 1"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-200">
              <span>¿Es sucursal Matriz?</span>
              <input
                type="checkbox"
                checked={esMatriz}
                onChange={(event) => setEsMatriz(event.target.checked)}
                className="h-4 w-4 accent-orange-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-200">
              <span>Estado Activo</span>
              <input
                type="checkbox"
                checked={activa}
                onChange={(event) => setActiva(event.target.checked)}
                className="h-4 w-4 accent-orange-500"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-200">
            <label className="flex items-start justify-between gap-3">
              <span>¿Fijar cantidad de colaboradores para división de bonos?</span>
              <input
                type="checkbox"
                checked={usarPlantillaFija}
                onChange={(event) => setUsarPlantillaFija(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
              />
            </label>
            {usarPlantillaFija && (
              <label className="block space-y-2">
                <span>Cantidad de colaboradores</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidadColaboradores}
                  onChange={(event) => setCantidadColaboradores(event.target.value)}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-400"
                />
              </label>
            )}
          </div>

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
                  Guardando...
                </>
              ) : (
                <>
                  <Store className="h-4 w-4" />
                  Guardar Farmacia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
