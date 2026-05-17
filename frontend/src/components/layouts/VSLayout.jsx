import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Flame, Zap, Trophy, Hourglass, Share2, ChevronsUp, Scale } from 'lucide-react';
import { cn } from '../../lib/utils';
import voiceService from '../../services/voiceService';
import DoubleTapVoteAnimation, { TWYK_GRADIENTS } from '../DoubleTapVoteAnimation';
import SafeImage from '../common/SafeImage';
import resolveAssetUrl from '../../utils/resolveAssetUrl';
import VSWinnerCard from './VSWinnerCard';
import VSContentCard from './VSContentCard';
import { useTranslation } from '../../hooks/useTranslation';

// 🎨 Twyk brand colors — usados en el rediseño VS del MVP.
// Top card (Player A) → lila, Bottom card (Player B) → azul.
const TWYK_COLORS = {
  top: {
    primary: '#A855F7',      // lila / purple-500
    primaryRgb: '168,85,247',
    secondary: '#7C3AED',    // violet-600 (acento más oscuro)
    glow: 'rgba(168,85,247,0.55)',
    glowSoft: 'rgba(168,85,247,0.25)',
  },
  bottom: {
    primary: '#3B82F6',      // azul / blue-500
    primaryRgb: '59,130,246',
    secondary: '#2563EB',    // blue-600 (acento más oscuro)
    glow: 'rgba(59,130,246,0.55)',
    glowSoft: 'rgba(59,130,246,0.25)',
  },
};

