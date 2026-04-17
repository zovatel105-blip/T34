/**
 * RecommendationsSection - Personalized "You may like" content
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, MessageCircle, Share, Bookmark, RefreshCw, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import searchService from '../../services/searchService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

const RecommendationsSection = ({ className = "" }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await searchService.getPersonalizedRecommendations(15);
      setRecommendations(response.recommendations || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      // Fallback to mock data for demo
      setRecommendations(generateFallbackRecommendations());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Generate fallback recommendations based on common patterns
  const generateFallbackRecommendations = () => {
    const categories = [
      { type: 'hashtag', hashtag: 'TikTokTrends', reason: 'Popular in your area', engagement: 1250000 },
      { type: 'user', username: 'creator123', display_name: 'Creative Content', reason: 'Similar interests', followers: 89000 },
      { type: 'hashtag', hashtag: 'LearnOnTikTok', reason: 'Based on your activity', engagement: 890000 },
      { type: 'user', username: 'musiclover', display_name: 'Music Lover', reason: 'Trending creator', followers: 156000 },
      { type: 'hashtag', hashtag: 'LifeHacks', reason: 'Popular with your followers', engagement: 2100000 },
    ];
    
    return categories.map((item, index) => ({
      id: `rec-${index}`,
      ...item,
      thumbnail_url: `https://images.unsplash.com/photo-${1500000000000 + index}?w=300&h=400&fit=crop`,
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const handleItemClick = (item) => {
    if (item.type === 'user') {
      navigate(`/profile/${item.username}`);
    } else if (item.type === 'hashtag') {
      navigate(`/search?q=${encodeURIComponent(item.hashtag)}&filter=hashtags`);
    } else if (item.type === 'post') {
      navigate(`/post/${item.id}`);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getReasonColor = (reason) => {
    if (reason.includes('Similar')) return 'text-blue-600 bg-blue-50';
    if (reason.includes('Popular')) return 'text-green-600 bg-green-50';
    if (reason.includes('Trending')) return 'text-orange-600 bg-orange-50';
    if (reason.includes('Based on')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-xl font-bold text-gray-900">You may like</h3>
          </div>
        </div>
        <div className="px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="text-xl font-bold text-gray-900">You may like</h3>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadRecommendations(true)}
          disabled={refreshing}
          className="text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Recommendations List */}
      <div className="px-4 space-y-4">
        {recommendations.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleItemClick(item)}
            className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer group"
          >
            {/* Thumbnail/Avatar */}
            <div className="relative flex-shrink-0">
              {item.type === 'user' ? (
                <div className="relative">
                  <img
                    src={resolveAssetUrl(item.avatar_url) || '/default-avatar.png'}
                    alt={item.display_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  {item.verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center overflow-hidden">
                  {item.thumbnail_url ? (
                    <img
                      src={resolveAssetUrl(item.thumbnail_url)}
                      alt="Content"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      #{item.hashtag ? item.hashtag.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 truncate">
                  {item.type === 'user' 
                    ? item.display_name || item.username
                    : item.type === 'hashtag' 
                    ? `#${item.hashtag}`
                    : item.title
                  }
                </h4>
                
                {item.type === 'user' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Follow user:', item.username);
                    }}
                  >
                    Follow
                  </Button>
                )}
              </div>

              {/* Subtitle */}
              {item.type === 'user' && (
                <p className="text-sm text-gray-500 truncate mb-2">
                  @{item.username}
                </p>
              )}

              {/* Reason */}
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(item.reason || 'Recommended for you')}`}>
                {item.reason || 'Recommended for you'}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {item.type === 'user' ? (
                  <>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {formatNumber(item.followers || item.followers_count || 0)} followers
                    </span>
                    <span>{formatNumber(item.posts_count || 0)} posts</span>
                  </>
                ) : item.type === 'hashtag' ? (
                  <>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(item.engagement || 0)}
                    </span>
                    <span>{formatNumber(item.posts_count || 0)} posts</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(item.likes_count || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {formatNumber(item.comments_count || 0)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Action Menu */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('More options for:', item.id);
                }}
              >
                ⋯
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More Button */}
      <div className="px-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => loadRecommendations(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Loading...' : 'Load More'}
        </Button>
      </div>
    </div>
  );
};

export default RecommendationsSection;