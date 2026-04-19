/**
 * SafeAreaTop - Spacer de separación debajo del status bar
 * 
 * Replica el mismo padding que usa StatisticsModal (py-4 = 16px).
 * Se añade como primer elemento dentro de contenedores de página
 * para crear espacio entre la barra de estado y el contenido.
 */
import React from 'react';

const SafeAreaTop = () => {
  return <div className="w-full" style={{ height: '16px', flexShrink: 0 }} />;
};

export default SafeAreaTop;
