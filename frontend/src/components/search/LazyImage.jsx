import React, { useState, useEffect, useRef } from 'react';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

/**
 * LazyImage component with Intersection Observer
 * Only loads images when they come into viewport.
 *
 * 📱 Resuelve automáticamente URLs relativas (ej: "/api/uploads/xxx.jpg")
 * a su forma absoluta contra el BACKEND_URL, evitando que fallen en el
 * APK de Capacitor (donde el WebView corre desde https://localhost).
 */
const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  onError = null,
  onClick = null,
  threshold = 0.1,
  rootMargin = '50px',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Resolver la URL (absoluta o relativa) a forma final cargable
  const resolvedSrc = resolveAssetUrl(src);

  useEffect(() => {
    // Create Intersection Observer
    const currentImg = imgRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect(); // Stop observing once image is in view
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    // Start observing
    if (currentImg) {
      observer.observe(currentImg);
    }

    // Cleanup
    return () => {
      if (currentImg) {
        observer.unobserve(currentImg);
      }
    };
  }, [threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = (e) => {
    setHasError(true);
    if (onError) {
      onError(e);
    }
  };

  return (
    <div ref={imgRef} className={`relative ${className}`} onClick={onClick}>
      {/* Placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Actual image - only load when in view */}
      {isInView && !hasError && resolvedSrc && (
        <img
          src={resolvedSrc}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          {...props}
        />
      )}

      {/* Si no hay URL resolvible, mostrar placeholder */}
      {isInView && !resolvedSrc && placeholder}

      {/* Error placeholder */}
      {hasError && placeholder}
    </div>
  );
};

export default LazyImage;