import React from 'react';

function SkeletonBar({ className = '' }) {
  return <div className={`bg-[#1f2937] rounded animate-pulse ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="os-data-card">
      <SkeletonBar className="h-0.5 w-full" />
      <div className="p-5 space-y-3">
        <SkeletonBar className="h-4 w-20" />
        <SkeletonBar className="h-3 w-full" />
        <SkeletonBar className="h-3 w-3/4" />
        <SkeletonBar className="h-3 w-5/6" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <SkeletonBar className="h-8 w-full" />
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonBar key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function TextSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBar key={i} className="h-3" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ lines = 3, type = 'text' }) {
  if (type === 'card') return <CardSkeleton />;
  if (type === 'table') return <TableSkeleton />;
  return <TextSkeleton lines={lines} />;
}
