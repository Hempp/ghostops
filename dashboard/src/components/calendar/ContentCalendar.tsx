'use client'

import { useEffect, useState } from 'react'
import { Instagram, Facebook, Clock, CheckCircle, Heart, MessageCircle, Share2, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getSocialPosts, subscribeToSocialPosts, type SocialPost } from '@/lib/supabase'
import { StatCardSkeleton, ContentCardSkeleton } from '@/components/ui/Skeleton'

interface ContentCalendarProps {
  businessId: string
}

export default function ContentCalendar({ businessId }: ContentCalendarProps) {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getSocialPosts(businessId)
        setPosts(data)
      } catch (err) {
        console.error('Error loading social posts:', err)
        toast.error('Failed to load content calendar', {
          description: 'Check your connection and try again',
          action: {
            label: 'Retry',
            onClick: () => load()
          }
        })
      } finally {
        setLoading(false)
      }
    }

    load()

    // Subscribe to real-time updates
    const subscription = subscribeToSocialPosts(businessId, (updated) => {
      setPosts(prev => {
        const exists = prev.find(p => p.id === updated.id)
        if (exists) {
          return prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
        }
        return [updated, ...prev]
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [businessId])

  // Calculate stats
  const postedThisWeek = posts.filter(p => {
    if (p.status !== 'posted' || !p.posted_at) return false
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return new Date(p.posted_at).getTime() > weekAgo
  }).length

  const scheduledCount = posts.filter(p => p.status === 'scheduled').length

  const totalEngagement = posts.reduce((sum, p) => {
    return sum + (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0)
  }, 0)

  const totalReach = posts.reduce((sum, p) => sum + (p.engagement?.likes || 0), 0)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-600',
      pending_approval: 'bg-yellow-600',
      scheduled: 'bg-blue-600',
      posted: 'bg-green-600',
      failed: 'bg-red-600',
    }
    return colors[status] || colors.draft
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <ContentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Posted This Week', value: String(postedThisWeek), icon: CheckCircle, color: 'text-green-400' },
          { label: 'Scheduled', value: String(scheduledCount), icon: Clock, color: 'text-blue-400' },
          { label: 'Total Reach', value: totalReach > 1000 ? `${(totalReach / 1000).toFixed(1)}K` : String(totalReach), icon: Heart, color: 'text-pink-400' },
          { label: 'Engagement', value: String(totalEngagement), icon: MessageCircle, color: 'text-purple-400' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-ghost-card border border-ghost-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={"w-5 h-5 " + stat.color} />
                <span className="text-ghost-muted text-sm">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </div>
          )
        })}
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-8 text-center">
          <PlusCircle className="w-12 h-12 text-ghost-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
          <p className="text-ghost-muted">
            Text your GhostOps number with a photo to create social media posts.
            AI will generate captions for Instagram and Facebook.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
              {/* Media Preview */}
              <div className="aspect-square bg-ghost-border flex items-center justify-center relative">
                {post.media_urls && post.media_urls.length > 0 ? (
                  <img
                    src={post.media_urls[0]}
                    alt="Post media"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-ghost-muted">No media</span>
                )}
                {post.media_urls && post.media_urls.length > 1 && (
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    +{post.media_urls.length - 1}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={"px-2 py-1 rounded-full text-xs font-medium text-white " + getStatusColor(post.status)}>
                    {post.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <div className="flex gap-2">
                    {post.platforms.includes('instagram') && <Instagram className="w-4 h-4 text-pink-400" />}
                    {post.platforms.includes('facebook') && <Facebook className="w-4 h-4 text-blue-400" />}
                  </div>
                </div>

                {/* Caption */}
                <p className="text-white text-sm mb-3 line-clamp-3">{post.content}</p>

                {/* Engagement or Schedule */}
                {post.status === 'posted' ? (
                  <div className="flex items-center gap-4 text-sm text-ghost-muted">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" /> {post.engagement?.likes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" /> {post.engagement?.comments || 0}
                    </span>
                    {post.engagement?.shares && (
                      <span className="flex items-center gap-1">
                        <Share2 className="w-4 h-4" /> {post.engagement.shares}
                      </span>
                    )}
                  </div>
                ) : post.status === 'scheduled' && post.scheduled_at ? (
                  <div className="flex items-center gap-1 text-sm text-blue-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(post.scheduled_at).toLocaleDateString()} at{' '}
                      {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : post.status === 'pending_approval' ? (
                  <button className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors">
                    Review & Approve
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
