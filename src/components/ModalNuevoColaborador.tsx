'use client';

import { Loader2, UserPlus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Sucursal = {
  id: string | number;
  nombre: string;
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

type ModalNuevoColaboradorProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (colaborador: Colaborador) => void;
  sucursales: Sucursal[];
};

export default function ModalNuevoColaborador({ isOpen, onClose, onSuccess, sucursales }: ModalNuevoColaboradorProps) {
  const [area, setArea] = useState<'farmacia' | 'bodega' | 'admon' | 'otros'>('farmacia');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [puesto, setPuesto] = useState('Dependiente');
  const [sucursalId, setSucursalId] = useState('');
  const [salarioBaseQuincenal, setSalarioBaseQuincenal] = useState('');
  const [aplicaIgss, setAplicaIgss] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setArea('farmacia');
    setNombreCompleto('');
    setPuesto('Dependiente');
    setSucursalId(sucursales[0] ? String(sucursales[0].id) : '');
    setSalarioBaseQuincenal('');
    setAplicaIgss(true);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nombreLimpio = nombreCompleto.trim();
    if (!nombreLimpio) {
      setError('El nombre completo del colaborador es obligatorio.');
      return;
    }

    if (area === 'farmacia' && !sucursalId) {
      setError('Selecciona una sucursal asignada.');
      return;
    }

    const salario = Number(salarioBaseQuincenal);
    if (!Number.isFinite(salario) || salario < 0) {
      setError('Ingresa un salario base quincenal válido.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('colaboradores')
        .insert([
          {
            nombre: nombreLimpio,
            area,
            puesto: puesto.trim() || 'Dependiente',
            sucursal_id: area === 'farmacia' ? String(sucursalId) : (sucursalId || null),
            salario_base_quincenal: salario,
            aplica_igss: aplicaIgss,
            activo: true,
          },
        ])
        .select();

      if (insertError) {
        throw insertError;
      }

      const nuevoColaborador = data?.[0] as Colaborador | undefined;
      if (!nuevoColaborador) {
        throw new Error('No se recibió la fila creada desde Supabase.');
      }

      onSuccess(nuevoColaborador);
      handleClose();
    } catch (submitError) {
      console.error('Error al registrar colaborador:', submitError);
      const detail =
        submitError instanceof Error
          ? submitError.message
          : typeof submitError === 'object' && submitError !== null && 'message' in submitError
            ? String((submitError as { message?: string }).message ?? '')
            : '';

      setError(detail ? `No se pudo registrar el colaborador. ${detail}` : 'No se pudo registrar el colaborador.');
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
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">Planilla</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Nuevo colaborador</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Cerrar modal de colaborador"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="block space-y-2 text-sm text-slate-200">
            <span>Área / Departamento</span>
            <select
              value={area}
              onChange={(event) => setArea(event.target.value as 'farmacia' | 'bodega' | 'admon' | 'otros')}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
              required
            >
              <option value="farmacia">Farmacia / Mostrador</option>
              <option value="bodega">Bodega / Logística</option>
              <option value="admon">Administración / Oficina Central</option>
              <option value="otros">Otros / Servicios Generales</option>
            </select>
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>Nombre completo</span>
            <input
              type="text"
              value={nombreCompleto}
              onChange={(event) => setNombreCompleto(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
              placeholder="Ej. Juan Pérez"
              required
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>Puesto</span>
            <input
              type="text"
              value={puesto}
              onChange={(event) => setPuesto(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
              placeholder="Dependiente"
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>{area === 'farmacia' ? 'Sucursal asignada' : 'Sucursal asignada (opcional)'}</span>
            <select
              value={sucursalId}
              onChange={(event) => setSucursalId(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
              required={area === 'farmacia'}
            >
              {area !== 'farmacia' && <option value="">Matriz / Corporativo Central</option>}
              {sucursales.map((sucursal) => (
                <option key={String(sucursal.id)} value={String(sucursal.id)}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>Salario base quincenal (Q)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={salarioBaseQuincenal}
              onChange={(event) => setSalarioBaseQuincenal(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
              placeholder="0.00"
              required
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-200">
            <span>¿Aplica IGSS?</span>
            <input
              type="checkbox"
              checked={aplicaIgss}
              onChange={(event) => setAplicaIgss(event.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Guardar colaborador
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
