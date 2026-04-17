/**
 * TrendingSection - Display trending content with visual highlights
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Hash, User, Music, Play, Heart, MessageCircle, Fire } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import searchService from '../../services/searchService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

const TrendingSection = ({ className = "" }) => {
  const [trendingData, setTrendingData] = useState({
    posts: [],
    hashtags: [],
    users: [],
    sounds: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const navigate = useNavigate();

  const trendingTabs = [
    { id: 'posts', label: 'Posts', icon: TrendingUp },
    { id: 'hashtags', label: 'Hashtags', icon: Hash },
    { id: 'users', label: 'Users', icon: User },
    { id: 'sounds', label: 'Sounds', icon: Music }
  ];

  useEffect(() => {
    loadTrendingContent();
  }, []);

  const loadTrendingContent = async () => {
    setLoading(true);
    try {
      const response = await searchService.getTrendingContent('24h', 20);
      setTrendingData({
        posts: response.trending_posts || [],
        hashtags: response.trending_hashtags || [],
        users: response.trending_users || [],
        sounds: response.trending_sounds || []
      });
    } catch (error) {
      console.error('Error loading trending content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item, type) => {
    switch (type) {
      case 'posts':
        navigate(`/post/${item.id}`);
        break;
      case 'hashtags':
        navigate(`/search?q=${encodeURIComponent(item.hashtag)}&filter=hashtags`);
        break;
      case 'users':
        navigate(`/profile/${item.username}`);
        break;
      case 'sounds':
        navigate(`/search?q=${encodeURIComponent(item.title)}&filter=sounds`);
        break;
      default:
        break;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2 px-4">
          <Fire className="w-5 h-5 text-orange-500" />
          <h3 className="text-xl font-bold text-gray-900">Trending</h3>
        </div>
        <div className="px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Trending Icon */}
      <div className="flex items-center gap-2 px-4">
        <Fire className="w-5 h-5 text-orange-500" />
        <h3 className="text-xl font-bold text-gray-900">Trending</h3>
        <div className="ml-auto text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full font-medium">
          Last 24h
        </div>
      </div>

      {/* Trending Tabs */}
      <div className="flex space-x-1 px-4">
        {trendingTabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <IconComponent className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Trending Content */}
      <div className="px-4">
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {trendingData.posts.slice(0, 8).map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleItemClick(post, 'posts')}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer group"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                    #{index + 1}
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <Fire className="w-2 h-2 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {post.title || 'Trending Post'}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(post.likes_count || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {formatNumber(post.comments_count || 0)}
                    </span>
                    <span className="text-orange-500 font-medium">
                      +{formatNumber(post.growth_24h || 0)} today
                    </span>
                  </div>
                </div>

                {post.thumbnail_url && (
                  <img
                    src={resolveAssetUrl(post.thumbnail_url)}
                    alt="Post thumbnail"
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'hashtags' && (
          <div className="space-y-3">
            {trendingData.hashtags.slice(0, 10).map((hashtag, index) => (
              <motion.div
                key={hashtag.hashtag}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleItemClick(hashtag, 'hashtags')}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  #{index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-gray-900">{hashtag.hashtag}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(hashtag.post_count || 0)} posts • 
                    <span className="text-green-500 ml-1">
                      +{formatNumber(hashtag.growth_24h || 0)} today
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-3">
            {trendingData.users.slice(0, 8).map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleItemClick(user, 'users')}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={resolveAssetUrl(user.avatar_url) || '/default-avatar.png'}
                    alt={user.display_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-orange-300"
                  />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{user.display_name}</span>
                    {user.verified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(user.followers_count || 0)} followers •
                    <span className="text-orange-500 ml-1">
                      +{formatNumber(user.followers_growth_24h || 0)} today
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'sounds' && (
          <div className="space-y-3">
            {trendingData.sounds.slice(0, 8).map((sound, index) => (
              <motion.div
                key={sound.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => handleItemClick(sound, 'sounds')}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <Music className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {sound.title || 'Trending Sound'}
                  </h4>
                  <p className="text-sm text-gray-500 truncate">
                    {sound.artist || 'Unknown Artist'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(sound.usage_count || 0)} videos •
                    <span className="text-purple-500 ml-1">
                      +{formatNumber(sound.growth_24h || 0)} today
                    </span>
                  </p>
                </div>

                <div className="w-8 h-8 bg-white border-2 border-purple-300 rounded-full flex items-center justify-center">
                  <Play className="w-3 h-3 text-purple-500 ml-0.5" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingSection;