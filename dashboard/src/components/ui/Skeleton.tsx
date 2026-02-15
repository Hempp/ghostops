'use client'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-ghost-border rounded ${className}`}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-12 h-4" />
      </div>
      <Skeleton className="w-20 h-8 mb-2" />
      <Skeleton className="w-16 h-4" />
    </div>
  )
}

export function ConversationItemSkeleton() {
  return (
    <div className="p-4 border-b border-ghost-border">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-16 h-3" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="w-12 h-3" />
      </div>
    </div>
  )
}

export function MessageSkeleton({ outbound = false }: { outbound?: boolean }) {
  return (
    <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
      <div className="flex items-end gap-2 max-w-[80%]">
        {!outbound && <Skeleton className="w-6 h-6 rounded-full" />}
        <div className={outbound ? 'bg-emerald-600/30' : 'bg-ghost-card'} style={{ borderRadius: '1rem' }}>
          <div className="px-4 py-3">
            <Skeleton className="w-48 h-4 mb-2" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
        {outbound && <Skeleton className="w-6 h-6 rounded-full" />}
      </div>
    </div>
  )
}

export function InvoiceRowSkeleton() {
  return (
    <tr className="border-b border-ghost-border">
      <td className="p-4">
        <Skeleton className="w-24 h-4 mb-1" />
        <Skeleton className="w-20 h-3" />
      </td>
      <td className="p-4"><Skeleton className="w-32 h-4" /></td>
      <td className="p-4"><Skeleton className="w-16 h-4" /></td>
      <td className="p-4"><Skeleton className="w-16 h-6 rounded-full" /></td>
      <td className="p-4"><Skeleton className="w-20 h-4" /></td>
    </tr>
  )
}

export function ContentCardSkeleton() {
  return (
    <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="w-20 h-5 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-4 h-4" />
          </div>
        </div>
        <Skeleton className="w-full h-4 mb-2" />
        <Skeleton className="w-3/4 h-4 mb-3" />
        <div className="flex gap-4">
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
      </div>
    </div>
  )
}
