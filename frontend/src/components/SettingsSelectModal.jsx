import React from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

const SettingsSelectModal = ({ isOpen, onClose, title, options, selectedValue, onSelect }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        style={{ animation: 'fadeIn 0.2s ease-out forwards' }}
        onClick={onClose}
      />
      
      {/* Bottom sheet */}
      <div className="flex h-full items-end justify-center">
        <div 
          className="relative bg-white shadow-2xl overflow-hidden w-full rounded-t-3xl"
          style={{ animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
        >
          {/* Handle */}
          <div className="w-full py-2.5 flex justify-center">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 py-2 flex items-center justify-center">
            <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
          </div>

          {/* Opciones */}
          <div className="px-4 pb-8 pt-2 flex flex-col gap-2">
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  className={`flex items-center gap-3 p-4 rounded-2xl transition-colors text-left ${
                    isSelected 
                      ? 'bg-blue-50 ring-1 ring-blue-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-blue-100' : 'bg-white shadow-sm'
                  }`}>
                    {option.icon ? (
                      <option.icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} strokeWidth={1.5} />
                    ) : (
                      <span className={`text-sm font-bold ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                        {option.label.charAt(0)}
                      </span>
                    )}
                  </div>
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
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0" strokeWidth={2} />
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
