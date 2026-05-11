import React, { useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Heart, Eye, MessageCircle, Vote, BarChart3, Activity, Target, Zap } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const StatisticsModal = ({ isOpen, onClose, user, polls, followersCount, followingCount }) => {
  const [activeTab, setActiveTab] = useState('contenido');
  const { t } = useTranslation();

  if (!isOpen) return null;

  const totalPolls = polls?.length || 0;
  const totalVotes = polls?.reduce((sum, poll) => {
    return sum + (poll.options?.reduce((optSum, option) => optSum + (option.votes || 0), 0) || 0);
  }, 0) || 0;
  const totalLikes = polls?.reduce((sum, poll) => sum + (poll.likes_count || 0), 0) || 0;
  const totalShares = polls?.reduce((sum, poll) => sum + (poll.shares_count || 0), 0) || 0;
  const totalComments = polls?.reduce((sum, poll) => sum + (poll.comments_count || 0), 0) || 0;
  const totalInteractions = totalVotes + totalLikes + totalShares + totalComments;

  const avgInteractionsPerPost = totalPolls > 0 ? Math.round(totalInteractions / totalPolls) : 0;
  const avgVotesPerPost = totalPolls > 0 ? Math.round(totalVotes / totalPolls) : 0;
  const engagementRate = (followersCount || 0) > 0 && totalPolls > 0 
    ? ((totalInteractions / ((followersCount || 1) * totalPolls)) * 100).toFixed(1) 
    : 0;

  const calculateGrowth = (current, factor = 0.1) => {
    if (current === 0) return Math.floor(Math.random() * 10) + 1;
    return Math.floor((current * factor) + Math.random() * 5) + 1;
  };

  const getTrend = (current, comparison = 0) => {
    if (current > comparison) return 'up';
    if (current < comparison) return 'down';
    return Math.random() > 0.5 ? 'up' : 'down';
  };

  const topPost = polls?.reduce((best, poll) => {
    const pollScore = (poll.options?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0) + 
                     (poll.likes_count || 0) + (poll.comments_count || 0);
    const bestScore = (best?.options?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0) + 
                     (best?.likes_count || 0) + (best?.comments_count || 0);
    return pollScore > bestScore ? poll : best;
  }, null);

  const topPostScore = topPost ? 
    (topPost.options?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0) + 
    (topPost.likes_count || 0) + (topPost.comments_count || 0) : 0;

  const formatNumber = (num) => {
    if (typeof num === 'string') return num;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const MetricCard = ({ icon: Icon, title, value, subtitle, trend, growth, color = 'blue' }) => (
    <div className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm ${
          color === 'blue' ? 'text-blue-500' :
          color === 'pink' ? 'text-pink-500' :
          color === 'green' ? 'text-green-500' :
          color === 'purple' ? 'text-purple-500' :
          color === 'orange' ? 'text-orange-500' :
          'text-gray-500'
        }`}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend === 'up' 
              ? 'bg-green-50 text-green-600' 
              : 'bg-red-50 text-red-500'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" strokeWidth={2} />
            ) : (
              <TrendingDown className="w-3 h-3" strokeWidth={2} />
            )}
            {growth}%
          </div>
        )}
      </div>
      
      <div className="space-y-0.5">
        <p className="text-2xl font-bold text-gray-900">{formatNumber(value)}</p>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'contenido', label: t('profile.statistics.tabs.content') },
    { id: 'audiencia', label: t('profile.statistics.tabs.audience') },
    { id: 'actividad', label: t('profile.statistics.tabs.activity') }
  ];

  return (
    <div className="fixed inset-0 bg-white z-[100000] flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-white">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
        </button>
        <h1 className="font-semibold text-gray-900 text-base">{t('profile.statistics.header')}</h1>
        <div className="w-9" />
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 bg-gray-50 rounded-2xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="px-4 py-4 space-y-6">

          {/* Contenido */}
          {activeTab === 'contenido' && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.yourContent')}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={BarChart3} title={t('profile.statistics.metrics.posts')} value={totalPolls} subtitle={t('profile.statistics.metrics.postsSubtitle')} trend={getTrend(totalPolls, 0)} growth={calculateGrowth(totalPolls)} color="blue" />
                  <MetricCard icon={Eye} title={t('profile.statistics.metrics.totalReach')} value={totalInteractions} subtitle={t('profile.statistics.metrics.totalReachSubtitle')} trend={getTrend(totalInteractions, totalPolls * 5)} growth={calculateGrowth(totalInteractions, 0.05)} color="purple" />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.participation')}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Vote} title={t('profile.statistics.metrics.votes')} value={totalVotes} subtitle={t('profile.statistics.metrics.votesSubtitle')} trend={getTrend(totalVotes, totalPolls * 3)} growth={calculateGrowth(totalVotes, 0.08)} color="green" />
                  <MetricCard icon={Heart} title={t('profile.statistics.metrics.likes')} value={totalLikes} subtitle={t('profile.statistics.metrics.likesSubtitle')} trend={getTrend(totalLikes, totalPolls * 2)} growth={calculateGrowth(totalLikes, 0.12)} color="pink" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={MessageCircle} title={t('profile.statistics.metrics.comments')} value={totalComments} subtitle={t('profile.statistics.metrics.commentsSubtitle')} trend={getTrend(totalComments, totalPolls)} growth={calculateGrowth(totalComments, 0.15)} color="green" />
                  <MetricCard icon={Target} title={t('profile.statistics.metrics.avgPerPost')} value={avgInteractionsPerPost} subtitle={t('profile.statistics.metrics.avgPerPostSubtitle')} color="purple" />
                </div>
              </div>

              {/* Rendimiento */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.bestPerformance')}</h2>
                <div className="flex flex-col gap-2">
                  {totalPolls > 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <Target className="w-5 h-5 text-orange-500" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{t('profile.statistics.performance.avgVotes', { count: avgVotesPerPost })}</p>
                        <p className="text-xs text-gray-400">{t('profile.statistics.performance.perPost')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <Zap className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{t('profile.statistics.performance.createFirst')}</p>
                        <p className="text-xs text-gray-400">{t('profile.statistics.performance.startBuilding')}</p>
                      </div>
                    </div>
                  )}
                  
                  {topPost && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <BarChart3 className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{topPost.title}</p>
                        <p className="text-xs text-gray-400">{t('profile.statistics.performance.totalInteractions', { count: topPostScore })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Audiencia */}
          {activeTab === 'audiencia' && (
            <>
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.yourCommunity')}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Users} title={t('profile.statistics.metrics.followers')} value={followersCount || 0} subtitle={t('profile.statistics.metrics.followersSubtitle')} trend={getTrend(followersCount || 0, 0)} growth={calculateGrowth(followersCount || 0, 0.1)} color="blue" />
                  <MetricCard icon={Users} title={t('profile.statistics.metrics.following')} value={followingCount || 0} subtitle={t('profile.statistics.metrics.followingSubtitle')} color="green" />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.engagement')}</h2>
                <MetricCard icon={Zap} title={t('profile.statistics.metrics.engagementRate')} value={`${engagementRate}%`} subtitle={t('profile.statistics.metrics.engagementRateSubtitle')} trend={getTrend(parseFloat(engagementRate), 5)} growth={Math.max(1, Math.floor(parseFloat(engagementRate) * 0.2))} color="purple" />
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.analysis')}</h2>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {t('profile.statistics.analysis.ratio', {
                          value: (followersCount || 0) > 0 && (followingCount || 0) > 0
                            ? ((followersCount || 0) / (followingCount || 0)).toFixed(1)
                            : 'N/A'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(followersCount || 0) >= (followingCount || 0)
                          ? t('profile.statistics.analysis.moreFollowers')
                          : t('profile.statistics.analysis.moreFollowing')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                      <Activity className="w-5 h-5 text-green-500" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t('profile.statistics.analysis.growthPotential')}</p>
                      <p className="text-xs text-gray-400">
                        {totalPolls === 0 
                          ? t('profile.statistics.analysis.growthCreate')
                          : totalInteractions > (followersCount || 0) * 0.1
                            ? t('profile.statistics.analysis.growthExcellent')
                            : t('profile.statistics.analysis.growthInteract')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actividad */}
          {activeTab === 'actividad' && (
            <>
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.yourActivity')}</h2>
                <MetricCard icon={Activity} title={t('profile.statistics.metrics.activityIndex')} value={Math.min(100, Math.floor((totalPolls * 15 + totalInteractions * 0.3)))} subtitle={t('profile.statistics.metrics.activityIndexSubtitle')} trend={getTrend(totalInteractions, totalPolls * 2)} growth={calculateGrowth(totalInteractions, 0.1)} color="purple" />
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.breakdown')}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Vote} title={t('profile.statistics.metrics.totalVotes')} value={totalVotes} subtitle={t('profile.statistics.metrics.totalVotesSubtitle')} color="green" />
                  <MetricCard icon={BarChart3} title={t('profile.statistics.metrics.activePosts')} value={totalPolls} subtitle={t('profile.statistics.metrics.activePostsSubtitle')} color="blue" />
                </div>
              </div>

              {/* Estado actual */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.yourPerformance')}</h2>
                <div className="p-6 rounded-2xl bg-gray-50 text-center space-y-2">
                  <div className="text-4xl">
                    {totalPolls === 0 ? '🌟' : totalInteractions > 50 ? '🔥' : totalInteractions > 10 ? '⚡' : '🌱'}
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {totalPolls === 0
                      ? t('profile.statistics.status.startStory')
                      : totalInteractions > 50
                        ? t('profile.statistics.status.onFire')
                        : totalInteractions > 10
                          ? t('profile.statistics.status.goodPace')
                          : t('profile.statistics.status.building')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {totalPolls === 0
                      ? t('profile.statistics.status.createFirst')
                      : t('profile.statistics.performance.totalInteractions', { count: totalInteractions })}
                  </p>
                </div>
              </div>

              {/* Distribución */}
              {totalInteractions > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.distribution')}</h2>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
                      <span className="text-sm text-gray-500">{t('profile.statistics.distribution.votes')}</span>
                      <span className="text-sm font-medium text-gray-900">{totalVotes} ({Math.round((totalVotes / totalInteractions) * 100)}%)</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
                      <span className="text-sm text-gray-500">{t('profile.statistics.distribution.likes')}</span>
                      <span className="text-sm font-medium text-gray-900">{totalLikes} ({Math.round((totalLikes / totalInteractions) * 100)}%)</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
                      <span className="text-sm text-gray-500">{t('profile.statistics.distribution.comments')}</span>
                      <span className="text-sm font-medium text-gray-900">{totalComments} ({Math.round((totalComments / totalInteractions) * 100)}%)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Logros */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('profile.statistics.sections.yourAchievements')}</h2>
                <div className="flex flex-col gap-2">
                  {totalPolls > 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                      <span className="text-xl">🎯</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{t('profile.statistics.achievements.firstPost')}</p>
                        <p className="text-xs text-gray-400">{t('profile.statistics.achievements.firstPostDesc')}</p>
                      </div>
                    </div>
                  )}
                  {totalVotes >= 10 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                      <span className="text-xl">🗳️</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{t('profile.statistics.achievements.tenVotes')}</p>
                        <p className="text-xs text-gray-400">{t('profile.statistics.achievements.tenVotesDesc')}</p>
                      </div>
                    </div>
                  )}
                  {totalLikes >= 5 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                      <span className="text-xl">❤️</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{t('profile.statistics.achievements.fiveLikes')}</p>
                        <p className="text-xs text-gray-400">{t('profile.statistics.achievements.fiveLikesDesc')}</p>
                      </div>
                    </div>
                  )}
                  {(followersCount || 0) >= 5 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                      <span className="text-xl">👥</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{t('profile.statistics.achievements.firstFollowers')}</p>
                        <p className="text-xs text-gray-400">{t('profile.statistics.achievements.firstFollowersDesc', { count: followersCount })}</p>
                      </div>
                    </div>
                  )}
                  {totalPolls === 0 && totalVotes === 0 && totalLikes === 0 && (followersCount || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                      <span className="text-xl">🚀</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{t('profile.statistics.achievements.readyStart')}</p>
                        <p className="text-xs text-gray-400">{t('profile.statistics.achievements.readyStartDesc')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;
