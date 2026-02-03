"use client";

import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

/**
 * Base skeleton component for loading states.
 */
export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
};

/**
 * Skeleton for card-style components.
 */
export const SkeletonCard = ({ className }: SkeletonProps) => {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
};

/**
 * Skeleton for image cards (like in history grid).
 */
export const SkeletonImageCard = ({ className }: SkeletonProps) => {
  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <Skeleton className="aspect-square w-full" />
      <div className="p-2 space-y-1.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-2 w-1/2" />
      </div>
    </div>
  );
};

/**
 * Skeleton for component cards in the builder.
 */
export const SkeletonComponentCard = ({ className }: SkeletonProps) => {
  return (
    <div className={cn("rounded-lg border bg-card p-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-16 w-full rounded" />
    </div>
  );
};

/**
 * Skeleton for list items.
 */
export const SkeletonListItem = ({ className }: SkeletonProps) => {
  return (
    <div className={cn("flex items-center gap-3 p-3 border-b", className)}>
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2 w-1/2" />
      </div>
    </div>
  );
};

/**
 * Skeleton for text content.
 */
export const SkeletonText = ({
  lines = 3,
  className
}: SkeletonProps & { lines?: number }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3",
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton grid for image galleries.
 */
export const SkeletonImageGrid = ({
  count = 8,
  className
}: SkeletonProps & { count?: number }) => {
  return (
    <div className={cn(
      "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4",
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonImageCard key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton for component grid in builder.
 */
export const SkeletonComponentGrid = ({
  count = 6,
  className
}: SkeletonProps & { count?: number }) => {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponentCard key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton for detail panels.
 */
export const SkeletonDetailPanel = ({ className }: SkeletonProps) => {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {/* Image placeholder */}
      <Skeleton className="aspect-square w-full rounded-lg" />

      {/* Title and actions */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>

      {/* Tags */}
      <div className="flex gap-2 flex-wrap">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>

      {/* JSON preview placeholder */}
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
};