// Colores por país - TODOS LOS PAÍSES DEL MUNDO
const countryColors = {
  // ==================== EUROPA ====================
  // España
  'españa': { bg: 'bg-gradient-to-b from-red-600 via-yellow-400 to-red-600', primary: '#dc2626', secondary: '#facc15' },
  'spain': { bg: 'bg-gradient-to-b from-red-600 via-yellow-400 to-red-600', primary: '#dc2626', secondary: '#facc15' },
  'ES': { bg: 'bg-gradient-to-b from-red-600 via-yellow-400 to-red-600', primary: '#dc2626', secondary: '#facc15' },
  // Francia
  'francia': { bg: 'bg-gradient-to-r from-blue-600 via-white to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'france': { bg: 'bg-gradient-to-r from-blue-600 via-white to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'FR': { bg: 'bg-gradient-to-r from-blue-600 via-white to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Alemania
  'alemania': { bg: 'bg-gradient-to-b from-black via-red-600 to-yellow-400', primary: '#000000', secondary: '#facc15' },
  'germany': { bg: 'bg-gradient-to-b from-black via-red-600 to-yellow-400', primary: '#000000', secondary: '#facc15' },
  'DE': { bg: 'bg-gradient-to-b from-black via-red-600 to-yellow-400', primary: '#000000', secondary: '#facc15' },
  // Italia
  'italia': { bg: 'bg-gradient-to-r from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'italy': { bg: 'bg-gradient-to-r from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'IT': { bg: 'bg-gradient-to-r from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  // Portugal
  'portugal': { bg: 'bg-gradient-to-r from-green-600 to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'PT': { bg: 'bg-gradient-to-r from-green-600 to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  // Países Bajos
  'holanda': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'netherlands': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'NL': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // Bélgica
  'bélgica': { bg: 'bg-gradient-to-r from-black via-yellow-400 to-red-600', primary: '#000000', secondary: '#facc15' },
  'belgium': { bg: 'bg-gradient-to-r from-black via-yellow-400 to-red-600', primary: '#000000', secondary: '#facc15' },
  'BE': { bg: 'bg-gradient-to-r from-black via-yellow-400 to-red-600', primary: '#000000', secondary: '#facc15' },
  // Reino Unido
  'united kingdom': { bg: 'bg-gradient-to-b from-blue-900 via-red-600 to-blue-900', primary: '#1e3a8a', secondary: '#dc2626' },
  'GB': { bg: 'bg-gradient-to-b from-blue-900 via-red-600 to-blue-900', primary: '#1e3a8a', secondary: '#dc2626' },
  // Irlanda
  'ireland': { bg: 'bg-gradient-to-r from-green-600 via-white to-orange-500', primary: '#16a34a', secondary: '#f97316' },
  'IE': { bg: 'bg-gradient-to-r from-green-600 via-white to-orange-500', primary: '#16a34a', secondary: '#f97316' },
  // Suiza
  'switzerland': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'CH': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  // Austria
  'austria': { bg: 'bg-gradient-to-b from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'AT': { bg: 'bg-gradient-to-b from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  // Polonia
  'poland': { bg: 'bg-gradient-to-b from-white to-red-600', primary: '#ffffff', secondary: '#dc2626' },
  'PL': { bg: 'bg-gradient-to-b from-white to-red-600', primary: '#ffffff', secondary: '#dc2626' },
  // Grecia
  'greece': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  'GR': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  // Suecia
  'sweden': { bg: 'bg-blue-600', primary: '#2563eb', secondary: '#facc15' },
  'SE': { bg: 'bg-blue-600', primary: '#2563eb', secondary: '#facc15' },
  // Noruega
  'norway': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'NO': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // Dinamarca
  'denmark': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'DK': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  // Finlandia
  'finland': { bg: 'bg-white', primary: '#ffffff', secondary: '#2563eb' },
  'FI': { bg: 'bg-white', primary: '#ffffff', secondary: '#2563eb' },
  // Islandia
  'iceland': { bg: 'bg-blue-600', primary: '#2563eb', secondary: '#dc2626' },
  'IS': { bg: 'bg-blue-600', primary: '#2563eb', secondary: '#dc2626' },
  // República Checa
  'czech republic': { bg: 'bg-gradient-to-b from-white via-red-600 to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'CZ': { bg: 'bg-gradient-to-b from-white via-red-600 to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // Eslovaquia
  'slovakia': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'SK': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Hungría
  'hungary': { bg: 'bg-gradient-to-b from-red-600 via-white to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  'HU': { bg: 'bg-gradient-to-b from-red-600 via-white to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  // Rumanía
  'romania': { bg: 'bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600', primary: '#2563eb', secondary: '#facc15' },
  'RO': { bg: 'bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600', primary: '#2563eb', secondary: '#facc15' },
  // Bulgaria
  'bulgaria': { bg: 'bg-gradient-to-b from-white via-green-600 to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'BG': { bg: 'bg-gradient-to-b from-white via-green-600 to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  // Croacia
  'croatia': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'HR': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // Serbia
  'serbia': { bg: 'bg-gradient-to-b from-red-600 via-blue-600 to-white', primary: '#dc2626', secondary: '#2563eb' },
  'RS': { bg: 'bg-gradient-to-b from-red-600 via-blue-600 to-white', primary: '#dc2626', secondary: '#2563eb' },
  // Eslovenia
  'slovenia': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'SI': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Bosnia
  'bosnia': { bg: 'bg-blue-600', primary: '#2563eb', secondary: '#facc15' },
  'BA': { bg: 'bg-blue-600', primary: '#2563eb', secondary: '#facc15' },
  // Montenegro
  'montenegro': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  'ME': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  // Macedonia del Norte
  'north macedonia': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  'MK': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  // Albania
  'albania': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#000000' },
  'AL': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#000000' },
  // Kosovo
  'kosovo': { bg: 'bg-blue-600', primary: '#2563eb', secondary: '#facc15' },
  'XK': { bg: 'bg-blue-600', primary: '#2563eb', secondary: '#facc15' },
  // Ucrania
  'ukraine': { bg: 'bg-gradient-to-b from-blue-500 to-yellow-400', primary: '#3b82f6', secondary: '#facc15' },
  'UA': { bg: 'bg-gradient-to-b from-blue-500 to-yellow-400', primary: '#3b82f6', secondary: '#facc15' },
  // Bielorrusia
  'belarus': { bg: 'bg-gradient-to-b from-red-600 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  'BY': { bg: 'bg-gradient-to-b from-red-600 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  // Moldavia
  'moldova': { bg: 'bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600', primary: '#2563eb', secondary: '#facc15' },
  'MD': { bg: 'bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600', primary: '#2563eb', secondary: '#facc15' },
  // Estonia
  'estonia': { bg: 'bg-gradient-to-b from-blue-600 via-black to-white', primary: '#2563eb', secondary: '#000000' },
  'EE': { bg: 'bg-gradient-to-b from-blue-600 via-black to-white', primary: '#2563eb', secondary: '#000000' },
  // Letonia
  'latvia': { bg: 'bg-gradient-to-b from-red-800 via-white to-red-800', primary: '#991b1b', secondary: '#ffffff' },
  'LV': { bg: 'bg-gradient-to-b from-red-800 via-white to-red-800', primary: '#991b1b', secondary: '#ffffff' },
  // Lituania
  'lithuania': { bg: 'bg-gradient-to-b from-yellow-400 via-green-600 to-red-600', primary: '#facc15', secondary: '#16a34a' },
  'LT': { bg: 'bg-gradient-to-b from-yellow-400 via-green-600 to-red-600', primary: '#facc15', secondary: '#16a34a' },
  // Luxemburgo
  'luxembourg': { bg: 'bg-gradient-to-b from-red-600 via-white to-sky-400', primary: '#dc2626', secondary: '#38bdf8' },
  'LU': { bg: 'bg-gradient-to-b from-red-600 via-white to-sky-400', primary: '#dc2626', secondary: '#38bdf8' },
  // Malta
  'malta': { bg: 'bg-gradient-to-r from-white to-red-600', primary: '#ffffff', secondary: '#dc2626' },
  'MT': { bg: 'bg-gradient-to-r from-white to-red-600', primary: '#ffffff', secondary: '#dc2626' },
  // Chipre
  'cyprus': { bg: 'bg-white', primary: '#ffffff', secondary: '#f97316' },
  'CY': { bg: 'bg-white', primary: '#ffffff', secondary: '#f97316' },
  // Andorra
  'andorra': { bg: 'bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600', primary: '#2563eb', secondary: '#facc15' },
  'AD': { bg: 'bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600', primary: '#2563eb', secondary: '#facc15' },
  // Mónaco
  'monaco': { bg: 'bg-gradient-to-b from-red-600 to-white', primary: '#dc2626', secondary: '#ffffff' },
  'MC': { bg: 'bg-gradient-to-b from-red-600 to-white', primary: '#dc2626', secondary: '#ffffff' },
  // San Marino
  'san marino': { bg: 'bg-gradient-to-b from-white to-sky-400', primary: '#ffffff', secondary: '#38bdf8' },
  'SM': { bg: 'bg-gradient-to-b from-white to-sky-400', primary: '#ffffff', secondary: '#38bdf8' },
  // Liechtenstein
  'liechtenstein': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'LI': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },

  // ==================== AMÉRICA DEL NORTE ====================
  // Estados Unidos
  'usa': { bg: 'bg-gradient-to-b from-blue-900 via-white to-red-600', primary: '#1e3a8a', secondary: '#dc2626' },
  'estados unidos': { bg: 'bg-gradient-to-b from-blue-900 via-white to-red-600', primary: '#1e3a8a', secondary: '#dc2626' },
  'united states': { bg: 'bg-gradient-to-b from-blue-900 via-white to-red-600', primary: '#1e3a8a', secondary: '#dc2626' },
  'US': { bg: 'bg-gradient-to-b from-blue-900 via-white to-red-600', primary: '#1e3a8a', secondary: '#dc2626' },
  // Canadá
  'canadá': { bg: 'bg-gradient-to-r from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'canada': { bg: 'bg-gradient-to-r from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'CA': { bg: 'bg-gradient-to-r from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },

  // ==================== AMÉRICA LATINA ====================
  // México
  'méxico': { bg: 'bg-gradient-to-r from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'mexico': { bg: 'bg-gradient-to-r from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'MX': { bg: 'bg-gradient-to-r from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  // Brasil
  'brasil': { bg: 'bg-gradient-to-b from-green-500 via-yellow-400 to-green-500', primary: '#22c55e', secondary: '#facc15' },
  'brazil': { bg: 'bg-gradient-to-b from-green-500 via-yellow-400 to-green-500', primary: '#22c55e', secondary: '#facc15' },
  'BR': { bg: 'bg-gradient-to-b from-green-500 via-yellow-400 to-green-500', primary: '#22c55e', secondary: '#facc15' },
  // Argentina
  'argentina': { bg: 'bg-gradient-to-b from-sky-400 via-white to-sky-400', primary: '#38bdf8', secondary: '#ffffff' },
  'AR': { bg: 'bg-gradient-to-b from-sky-400 via-white to-sky-400', primary: '#38bdf8', secondary: '#ffffff' },
  // Colombia
  'colombia': { bg: 'bg-gradient-to-b from-yellow-400 via-blue-600 to-red-600', primary: '#facc15', secondary: '#2563eb' },
  'CO': { bg: 'bg-gradient-to-b from-yellow-400 via-blue-600 to-red-600', primary: '#facc15', secondary: '#2563eb' },
  // Chile
  'chile': { bg: 'bg-gradient-to-b from-white to-red-600', primary: '#dc2626', secondary: '#1e3a8a' },
  'CL': { bg: 'bg-gradient-to-b from-white to-red-600', primary: '#dc2626', secondary: '#1e3a8a' },
  // Perú
  'perú': { bg: 'bg-gradient-to-r from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'peru': { bg: 'bg-gradient-to-r from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'PE': { bg: 'bg-gradient-to-r from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  // Venezuela
  'venezuela': { bg: 'bg-gradient-to-b from-yellow-400 via-blue-600 to-red-600', primary: '#facc15', secondary: '#dc2626' },
  'VE': { bg: 'bg-gradient-to-b from-yellow-400 via-blue-600 to-red-600', primary: '#facc15', secondary: '#dc2626' },
  // Ecuador
  'ecuador': { bg: 'bg-gradient-to-b from-yellow-400 via-blue-600 to-red-600', primary: '#facc15', secondary: '#2563eb' },
  'EC': { bg: 'bg-gradient-to-b from-yellow-400 via-blue-600 to-red-600', primary: '#facc15', secondary: '#2563eb' },
  // Uruguay
  'uruguay': { bg: 'bg-gradient-to-b from-white to-blue-600', primary: '#2563eb', secondary: '#facc15' },
  'UY': { bg: 'bg-gradient-to-b from-white to-blue-600', primary: '#2563eb', secondary: '#facc15' },
  // Paraguay
  'paraguay': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'PY': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // Bolivia
  'bolivia': { bg: 'bg-gradient-to-b from-red-600 via-yellow-400 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  'BO': { bg: 'bg-gradient-to-b from-red-600 via-yellow-400 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  // Cuba
  'cuba': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'CU': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Panamá
  'panamá': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#dc2626', secondary: '#2563eb' },
  'panama': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#dc2626', secondary: '#2563eb' },
  'PA': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#dc2626', secondary: '#2563eb' },
  // Costa Rica
  'costa rica': { bg: 'bg-gradient-to-b from-blue-600 via-red-600 to-blue-600', primary: '#2563eb', secondary: '#dc2626' },
  'CR': { bg: 'bg-gradient-to-b from-blue-600 via-red-600 to-blue-600', primary: '#2563eb', secondary: '#dc2626' },
  // Guatemala
  'guatemala': { bg: 'bg-gradient-to-r from-sky-400 via-white to-sky-400', primary: '#38bdf8', secondary: '#ffffff' },
  'GT': { bg: 'bg-gradient-to-r from-sky-400 via-white to-sky-400', primary: '#38bdf8', secondary: '#ffffff' },
  // Honduras
  'honduras': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  'HN': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  // El Salvador
  'el salvador': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  'SV': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  // Nicaragua
  'nicaragua': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  'NI': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  // República Dominicana
  'república dominicana': { bg: 'bg-gradient-to-b from-blue-600 via-white to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'dominican republic': { bg: 'bg-gradient-to-b from-blue-600 via-white to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'DO': { bg: 'bg-gradient-to-b from-blue-600 via-white to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Puerto Rico
  'puerto rico': { bg: 'bg-gradient-to-b from-red-600 to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'PR': { bg: 'bg-gradient-to-b from-red-600 to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // Haití
  'haiti': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'HT': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Jamaica
  'jamaica': { bg: 'bg-gradient-to-b from-green-600 via-yellow-400 to-black', primary: '#16a34a', secondary: '#facc15' },
  'JM': { bg: 'bg-gradient-to-b from-green-600 via-yellow-400 to-black', primary: '#16a34a', secondary: '#facc15' },
  // Trinidad y Tobago
  'trinidad': { bg: 'bg-gradient-to-br from-red-600 via-black to-red-600', primary: '#dc2626', secondary: '#000000' },
  'TT': { bg: 'bg-gradient-to-br from-red-600 via-black to-red-600', primary: '#dc2626', secondary: '#000000' },

  // ==================== ASIA ====================
  // Japón
  'japón': { bg: 'bg-white', primary: '#ffffff', secondary: '#dc2626' },
  'japan': { bg: 'bg-white', primary: '#ffffff', secondary: '#dc2626' },
  'JP': { bg: 'bg-white', primary: '#ffffff', secondary: '#dc2626' },
  // China
  'china': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  'CN': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  // Corea del Sur
  'corea': { bg: 'bg-gradient-to-b from-white to-red-600', primary: '#ffffff', secondary: '#dc2626' },
  'korea': { bg: 'bg-gradient-to-b from-white to-red-600', primary: '#ffffff', secondary: '#dc2626' },
  'south korea': { bg: 'bg-gradient-to-b from-white to-red-600', primary: '#ffffff', secondary: '#dc2626' },
  'KR': { bg: 'bg-gradient-to-b from-white to-red-600', primary: '#ffffff', secondary: '#dc2626' },
  // Corea del Norte
  'north korea': { bg: 'bg-gradient-to-b from-blue-600 via-red-600 to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'KP': { bg: 'bg-gradient-to-b from-blue-600 via-red-600 to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // India
  'india': { bg: 'bg-gradient-to-b from-orange-500 via-white to-green-600', primary: '#f97316', secondary: '#16a34a' },
  'IN': { bg: 'bg-gradient-to-b from-orange-500 via-white to-green-600', primary: '#f97316', secondary: '#16a34a' },
  // Indonesia
  'indonesia': { bg: 'bg-gradient-to-b from-red-600 to-white', primary: '#dc2626', secondary: '#ffffff' },
  'ID': { bg: 'bg-gradient-to-b from-red-600 to-white', primary: '#dc2626', secondary: '#ffffff' },
  // Malasia
  'malaysia': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#facc15' },
  'MY': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#facc15' },
  // Filipinas
  'philippines': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'PH': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Tailandia
  'thailand': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'TH': { bg: 'bg-gradient-to-b from-red-600 via-white to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // Vietnam
  'vietnam': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  'VN': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  // Singapur
  'singapore': { bg: 'bg-gradient-to-b from-red-600 to-white', primary: '#dc2626', secondary: '#ffffff' },
  'SG': { bg: 'bg-gradient-to-b from-red-600 to-white', primary: '#dc2626', secondary: '#ffffff' },
  // Taiwán
  'taiwan': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'TW': { bg: 'bg-gradient-to-b from-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Hong Kong
  'hong kong': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'HK': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  // Pakistán
  'pakistan': { bg: 'bg-gradient-to-r from-white to-green-600', primary: '#16a34a', secondary: '#ffffff' },
  'PK': { bg: 'bg-gradient-to-r from-white to-green-600', primary: '#16a34a', secondary: '#ffffff' },
  // Bangladesh
  'bangladesh': { bg: 'bg-green-600', primary: '#16a34a', secondary: '#dc2626' },
  'BD': { bg: 'bg-green-600', primary: '#16a34a', secondary: '#dc2626' },
  // Sri Lanka
  'sri lanka': { bg: 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-800', primary: '#facc15', secondary: '#991b1b' },
  'LK': { bg: 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-800', primary: '#facc15', secondary: '#991b1b' },
  // Nepal
  'nepal': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#2563eb' },
  'NP': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#2563eb' },
  // Myanmar
  'myanmar': { bg: 'bg-gradient-to-b from-yellow-400 via-green-600 to-red-600', primary: '#facc15', secondary: '#16a34a' },
  'MM': { bg: 'bg-gradient-to-b from-yellow-400 via-green-600 to-red-600', primary: '#facc15', secondary: '#16a34a' },
  // Camboya
  'cambodia': { bg: 'bg-gradient-to-b from-blue-600 via-red-600 to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  'KH': { bg: 'bg-gradient-to-b from-blue-600 via-red-600 to-blue-600', primary: '#dc2626', secondary: '#2563eb' },
  // Laos
  'laos': { bg: 'bg-gradient-to-b from-red-600 via-blue-600 to-red-600', primary: '#dc2626', secondary: '#2563eb' },
  'LA': { bg: 'bg-gradient-to-b from-red-600 via-blue-600 to-red-600', primary: '#dc2626', secondary: '#2563eb' },
  // Mongolia
  'mongolia': { bg: 'bg-gradient-to-r from-red-600 via-blue-600 to-red-600', primary: '#dc2626', secondary: '#2563eb' },
  'MN': { bg: 'bg-gradient-to-r from-red-600 via-blue-600 to-red-600', primary: '#dc2626', secondary: '#2563eb' },

  // ==================== MEDIO ORIENTE ====================
  // Arabia Saudita
  'saudi arabia': { bg: 'bg-green-600', primary: '#16a34a', secondary: '#ffffff' },
  'SA': { bg: 'bg-green-600', primary: '#16a34a', secondary: '#ffffff' },
  // Emiratos Árabes
  'uae': { bg: 'bg-gradient-to-b from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'AE': { bg: 'bg-gradient-to-b from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  // Israel
  'israel': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  'IL': { bg: 'bg-gradient-to-b from-blue-600 via-white to-blue-600', primary: '#2563eb', secondary: '#ffffff' },
  // Turquía
  'turkey': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'TR': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  // Irán
  'iran': { bg: 'bg-gradient-to-b from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'IR': { bg: 'bg-gradient-to-b from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  // Irak
  'iraq': { bg: 'bg-gradient-to-b from-red-600 via-white to-black', primary: '#dc2626', secondary: '#000000' },
  'IQ': { bg: 'bg-gradient-to-b from-red-600 via-white to-black', primary: '#dc2626', secondary: '#000000' },
  // Egipto
  'egypt': { bg: 'bg-gradient-to-b from-red-600 via-white to-black', primary: '#dc2626', secondary: '#000000' },
  'EG': { bg: 'bg-gradient-to-b from-red-600 via-white to-black', primary: '#dc2626', secondary: '#000000' },
  // Jordania
  'jordan': { bg: 'bg-gradient-to-b from-black via-white to-green-600', primary: '#000000', secondary: '#16a34a' },
  'JO': { bg: 'bg-gradient-to-b from-black via-white to-green-600', primary: '#000000', secondary: '#16a34a' },
  // Líbano
  'lebanon': { bg: 'bg-gradient-to-b from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#16a34a' },
  'LB': { bg: 'bg-gradient-to-b from-red-600 via-white to-red-600', primary: '#dc2626', secondary: '#16a34a' },
  // Kuwait
  'kuwait': { bg: 'bg-gradient-to-b from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  'KW': { bg: 'bg-gradient-to-b from-green-600 via-white to-red-600', primary: '#16a34a', secondary: '#dc2626' },
  // Qatar
  'qatar': { bg: 'bg-gradient-to-r from-white to-red-800', primary: '#991b1b', secondary: '#ffffff' },
  'QA': { bg: 'bg-gradient-to-r from-white to-red-800', primary: '#991b1b', secondary: '#ffffff' },
  // Bahréin
  'bahrain': { bg: 'bg-gradient-to-r from-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'BH': { bg: 'bg-gradient-to-r from-white to-red-600', primary: '#dc2626', secondary: '#ffffff' },
  // Omán
  'oman': { bg: 'bg-gradient-to-b from-white via-red-600 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  'OM': { bg: 'bg-gradient-to-b from-white via-red-600 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  // Yemen
  'yemen': { bg: 'bg-gradient-to-b from-red-600 via-white to-black', primary: '#dc2626', secondary: '#000000' },
  'YE': { bg: 'bg-gradient-to-b from-red-600 via-white to-black', primary: '#dc2626', secondary: '#000000' },
  // Afganistán
  'afghanistan': { bg: 'bg-gradient-to-r from-black via-red-600 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  'AF': { bg: 'bg-gradient-to-r from-black via-red-600 to-green-600', primary: '#dc2626', secondary: '#16a34a' },

  // ==================== RUSIA Y EX-URSS ====================
  // Rusia
  'rusia': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'russia': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  'RU': { bg: 'bg-gradient-to-b from-white via-blue-600 to-red-600', primary: '#2563eb', secondary: '#dc2626' },
  // Georgia
  'georgia': { bg: 'bg-white', primary: '#ffffff', secondary: '#dc2626' },
  'GE': { bg: 'bg-white', primary: '#ffffff', secondary: '#dc2626' },
  // Armenia
  'armenia': { bg: 'bg-gradient-to-b from-red-600 via-blue-600 to-orange-500', primary: '#dc2626', secondary: '#2563eb' },
  'AM': { bg: 'bg-gradient-to-b from-red-600 via-blue-600 to-orange-500', primary: '#dc2626', secondary: '#2563eb' },
  // Azerbaiyán
  'azerbaijan': { bg: 'bg-gradient-to-b from-blue-600 via-red-600 to-green-600', primary: '#2563eb', secondary: '#dc2626' },
  'AZ': { bg: 'bg-gradient-to-b from-blue-600 via-red-600 to-green-600', primary: '#2563eb', secondary: '#dc2626' },
  // Kazajistán
  'kazakhstan': { bg: 'bg-sky-400', primary: '#38bdf8', secondary: '#facc15' },
  'KZ': { bg: 'bg-sky-400', primary: '#38bdf8', secondary: '#facc15' },
  // Uzbekistán
  'uzbekistan': { bg: 'bg-gradient-to-b from-blue-600 via-white to-green-600', primary: '#2563eb', secondary: '#16a34a' },
  'UZ': { bg: 'bg-gradient-to-b from-blue-600 via-white to-green-600', primary: '#2563eb', secondary: '#16a34a' },
  // Turkmenistán
  'turkmenistan': { bg: 'bg-green-600', primary: '#16a34a', secondary: '#dc2626' },
  'TM': { bg: 'bg-green-600', primary: '#16a34a', secondary: '#dc2626' },
  // Tayikistán
  'tajikistan': { bg: 'bg-gradient-to-b from-red-600 via-white to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  'TJ': { bg: 'bg-gradient-to-b from-red-600 via-white to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  // Kirguistán
  'kyrgyzstan': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },
  'KG': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#facc15' },

  // ==================== OCEANÍA ====================
  // Australia
  'australia': { bg: 'bg-blue-900', primary: '#1e3a8a', secondary: '#dc2626' },
  'AU': { bg: 'bg-blue-900', primary: '#1e3a8a', secondary: '#dc2626' },
  // Nueva Zelanda
  'new zealand': { bg: 'bg-blue-900', primary: '#1e3a8a', secondary: '#dc2626' },
  'NZ': { bg: 'bg-blue-900', primary: '#1e3a8a', secondary: '#dc2626' },
  // Fiyi
  'fiji': { bg: 'bg-sky-400', primary: '#38bdf8', secondary: '#dc2626' },
  'FJ': { bg: 'bg-sky-400', primary: '#38bdf8', secondary: '#dc2626' },

  // ==================== ÁFRICA ====================
  // Sudáfrica
  'south africa': { bg: 'bg-gradient-to-b from-green-600 via-yellow-400 to-blue-600', primary: '#16a34a', secondary: '#facc15' },
  'ZA': { bg: 'bg-gradient-to-b from-green-600 via-yellow-400 to-blue-600', primary: '#16a34a', secondary: '#facc15' },
  // Nigeria
  'nigeria': { bg: 'bg-gradient-to-r from-green-600 via-white to-green-600', primary: '#16a34a', secondary: '#ffffff' },
  'NG': { bg: 'bg-gradient-to-r from-green-600 via-white to-green-600', primary: '#16a34a', secondary: '#ffffff' },
  // Kenia
  'kenya': { bg: 'bg-gradient-to-b from-black via-red-600 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  'KE': { bg: 'bg-gradient-to-b from-black via-red-600 to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  // Ghana
  'ghana': { bg: 'bg-gradient-to-b from-red-600 via-yellow-400 to-green-600', primary: '#dc2626', secondary: '#facc15' },
  'GH': { bg: 'bg-gradient-to-b from-red-600 via-yellow-400 to-green-600', primary: '#dc2626', secondary: '#facc15' },
  // Etiopía
  'ethiopia': { bg: 'bg-gradient-to-b from-green-600 via-yellow-400 to-red-600', primary: '#16a34a', secondary: '#facc15' },
  'ET': { bg: 'bg-gradient-to-b from-green-600 via-yellow-400 to-red-600', primary: '#16a34a', secondary: '#facc15' },
  // Marruecos
  'morocco': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#16a34a' },
  'MA': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#16a34a' },
  // Argelia
  'algeria': { bg: 'bg-gradient-to-r from-green-600 to-white', primary: '#16a34a', secondary: '#dc2626' },
  'DZ': { bg: 'bg-gradient-to-r from-green-600 to-white', primary: '#16a34a', secondary: '#dc2626' },
  // Túnez
  'tunisia': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  'TN': { bg: 'bg-red-600', primary: '#dc2626', secondary: '#ffffff' },
  // Libia
  'libya': { bg: 'bg-gradient-to-b from-red-600 via-black to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  'LY': { bg: 'bg-gradient-to-b from-red-600 via-black to-green-600', primary: '#dc2626', secondary: '#16a34a' },
  // Angola
  'angola': { bg: 'bg-gradient-to-b from-red-600 to-black', primary: '#dc2626', secondary: '#facc15' },
  'AO': { bg: 'bg-gradient-to-b from-red-600 to-black', primary: '#dc2626', secondary: '#facc15' },
  // Mozambique
  'mozambique': { bg: 'bg-gradient-to-b from-green-600 via-black to-yellow-400', primary: '#16a34a', secondary: '#facc15' },
  'MZ': { bg: 'bg-gradient-to-b from-green-600 via-black to-yellow-400', primary: '#16a34a', secondary: '#facc15' },
  // Tanzania
  'tanzania': { bg: 'bg-gradient-to-br from-green-600 via-yellow-400 to-blue-600', primary: '#16a34a', secondary: '#2563eb' },
  'TZ': { bg: 'bg-gradient-to-br from-green-600 via-yellow-400 to-blue-600', primary: '#16a34a', secondary: '#2563eb' },
  // Uganda
  'uganda': { bg: 'bg-gradient-to-b from-black via-yellow-400 to-red-600', primary: '#facc15', secondary: '#dc2626' },
  'UG': { bg: 'bg-gradient-to-b from-black via-yellow-400 to-red-600', primary: '#facc15', secondary: '#dc2626' },
  // Senegal
  'senegal': { bg: 'bg-gradient-to-r from-green-600 via-yellow-400 to-red-600', primary: '#16a34a', secondary: '#facc15' },
  'SN': { bg: 'bg-gradient-to-r from-green-600 via-yellow-400 to-red-600', primary: '#16a34a', secondary: '#facc15' },
  // Costa de Marfil
  'ivory coast': { bg: 'bg-gradient-to-r from-orange-500 via-white to-green-600', primary: '#f97316', secondary: '#16a34a' },
  'CI': { bg: 'bg-gradient-to-r from-orange-500 via-white to-green-600', primary: '#f97316', secondary: '#16a34a' },
  // Camerún
  'cameroon': { bg: 'bg-gradient-to-r from-green-600 via-red-600 to-yellow-400', primary: '#16a34a', secondary: '#dc2626' },
  'CM': { bg: 'bg-gradient-to-r from-green-600 via-red-600 to-yellow-400', primary: '#16a34a', secondary: '#dc2626' },
};

// Colores por defecto
const defaultColors = {
  top: { bg: 'bg-gradient-to-b from-amber-400 to-orange-500', primary: '#f97316', secondary: '#dc2626' },
  bottom: { bg: 'bg-gradient-to-b from-red-500 to-red-700', primary: '#dc2626', secondary: '#f97316' }
};

const getCountryColor = (text, index) => {
  if (!text) {
    return index === 0 ? defaultColors.top.bg : defaultColors.bottom.bg;
  }
  
  const lowerText = text.toLowerCase();
  
  for (const [country, colors] of Object.entries(countryColors)) {
    if (lowerText.includes(country.toLowerCase()) || country.toLowerCase().includes(lowerText)) {
      return colors.bg;
    }
  }
  
  return index === 0 ? defaultColors.top.bg : defaultColors.bottom.bg;
};

// Obtiene los 2 colores principales del país
const getCountryColors = (countryName) => {
  if (!countryName) {
    return { primary: defaultColors.top.primary, secondary: defaultColors.bottom.primary };
  }
  
  const lowerText = countryName.toLowerCase();
  
  for (const [country, colors] of Object.entries(countryColors)) {
    if (lowerText.includes(country.toLowerCase()) || country.toLowerCase().includes(lowerText)) {
      return { primary: colors.primary, secondary: colors.secondary };
    }
  }
  
  return { primary: defaultColors.top.primary, secondary: defaultColors.bottom.primary };
};

const getCountryPrimaryColor = (text, index) => {
  if (!text) {
    return index === 0 ? defaultColors.top.primary : defaultColors.bottom.primary;
  }
  
  const lowerText = text.toLowerCase();
  
  for (const [country, colors] of Object.entries(countryColors)) {
    if (lowerText.includes(country.toLowerCase()) || country.toLowerCase().includes(lowerText)) {
      return colors.primary;
    }
  }
  
  return index === 0 ? defaultColors.top.primary : defaultColors.bottom.primary;
};

// Componente para una sola pregunta (Rediseño MVP — Twyk colors)
const QuestionSlide = ({ 
  question, 
  questionIndex,
  isActive, 
  onVote, 
  selectedOption, 
  showResults,
  creatorCountry,
  highlightedOption,  // Opción resaltada por la voz (0 o 1)
  totalQuestions = 1,
  currentIndex = 0,
  timeLeft = 0,
  orientation = 'horizontal',  // 'horizontal' = arriba-abajo, 'vertical' = lado a lado (izquierda-derecha)
  stats = null,  // 🗳️ Stats actualizados del servidor: { total_votes, options: [{ id, votes, percentage }] }
  // 🧭 NUEVO: si la barra de navegación inferior está visible se reservan
  // ~56px adicionales en la zona inferior del post.
  isBottomNavVisible = false,
  // 🏆 Winner card overlay
  pollId,
  onRequestNextDuel,
}) => {
  const isRow = orientation === 'vertical';  // lado a lado
  const options = question.options || [];
  const optionA = options[0];
  const optionB = options[1];

  // 🧭 Offsets dinámicos según el tipo de barra de navegación
  // - bottom-nav visible (feed normal): se suma ~56px al fondo
  // - bottom-nav oculta (modo TikTok fullscreen): valores estándar
  const TOP_OFFSET = 'top-14';
  const BOTTOM_OFFSET = isBottomNavVisible ? 'bottom-40' : 'bottom-24';
  const TROPHY_TOP = 'top-24';
  const TROPHY_BOTTOM = isBottomNavVisible ? 'bottom-52' : 'bottom-36';

  // ⏱️ Countdown "SIGUIENTE DUELO EN Xs" — se activa cuando aparecen los resultados
  const [nextDuelCountdown, setNextDuelCountdown] = useState(null);
  const { t } = useTranslation();
  // 🏆 Winner card — aparece 1.5s después del voto/resultados (no en empates)
  //    SOLO se muestra para el slide activo. Como VSWinnerCard se portaliza a
  //    document.body, sin este gate verías cards de publicaciones anteriores
  //    todavía montadas en el "tape" del scroller.
  const [showWinnerCard, setShowWinnerCard] = useState(false);

  // 🖼️ Content card — vista "solo contenido" del duelo. Se activa con long-press
  //    y se cierra con el botón Atrás del dispositivo.
  const [showContentCard, setShowContentCard] = useState(false);
  const [contentCardInitial, setContentCardInitial] = useState(0);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  const handleLongPressStart = (e) => {
    if (!isActive) return;
    longPressTriggeredRef.current = false;
    const isTouch = e.type === 'touchstart';
    if (isTouch) {
      const t = e.touches?.[0];
      if (!t) return;
      touchStartPosRef.current = { x: t.clientX, y: t.clientY };
    } else {
      // Solo touch/mobile
      return;
    }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    // Calculamos qué opción se está presionando según la posición del touch
    // y la orientación del VS (vertical=lado a lado, horizontal=arriba-abajo)
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const t = e.touches[0];
    const localX = t.clientX - rect.left;
    const localY = t.clientY - rect.top;
    let initialIdx = 0;
    if (isRow) {
      // lado a lado: A=izq, B=der
      initialIdx = localX < rect.width / 2 ? 0 : 1;
    } else {
      // arriba-abajo: A=arriba, B=abajo
      initialIdx = localY < rect.height / 2 ? 0 : 1;
    }
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setContentCardInitial(initialIdx);
      setShowContentCard(true);
    }, 550);
  };

  const handleLongPressMove = (e) => {
    if (!longPressTimerRef.current) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(t.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLongPressEnd = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Si el long-press se disparó, evitamos el click sintético posterior
    // que el WebView de Android genera al levantar el dedo (podría caer
    // sobre la card recién montada y cerrarla).
    if (longPressTriggeredRef.current) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch (_) { /* noop */ }
    }
  };

  const handleLongPressClickCapture = (e) => {
    // Si el long-press se disparó, suprimimos el click hijo (voto)
    if (longPressTriggeredRef.current) {
      e.stopPropagation();
      e.preventDefault();
      longPressTriggeredRef.current = false;
    }
  };
  useEffect(() => {
    if (!showResults || !isActive) {
      setShowWinnerCard(false);
      return;
    }
    const t = setTimeout(() => setShowWinnerCard(true), 1500);
    return () => clearTimeout(t);
  }, [showResults, isActive]);
  useEffect(() => {
    if (!showResults) {
      setNextDuelCountdown(null);
      return;
    }
    setNextDuelCountdown(5);
    const id = setInterval(() => {
      setNextDuelCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [showResults]);

  // Cálculo de votos y porcentajes — preferir los stats del servidor si
  // existen (rellenados tras el voto), si no usar los conteos del propio
  // poll.options.
  const getServerVotes = (optionId) => {
    if (!stats?.options) return null;
    const found = stats.options.find(o => o.id === optionId);
    return found ? { votes: found.votes, percentage: found.percentage } : null;
  };

  const serverA = getServerVotes(optionA?.id);
  const serverB = getServerVotes(optionB?.id);

  const votesA = serverA?.votes ?? optionA?.votes ?? 0;
  const votesB = serverB?.votes ?? optionB?.votes ?? 0;
  const totalVotes = stats?.total_votes ?? (votesA + votesB);

  const getPercentage = (optionId) => {
    // 1) Stats del servidor (más preciso)
    const sv = getServerVotes(optionId);
    if (sv) return sv.percentage;
    // 2) Cálculo a partir de conteos locales
    if (totalVotes === 0) {
      // Si no hay votos: si el usuario eligió, mostrar 65/35 sesgado a su voto
      if (selectedOption) return optionId === selectedOption ? 65 : 35;
      return 50;
    }
    const optionVotes = options.find(o => o.id === optionId)?.votes || 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const percA = getPercentage(optionA?.id);
  const percB = 100 - percA;
  const winnerIsA = percA > percB;
  const winnerIsB = percB > percA;
  const isTie = percA === percB;

  // Mock "+N votos en los últimos 5s" — animado y con jitter realista
  const [recentVotes, setRecentVotes] = useState(() => Math.floor(Math.random() * 25) + 8);
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      setRecentVotes((v) => {
        const delta = Math.floor(Math.random() * 9) - 3; // -3..+5
        const next = Math.max(3, Math.min(99, v + delta));
        return next;
      });
    }, 1800);
    return () => clearInterval(id);
  }, [isActive]);

  // Estado label por opción
  const getStatusLabel = (isOptionA) => {
    const isSelected = (isOptionA && optionA && selectedOption === optionA.id)
      || (!isOptionA && optionB && selectedOption === optionB.id);
    if (isSelected) return { Icon: Heart, iconProps: { fill: 'currentColor' }, text: t('vs.tuVoto'), color: '#fff' };
    if (!showResults) return null;
    const myPerc = isOptionA ? percA : percB;
    const otherPerc = isOptionA ? percB : percA;
    if (myPerc > otherPerc) return { Icon: Flame, iconProps: { fill: 'currentColor' }, text: t('vs.vaGanando'), color: '#fff' };
    if (myPerc < otherPerc) return { Icon: Zap, iconProps: { fill: 'currentColor' }, text: t('vs.remontando'), color: '#fff' };
    return { Icon: Scale, iconProps: {}, text: t('vs.empate'), color: '#fff' };
  };

  const renderCard = (option, index) => {
    if (!option) return <div className="flex-1 bg-black/40" />;
    const isOptionA = index === 0;
    const colors = isOptionA ? TWYK_COLORS.top : TWYK_COLORS.bottom;
    const isSelected = selectedOption === option.id;
    const isHighlighted = highlightedOption === index;
    const percentage = isOptionA ? percA : percB;
    // Preferir conteo del servidor si existe; si no, el del propio option.
    const optionVotes = isOptionA ? votesA : votesB;
    const imageUrl = option.media?.url || option.media?.thumbnail || option.media_url || option.thumbnail_url || option.image;
    const status = getStatusLabel(isOptionA);
    const isWinning = showResults && (isOptionA ? winnerIsA : winnerIsB);

    // 🎬 CINEMA 3D — clases para el efecto estereoscópico tipo cine 3D
    const isLoser = showResults && !isSelected && !isWinning;
    return (
      <div
        className={cn(
          "flex-1 relative overflow-hidden cursor-pointer",
          isHighlighted && !isSelected && "scale-[1.01]",
          // Card votada → respira/flota en 3D ("sale" de la pantalla, viva)
          // + aberración cromática (RGB split) tipo gafas 3D
          isSelected && "vs-cinema-3d-active vs-cinema-chroma-shadow",
          // Card perdedora → se va AL FONDO (translateZ negativo + blur)
          isLoser && "vs-cinema-recede"
        )}
        style={{
          // 🎬 Lift Subject: origen en el CENTRO para que la card crezca
          // hacia AMBOS lados y se SUPERPONGA sobre la vecina (estilo iOS).
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
          zIndex: isSelected ? 30 : (isLoser ? 1 : 5),
          // 🎬 Border radius animado: la card votada parece RECORTADA del
          // fondo (Visual Look Up / Lift Subject from Background) — bordes
          // limpios al superponerse sobre la card vecina.
          borderRadius: isSelected ? '22px' : '0px',
          // Solo aplicamos transform inline cuando NO está la animación 3D activa
          // (la animación CSS controla el transform de los estados isSelected/isLoser).
          transform: !isSelected && !isLoser ? 'none' : undefined,
          transition: !isSelected && !isLoser
            ? 'transform 0.55s cubic-bezier(0.16,1,0.3,1), filter 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease, border-radius 0.4s ease'
            : 'border-radius 0.4s cubic-bezier(0.16,1,0.3,1)',
          filter: !isSelected && !isLoser ? 'none' : undefined,
          opacity: !isSelected && !isLoser ? 1 : undefined,
          // Glow base sólo cuando NO está votada (sin animar). Cuando está votada,
          // el box-shadow lo controla la animación .vs-cinema-chroma-shadow.
          boxShadow: !isSelected
            ? (isActive ? `inset 0 0 60px ${colors.glowSoft}` : 'none')
            : undefined,
        }}
        onClick={() => {
          if (isActive && !showResults) onVote(option.id);
        }}
      >
        <DoubleTapVoteAnimation
          onDoubleTap={() => isActive && !showResults && onVote(option.id)}
          disabled={showResults}
          // 🎨 Color Twyk fijo: lila para opción A (top), azul para opción B (bottom).
          // Nunca usar colores aleatorios.
          gradient={isOptionA ? TWYK_GRADIENTS.violet : TWYK_GRADIENTS.blue}
        >
          {/* Imagen de fondo (cacheable) — con paralaje 3D si está votada */}
          {imageUrl ? (
            <SafeImage
              src={imageUrl}
              alt=""
              loading={isActive ? "eager" : "lazy"}
              decoding="async"
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                // 🎬 Paralaje 3D — la imagen se aleja un poco más que el marco,
                // creando sensación de profundidad real (como en el cine 3D).
                isSelected && "vs-cinema-image-depth"
              )}
            />
          ) : (
            <div
              className={cn(
                "absolute inset-0",
                isSelected && "vs-cinema-image-depth"
              )}
              style={{
                background: `linear-gradient(${isOptionA ? '180deg' : '0deg'}, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              }}
            />
          )}

          {/* 🎬 Pulso interno cinematográfico — solo en la card votada.
              Da sensación de "vida" — la publicación respira luz por dentro. */}
          {isSelected && (
            <div
              aria-hidden
              className="absolute inset-0 vs-cinema-inner-pulse pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 50%, ${colors.glow} 0%, transparent 65%)`,
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* Overlay degradado para legibilidad del texto */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isRow
                ? (isOptionA
                    ? 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.55) 100%)'
                    : 'linear-gradient(270deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.55) 100%)')
                : (isOptionA
                    ? 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.55) 100%)'
                    : 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.55) 100%)'),
            }}
          />

          {/* Glow de borde Twyk (lila arriba, azul abajo) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `inset 0 0 0 2px ${colors.primary}, inset 0 0 30px ${colors.glow}`,
              opacity: isSelected ? 1 : (isActive ? 0.65 : 0.3),
              transition: 'opacity 0.3s ease',
            }}
          />

          {/* Resaltado por voz */}
          {isHighlighted && !isSelected && (
            <div className="absolute inset-0 bg-yellow-400/20 z-5 animate-pulse pointer-events-none" />
          )}

          {/* 🏷️ Trofeo + nombre + status + % + votos: MOVIDOS FUERA de la card.
              Ahora se renderizan como capa hermana del lift-subject con
              zIndex: 50 (al final de QuestionSlide), por encima del overlay
              3D y del lift-subject. Esto evita que queden clippeados por
              overflow-hidden de la card y que se vean afectados por las
              transformaciones 3D (preserve-3d) del contexto cinema. */}

          {/* 🚫 Botón corazón eliminado por petición del usuario.
              El voto se realiza con doble tap sobre la imagen
              (DoubleTapVoteAnimation) o con un solo tap. */}

          {/* Indicador de selección — checkmark verde (mantenido para feedback) */}
          {isSelected && !showResults && (
            <div className={cn("absolute right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-20", TOP_OFFSET)}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </DoubleTapVoteAnimation>
      </div>
    );
  };

  return (
    <div
      className={cn("w-full h-full flex relative", isRow ? "flex-row" : "flex-col")}
      style={{
        // 🎬 Contexto 3D cinematográfico — esencial para que translateZ
        // de las cards funcione como pop-out estereoscópico real (gafas 3D).
        perspective: '1400px',
        perspectiveOrigin: '50% 45%',
        transformStyle: 'preserve-3d',
      }}
      onTouchStart={handleLongPressStart}
      onTouchMove={handleLongPressMove}
      onTouchEnd={handleLongPressEnd}
      onTouchCancel={handleLongPressEnd}
      onClickCapture={handleLongPressClickCapture}
    >
      {renderCard(optionA, 0)}
      {renderCard(optionB, 1)}

      {/* 🎬 LIFT SUBJECT — duplicado del sujeto principal de la opción
          VOTADA, recortado por máscara radial. Se LEVANTA en 3D y se
          monta un poco sobre la card perdedora (estilo iOS Visual Look
          Up / Lift Subject from Background). */}
      {selectedOption && (() => {
        const isVotedA = optionA?.id === selectedOption;
        const voted = isVotedA ? optionA : optionB;
        const votedImg = voted?.media?.url
          || voted?.media?.thumbnail
          || voted?.media_url
          || voted?.thumbnail_url
          || voted?.image;
        if (!votedImg) return null;

        // El overlay cubre la mitad de la card votada; el <img> dentro
        // se escala 1.16-1.23 con la animación → al estar dentro del
        // overlay con overflow visible, el sujeto se sale de su mitad
        // y se monta sobre la card perdedora.
        const slotStyle = isRow
          ? {
              top: 0,
              bottom: 0,
              width: '50%',
              [isVotedA ? 'left' : 'right']: 0,
            }
          : {
              left: 0,
              right: 0,
              height: '50%',
              [isVotedA ? 'top' : 'bottom']: 0,
            };

        return (
          <div
            aria-hidden
            className="absolute pointer-events-none vs-cinema-lift-subject-wrapper"
            style={{
              ...slotStyle,
              zIndex: 31, // por encima de la card votada (30) y la perdedora (1)
              transformStyle: 'preserve-3d',
              overflow: 'visible',
            }}
          >
            <img
              src={resolveAssetUrl(votedImg)}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover vs-cinema-lift-subject"
            />
          </div>
        );
      })()}

      {/* 🏷️ LABELS LAYER — nombre + status pill + % + votos + trofeo.
          Renderizada FUERA de las cards (hermana del lift-subject) con
          zIndex: 50 para que quede SIEMPRE por encima del overlay 3D,
          del lift-subject (zIndex 31) y de las propias cards (zIndex 30/1).
          Cada opción ocupa su mitad mediante un slot absolute idéntico al
          que usa el lift-subject. La capa no captura eventos (pointer-events
          none) para no romper el voto/long-press de las cards. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 50 }}
      >
        {[optionA, optionB].map((option, index) => {
          if (!option) return null;
          const isOptionA = index === 0;
          const colors = isOptionA ? TWYK_COLORS.top : TWYK_COLORS.bottom;
          const isSelected = selectedOption === option.id;
          const percentage = isOptionA ? percA : percB;
          const optionVotes = isOptionA ? votesA : votesB;
          const status = getStatusLabel(isOptionA);
          const isWinning = showResults && (isOptionA ? winnerIsA : winnerIsB);

          // Slot que ocupa la mitad correspondiente — igual que el lift-subject
          const slotStyle = isRow
            ? {
                top: 0,
                bottom: 0,
                width: '50%',
                [isOptionA ? 'left' : 'right']: 0,
              }
            : {
                left: 0,
                right: 0,
                height: '50%',
                [isOptionA ? 'top' : 'bottom']: 0,
              };

          return (
            <div key={option.id} className="absolute" style={slotStyle}>
              {/* 🏆 Trofeo */}
              {isWinning && showResults && (
                <div
                  className={cn(
                    "absolute flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                    "bg-gradient-to-r from-yellow-400 to-amber-500 shadow-xl border-2 border-white/50",
                    isRow
                      ? cn(TROPHY_TOP, isOptionA ? "left-3" : "right-3")
                      : cn("right-3", isOptionA ? TROPHY_TOP : TROPHY_BOTTOM)
                  )}
                >
                  <Trophy className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">{t('vs.ganador')}</span>
                </div>
              )}

              {/* Contenido principal — nombre + status pill + porcentaje + votos */}
              <div
                className={cn(
                  "absolute flex flex-col px-2",
                  isRow
                    ? cn("bottom-16 right-2 left-1 items-start")
                    : cn("left-0 right-16 items-start", isOptionA ? "bottom-16" : "top-16"),
                  // 🎬 Texto/porcentaje flota DELANTE de la imagen (3 capas de profundidad)
                  isSelected && "vs-cinema-text-float"
                )}
              >
                {option.text ? (
                  <h2
                    className="text-white font-black text-2xl md:text-3xl uppercase tracking-tight leading-none"
                    style={{
                      textShadow: '2px 2px 0 rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.6)',
                      WebkitTextStroke: '0.5px rgba(0,0,0,0.4)',
                    }}
                  >
                    {option.text}
                  </h2>
                ) : null}

                {/* Status pill — debajo del nombre (estilo referencia) */}
                {status && (
                  <div
                    className="mt-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 border border-white/30 shadow-md"
                    style={{
                      background: `linear-gradient(90deg, rgba(${colors.primaryRgb},0.55), rgba(${colors.primaryRgb},0.35))`,
                    }}
                  >
                    <span className="text-[10px]">{status.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white drop-shadow-md">
                      {status.text}
                    </span>
                  </div>
                )}

                {/* Porcentaje gigante + votos */}
                {showResults && (
                  <div className="mt-1 flex items-baseline gap-2 animate-in fade-in zoom-in duration-300">
                    <span
                      className="text-5xl md:text-6xl font-black leading-none"
                      style={{
                        color: '#fff',
                        textShadow: `0 0 16px ${colors.glow}, 2px 2px 0 rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.6)`,
                      }}
                    >
                      {percentage}%
                    </span>
                    <span className="text-xs text-white/85 font-bold tabular-nums">
                      {optionVotes.toLocaleString()} votos
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Header overlay — DUELO + RONDA + live votes (solo cuando es activo) */}
      {isActive && (
        <div className={cn("absolute left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-none", TOP_OFFSET)}>
          {/* Pill RONDA */}
          {totalQuestions > 1 && (
            <div className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
                RONDA {currentIndex + 1}/{totalQuestions}
              </span>
            </div>
          )}
          {/* Pill +N votos en los últimos 5s */}
          {!showResults && (
            <div
              className="px-3 py-1 rounded-full backdrop-blur-md border border-white/30 flex items-center gap-1.5 shadow-lg animate-pulse"
              style={{
                background: 'linear-gradient(90deg, rgba(239,68,68,0.85), rgba(249,115,22,0.85))',
              }}
            >
              <Flame className="w-3 h-3 text-white" fill="#fff" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                {t('vs.votosUltimos', { count: recentVotes, seconds: 5 })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer overlay — Hourglass + timer + progress bar */}
      {isActive && !showResults && (
        <div className={cn("absolute left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-none w-[88%]", BOTTOM_OFFSET)}>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 flex items-center gap-1.5">
              <Hourglass className="w-3 h-3 text-amber-300" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white tabular-nums">
                {t('vs.quedan')} 00:{String(timeLeft).padStart(2, '0')}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md border border-white/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                {t('vs.dueloActivo')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer post-voto: la barra de progreso vive ahora en el modal "Votos y reproducciones" y los % en la WinnerCard */}

      {/* Línea divisora con gradiente Twyk (lila → azul) — horizontal o vertical según orientación.
          Grosor 4px (1px en Tailwind = 0.25rem) para que cada mitad (lila 2px + azul 2px)
          coincida visualmente con el borde lateral inset de 2px de cada tarjeta. */}
      <div
        className={cn(
          "absolute z-10 pointer-events-none",
          isRow
            ? "top-0 bottom-0 left-1/2 w-1 transform -translate-x-1/2"
            : "left-0 right-0 top-1/2 h-1 transform -translate-y-1/2"
        )}
        style={{
          background: isRow
            ? `linear-gradient(180deg, ${TWYK_COLORS.top.primary} 0%, ${TWYK_COLORS.top.secondary} 50%, ${TWYK_COLORS.bottom.secondary} 50%, ${TWYK_COLORS.bottom.primary} 100%)`
            : `linear-gradient(90deg, ${TWYK_COLORS.top.primary} 0%, ${TWYK_COLORS.top.secondary} 50%, ${TWYK_COLORS.bottom.secondary} 50%, ${TWYK_COLORS.bottom.primary} 100%)`,
          boxShadow: `0 0 8px ${TWYK_COLORS.top.glow}, 0 0 8px ${TWYK_COLORS.bottom.glow}`,
        }}
      />

      {/* 🏆 Winner Card overlay — aparece 1.5s después de votar (no en empates) */}
      {/*    Gate de isActive además del showWinnerCard para no portalizar cards
            de slides inactivos. */}
      {isActive && showResults && showWinnerCard && !isTie && (() => {
        const winnerOpt = winnerIsA ? optionA : optionB;
        const loserOpt = winnerIsA ? optionB : optionA;
        const winnerName = (winnerOpt?.participant_username || winnerOpt?.text || t('vs.ganadorDefault')).toString();
        const loserName = (loserOpt?.participant_username || loserOpt?.text || '').toString();
        const winnerPerc = winnerIsA ? percA : percB;
        const loserPerc = winnerIsA ? percB : percA;
        const winnerImage =
          winnerOpt?.media?.url ||
          winnerOpt?.media?.thumbnail ||
          winnerOpt?.media_url ||
          winnerOpt?.thumbnail_url ||
          winnerOpt?.image ||
          null;

        const handleShare = () => {
          const text = `¡${winnerName} ganó con ${winnerPerc}%! ⚔️ Vota tu favorito en Twyk`;
          try {
            if (navigator.share) {
              navigator.share({ title: 'Twyk · Duelo', text, url: window.location.href }).catch(() => {});
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(`${text} ${window.location.href}`).catch(() => {});
            }
          } catch (err) { /* noop */ }
        };

        const handleComments = () => {
          if (typeof window !== 'undefined' && pollId) {
            window.dispatchEvent(new CustomEvent('vs:openComments', { detail: { pollId } }));
          }
        };

        const handleNext = () => {
          // Cierra la winner card y delega: si quedan rondas internas avanza a
          // la siguiente; si es la última, dispara evento para avanzar al
          // siguiente post del feed.
          setShowWinnerCard(false);
          if (typeof onRequestNextDuel === 'function') {
            onRequestNextDuel();
          }
        };

        return (
          <VSWinnerCard
            visible={showWinnerCard}
            winnerName={winnerName.toUpperCase()}
            winnerPercentage={winnerPerc}
            winnerImage={winnerImage}
            loserName={loserName ? loserName.toUpperCase() : ''}
            loserPercentage={loserPerc}
            totalVotes={totalVotes}
            currentRound={currentIndex + 1}
            totalRounds={totalQuestions}
            onShare={handleShare}
            onComments={handleComments}
            onNext={handleNext}
            onClose={() => setShowWinnerCard(false)}
          />
        );
      })()}

      {/* 🖼️ Content Card overlay — vista solo contenido (long-press) */}
      {isActive && (
        <VSContentCard
          visible={showContentCard}
          optionA={optionA}
          optionB={optionB}
          initialIndex={contentCardInitial}
          onClose={() => setShowContentCard(false)}
        />
      )}
    </div>
  );
};

const VSLayout = ({ 
  poll, 
  onVote, 
  isActive,
  isThumbnail = false,
  // 🧭 Si la bottom-nav está visible, se reservan ~56px más al pie del post
  // (ver TikTokScrollView padding). Se propaga a QuestionSlide para ajustar
  // las posiciones de los overlays (timer, status pills, trofeo, etc.).
  isBottomNavVisible = false
}) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const voiceSequenceRef = useRef(null);
  const hasStartedVoiceRef = useRef(false);
  
  // País del creador para los colores y voz
  const creatorCountry = poll.creator_country;

  // 🆕 Orientación VS: 'vertical' = lado a lado (izq-der), 'horizontal' = arriba-abajo
  // Default 'horizontal' para retrocompatibilidad con publicaciones anteriores.
  const vsOrientation = ['vertical', 'horizontal'].includes(poll.vs_orientation)
    ? poll.vs_orientation
    : 'horizontal';
  const isRow = vsOrientation === 'vertical';
  
  // Preparar todas las preguntas
  const vsQuestions = poll.vs_questions || [];
  const initialOptions = poll.options || [];
  
  // Si hay vs_questions, usarlas; si no, crear una pregunta con las opciones del poll
  const allQuestions = vsQuestions.length > 0 
    ? vsQuestions 
    : [{ id: poll.id, options: initialOptions }];
  
  const totalQuestions = allQuestions.length;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [showResults, setShowResults] = useState({});
  const [timeLeft, setTimeLeft] = useState(5);
  const [showVS, setShowVS] = useState(true);
  const [highlightedOption, setHighlightedOption] = useState(null); // Para resaltar visualmente
  // 🗳️ Stats actualizados del servidor por pregunta. Se rellena tras cada
  // voto con la respuesta del endpoint /api/vs/{vs_id}/vote.
  // Estructura: { [question_id]: { total_votes, options: [{ id, votes, percentage }] } }
  const [questionStats, setQuestionStats] = useState({});

  // 🔄 SYNC al montar: traer el estado fresco desde /api/vs/{vs_id}
  //   1) Votos previos del usuario (selectedOptions + showResults)
  //   2) Conteos actuales por pregunta/opcion (questionStats con porcentajes exactos)
  // Sin esto, después de recargar el feed el voto aparece como "no votado"
  // (aunque está guardado en `vs_votes`) y los porcentajes muestran el snapshot
  // estancado de `polls.vs_questions` que nunca se actualiza al votar.
  useEffect(() => {
    if (isThumbnail) return;
    const vsId = poll?.vs_id;
    if (!vsId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        const res = await fetch(`${backendUrl}/api/vs/${vsId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        // 1) Pre-seleccionar votos previos del usuario
        const userVotes = data?.user_votes || {};
        if (userVotes && Object.keys(userVotes).length > 0) {
          setSelectedOptions(prev => ({ ...userVotes, ...prev }));
          // Mostrar resultados de las preguntas ya votadas
          const showMap = {};
          Object.keys(userVotes).forEach(qid => { showMap[qid] = true; });
          setShowResults(prev => ({ ...showMap, ...prev }));
        }

        // 2) Construir questionStats frescos con porcentajes exactos
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        if (questions.length > 0) {
          setQuestionStats(prev => {
            const next = { ...prev };
            questions.forEach(q => {
              const opts = Array.isArray(q?.options) ? q.options : [];
              const total = opts.reduce((s, o) => s + (Number(o?.votes) || 0), 0);
              // No sobreescribir stats locales más recientes (post-voto optimista)
              if (next[q.id]) return;
              next[q.id] = {
                question_id: q.id,
                total_votes: total,
                options: opts.map(o => ({
                  id: o.id,
                  votes: Number(o?.votes) || 0,
                  percentage: total > 0 ? Math.round(((Number(o?.votes) || 0) / total) * 100) : 0,
                })),
              };
            });
            return next;
          });
        }

        // 3) 📣 Notificar el TOTAL real de votos al contenedor (TikTokScrollView)
        // para que el contador del botón social refleje el conteo real de
        // `vs_experiences` (no el snapshot estancado de `polls.total_votes`).
        // Se prefiere `total_participants` (usuarios únicos que votaron); si no
        // existe, se calcula como suma de votos / nº de preguntas (~ usuarios).
        const totalParticipants = Number(data?.total_participants) || 0;
        let realTotal = totalParticipants;
        if (!realTotal && questions.length > 0) {
          const sumAll = questions.reduce((acc, q) => {
            const opts = Array.isArray(q?.options) ? q.options : [];
            return acc + opts.reduce((s, o) => s + (Number(o?.votes) || 0), 0);
          }, 0);
          realTotal = Math.round(sumAll / questions.length);
        }
        if (realTotal > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vs:statsUpdate', {
            detail: { pollId: poll.id, totalVotes: realTotal },
          }));
        }

        // 4) 🎨 Determinar el lado votado por el usuario en la PRIMERA pregunta
        // (la principal del post) para colorear el botón social: A=lila, B=azul.
        const firstQ = questions[0];
        if (firstQ && userVotes[firstQ.id]) {
          const optsArr = Array.isArray(firstQ.options) ? firstQ.options : [];
          const idx = optsArr.findIndex(o => o.id === userVotes[firstQ.id]);
          if (idx === 0 || idx === 1) {
            window.dispatchEvent(new CustomEvent('vs:userVote', {
              detail: { pollId: poll.id, votedSide: idx === 0 ? 'a' : 'b' },
            }));
          }
        }
      } catch (e) {
        // silent: si falla, se usa el snapshot local del poll
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll?.vs_id, isThumbnail]);

  const currentQuestion = allQuestions[currentIndex];
  const currentQuestionId = currentQuestion?.id;
  const hasVoted = !!selectedOptions[currentQuestionId];

  // Función para detener toda la voz y secuencia
  const stopVoice = useCallback(() => {
    voiceService.stop();
    if (voiceSequenceRef.current) {
      voiceSequenceRef.current.forEach(timer => clearTimeout(timer));
      voiceSequenceRef.current = null;
    }
    setHighlightedOption(null);
  }, []);

  // Función para hablar con Text-to-Speech (usando voiceService con detección de idioma)
  const speak = useCallback(async (text, rate = 0.9) => {
    if (isThumbnail) return;
    
    // Usar voiceService con el país del creador para determinar el idioma
    // Velocidad reducida para que se escuche mejor
    await voiceService.speak(text, {
      rate,
      pitch: 1.0,
      country: creatorCountry,  // El idioma se determina por el país del creador
    });
  }, [isThumbnail, creatorCountry]);

  // Obtener la frase de intro según el idioma del país - TODOS LOS IDIOMAS
  const getIntroPhrase = useCallback(() => {
    const lang = voiceService.getLanguageFromCountry(creatorCountry);
    
    const phrases = {
      // Idiomas principales
      'es': '¿Qué prefieres?',
      'en': 'What do you prefer?',
      'pt': 'O que você prefere?',
      'fr': 'Que préférez-vous?',
      'de': 'Was bevorzugst du?',
      'it': 'Cosa preferisci?',
      'ja': '何が好きですか？',
      'ko': '뭐가 좋아요?',
      'zh': '你喜欢什么？',
      'ru': 'Что вы предпочитаете?',
      'ar': 'ماذا تفضل؟',
      'nl': 'Wat heeft je voorkeur?',
      'pl': 'Co wolisz?',
      'tr': 'Hangisini tercih edersin?',
      'sv': 'Vad föredrar du?',
      'no': 'Hva foretrekker du?',
      'da': 'Hvad foretrækker du?',
      'fi': 'Mitä suosit?',
      // Idiomas adicionales
      'el': 'Τι προτιμάς;',           // Griego
      'he': 'מה אתה מעדיף?',          // Hebreo
      'th': 'คุณชอบอะไรมากกว่า?',      // Tailandés
      'vi': 'Bạn thích gì hơn?',      // Vietnamita
      'id': 'Apa yang kamu pilih?',   // Indonesio
      'ms': 'Apa yang anda pilih?',   // Malayo
      'hi': 'आप क्या पसंद करते हैं?',    // Hindi
      'bn': 'আপনি কোনটা পছন্দ করেন?',   // Bengali
      'ur': 'آپ کیا پسند کرتے ہیں؟',    // Urdu
      'ta': 'நீங்கள் எதை விரும்புகிறீர்கள்?', // Tamil
      'cs': 'Co preferuješ?',         // Checo
      'sk': 'Čo preferuješ?',         // Eslovaco
      'hu': 'Mit választanál?',       // Húngaro
      'ro': 'Ce preferi?',            // Rumano
      'bg': 'Какво предпочиташ?',     // Búlgaro
      'hr': 'Što preferiraš?',        // Croata
      'sr': 'Шта преферираш?',        // Serbio
      'sl': 'Kaj imaš raje?',         // Esloveno
      'uk': 'Що ви обираєте?',        // Ucraniano
      'ca': 'Què prefereixes?',       // Catalán
      'et': 'Mida sa eelistad?',      // Estonio
      'lv': 'Ko tu izvēlies?',        // Letón
      'lt': 'Ką tu pasirinktum?',     // Lituano
      'is': 'Hvað kýst þú?',          // Islandés
      'sq': 'Çfarë preferoni?',       // Albanés
      'mk': 'Што претпочитате?',      // Macedonio
      'ka': 'რას ანიჭებთ უპირატესობას?', // Georgiano
      'hy': 'Ինչ եք նախընտրում?',            // Armenio
      'az': 'Nəyi seçərdiniz?',       // Azerbaiyano
      'uz': 'Nimani tanlaysiz?',      // Uzbeko
      'mn': 'Та юу сонгох вэ?',       // Mongol
      'ne': 'तपाईं के रोज्नुहुन्छ?',     // Nepalí
      'my': 'ဘာကိုပိုကြိုက်သလဲ?',      // Birmano
      'km': 'អ្នកចូលចិត្តអ្វី?',         // Khmer
      'lo': 'ເຈົ້າມັກຫຍັງ?',           // Lao
      'am': 'ምን ትመርጣለህ?',           // Amárico
      'fa': 'چه چیزی را ترجیح می‌دهید؟', // Persa
    };
    return phrases[lang] || phrases['es'];  // Default español
  }, [creatorCountry]);

  // Secuencia de voz con resaltado visual
  // 🔇 Voz desactivada por petición del usuario — VS ya no usa TTS ni
  // pronuncia la frase intro "¿Qué prefieres?" / "What do you prefer?".
  const startVoiceSequence = useCallback(() => {
    return; // no-op
  }, []);

  // Detener speech cuando el componente se desmonta
  useEffect(() => {
    return () => stopVoice();
  }, [stopVoice]);

  // Iniciar secuencia de voz cuando termina el VS y está activo
  useEffect(() => {
    if (!isActive || isThumbnail || showVS || hasVoted) return;
    
    // Solo iniciar si no ha empezado aún para esta pregunta
    if (!hasStartedVoiceRef.current) {
      hasStartedVoiceRef.current = true;
      startVoiceSequence();
    }
  }, [isActive, isThumbnail, showVS, hasVoted, startVoiceSequence]);

  // Resetear el flag cuando cambia la pregunta
  useEffect(() => {
    hasStartedVoiceRef.current = false;
    setHighlightedOption(null);
  }, [currentIndex]);

  // Avanzar al siguiente slide
  const goToNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      stopVoice(); // Detener voz al cambiar de pantalla
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(5);
      setShowVS(true);
      hasStartedVoiceRef.current = false;
    }
  }, [currentIndex, totalQuestions, stopVoice]);

  // Mostrar VS por 1.5 segundos
  useEffect(() => {
    if (!isActive || isThumbnail) return;
    
    const timer = setTimeout(() => {
      setShowVS(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isActive, isThumbnail, currentIndex]);

  // Temporizador
  useEffect(() => {
    if (!isActive || hasVoted || isThumbnail || showVS) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Espera ~5s para mostrar countdown "SIGUIENTE DUELO" antes de avanzar
          setTimeout(() => goToNext(), 5000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, hasVoted, isThumbnail, showVS, goToNext]);

  const handleVote = async (optionId) => {
    if (hasVoted) return;

    // Optimistic UI: marcar la opción y mostrar resultados ya
    setSelectedOptions(prev => ({
      ...prev,
      [currentQuestionId]: optionId
    }));
    setShowResults(prev => ({
      ...prev,
      [currentQuestionId]: true
    }));

    // 📊 OPTIMISTA: incrementar stats locales para que los porcentajes se vean
    // bien al instante (antes de la respuesta del backend). Si stats no existe
    // aún (no se llegó a prefetch), se inicializa a partir de allQuestions.
    setQuestionStats(prev => {
      const existing = prev[currentQuestionId];
      const baseOptions = existing?.options
        ? existing.options
        : (currentQuestion?.options || []).map(o => ({
            id: o.id,
            votes: Number(o?.votes) || 0,
            percentage: 0,
          }));
      const updatedOptions = baseOptions.map(o =>
        o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
      );
      const newTotal = updatedOptions.reduce((s, o) => s + (o.votes || 0), 0);
      const withPerc = updatedOptions.map(o => ({
        ...o,
        percentage: newTotal > 0 ? Math.round(((o.votes || 0) / newTotal) * 100) : 0,
      }));
      return {
        ...prev,
        [currentQuestionId]: {
          question_id: currentQuestionId,
          total_votes: newTotal,
          options: withPerc,
        },
      };
    });

    // 🔇 Voz al votar desactivada por petición del usuario.

    // 🎨 Notificar el lado votado SOLO si es la primera pregunta del post
    // (la principal). El botón social se colorea: A=lila, B=azul.
    const firstQuestionId = allQuestions[0]?.id;
    if (currentQuestionId === firstQuestionId && currentQuestion?.options) {
      const idx = currentQuestion.options.findIndex(o => o.id === optionId);
      if ((idx === 0 || idx === 1) && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vs:userVote', {
          detail: { pollId: poll.id, votedSide: idx === 0 ? 'a' : 'b' },
        }));
      }
    }

    // 🗳️ Persistir voto en el backend usando el endpoint específico VS,
    // que registra question_id + option_id por usuario (un voto por
    // pregunta). poll.vs_id apunta al VS experience.
    const vsId = poll.vs_id || poll.id;
    const questionId = currentQuestionId;
    if (vsId && questionId) {
      try {
        const token = localStorage.getItem('token');
        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        const res = await fetch(`${backendUrl}/api/vs/${vsId}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            question_id: questionId,
            option_id: optionId,
          }),
        });
        if (res.ok) {
          // 📊 Guardar stats actualizados (total_votes y porcentajes por
          // opción) para mostrarlos correctamente en la UI.
          const data = await res.json().catch(() => null);
          if (data?.stats) {
            setQuestionStats(prev => ({
              ...prev,
              [questionId]: data.stats,
            }));
          }
        } else {
          // No revertimos la UI optimista para no confundir al usuario
          // (probablemente ya votó). Solo loggeamos.
          // eslint-disable-next-line no-console
          console.warn('[VSLayout] vote failed', res.status, await res.text());
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[VSLayout] vote error', err);
      }
    }

    // También notificamos al padre por compat (FeedPage muestra toast,
    // pero el endpoint genérico /api/polls/{id}/vote también sirve para
    // marcar el VS poll-doc como "votado" por este usuario).
    if (onVote) {
      onVote(poll.id, optionId);
    }

    // Auto-avanzar después de votar (5s de countdown SIGUIENTE DUELO)
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => goToNext(), 5000);
    }
  };

  // Thumbnail
  if (isThumbnail) {
    const thumbOptions = initialOptions.slice(0, 2);
    return (
      <div className="w-full h-full relative" style={{ containerType: 'inline-size' }}>
        <div className={cn("absolute inset-0 flex", isRow ? "flex-row" : "flex-col")}>
          {thumbOptions.map((option, index) => {
            const imageUrl = option.media?.url || option.media?.thumbnail || option.media_url || option.thumbnail_url || option.image;
            const bgColor = getCountryColor(option.text, index);
            return (
              <div key={option.id} className={cn("flex-1 relative overflow-hidden", !imageUrl && bgColor)}>
                {imageUrl && (
                  <SafeImage
                    src={imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Línea divisora con gradiente Twyk (lila → azul) — igual que la vista completa */}
        <div
          className={cn(
            "absolute z-10 pointer-events-none",
            isRow
              ? "top-0 bottom-0 left-1/2 w-0.5 transform -translate-x-1/2"
              : "left-0 right-0 top-1/2 h-0.5 transform -translate-y-1/2"
          )}
          style={{
            background: isRow
              ? `linear-gradient(180deg, ${TWYK_COLORS.top.primary} 0%, ${TWYK_COLORS.top.secondary} 50%, ${TWYK_COLORS.bottom.secondary} 50%, ${TWYK_COLORS.bottom.primary} 100%)`
              : `linear-gradient(90deg, ${TWYK_COLORS.top.primary} 0%, ${TWYK_COLORS.top.secondary} 50%, ${TWYK_COLORS.bottom.secondary} 50%, ${TWYK_COLORS.bottom.primary} 100%)`,
          }}
        />
        {/* VS central — mismo diseño que la vista completa (italic, bold, V lila + S azul)
            Escalado al tamaño de la miniatura usando container queries (cqw).
            Sin animación bounce para no distraer en grids con muchos thumbnails. */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-full">
          <div className="relative flex items-center justify-center w-full">
            <span
              className="relative font-black select-none inline-flex items-baseline"
              style={{
                fontSize: 'clamp(1.25rem, 32cqw, 5rem)',
                fontStyle: 'italic',
                lineHeight: 1,
                letterSpacing: '-0.14em',
                fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif',
                fontWeight: 900,
              }}
            >
              {/* V — fill blanco, borde LILA Twyk */}
              <span
                className="relative"
                style={{
                  color: '#fff',
                  WebkitTextStroke: `1.5px ${TWYK_COLORS.top.primary}`,
                  paintOrder: 'stroke fill',
                  textShadow: '0 2px 0 rgba(0,0,0,0.6), 1px 2px 6px rgba(0,0,0,0.75)',
                  transform: 'skewX(-6deg) translateY(-0.16em)',
                  display: 'inline-block',
                  marginRight: '0.02em',
                }}
              >
                V
              </span>
              {/* S — fill blanco, borde AZUL Twyk */}
              <span
                className="relative"
                style={{
                  color: '#fff',
                  WebkitTextStroke: `1.5px ${TWYK_COLORS.bottom.primary}`,
                  paintOrder: 'stroke fill',
                  textShadow: '0 2px 0 rgba(0,0,0,0.6), 1px 2px 6px rgba(0,0,0,0.75)',
                  transform: 'skewX(-6deg) translateY(0.16em)',
                  display: 'inline-block',
                }}
              >
                S
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      {/* Carrusel de preguntas */}
      <div 
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ 
          width: `${totalQuestions * 100}%`,
          transform: `translateX(-${(currentIndex / totalQuestions) * 100}%)` 
        }}
      >
        {allQuestions.map((question, qIndex) => (
          <div 
            key={question.id} 
            className="h-full relative"
            style={{ width: `${100 / totalQuestions}%` }}
          >
            <QuestionSlide
              question={question}
              questionIndex={qIndex}
              isActive={qIndex === currentIndex && isActive}
              onVote={handleVote}
              selectedOption={selectedOptions[question.id]}
              showResults={showResults[question.id]}
              creatorCountry={creatorCountry}
              highlightedOption={qIndex === currentIndex ? highlightedOption : null}
              totalQuestions={totalQuestions}
              currentIndex={currentIndex}
              timeLeft={timeLeft}
              orientation={vsOrientation}
              stats={questionStats[question.id]}
              isBottomNavVisible={isBottomNavVisible}
              pollId={poll.id}
              onRequestNextDuel={() => {
                if (currentIndex < totalQuestions - 1) {
                  goToNext();
                } else if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('vs:nextPost', { detail: { pollId: poll.id } }));
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* VS central — diseño tipo referencia (italic, bold, neón intenso)
          pero con los colores Twyk: lila (arriba) + azul (abajo).
          🚫 SOMBRAS DE COLORES ELIMINADAS por petición del usuario:
          se quita el halo radial lila/azul, el flash colorido y los
          glows multicapa (lila/azul) alrededor de las letras. Se
          mantienen los bordes lila (V) y azul (S) y una sombra negra
          neutra para conservar la profundidad. */}
      {(() => {
        return (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-full">
            <div className="relative flex items-center justify-center w-full">
              {/* Texto "VS" — letras BLANCAS, bordes Twyk (V lila / S azul),
                  V ligeramente arriba, S ligeramente abajo. Sin glow de color. */}
              <span
                className={cn(
                  "relative font-black select-none inline-flex items-baseline",
                  showVS && "animate-vs-bounce"
                )}
                style={{
                  fontSize: 'clamp(4rem, 18vw, 9rem)',
                  fontStyle: 'italic',
                  lineHeight: 1,
                  letterSpacing: '-0.14em',
                  fontFamily: '"Impact", "Bebas Neue", "Arial Black", sans-serif',
                  fontWeight: 900,
                }}
              >
                {/* V — fill blanco, borde LILA Twyk (sin glow de color) */}
                <span
                  className="relative"
                  style={{
                    color: '#fff',
                    WebkitTextStroke: `3px ${TWYK_COLORS.top.primary}`,
                    paintOrder: 'stroke fill',
                    textShadow: [
                      // sólo sombra negra neutra para profundidad 3D
                      '0 5px 0 rgba(0,0,0,0.6)',
                      '3px 6px 14px rgba(0,0,0,0.75)',
                    ].join(', '),
                    transform: 'skewX(-6deg) translateY(-0.16em)',
                    display: 'inline-block',
                    marginRight: '0.02em',
                  }}
                >
                  V
                </span>
                {/* S — fill blanco, borde AZUL Twyk (sin glow de color) */}
                <span
                  className="relative"
                  style={{
                    color: '#fff',
                    WebkitTextStroke: `3px ${TWYK_COLORS.bottom.primary}`,
                    paintOrder: 'stroke fill',
                    textShadow: [
                      // sólo sombra negra neutra para profundidad 3D
                      '0 5px 0 rgba(0,0,0,0.6)',
                      '3px 6px 14px rgba(0,0,0,0.75)',
                    ].join(', '),
                    transform: 'skewX(-6deg) translateY(0.16em)',
                    display: 'inline-block',
                  }}
                >
                  S
                </span>
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default VSLayout;
