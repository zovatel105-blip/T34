import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Image, Clock, Swords, Camera } from 'lucide-react';
import { cn } from '../lib/utils';

const ContentSelectionPage = () => {
  const navigate = useNavigate();

  const contentTypes = [
    {
      id: 'post',
      title: 'Publicación',
      description: 'Fotos y videos con votación',
      icon: Image,
      gradient: 'from-purple-500 to-pink-500',
      route: '/content-creation'
    },
    {
      id: 'moment',
      title: 'Momento',
      description: 'Momentos que no quieres olvidar',
      icon: Camera,
      gradient: 'from-amber-500 to-yellow-500',
      route: '/moment-create'
    },
    {
      id: 'story',
      title: 'Historia',
      description: 'Contenido temporal de 24h',
      icon: Clock,
      gradient: 'from-blue-500 to-cyan-500',
      route: '/story-creation'
    },
    {
      id: 'vs',
      title: 'VS',
      description: '¿Qué prefieres? Votación rápida',
      icon: Swords,
      gradient: 'from-orange-500 to-red-500',
      route: '/vs-create'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-white font-semibold text-lg">Crear</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Content Options */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <p className="text-white/60 text-center mb-4">
          ¿Qué quieres crear?
        </p>
        
        <div className="w-full max-w-sm flex flex-col gap-4">
          {contentTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => navigate(type.route)}
              className={cn(
                "w-full p-6 rounded-2xl transition-all duration-300",
                "bg-gradient-to-r", type.gradient,
                "hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]",
                "flex items-center gap-4"
              )}
            >
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <type.icon className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-bold text-lg">{type.title}</h3>
                <p className="text-white/80 text-sm">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentSelectionPage;
