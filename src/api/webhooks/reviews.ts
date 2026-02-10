// Review Engine - Google Reviews Handler
import { Router, Request, Response } from 'express';
import { supabase, getActiveBusinesses } from '../../lib/supabase.js';
import { generateReviewResponse, generateReviewRequest } from '../../lib/ai/claude.js';
import { sendSms } from '../../lib/sms/twilio.js';
import { generateGoogleReviewLink } from '../../lib/social/meta.js';
import type { Business, Review } from '../../types/index.js';

const router = Router();

// Trigger review request after job completion
// Owner texts "done [customer name]" or API call
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { business_id, customer_phone, customer_name, service } = req.body;
    
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', business_id)
      .single();
    
    if (!business || !business.google_place_id) {
      return res.status(400).json({ error: 'Business or Google Place ID not found' });
    }
    
    // Generate personalized review request
    const message = await generateReviewRequest(business, customer_name, service);
    
    // Replace placeholder with actual review link
    const reviewLink = generateGoogleReviewLink(business.google_place_id);
    const finalMessage = message.replace('{{REVIEW_LINK}}', reviewLink);
    
    // Schedule to send after 2 hours
    const sendAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    
    // For now, send immediately (in production, use a job queue)
    setTimeout(async () => {
      await sendSms({
        to: customer_phone,
        from: business.twilio_number!,
        body: finalMessage
      });
      
      // Record review request
      await supabase.from('reviews').insert({
        business_id: business.id,
        platform: 'google',
        review_requested: true,
        request_sent_at: new Date().toISOString(),
        contact_phone: customer_phone
      });
    }, 2 * 60 * 60 * 1000); // 2 hours
    
    res.json({ status: 'scheduled', send_at: sendAt.toISOString() });
  } catch (error) {
    console.error('Review request error:', error);
    res.status(500).json({ error: 'Failed to schedule review request' });
  }
});

// Poll Google reviews (called by cron)
router.post('/poll', async (req: Request, res: Response) => {
  try {
    const businesses = await getActiveBusinesses();
    let totalNew = 0;
    
    for (const business of businesses) {
      if (!business.google_place_id || !business.features_enabled?.review_engine) continue;
      
      const newReviews = await pollGoogleReviews(business);
      totalNew += newReviews.length;
      
      for (const review of newReviews) {
        // Generate AI response
        const response = await generateReviewResponse(business, {
          rating: review.rating || 0,
          content: review.content || '',
          author_name: review.author_name || undefined
        });
        
        // For negative reviews (< 4 stars), notify owner for approval
        if ((review.rating || 5) < 4) {
          await sendSms({
            to: business.owner_phone,
            from: business.twilio_number!,
            body: 'New ' + review.rating + '-star review from ' + (review.author_name || 'Customer') + ': "' + (review.content || '').substring(0, 60) + '..." AI response ready for approval.'
          });
          
          await supabase.from('reviews').update({
            response,
            response_ai_generated: true
          }).eq('id', review.id);
        } else {
          // Auto-respond to positive reviews
          // Note: Google My Business API required to post response
          await supabase.from('reviews').update({
            response,
            response_ai_generated: true,
            responded_at: new Date().toISOString()
          }).eq('id', review.id);
        }
      }
    }
    
    res.json({ status: 'ok', new_reviews: totalNew });
  } catch (error) {
    console.error('Review poll error:', error);
    res.status(500).json({ error: 'Failed to poll reviews' });
  }
});

// Helper to poll Google reviews
async function pollGoogleReviews(business: Business): Promise<Review[]> {
  // Note: Requires Google My Business API access
  // This is a simplified version - in production, use the actual API
  
  const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!GOOGLE_API_KEY || !business.google_place_id) return [];
  
  try {
    const response = await fetch(
      'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + 
      business.google_place_id + 
      '&fields=reviews&key=' + 
      GOOGLE_API_KEY
    );
    
    const data = await response.json() as {
      result?: {
        reviews?: Array<{
          author_name: string;
          rating: number;
          text: string;
          time: number;
        }>;
      };
    };
    
    const googleReviews = data.result?.reviews || [];
    const newReviews: Review[] = [];
    
    for (const gr of googleReviews) {
      // Check if we already have this review
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('business_id', business.id)
        .eq('platform', 'google')
        .eq('author_name', gr.author_name)
        .eq('published_at', new Date(gr.time * 1000).toISOString())
        .single();
      
      if (!existing) {
        const { data: newReview } = await supabase.from('reviews').insert({
          business_id: business.id,
          platform: 'google',
          author_name: gr.author_name,
          rating: gr.rating,
          content: gr.text,
          published_at: new Date(gr.time * 1000).toISOString()
        }).select().single();
        
        if (newReview) newReviews.push(newReview as Review);
      }
    }
    
    return newReviews;
  } catch (error) {
    console.error('Error polling Google reviews:', error);
    return [];
  }
}

export default router;
