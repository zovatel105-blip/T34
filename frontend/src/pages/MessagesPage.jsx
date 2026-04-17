import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft, Send, Camera, Mic, Smile, Users, Bell, MessageCircle, Phone, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import useLivePoll from '../hooks/useLivePoll';

const MessagesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [storyUsers, setStoryUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [ephemeralMode, setEphemeralMode] = useState(false);
  
  // Control segmentado - comenzar con chats/conversaciones por defecto
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [segmentData, setSegmentData] = useState({
    followers: { count: 0, loading: true },
    activity: { count: 0, loading: true },
    messages: { count: 0, loading: true }
  });
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notifications, setNotifications] = useState([]);
  
  const longPressTimer = useRef(null);
  const { user, apiRequest } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Mobile responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // Dynamic view based on selected conversation
  const showInbox = !selectedConversation; // Show inbox when no conversation selected
  const showChat = !!selectedConversation; // Show chat when conversation is selected

  // ===================== CORE FUNCTIONS =====================

  // Load conversations from backend
  const loadConversations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      console.log('🔄 Loading conversations for user:', user.id);
      
      const response = await apiRequest('/api/conversations', {
        method: 'GET'
      });
      
      console.log('📥 Loaded conversations:', response);
      
      if (Array.isArray(response)) {
        setConversations(response);
      } else {
        console.log('ℹ️ No conversations found');
        setConversations([]);
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      setConversations([]);
      
      if (error.message.includes('404')) {
        console.log('ℹ️ No conversations endpoint available yet');
      } else {
        toast({
          title: "Error al cargar conversaciones",
          description: "No se pudieron cargar las conversaciones",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a specific conversation or chat request
  const loadMessages = async (conversationId) => {
    if (!conversationId || !user?.id) return;
    
    try {
      console.log('📩 Loading messages for conversation:', conversationId);
      
      // Check if this is a chat request
      if (conversationId.startsWith('request-')) {
        const requestId = conversationId.replace('request-', '');
        console.log('📨 Loading chat request messages:', requestId);
        
        const response = await apiRequest(`/api/chat-requests/${requestId}/messages`, {
          method: 'GET'
        });
        
        console.log('📥 Loaded chat request messages:', response);
        
        if (Array.isArray(response)) {
          setMessages(response);
        } else {
          setMessages([]);
        }
      } else {
        // Regular conversation
        const response = await apiRequest(`/api/conversations/${conversationId}/messages`, {
          method: 'GET'
        });
        
        console.log('📥 Loaded messages:', response);
        
        if (Array.isArray(response)) {
          setMessages(response);
        } else {
          console.log('ℹ️ No messages found');
          setMessages([]);
        }
      }
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setMessages([]);
      
      if (!error.message.includes('404')) {
        toast({
          title: "Error al cargar mensajes",
          description: "No se pudieron cargar los mensajes",
          variant: "destructive",
        });
      }
    }
  };

  // Search users for new conversation
  const searchUsers = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      console.log('🔍 Searching users:', query);
      
      const response = await apiRequest(`/api/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET'
      });
      
      console.log('📥 Search results:', response);
      
      if (Array.isArray(response)) {
        // Filter out current user from results
        const filteredResults = response.filter(u => u.id !== user.id);
        setSearchResults(filteredResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Error searching users:', error);
      setSearchResults([]);
    }
  };

  // Start new conversation with user
  const startNewConversation = async (targetUser) => {
    if (!targetUser || !user?.id) return;
    
    try {
      console.log('🆕 Starting new conversation with:', targetUser.username);
      
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => 
        conv.participants && conv.participants.some(p => p.id === targetUser.id)
      );
      
      if (existingConversation) {
        console.log('🔄 Using existing conversation:', existingConversation.id);
        setSelectedConversation(existingConversation);
        loadMessages(existingConversation.id);
        setShowNewChat(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }
      
      // Create new conversation object (will be saved when first message is sent)
      const newConversation = {
        id: `new-${Date.now()}`,
        participants: [user, targetUser],
        otherParticipant: targetUser,
        last_message: null,
        created_at: new Date().toISOString(),
        isNewConversation: true
      };
      
      setSelectedConversation(newConversation);
      setMessages([]);
      setShowNewChat(false);
      setSearchQuery('');
      setSearchResults([]);
      
      console.log('✅ New conversation created:', newConversation);
      
    } catch (error) {
      console.error('❌ Error starting new conversation:', error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la conversación",
        variant: "destructive",
      });
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;
    
    // Check if this is a pending chat request and user is the sender
    if (selectedConversation.is_chat_request && selectedConversation.is_request_sender) {
      toast({
        title: "Solicitud pendiente",
        description: "Espera a que el usuario acepte tu solicitud para enviar más mensajes",
        variant: "default",
      });
      return;
    }
    
    const messageContent = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}`;
    
    // Add optimistic message
    const optimisticMessage = {
      id: tempMessageId,
      content: messageContent,
      sender_id: user.id,
      sender: user,
      created_at: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setSendingMessage(true);
    
    try {
      console.log('📤 Sending message:', messageContent);
      
      // Determine recipient
      let recipientId;
      if (selectedConversation.isNewConversation) {
        recipientId = selectedConversation.otherParticipant.id;
      } else {
        const otherParticipant = selectedConversation.participants?.find(p => p.id !== user.id);
        recipientId = otherParticipant?.id;
      }
      
      if (!recipientId) {
        throw new Error('No se pudo determinar el destinatario');
      }
      
      const messagePayload = {
        recipient_id: recipientId,
        content: messageContent
      };
      
      console.log('📤 Message payload:', messagePayload);
      
      const response = await apiRequest('/api/messages', {
        method: 'POST',
        body: messagePayload
      });

      console.log('✅ Respuesta del servidor:', response);
      
      // Manejar diferentes tipos de respuesta del backend
      if (response.type === 'chat_request') {
        // El mensaje se convirtió en una solicitud de chat
        console.log('📨 Solicitud de chat enviada:', response.request_id);
        
        // Eliminar mensaje temporal
        setMessages(prevMessages =>
          prevMessages.filter(msg => msg.id !== tempMessageId)
        );
        
        // Mostrar mensaje informativo al usuario
        const chatRequestMessage = {
          id: `system-${Date.now()}`,
          content: '📨 Solicitud de chat enviada. El usuario debe aceptarla para poder intercambiar mensajes.',
          sender_id: 'system',
          isSystemMessage: true,
          created_at: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, chatRequestMessage]);
        
        // Cerrar la conversación después de un momento
        setTimeout(() => {
          setSelectedConversation(null);
        }, 3000);
        
      } else if (response.message_id) {
        // Mensaje enviado normalmente
        
        // Si era una conversación nueva, actualizar con los datos reales del backend
        if (selectedConversation.isNewConversation && response.conversation_id) {
          console.log('🔄 Actualizando conversación nueva con ID real:', response.conversation_id);
          setSelectedConversation(prev => ({
            ...prev,
            id: response.conversation_id,
            isNewConversation: false
          }));
        }
        
        // Actualizar el mensaje temporal con la respuesta del servidor
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === tempMessageId
              ? { ...response, status: 'sent', id: response.message_id }
              : msg
          )
        );

        // Actualizar la conversación con el último mensaje
        setSelectedConversation(prev => ({
          ...prev,
          last_message: {
            content: messageContent,
            timestamp: response.timestamp,
            sender_id: user.id
          }
        }));

        // Recargar conversaciones para actualizar la lista
        loadConversations();
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Mark message as failed
      setMessages(prevMessages =>
        prevMessages.filter(msg => msg.id !== tempMessageId)
      );
      
      // Handle specific error cases
      if (error.message.includes('Chat request already sent')) {
        const existingRequestMessage = {
          id: `system-${Date.now()}`,
          content: 'Ya enviaste una solicitud de chat a este usuario. Espera a que la acepte.',
          sender_id: 'system',
          isSystemMessage: true,
          created_at: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, existingRequestMessage]);
        
        toast({
          title: "Solicitud pendiente",
          description: "Ya enviaste una solicitud de chat a este usuario",
          variant: "default",
        });
      } else if (error.message.includes('403')) {
        const permissionMessage = {
          id: `system-${Date.now()}`,
          content: '🚫 No tienes permiso para enviar mensajes a este usuario.',
          sender_id: 'system',
          isSystemMessage: true,
          created_at: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, permissionMessage]);
        
        toast({
          title: "Sin permisos",
          description: "No puedes enviar mensajes a este usuario",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al enviar mensaje",
          description: error.message || "No se pudo enviar el mensaje",
          variant: "destructive",
        });
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // Cancel chat request (sender only)
  const handleCancelRequest = async (requestId) => {
    if (!requestId) return;
    
    try {
      console.log('🚫 Cancelling chat request:', requestId);
      
      const response = await apiRequest(`/api/chat-requests/${requestId}`, {
        method: 'DELETE'
      });
      
      console.log('✅ Request cancelled:', response);
      
      toast({
        title: "Solicitud cancelada",
        description: "La solicitud de chat ha sido cancelada",
      });
      
      // Close the conversation and reload
      setSelectedConversation(null);
      await loadConversations();
      
    } catch (error) {
      console.error('❌ Error cancelling chat request:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la solicitud",
        variant: "destructive",
      });
    }
  };

  // Handle chat request (accept/reject)
  const handleChatRequest = async (requestId, action) => {
    if (!requestId) return;
    
    try {
      console.log(`📨 ${action === 'accept' ? 'Accepting' : 'Rejecting'} chat request:`, requestId);
      
      const response = await apiRequest(`/api/chat-requests/${requestId}`, {
        method: 'PUT',
        body: { action }
      });

      console.log('✅ Chat request response:', response);

      if (response.success) {
        toast({
          title: action === 'accept' ? "✅ Solicitud aceptada" : "❌ Solicitud rechazada",
          description: action === 'accept' 
            ? "Ahora puedes enviar mensajes libremente" 
            : "La solicitud ha sido rechazada",
        });

        // Reload conversations
        await loadConversations();

        // If accepted, navigate to the new conversation
        if (action === 'accept' && response.conversation_id) {
          const conversations = await apiRequest(`/api/conversations`);
          const newConv = conversations.find(c => c.id === response.conversation_id);
          if (newConv) {
            setSelectedConversation(newConv);
            loadMessages(newConv.id);
          }
        } else if (action === 'reject') {
          // If rejected, close the conversation
          setSelectedConversation(null);
        }
      }
    } catch (error) {
      console.error('❌ Error handling chat request:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la solicitud",
        variant: "destructive"
      });
    }
  };

  // ===================== EFFECT HOOKS =====================

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedConversation && selectedConversation.id && !selectedConversation.isNewConversation) {
      console.log('🔄 UseEffect: Loading messages for conversation:', selectedConversation.id);
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  // 🔴 LIVE REFRESH — mensajes en vivo (3s) estilo WhatsApp/Instagram
  // Se pausa automáticamente cuando la pestaña está oculta y refresca al volver al foco.
  const livePollMessages = useCallback(() => {
    if (!selectedConversation?.id) return;
    if (selectedConversation.isNewConversation) return;
    if (selectedConversation.is_chat_request) return; // no pollear en requests
    loadMessages(selectedConversation.id);
  }, [selectedConversation?.id, selectedConversation?.isNewConversation, selectedConversation?.is_chat_request]);

  useLivePoll(livePollMessages, 3000, {
    enabled: Boolean(
      selectedConversation &&
      selectedConversation.id &&
      !selectedConversation.isNewConversation &&
      !selectedConversation.is_chat_request
    ),
    pauseWhenHidden: true,
    refreshOnFocus: true,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle URL parameters for direct user chat
  useEffect(() => {
    const targetUserId = searchParams.get('user');
    if (targetUserId && conversations.length > 0) {
      const existingConv = conversations.find(conv =>
        conv.participants?.some(p => p.id === targetUserId)
      );
      if (existingConv) {
        setSelectedConversation(existingConv);
      }
    }
  }, [searchParams, conversations]);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery) {
      searchUsers(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // ===================== HELPER FUNCTIONS =====================

  const getOtherParticipant = (conversation) => {
    if (conversation.isNewConversation) {
      return conversation.otherParticipant;
    }
    return conversation.participants?.find(p => p.id !== user?.id) || conversation.participants?.[0];
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  // ===================== RENDER =====================

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Conversations List */}
      <div className={cn(
        "border-r bg-white transition-all duration-300",
        isMobile 
          ? (showInbox ? "w-full" : "w-0 overflow-hidden")
          : "w-80"
      )}>
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-4 bg-white">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Cargando conversaciones...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No tienes conversaciones aún</p>
              <p className="text-sm">Inicia una nueva conversación</p>
            </div>
          ) : (
            <div className="space-y-0">
              {conversations.map((conversation) => {
                const otherUser = getOtherParticipant(conversation);
                if (!otherUser) return null;
                
                const isChatRequest = conversation.is_chat_request;
                const isSender = conversation.is_request_sender;
                const isReceiver = conversation.is_request_receiver;
                
                return (
                  <div
                    key={conversation.id}
                    onClick={(e) => {
                      // Don't open conversation if clicking on action buttons
                      if (e.target.closest('button')) return;
                      setSelectedConversation(conversation);
                      loadMessages(conversation.id);
                    }}
                    className={cn(
                      "flex items-center p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors",
                      selectedConversation?.id === conversation.id && "bg-blue-50",
                      isChatRequest && isReceiver && "bg-blue-50/30"
                    )}
                  >
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      {otherUser.avatar_url ? (
                        <img 
                          src={otherUser.avatar_url} 
                          alt="Avatar" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {otherUser.display_name || otherUser.username}
                          </h3>
                          {isChatRequest && (
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium",
                              isSender ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {isSender ? "Pendiente" : "Nueva"}
                            </span>
                          )}
                        </div>
                        {conversation.last_message_at && (
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(conversation.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-600 truncate flex-1">
                          {conversation.last_message || 'Nueva conversación'}
                        </p>
                        {isChatRequest && (
                          <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isReceiver ? (
                              <>
                                <button
                                  onClick={() => handleChatRequest(conversation.chat_request_id, 'accept')}
                                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                  Aceptar
                                </button>
                                <button
                                  onClick={() => handleChatRequest(conversation.chat_request_id, 'reject')}
                                  className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleCancelRequest(conversation.chat_request_id)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isMobile 
          ? (showChat ? "w-full" : "w-0 overflow-hidden")
          : "flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-white">
              <div className="flex items-center space-x-3">
                {isMobile && (
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  {getOtherParticipant(selectedConversation)?.avatar_url ? (
                    <img 
                      src={getOtherParticipant(selectedConversation).avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {getOtherParticipant(selectedConversation)?.display_name || 
                     getOtherParticipant(selectedConversation)?.username}
                  </h2>
                  <p className="text-sm text-gray-500">
                    @{getOtherParticipant(selectedConversation)?.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const isSystemMessage = message.isSystemMessage || message.sender_id === 'system';
                const showAvatar = !isOwnMessage && !isSystemMessage && (index === 0 || messages[index - 1].sender_id !== message.sender_id);
                
                // Renderizado especial para mensajes del sistema
                if (isSystemMessage) {
                  return (
                    <div key={message.id} className="flex justify-center mb-4">
                      <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm max-w-md text-center border border-blue-200">
                        {message.content}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {/* Avatar para mensajes de otros usuarios */}
                      {showAvatar && !isOwnMessage && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {message.sender?.avatar_url ? (
                            <img 
                              src={message.sender.avatar_url} 
                              alt="Avatar" 
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                      )}
                      
                      {/* Spacer cuando no se muestra avatar */}
                      {!showAvatar && !isOwnMessage && <div className="w-8" />}
                      
                      {/* Mensaje */}
                      <div className={`relative px-4 py-2 rounded-2xl ${
                        isOwnMessage 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        
                        {/* Indicador de estado para mensajes propios */}
                        {isOwnMessage && message.status && (
                          <div className="absolute -bottom-1 -right-1">
                            {message.status === 'sending' && (
                              <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
                            )}
                            {message.status === 'sent' && (
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            )}
                            {message.status === 'failed' && (
                              <div className="w-3 h-3 bg-red-500 rounded-full cursor-pointer" title="Error al enviar"></div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input or Chat Request Actions */}
            {selectedConversation.is_chat_request && selectedConversation.is_request_receiver && (
              /* Receiver: Show accept/reject buttons - Diseño minimalista */
              <div className="border-t border-gray-200 p-3 bg-white">
                <div className="flex gap-2 max-w-md mx-auto">
                  <button
                    onClick={() => handleChatRequest(selectedConversation.chat_request_id, 'accept')}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleChatRequest(selectedConversation.chat_request_id, 'reject')}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            )}
            
            {selectedConversation.is_chat_request && selectedConversation.is_request_sender && (
              /* Sender: Show waiting message - Diseño minimalista */
              <div className="border-t border-gray-200 p-6 bg-white">
                <div className="text-center space-y-3 max-w-md mx-auto">
                  <h2 className="text-2xl font-bold text-gray-900">Invitación enviada</h2>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Podrás enviar más mensajes cuando se acepte tu invitación.
                  </p>
                  <button
                    onClick={() => handleCancelRequest(selectedConversation.chat_request_id)}
                    className="w-full mt-4 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    Cancelar solicitud
                  </button>
                </div>
              </div>
            )}
            
            {!selectedConversation.is_chat_request && (
              /* Normal conversation: Show message input */
              <div className="border-t p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-transparent outline-none text-sm"
                      disabled={sendingMessage}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      newMessage.trim() && !sendingMessage
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    {sendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mensajes
              </h3>
              <p className="text-gray-500">
                Tus conversaciones aparecerán aquí. Busca usuarios para iniciar nuevos chats
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Nuevo chat</h2>
                <button
                  onClick={() => {
                    setShowNewChat(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => startNewConversation(user)}
                      className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt="Avatar" 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {user.display_name || user.username}
                        </h3>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No se encontraron usuarios</p>
                  <p className="text-sm">Intenta con otro término de búsqueda</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Busca usuarios para iniciar una conversación</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;