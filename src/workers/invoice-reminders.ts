// ===========================================
// INVOICE REMINDER WORKER
// CIPHER Agent: Payment Follow-ups
// ===========================================

import { CronJob } from 'cron';
import { supabase, updateInvoice } from '../lib/supabase.js';
import { sendSms } from '../lib/twilio.js';
import type { Business, Invoice } from '../types/index.js';

// ===========================================
// WORKER INITIALIZATION
// ===========================================

export function startInvoiceReminderWorker(): void {
  // Run every hour at minute 0
  const job = new CronJob(
    '0 * * * *', // Every hour
    async () => {
      await processInvoiceReminders();
    },
    null,
    true,
    'UTC'
  );

  // Also run daily at 10am UTC for overdue checks
  const overdueJob = new CronJob(
    '0 10 * * *', // 10am UTC daily
    async () => {
      await processOverdueInvoices();
    },
    null,
    true,
    'UTC'
  );

  console.log('💰 Invoice reminder worker started');
}

// ===========================================
// REMINDER LOGIC
// ===========================================

async function processInvoiceReminders(): Promise<void> {
  try {
    // Get all pending/sent invoices with their businesses
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, businesses(*)')
      .in('status', ['sent', 'reminded'])
      .not('customer_phone', 'is', null);

    if (error) throw error;
    if (!invoices?.length) return;

    const now = new Date();

    for (const invoice of invoices) {
      const business = invoice.businesses as Business;

      if (!business || business.settings.paused) continue;

      const reminderDays = business.settings.invoice_reminder_days || [3, 7];
      const createdAt = new Date(invoice.created_at);
      const daysSinceCreated = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we should send a reminder
      const shouldRemind = reminderDays.includes(daysSinceCreated);
      const alreadyRemindedToday = invoice.reminder_count >= reminderDays.indexOf(daysSinceCreated) + 1;

      if (shouldRemind && !alreadyRemindedToday) {
        await sendReminder(invoice as Invoice, business);
      }
    }
  } catch (error) {
    console.error('Invoice reminder worker error:', error);
  }
}

async function sendReminder(invoice: Invoice, business: Business): Promise<void> {
  const amountDollars = (invoice.amount / 100).toFixed(2);
  const reminderNumber = invoice.reminder_count + 1;

  let message: string;

  if (reminderNumber === 1) {
    // Friendly first reminder
    message =
      `Hi ${invoice.customer_name}! Just a friendly reminder about your invoice from ${business.name}.\n\n` +
      `💰 $${amountDollars} - ${invoice.description}\n\n` +
      `Pay here: ${invoice.stripe_payment_link}`;
  } else {
    // More urgent follow-up
    message =
      `Hi ${invoice.customer_name}, your invoice from ${business.name} is still outstanding.\n\n` +
      `Amount due: $${amountDollars}\n\n` +
      `Please pay at your earliest convenience: ${invoice.stripe_payment_link}`;
  }

  try {
    if (!invoice.customer_phone || !business.twilio_number) {
      throw new Error('Missing phone number');
    }
    await sendSms(invoice.customer_phone, business.twilio_number, message);

    // Update invoice
    await updateInvoice(invoice.id, {
      status: 'reminded',
      reminder_count: reminderNumber,
    });

    console.log(`📤 Reminder #${reminderNumber} sent for invoice ${invoice.id}`);
  } catch (error) {
    console.error(`Failed to send reminder for invoice ${invoice.id}:`, error);
  }
}

// ===========================================
// OVERDUE PROCESSING
// ===========================================

async function processOverdueInvoices(): Promise<void> {
  try {
    // Find invoices older than 14 days that aren't paid
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 14);

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, businesses(*)')
      .in('status', ['sent', 'reminded'])
      .lt('created_at', overdueDate.toISOString());

    if (error) throw error;
    if (!invoices?.length) return;

    for (const invoice of invoices) {
      const business = invoice.businesses as Business;

      // Mark as overdue
      await updateInvoice(invoice.id, { status: 'overdue' });

      // Notify owner
      if (business && !business.settings?.paused && business.twilio_number) {
        const amountDollars = ((invoice.amount || invoice.amount_cents) / 100).toFixed(2);
        await sendSms(
          business.owner_phone,
          business.twilio_number,
          `⚠️ Invoice overdue!\n${invoice.customer_name || invoice.contact_name}: $${amountDollars}\nCreated ${Math.floor((new Date().getTime() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago.`
        );
      }

      console.log(`⚠️ Invoice ${invoice.id} marked as overdue`);
    }
  } catch (error) {
    console.error('Overdue invoice processing error:', error);
  }
}

// ===========================================
// MANUAL TRIGGER
// ===========================================

export async function sendInvoiceReminder(invoiceId: string): Promise<void> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, businesses(*)')
    .eq('id', invoiceId)
    .single();

  if (invoice) {
    const business = invoice.businesses as Business;
    await sendReminder(invoice as Invoice, business);
  }
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  import('dotenv/config').then(() => {
    console.log('Running invoice reminder worker standalone...');
    processInvoiceReminders().then(() => {
      console.log('Done');
      process.exit(0);
    });
  });
}
