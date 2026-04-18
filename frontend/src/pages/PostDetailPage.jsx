import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share, Play, User, MoreVertical } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import LogoWithQuickActions from '../components/LogoWithQuickActions';

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/polls/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPost(data);
      } else {
        setError('Post no encontrado');
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Error al cargar el post');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/polls/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ option_id: optionId })
      });

      if (response.ok) {
        await fetchPost(); // Refresh post data
        toast({
          title: "¡Voto registrado!",
          description: "Tu voto ha sido guardado exitosamente."
        });
      }
    } catch (err) {
      console.error('Error voting:', err);
      toast({
        title: "Error",
        description: "No se pudo registrar el voto",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-white text-lg">Cargando post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <User size={40} className="text-red-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">{error}</h2>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Logo fijo */}
      <div className="fixed top-4 right-4 z-50">
        <LogoWithQuickActions size={75} />
      </div>

      {/* Header */}
      <div className="sticky z-40 bg-black/80 backdrop-blur-md border-b border-gray-800" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          
          <h1 className="text-lg font-semibold">Post</h1>
          
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto">
        {/* Post Media */}
        <div className="relative aspect-[9/16] bg-gray-900">
          {post.options && post.options.length > 0 && post.options[0].media_url ? (
            <div className="relative w-full h-full">
              {post.options[0].media_type === 'video' ? (
                <video
                  src={post.options[0].media_url}
                  className="w-full h-full object-cover"
                  controls
                  poster={post.options[0].thumbnail_url}
                />
              ) : (
                <img
                  src={post.options[0].media_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Play button overlay for videos */}
              {post.options[0].media_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Play size={32} className="text-white ml-2" fill="currentColor" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 flex items-center justify-center">
              <div className="text-center">
                <User size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-white/70">Sin contenido multimedia</p>
              </div>
            </div>
          )}

          {/* Action buttons overlay */}
          <div className="absolute bottom-4 right-4 flex flex-col space-y-4">
            <button 
              className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              onClick={() => toast({ title: "❤️ Me gusta", description: "Función en desarrollo" })}
            >
              <Heart size={24} />
            </button>
            
            <button 
              className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              onClick={() => toast({ title: "💬 Comentarios", description: "Función en desarrollo" })}
            >
              <MessageCircle size={24} />
            </button>
            
            <button 
              className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              onClick={() => toast({ title: "📤 Compartir", description: "Función en desarrollo" })}
            >
              <Share size={24} />
            </button>
          </div>
        </div>

        {/* Post Info */}
        <div className="p-4">
          {/* Title */}
          {post.title && (
            <h2 className="text-xl font-bold mb-2">{post.title}</h2>
          )}
          
          {/* Description */}
          {post.description && (
            <p className="text-gray-300 mb-4 leading-relaxed">{post.description}</p>
          )}

          {/* Author */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
              {post.author?.avatar ? (
                <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div>
              <p className="font-semibold">{post.author?.display_name || post.author?.username}</p>
              <p className="text-sm text-gray-400">@{post.author?.username}</p>
            </div>
          </div>

          {/* Poll Options */}
          {post.options && post.options.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3">Opciones de voto:</h3>
              {post.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.text}</span>
                    <span className="text-sm text-gray-400">
                      {option.votes?.length || 0} votos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;