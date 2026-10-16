import React, { useState } from 'react';
import { supabase } from './supabaseClient';
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