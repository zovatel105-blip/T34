import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import voiceService from '../../services/voiceService';
import DoubleTapVoteAnimation from '../DoubleTapVoteAnimation';

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

// Componente para una sola pregunta
const QuestionSlide = ({ 
  question, 
  questionIndex,
  isActive, 
  onVote, 
  selectedOption, 
  showResults,
  creatorCountry,
  highlightedOption  // Opción resaltada por la voz (0 o 1)
}) => {
  const options = question.options || [];

  const getPercentage = (optionId) => {
    const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    if (totalVotes === 0) {
      return optionId === selectedOption ? 65 : 35;
    }
    const optionVotes = options.find(o => o.id === optionId)?.votes || 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {options.slice(0, 2).map((option, index) => {
        const isSelected = selectedOption === option.id;
        const isHighlighted = highlightedOption === index;
        const percentage = showResults ? getPercentage(option.id) : 0;
        const imageUrl = option.media?.url || option.media?.thumbnail || option.media_url || option.thumbnail_url || option.image;
        const bgColor = getCountryColor(option.text, index);
        const isTop = index === 0;
        
        return (
          <div
            key={option.id}
            className={cn(
              "flex-1 relative overflow-hidden transition-all duration-300",
              !imageUrl && bgColor,
              isSelected && "ring-4 ring-white ring-inset",
              isHighlighted && !isSelected && "ring-4 ring-yellow-400 ring-inset scale-[1.02]"
            )}
          >
            <DoubleTapVoteAnimation
              onDoubleTap={() => isActive && !showResults && onVote(option.id)}
              disabled={showResults}
            >
            {/* Overlay de resaltado por voz */}
            {isHighlighted && !isSelected && (
              <div className="absolute inset-0 bg-yellow-400/20 z-5 animate-pulse" />
            )}
            
            {/* Imagen de fondo completo */}
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt="" 
                loading={isActive ? "eager" : "lazy"}
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            
            {/* Contenido - posicionado arriba o abajo según la opción */}
            <div className={cn(
              "absolute left-0 right-0 z-10 flex flex-col items-center px-4",
              isTop ? "bottom-8 md:bottom-10" : "top-8 md:top-10"
            )}>
              <h2 className={cn(
                "text-white font-black text-2xl md:text-3xl uppercase tracking-wide",
                "drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center",
                "[text-shadow:_2px_2px_0_#000,_-2px_-2px_0_#000,_2px_-2px_0_#000,_-2px_2px_0_#000]",
                isSelected && "scale-110"
              )}>
                {option.text || `Opción ${index + 1}`}
              </h2>
              
              {showResults && (
                <div className="mt-1 animate-in fade-in zoom-in">
                  <span className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {percentage}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Indicador de selección */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            </DoubleTapVoteAnimation>
          </div>
        );
      })}
      
      {/* Línea divisora con 2 colores del país del creador */}
      {(() => {
        const colors = getCountryColors(creatorCountry);
        return (
          <div 
            className="absolute top-1/2 left-0 right-0 h-1.5 z-10 transform -translate-y-1/2"
            style={{
              background: `linear-gradient(90deg, ${colors.primary} 50%, ${colors.secondary} 50%)`
            }}
          />
        );
      })()}
    </div>
  );
};

const VSLayout = ({ 
  poll, 
  onVote, 
  isActive,
  isThumbnail = false
}) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const voiceSequenceRef = useRef(null);
  const hasStartedVoiceRef = useRef(false);
  
  // País del creador para los colores y voz
  const creatorCountry = poll.creator_country;
  
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
  const startVoiceSequence = useCallback(() => {
    if (isThumbnail || hasVoted || !isActive) return;
    
    const options = currentQuestion?.options || [];
    const optionA = options[0]?.text || 'Opción A';
    const optionB = options[1]?.text || 'Opción B';
    
    // Cancelar secuencia anterior
    stopVoice();
    
    const timers = [];
    
    // Solo decir intro en la primera pregunta
    const isFirstQuestion = currentIndex === 0;
    const introDelay = isFirstQuestion ? 1500 : 0;  // Más tiempo para la intro (1.5 segundos)
    
    // Paso 0: Decir frase intro (en el idioma del país) solo en la primera pregunta
    if (isFirstQuestion) {
      const introPhrase = getIntroPhrase();
      timers.push(setTimeout(() => {
        speak(introPhrase, 0.85);  // Velocidad más lenta para intro
      }, 0));
    }
    
    // Paso 1: Resaltar y hablar opción A (después de que termine la intro)
    timers.push(setTimeout(() => {
      setHighlightedOption(0);
      speak(optionA, 0.95);
    }, introDelay));
    
    // Paso 2: Resaltar y hablar opción B
    timers.push(setTimeout(() => {
      setHighlightedOption(1);
      speak(optionB, 0.95);
    }, introDelay + 2000));  // 2 segundos entre opciones
    
    // Paso 3: Quitar resaltado
    timers.push(setTimeout(() => {
      setHighlightedOption(null);
    }, introDelay + 4000));  // 4 segundos total después de intro
    
    voiceSequenceRef.current = timers;
  }, [isThumbnail, hasVoted, isActive, currentQuestion, currentIndex, speak, stopVoice, getIntroPhrase]);

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
          setTimeout(() => goToNext(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, hasVoted, isThumbnail, showVS, goToNext]);

  const handleVote = (optionId) => {
    if (hasVoted) return;
    
    // Obtener la opción seleccionada para la voz
    const options = currentQuestion?.options || [];
    const selectedOption = options.find(opt => opt.id === optionId);
    const otherOption = options.find(opt => opt.id !== optionId);
    
    setSelectedOptions(prev => ({
      ...prev,
      [currentQuestionId]: optionId
    }));
    setShowResults(prev => ({
      ...prev,
      [currentQuestionId]: true
    }));
    
    // Anunciar la elección con voz
    if (selectedOption) {
      const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
      const selectedVotes = selectedOption.votes || 0;
      const otherVotes = otherOption?.votes || 0;
      
      // Calcular porcentajes (simulados si no hay votos reales)
      let selectedPercent, otherPercent;
      if (totalVotes === 0) {
        selectedPercent = 65;
        otherPercent = 35;
      } else {
        selectedPercent = Math.round(((selectedVotes + 1) / (totalVotes + 1)) * 100);
        otherPercent = 100 - selectedPercent;
      }
      
      setTimeout(() => {
        speak(`Elegiste ${selectedOption.text}. ${selectedPercent} por ciento contra ${otherPercent} por ciento.`, 1.1);
      }, 300);
    }
    
    if (onVote) {
      onVote(poll.id, optionId);
    }

    // Auto-avanzar después de votar
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => goToNext(), 2500); // Aumentado para dar tiempo a la voz
    }
  };

  // Thumbnail
  if (isThumbnail) {
    const thumbOptions = initialOptions.slice(0, 2);
    return (
      <div className="w-full h-full relative">
        <div className="absolute inset-0 flex flex-col">
          {thumbOptions.map((option, index) => {
            const imageUrl = option.media?.url || option.media?.thumbnail || option.media_url || option.thumbnail_url || option.image;
            const bgColor = getCountryColor(option.text, index);
            return (
              <div key={option.id} className={cn("flex-1 relative overflow-hidden", !imageUrl && bgColor)}>
                {imageUrl && (
                  <img 
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center border-2 border-white">
            <span className="text-white font-bold text-xs">VS</span>
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
            />
          </div>
        ))}
      </div>
      
      {/* Círculo central: VS o Temporizador con 2 colores del país del creador */}
      {(() => {
        // Usar los 2 colores del país del creador
        const colors = getCountryColors(creatorCountry);
        
        return (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            {/* Anillo exterior con 2 colores en diagonal */}
            <div 
              className="w-16 h-16 md:w-20 md:h-20 rounded-full p-1 shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 50%, ${colors.secondary} 50%)`
              }}
            >
              {/* Círculo interior negro */}
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center relative overflow-hidden">
                {!showVS && !hasVoted && timeLeft > 0 && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 z-10">
                    <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                    <circle
                      cx="50%" cy="50%" r="45%"
                      fill="none" stroke="white" strokeWidth="4"
                      strokeDasharray={`${(timeLeft / 5) * 100} 100`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                )}
                
                <span className="text-white font-black text-xl md:text-2xl relative z-10">
                  {showVS ? 'VS' : (hasVoted ? '✓' : timeLeft)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default VSLayout;
