// Owner Command Parser - Command Interface Engine
import type { OwnerCommand } from '../../types/index.js';

// Parse owner SMS commands
export function parseOwnerCommand(message: string): OwnerCommand {
  const text = message.trim().toLowerCase();
  
  if (text === 'pause' || text === 'stop') return { type: 'pause' };
  if (text === 'resume' || text === 'start') return { type: 'resume' };
  if (text === 'status' || text === 'stats') return { type: 'status' };
  if (text === 'help' || text === '?') return { type: 'help' };
  if (text === 'unpaid' || text === 'overdue') return { type: 'unpaid' };
  
  // Invoice: "invoice John 500 plumbing repair"
  const invoiceMatch = message.match(/^invoice\s+(\w+)\s+(\d+(?:\.\d{2})?)\s+(.+)$/i);
  if (invoiceMatch) {
    return {
      type: 'invoice',
      customer: invoiceMatch[1],
      contact_name: invoiceMatch[1],
      amount: parseFloat(invoiceMatch[2]),
      description: invoiceMatch[3].trim()
    };
  }
  
  // Post command
  if (text.startsWith('post')) {
    return { type: 'post', content: message.substring(4).trim() || undefined };
  }
  
  // Schedule: "schedule [post_id] [datetime]"
  const scheduleMatch = message.match(/^schedule\s+(\w+)\s+(.+)$/i);
  if (scheduleMatch) {
    return { type: 'schedule', post_id: scheduleMatch[1], datetime: scheduleMatch[2] };
  }
  
  // Stats with period
  const statsMatch = text.match(/^stats?\s+(today|week|month)$/);
  if (statsMatch) {
    return { type: 'stats', period: statsMatch[1] as 'today' | 'week' | 'month' };
  }
  
  return { type: 'unknown', raw: message };
}

export function getHelpMessage(): string {
  return 'Commands: pause, resume, status, unpaid, invoice [name] [amt] [desc], post, schedule, stats, help';
}

export function formatStatusMessage(stats: {
  isPaused: boolean;
  todayLeads: number;
  todayMessages: number;
  pendingPosts: number;
  unpaidInvoices: number;
  unpaidTotal: number;
}): string {
  const status = stats.isPaused ? 'PAUSED' : 'ACTIVE';
  return status + ' | ' + stats.todayLeads + ' leads | ' + stats.unpaidInvoices + ' unpaid ($' + (stats.unpaidTotal / 100).toFixed(0) + ')';
}

export function formatUnpaidList(invoices: Array<{
  contact_name?: string;
  contact_phone: string;
  amount_cents: number;
  sent_at: string;
}>): string {
  if (invoices.length === 0) return 'No unpaid invoices!';
  return invoices.slice(0, 5).map(inv => {
    const name = inv.contact_name || inv.contact_phone;
    const days = Math.floor((Date.now() - new Date(inv.sent_at).getTime()) / 86400000);
    return name + ': $' + (inv.amount_cents / 100) + ' (' + days + 'd)';
  }).join('\n');
}

export function formatPostOptions(options: string[]): string {
  return options.map((opt, i) => (i + 1) + ') ' + opt.substring(0, 80) + '...').join('\n') + '\nReply 1, 2, or 3';
}

// Determine if an owner message is conversational (for co-founder AI) or a command
export function isConversationalMessage(message: string): boolean {
  const text = message.trim().toLowerCase();

  // Exact command matches
  const exactCommands = ['pause', 'stop', 'resume', 'start', 'status', 'stats', 'help', '?', 'unpaid', 'overdue'];
  if (exactCommands.includes(text)) {
    return false;
  }

  // Commands that start with specific keywords
  if (text.startsWith('invoice') || text.startsWith('post') || text.startsWith('schedule')) {
    return false;
  }

  // Stats with period pattern: stats today/week/month
  if (/^stats?\s+(today|week|month)$/.test(text)) {
    return false;
  }

  // Number 1-3 for post selection
  if (/^[1-3]$/.test(text)) {
    return false;
  }

  // Everything else is conversational
  return true;
}
