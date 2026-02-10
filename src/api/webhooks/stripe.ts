// Stripe Webhook Handler
import { Router, Request, Response } from 'express';
import { verifyStripeSignature, handleStripeWebhook } from '../../lib/payments/stripe.js';
import { supabase } from '../../lib/supabase.js';
import { sendSms } from '../../lib/sms/twilio.js';
import type { Business } from '../../types/index.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  try {
    const event = verifyStripeSignature(req.body, signature);
    
    // Handle payment success - notify owner
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as { metadata?: { ghostops_invoice_id?: string } };
      const ghostopsInvoiceId = invoice.metadata?.ghostops_invoice_id;
      
      if (ghostopsInvoiceId) {
        const { data: inv } = await supabase
          .from('invoices')
          .select('*, businesses(*)')
          .eq('id', ghostopsInvoiceId)
          .single();
        
        if (inv) {
          const business = inv.businesses as unknown as Business;
          const amount = (inv.amount_cents / 100).toFixed(2);
          const name = inv.contact_name || 'Customer';
          
          await sendSms({
            to: business.owner_phone,
            from: business.twilio_number!,
            body: '💰 ' + name + ' just paid $' + amount + '! Invoice for "' + inv.description + '" collected.'
          });
        }
      }
    }
    
    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).send('Webhook error');
  }
});

export default router;
