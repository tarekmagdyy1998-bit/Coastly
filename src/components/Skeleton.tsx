import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const baseClass = "skeleton rounded-rs";
  const variantClass = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'h-4 w-3/4' : '';
  
  return <div className={`${baseClass} ${variantClass} ${className}`} />;
};
