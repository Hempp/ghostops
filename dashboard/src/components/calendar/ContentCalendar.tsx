'use client'

import { useEffect, useState } from 'react'
import { Instagram, Facebook, Clock, CheckCircle, Heart, MessageCircle } from 'lucide-react'

interface SocialPost {
  id: string
  content: string
  media_urls: string[]
  platforms: string[]
  status: 'draft' | 'pending_approval' | 'scheduled' | 'posted'
  scheduled_at: string | null
  posted_at: string | null
  engagement: { likes?: number; comments?: number }
}

interface ContentCalendarProps {
  businessId: string
}

export default function ContentCalendar({ businessId }: ContentCalendarProps) {
  const [posts, setPosts] = useState<SocialPost[]>([])
  
  useEffect(() => {
    // Demo data
    setPosts([
      {
        id: '1',
        content: 'Just completed this stunning kitchen renovation! Our team worked hard to bring this client\'s dream to life. #HomeRenovation #KitchenDesign',
        media_urls: ['https://example.com/kitchen.jpg'],
        platforms: ['instagram', 'facebook'],
        status: 'posted',
        scheduled_at: null,
        posted_at: '2024-01-14T10:00:00Z',
        engagement: { likes: 234, comments: 18 }
      },
      {
        id: '2',
        content: 'Monday motivation: Starting the week with a beautiful bathroom remodel. Stay tuned for the reveal! 🔨',
        media_urls: ['https://example.com/bathroom.jpg'],
        platforms: ['instagram', 'facebook'],
        status: 'scheduled',
        scheduled_at: '2024-01-16T09:00:00Z',
        posted_at: null,
        engagement: {}
      },
      {
        id: '3',
        content: 'Behind the scenes of our latest project. Quality craftsmanship in every detail.',
        media_urls: ['https://example.com/bts.jpg'],
        platforms: ['instagram'],
        status: 'pending_approval',
        scheduled_at: null,
        posted_at: null,
        engagement: {}
      },
    ])
  }, [businessId])
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-600',
      pending_approval: 'bg-yellow-600',
      scheduled: 'bg-blue-600',
      posted: 'bg-green-600',
    }
    return colors[status] || colors.draft
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Posted This Week', value: '5', icon: CheckCircle, color: 'text-green-400' },
          { label: 'Scheduled', value: '3', icon: Clock, color: 'text-blue-400' },
          { label: 'Total Reach', value: '2.4K', icon: Heart, color: 'text-pink-400' },
          { label: 'Engagement', value: '156', icon: MessageCircle, color: 'text-purple-400' },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
            {/* Media Preview */}
            <div className="aspect-square bg-ghost-border flex items-center justify-center">
              <span className="text-ghost-muted">Media Preview</span>
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
                    <Heart className="w-4 h-4" /> {post.engagement.likes || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" /> {post.engagement.comments || 0}
                  </span>
                </div>
              ) : post.status === 'scheduled' && post.scheduled_at ? (
                <div className="flex items-center gap-1 text-sm text-blue-400">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(post.scheduled_at).toLocaleDateString()} at {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
    </div>
  )
}
