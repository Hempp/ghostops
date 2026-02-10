'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Clock, CheckCircle, AlertTriangle, Send } from 'lucide-react'

interface Invoice { id: string; contact_name: string | null; contact_phone: string; amount_cents: number; description: string; status: string }

export default function InvoiceTracker({ businessId }: { businessId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState('all')
  
  useEffect(() => {
    setInvoices([
      { id: '1', contact_name: 'John Smith', contact_phone: '+15551234567', amount_cents: 45000, description: 'Kitchen sink repair', status: 'paid' },
      { id: '2', contact_name: 'Sarah Johnson', contact_phone: '+15552345678', amount_cents: 125000, description: 'Bathroom renovation', status: 'viewed' },
      { id: '3', contact_name: 'Mike Williams', contact_phone: '+15553456789', amount_cents: 80000, description: 'Water heater', status: 'overdue' },
    ])
  }, [businessId])
  
  const filtered = invoices.filter(inv => filter === 'all' ? true : filter === 'unpaid' ? inv.status \!== 'paid' : inv.status === 'paid')
  const totalUnpaid = invoices.filter(i => i.status \!== 'paid').reduce((s, i) => s + i.amount_cents, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_cents, 0)
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2"><Clock className="w-5 h-5 text-orange-400" /><span className="text-ghost-muted">Unpaid</span></div>
          <div className="text-2xl font-bold text-white">${(totalUnpaid / 100).toLocaleString()}</div>
        </div>
        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2"><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-ghost-muted">Paid</span></div>
          <div className="text-2xl font-bold text-white">${(totalPaid / 100).toLocaleString()}</div>
        </div>
        <div className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2"><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-ghost-muted">Overdue</span></div>
          <div className="text-2xl font-bold text-white">{invoices.filter(i => i.status === 'overdue').length}</div>
        </div>
      </div>
      <div className="bg-ghost-card border border-ghost-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-ghost-border"><th className="text-left p-4 text-ghost-muted font-medium">Customer</th><th className="text-left p-4 text-ghost-muted font-medium">Amount</th><th className="text-left p-4 text-ghost-muted font-medium">Status</th></tr></thead>
          <tbody>{filtered.map((inv) => (<tr key={inv.id} className="border-b border-ghost-border"><td className="p-4 text-white">{inv.contact_name}</td><td className="p-4 text-white">${(inv.amount_cents/100).toFixed(2)}</td><td className="p-4"><span className="px-3 py-1 rounded-full text-xs bg-emerald-600/20 text-emerald-400">{inv.status}</span></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
