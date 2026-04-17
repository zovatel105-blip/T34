import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useModalBackButton } from '../hooks/useBackButton';

const SettingsSelectModal = ({ isOpen, onClose, title, options, selectedValue, onSelect }) => {
  // 📱 Cerrar con botón atrás / gesto (Android/Capacitor)
  useModalBackButton(isOpen, onClose);

  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    setDragging(true);
  };

  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      currentY.current = diff;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${diff}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (currentY.current > 100) {
      closeWithAnimation();
    } else if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.2s ease-out';
      sheetRef.current.style.transform = 'translateY(0)';
      setTimeout(() => {
        if (sheetRef.current) sheetRef.current.style.transition = '';
      }, 200);
    }
  };

  const closeWithAnimation = () => {
    setClosing(true);
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.25s ease-in';
      sheetRef.current.style.transform = 'translateY(100%)';
    }
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 250);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000]">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/70 backdrop-blur-md ${closing ? 'opacity-0' : ''}`}
        style={{ 
          animation: closing ? undefined : 'fadeIn 0.2s ease-out forwards',
          transition: closing ? 'opacity 0.25s ease-in' : undefined
        }}
        onClick={closeWithAnimation}
      />
      
      {/* Bottom sheet */}
      <div className="flex h-full items-end justify-center">
        <div 
          ref={sheetRef}
          className="relative bg-white shadow-2xl overflow-hidden w-full rounded-t-3xl"
          style={{ animation: closing ? undefined : 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Handle — zona de arrastre */}
          <div className="w-full py-2.5 flex justify-center cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 py-2 flex items-center justify-center">
            <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
          </div>

          {/* Opciones — sin iconos */}
          <div className="px-4 pb-8 pt-2 flex flex-col gap-2">
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onSelect(option.value);
                    closeWithAnimation();
                  }}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-colors text-left ${
                    isSelected 
                      ? 'bg-blue-50 ring-1 ring-blue-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                      {option.label}
                    </p>
                    {option.description && (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
                        {option.description}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-3" strokeWidth={2} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsSelectModal;
