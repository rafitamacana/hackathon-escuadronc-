import React, { useEffect, useState } from 'react';
import { crearReporte, iniciarSync } from '../lib/sync';
import {
  HeartPulse,
  Droplets,
  LifeBuoy,
  HelpCircle,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users
} from 'lucide-react';

const EMERGENCY_TYPES = [
  {
    id: 'medical',
    label: 'MÉDICA',
    desc: 'Heridos, colisión, infarto',
    icon: HeartPulse,
    bgColor: 'bg-red-600 active:bg-red-700',
    borderColor: 'border-red-400',
    textColor: 'text-white',
    ringColor: 'focus:ring-red-500'
  },
  {
    id: 'water',
    label: 'AGUA / INUNDACIÓN',
    desc: 'Corriente, desborde, rescate acuático',
    icon: Droplets,
    bgColor: 'bg-blue-600 active:bg-blue-700',
    borderColor: 'border-blue-400',
    textColor: 'text-white',
    ringColor: 'focus:ring-blue-500'
  },
  {
    id: 'rescue',
    label: 'RESCATE',
    desc: 'Atrapados, derrumbe, altura',
    icon: LifeBuoy,
    bgColor: 'bg-amber-400 active:bg-amber-500',
    borderColor: 'border-amber-300',
    textColor: 'text-slate-950',
    ringColor: 'focus:ring-amber-400'
  },
  {
    id: 'other',
    label: 'OTRO',
    desc: 'Fuga de gas, riesgo eléctrico, etc.',
    icon: HelpCircle,
    bgColor: 'bg-slate-700 active:bg-slate-600',
    borderColor: 'border-slate-500',
    textColor: 'text-slate-100',
    ringColor: 'focus:ring-slate-400'
  }
];

export default function EmergencyReportModal({ isOpen, onClose, userPos, onReportSuccess }) {
  const [selectedType, setSelectedType] = useState('medical');
  const [peopleCount, setPeopleCount] = useState(1);
  const [description, setDescription] = useState('');

  // Estados para el espacio de mensaje de estado
  // 'idle' | 'submitting' | 'success' | 'error'
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => iniciarSync(onReportSuccess), [onReportSuccess]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !userPos ||
      !Number.isFinite(userPos.lat) ||
      !Number.isFinite(userPos.lng)
    ) {
      setStatus({
        state: 'error',
        message: 'No se detectó señal de GPS válida para georreferenciar el reporte.'
      });
      return;
    }

    setStatus({
      state: 'submitting',
      message: navigator.onLine
        ? 'Transmitiendo reporte a unidades de auxilio...'
        : 'Sin conexión. Guardando alerta en este dispositivo...'
    });

    const databaseTypes = {
      medical: 'MEDICA',
      water: 'AGUA',
      rescue: 'RESCATE',
      other: 'OTRO'
    };

    const reporte = {
      id: crypto.randomUUID(),
      tipo_emergencia: databaseTypes[selectedType],
      latitud: userPos.lat,
      longitud: userPos.lng,
      descripcion: description.trim() || null,
      personas_afectadas: peopleCount,
      estado: 'PENDIENTE',
      created_at: new Date().toISOString()
    };

    try {
      const resultado = await crearReporte(reporte);

      setStatus({
        state: 'success',
        message: resultado === 'enviado'
          ? '¡Alerta enviada con éxito! Las cuadrillas de rescate han sido notificadas.'
          : 'Alerta guardada en este dispositivo. Se enviará automáticamente al recuperar la conexión.'
      });

      if (resultado === 'enviado' && onReportSuccess) onReportSuccess();

      // Cierre automático tras confirmar envío
      setTimeout(() => {
        setStatus({ state: 'idle', message: '' });
        setDescription('');
        setPeopleCount(1);
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Error reportando emergencia:', err);
      setStatus({
        state: 'error',
        message: 'Error de transmisión. Intenta nuevamente o llama al 911.'
      });
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 flex flex-col max-h-[92dvh] overflow-y-auto no-scrollbar text-slate-100 animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* CABECERA */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              Reportar Emergencia
            </h2>
            <p className="text-xs text-slate-400">
              Ubicación GPS: {userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)} (±{userPos.accuracy}m)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={status.state === 'submitting'}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 active:scale-95 transition-all"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* 1. LOS 4 BOTONES DE ALTO CONTRASTE */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de Emergencia (Selecciona una)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {EMERGENCY_TYPES.map((type) => {
                const IconComponent = type.icon;
                const isSelected = selectedType === type.id;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`relative p-3.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-150 border-2 select-none active:scale-95 shadow-md ${
                      type.bgColor
                    } ${type.textColor} ${
                      isSelected
                        ? `ring-4 ring-white ${type.borderColor} scale-[1.02] shadow-xl`
                        : 'opacity-85 border-transparent'
                    }`}
                  >
                    <IconComponent className="w-8 h-8 mb-1 drop-shadow-sm" />
                    <span className="text-xs font-black tracking-wider leading-tight">
                      {type.label}
                    </span>
                    <span className="text-[10px] opacity-90 line-clamp-1 mt-0.5 font-medium">
                      {type.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. FORMULARIO CORTO: NÚMERO DE PERSONAS */}
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <div>
                <span className="text-xs font-bold text-white block">Personas en Riesgo</span>
                <span className="text-[11px] text-slate-400">Aproximado en el lugar</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPeopleCount((prev) => Math.max(1, prev - 1))}
                className="w-9 h-9 rounded-xl bg-slate-700 text-white font-bold text-lg flex items-center justify-center active:scale-90"
              >
                -
              </button>
              <span className="w-8 text-center text-base font-black text-white">
                {peopleCount}
              </span>
              <button
                type="button"
                onClick={() => setPeopleCount((prev) => prev + 1)}
                className="w-9 h-9 rounded-xl bg-slate-700 text-white font-bold text-lg flex items-center justify-center active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* 3. FORMULARIO CORTO: DESCRIPCIÓN (OPCIONAL) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Descripción del Suceso <span className="text-slate-500 font-normal">(Opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Casa de 2 pisos, olor penetrante, cables caídos..."
              rows={2}
              maxLength={200}
              className="w-full bg-slate-950/70 text-slate-100 placeholder-slate-500 text-xs rounded-xl p-3 border border-slate-700 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* 4. ESPACIO PARA EL MENSAJE DE ESTADO */}
          <div className="min-h-[44px] flex items-center justify-center">
            {status.state === 'submitting' && (
              <div className="w-full p-2.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-sky-300 text-xs flex items-center justify-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{status.message}</span>
              </div>
            )}

            {status.state === 'success' && (
              <div className="w-full p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{status.message}</span>
              </div>
            )}

            {status.state === 'error' && (
              <div className="w-full p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{status.message}</span>
              </div>
            )}

            {status.state === 'idle' && (
              <p className="text-[11px] text-slate-400 text-center">
                El envío transmitirá tus coordenadas GPS exactas a la base de datos de auxilio.
              </p>
            )}
          </div>

          {/* BOTÓN PRINCIPAL DE ACCIÓN */}
          <button
            type="submit"
            disabled={status.state === 'submitting' || status.state === 'success'}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Emitir Alerta Inmediata</span>
          </button>
        </form>
      </div>
    </div>
  );
}