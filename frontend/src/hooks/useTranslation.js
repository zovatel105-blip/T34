import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '../i18n';

/**
 * Hook de traducción consciente de la ruta.
 *
 * 🎯 MVP VS-ONLY: el cambio de idioma seleccionado en Ajustes solo se
 * aplica a las páginas que forman parte del MVP visible. En las páginas
 * que NO son del MVP (Explore, Live, Stories, Challenges, MomentCreate)
 * los textos se mantienen siempre en español (idioma fallback).
 *
 * La detección se hace usando `useLocation()` de react-router-dom, por
 * lo que cualquier componente (incluidos los compartidos como
 * BottomNavigation o modales) reacciona automáticamente al cambio de
 * ruta y a los cambios de idioma sin necesidad de modificarlo.
 */
export const useTranslation = () => {
  const [locale, setLocale] = useState(i18n.getCurrentLocale());

  // Detectar la ruta actual para decidir si traducir o no.
  // useLocation puede fallar si el hook se llama fuera de un <Router>;
  // en ese caso caemos al pathname global como red de seguridad.
  let pathname = '/';
  try {
    const location = useLocation();
    pathname = location?.pathname || '/';
  } catch (e) {
    if (typeof window !== 'undefined') {
      pathname = window.location?.pathname || '/';
    }
  }

  useEffect(() => {
    const handleLocaleChange = (event) => {
      setLocale(event.detail);
    };

    window.addEventListener('localeChanged', handleLocaleChange);

    return () => {
      window.removeEventListener('localeChanged', handleLocaleChange);
    };
  }, []);

  // La traducción depende de la ruta: si es MVP usa el locale del usuario,
  // si no, siempre español.
  const t = (key, variables) => i18n.tForRoute(pathname, key, variables);

  const changeLocale = (newLocale) => {
    i18n.setLocale(newLocale);
  };

  const isMvpRoute = i18n.isMvpRoute(pathname);
  // Locale "efectivo" en la ruta actual (útil para depurar/UI condicional).
  const effectiveLocale = isMvpRoute ? locale : 'es';

  return {
    t,
    locale,
    effectiveLocale,
    isMvpRoute,
    changeLocale,
    formatNumber: i18n.formatNumber.bind(i18n),
    formatDuration: i18n.formatDuration.bind(i18n),
    formatDate: i18n.formatDate.bind(i18n),
    getAvailableLocales: i18n.getAvailableLocales.bind(i18n)
  };
};
