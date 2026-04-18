import React from 'react';

// Shimmer animation component
const ShimmerEffect = () => (
  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
);

// Skeleton for search result grid items
export const SearchResultSkeleton = ({ delay = 0 }) => (
  <div 
    className="bg-white overflow-hidden animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Header: Avatar + Username + Follow Button */}
    <div className="flex items-center justify-between px-0 py-2">
      <div className="flex items-center space-x-1">
        {/* Avatar skeleton */}
        <div className="w-6 h-6 rounded-full bg-gray-200 relative overflow-hidden">
          <ShimmerEffect />
        </div>
        {/* Username skeleton */}
        <div className="h-4 w-20 bg-gray-200 rounded relative overflow-hidden">
          <ShimmerEffect />
        </div>
      </div>
      {/* Follow button skeleton */}
      <div className="h-6 w-16 bg-gray-200 rounded-full relative overflow-hidden">
        <ShimmerEffect />
      </div>
    </div>

    {/* Image Container skeleton */}
    <div className="relative aspect-[6/11] bg-gray-200 rounded-xl overflow-hidden">
      <ShimmerEffect />
    </div>

    {/* Description skeleton */}
    <div className="px-0 pb-1 pl-2 pt-2">
      <div className="h-4 w-full bg-gray-200 rounded mb-1 relative overflow-hidden">
        <ShimmerEffect />
      </div>
      <div className="h-4 w-3/4 bg-gray-200 rounded relative overflow-hidden">
        <ShimmerEffect />
      </div>
    </div>
  </div>
);

// Skeleton for story cards
export const StorySkeleton = ({ delay = 0 }) => (
  <div 
    className="flex-shrink-0 animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div 
      className="relative rounded-2xl overflow-hidden bg-gray-200"
      style={{
        width: '120px',
        height: '160px'
      }}
    >
      <ShimmerEffect />
      
      {/* User avatar container skeleton */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-gray-300 mb-1 relative overflow-hidden">
          <ShimmerEffect />
        </div>
        <div className="h-3 w-16 bg-gray-300 rounded relative overflow-hidden">
          <ShimmerEffect />
        </div>
      </div>
    </div>
  </div>
);

// Skeleton for recommendation cards
export const RecommendationSkeleton = ({ delay = 0 }) => (
  <div 
    className="flex-shrink-0 animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div 
      className="bg-gray-200 rounded-xl sm:rounded-2xl relative overflow-hidden"
      style={{
        width: 'calc((100vw - 84px) / 2.8)',
        height: 'calc(((100vw - 84px) / 2.8) * 1.77)',
        minWidth: '100px',
        maxWidth: '129px',
        minHeight: '177px',
        maxHeight: '230px'
      }}
    >
      <ShimmerEffect />
    </div>
    
    {/* Title skeleton */}
    <div 
      className="h-4 bg-gray-200 rounded mt-1 sm:mt-2 relative overflow-hidden"
      style={{width: 'calc((100vw - 84px) / 2.8)', minWidth: '100px', maxWidth: '129px'}}
    >
      <ShimmerEffect />
    </div>
  </div>
);

// Grid of search result skeletons
export const SearchResultsGridSkeleton = ({ count = 6 }) => (
  <div className="px-1 py-2 w-full">
    <div className="grid grid-cols-2 gap-1">
      {Array.from({ length: count }).map((_, index) => (
        <SearchResultSkeleton key={`search-skel-${index}`} delay={index * 50} />
      ))}
    </div>
  </div>
);

// Stories section skeleton
export const StoriesSectionSkeleton = ({ count = 5 }) => (
  <div className="space-y-4 animate-slide-up">
    <div className="px-4">
      <div className="h-6 w-32 bg-gray-200 rounded relative overflow-hidden">
        <ShimmerEffect />
      </div>
    </div>
    
    <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2 px-4 lg:px-6 xl:px-8">
      {Array.from({ length: count }).map((_, index) => (
        <StorySkeleton key={`story-skel-${index}`} delay={index * 50} />
      ))}
    </div>
  </div>
);

// Recommendations section skeleton
export const RecommendationsSectionSkeleton = ({ count = 6 }) => (
  <div className="space-y-3 sm:space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
    <div className="px-3 sm:px-0">
      <div className="h-5 w-28 bg-gray-200 rounded relative overflow-hidden">
        <ShimmerEffect />
      </div>
    </div>
    
    <div className="flex space-x-3 sm:space-x-4 overflow-x-auto scrollbar-hide pb-2 w-full pl-3 sm:pl-0 lg:pl-6 xl:pl-8">
      {Array.from({ length: count }).map((_, index) => (
        <RecommendationSkeleton key={`rec-skel-${index}`} delay={index * 50} />
      ))}
    </div>
  </div>
);

// Recent searches skeleton
export const RecentSearchesSkeleton = ({ count = 5 }) => (
  <div className="space-y-3 sm:space-y-4 px-3 sm:px-0 animate-slide-up">
    <div className="flex items-center justify-between">
      <div className="h-5 w-40 bg-gray-200 rounded relative overflow-hidden">
        <ShimmerEffect />
      </div>
    </div>
    
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={`recent-skel-${index}`} 
          className="flex items-center space-x-3 p-2"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="w-5 h-5 bg-gray-200 rounded relative overflow-hidden">
            <ShimmerEffect />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-4 w-32 bg-gray-200 rounded relative overflow-hidden">
              <ShimmerEffect />
            </div>
            <div className="h-3 w-20 bg-gray-200 rounded relative overflow-hidden">
              <ShimmerEffect />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);