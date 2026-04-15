import React, { useState, useRef, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { Textarea } from './ui/textarea';

const UserMentionInput = ({ 
  value: externalValue, 
  onChange: externalOnChange, 
  placeholder, 
  className,
  onMentionSelect,
  ...props 
}) => {
  // Use internal state for text if no external value/onChange provided
  const [internalValue, setInternalValue] = useState('');
  const isControlled = externalValue !== undefined && typeof externalOnChange === 'function';
  
  const value = isControlled ? externalValue : internalValue;
  const onChange = isControlled ? externalOnChange : setInternalValue;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Search for users when typing after @
  const searchUsers = async (query) => {
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const token = localStorage.getItem('token'); // Changed from 'authToken' to 'token'
      
      const response = await fetch(`${backendUrl}/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      const data = await response.json();
      // Limit to 5 suggestions
      const filtered = data.slice(0, 5);
      setSuggestions(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      // No fallback data available
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle text change and mention detection
  const handleTextChange = async (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Ensure onChange is a function before calling it
    if (typeof onChange === 'function') {
      onChange(newValue);
    } else {
      console.error('UserMentionInput: onChange prop is not a function:', typeof onChange);
    }
    
    setCursorPosition(cursorPos);

    // Check if user is typing a mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowSuggestions(true);
      
      if (query.length >= 1) {
        searchUsers(query);
      } else {
        // For empty query, show recent users or mock users
        setLoading(true);
        try {
          const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
          const token = localStorage.getItem('token'); // Changed from 'authToken' to 'token'
          
          const response = await fetch(`${backendUrl}/api/users/search?q=`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setSuggestions(data.slice(0, 5));
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error('Error loading users:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery('');
    }
  };

  // Handle mention selection
  const handleMentionSelect = (user) => {
    // Asegurar que value no sea undefined o null
    const currentValue = value || '';
    
    const textBeforeCursor = currentValue.slice(0, cursorPosition);
    const textAfterCursor = currentValue.slice(cursorPosition);
    
    // Find the @ symbol position
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const beforeMention = textBeforeCursor.slice(0, mentionStart);
    
    // Replace the @query with @username
    const newValue = beforeMention + `@${user.username} ` + textAfterCursor;
    
    // Verificar que onChange sea una función antes de llamarla
    if (typeof onChange === 'function') {
      onChange(newValue);
    } else {
      console.error('UserMentionInput: onChange prop is not a function:', typeof onChange);
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery('');
    
    // Call callback if provided
    if (onMentionSelect) {
      onMentionSelect(user);
    }

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + user.username.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleMentionSelect(suggestions[0]);
      }
      return;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !textareaRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        {...props}
      />
      
      {/* Mention suggestions dropdown */}
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Search className="w-4 h-4 animate-pulse" />
                <span>Buscando usuarios...</span>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                Mencionar usuarios
              </div>
              {suggestions.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => handleMentionSelect(user)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">@{user.username}</span>
                      {user.is_verified && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 truncate">{user.display_name}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : mentionQuery.length > 0 ? (
            <div className="p-4 text-center text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No se encontraron usuarios con "{mentionQuery}"</p>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Escribe @ seguido de un nombre para buscar usuarios</p>
            </div>
          )}
        </div>
      )}
      
      {/* Help text */}
      <div className="mt-2 text-xs text-gray-500">
        Escribe @ para mencionar usuarios
      </div>
    </div>
  );
};

export default UserMentionInput;