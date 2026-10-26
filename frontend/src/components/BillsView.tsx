import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FileText, Plus, X, Eye, Search, Filter, Download, QrCode, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import UpiPaymentModal from './UpiPaymentModal';
import { apiUrl } from '../config/api';

const avatarStyles: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
};

import { getStoreBills, addStoreBill, deleteStoreBill, clearAllStoreBills } from '../lib/offlineStore';
import { openWhatsApp } from '../lib/whatsapp';
import { downloadInvoicePdf } from '../lib/pdfGenerator';

export default function BillsView() {
  const { shopkeeper } = useAuth();
  const [bills, setBills] = useState<any[]>(() => getStoreBills(shopkeeper?.email));
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [upiBill, setUpiBill] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    invoice: '',
    customer: '',
    amount: '',
    time: '',
    status: 'Paid',
    payment_mode: 'Cash',
    initials: '',
    tone: 'blue'
  });

  const fetchBills = () => {
    setLoading(true);
    const localBills = getStoreBills(shopkeeper?.email);

    axios.get(apiUrl('/api/bills/'), {
      params: { shopkeeper_email: shopkeeper?.email },
      timeout: 3000
    })
      .then(res => {
        const serverBills = Array.isArray(res.data) ? res.data : [];
        const billMap = new Map();
        localBills.forEach((b: any) => {
          const key = b.invoice || b.invoice_number || b.id;
          if (key) billMap.set(key, b);
        });
        serverBills.forEach((b: any) => {
          const key = b.invoice || b.invoice_number || b.id;
          if (key) billMap.set(key, { ...billMap.get(key), ...b });
        });
        const merged = Array.from(billMap.values());
        setBills(merged.length > 0 ? merged : localBills);
        setLoading(false);
      })
      .catch(() => {
        setBills(localBills);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBills();
  }, [shopkeeper?.email]);

  const handleOpenModal = () => {
    const now = new Date();
    const timeStr = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(now);
    const invoiceNum = `#QV-${Math.floor(1000 + Math.random() * 9000)}`;

    setFormData({
      invoice: invoiceNum,
      customer: '',
      amount: '₹0',
      time: timeStr,
      status: 'Paid',
      payment_mode: 'Cash',
      initials: '',
      tone: 'blue'
    });
    setShowModal(true);
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const customer = e.target.value;
    const initials = customer.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SK';
    const tones = ['violet', 'blue', 'amber', 'green', 'rose'];
    const tone = tones[customer.length % tones.length];
    
    setFormData({
      ...formData,
      customer,
      initials,
      tone
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = formData.amount.startsWith('₹') ? formData.amount : `₹${formData.amount}`;
    const billToSave = { ...formData, amount: cleanAmount, created_at: new Date().toISOString() };

    try {
      const res = await axios.post(apiUrl('/api/bills/'), { ...billToSave, shopkeeper_email: shopkeeper?.email }, { timeout: 3000 });
      const saved = res.data?.invoice ? res.data : billToSave;
      addStoreBill(saved, shopkeeper?.email);
      toast.success('Bill generated! Downloading PDF...');
      setShowModal(false);
      fetchBills();
      await downloadInvoicePdf(saved, shopkeeper);
    } catch {
      const saved = addStoreBill(billToSave, shopkeeper?.email);
      toast.success('Bill generated! Downloading PDF...');
      setShowModal(false);
      setBills(getStoreBills(shopkeeper?.email));
      await downloadInvoicePdf(saved, shopkeeper);
    }
  };

  const handleDownloadPdf = async (bill: any) => {
    await downloadInvoicePdf(bill, shopkeeper);
  };

  const handleSendWhatsApp = (bill: any) => {
    const cleanAmount = String(bill.amount || '0').replace('₹', '').replace(/,/g, '').trim();
    const lines = [
      `*Invoice: ${bill.invoice || 'N/A'}*`,
      `Customer: ${bill.customer || 'Walk-in Customer'}`,
      `Amount: ₹${cleanAmount}`,
      `Time: ${bill.time || ''}`,
      `Status: ${bill.status || 'Paid'}`,
      `Payment: ${bill.payment_mode || 'Cash'}`,
      ``,
      `Thank you for shopping with us! 🙏`,
    ];
    toast.success("Opening WhatsApp…");
    openWhatsApp({
      phone: bill.phone || bill.customer_phone || "",
      message: lines.join('\n'),
    });
  };

  const handlePreview = (bill: any) => {
    setSelectedBill(bill);
  };

  const handleDeleteBill = async (bill: any) => {
    const invKey = bill.invoice || bill.invoice_number || bill.id;
    if (!window.confirm(`Delete invoice ${invKey}? This will permanently remove it.`)) {
      return;
    }
    // Delete from backend if numeric ID
    if (bill.id && !isNaN(Number(bill.id))) {
      try {
        await axios.delete(apiUrl(`/api/bills/${bill.id}/`), { timeout: 3000 });
      } catch (err) {
        console.warn('Backend delete skipped/offline:', err);
      }
    }
    deleteStoreBill(invKey, shopkeeper?.email);
    setBills(prev => prev.filter(b => (b.invoice || b.invoice_number || b.id) !== invKey && String(b.id) !== String(bill.id)));
    if (selectedBill && ((selectedBill.invoice && selectedBill.invoice === bill.invoice) || selectedBill.id === bill.id)) {
      setSelectedBill(null);
    }
    toast.success('Bill deleted successfully');
  };

  const handleClearAllBills = async () => {
    if (!window.confirm('Are you sure you want to delete ALL generated bills? This cannot be undone.')) {
      return;
    }
    try {
      await Promise.all(
        bills
          .filter(b => b.id && !isNaN(Number(b.id)))
          .map(b => axios.delete(apiUrl(`/api/bills/${b.id}/`), { timeout: 3000 }).catch(() => {}))
      );
    } catch {}
    clearAllStoreBills(shopkeeper?.email);
    setBills([]);
    setSelectedBill(null);
    toast.success('All generated bills deleted');
  };

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const matchesSearch = 
        bill.invoice?.toLowerCase().includes(search.toLowerCase()) ||
        bill.customer?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || bill.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  const totalRevenue = useMemo(() => {
    return bills.reduce((sum, b) => {
      const clean = String(b.amount || '0').replace('₹', '').replace(/,/g, '').trim();
      const num = parseFloat(clean) || 0;
      return sum + num;
    }, 0);
  }, [bills]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-12 pt-7 sm:px-6 lg:px-10 lg:pt-9">
      {/* Header */}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600">
            <FileText className="h-3.5 w-3.5" /> Billing History & Invoices
          </div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[34px]">
            Bill History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View, track, and manage all your past customer bills and transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {bills.length > 0 && (
            <button
              onClick={handleClearAllBills}
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100 shadow-sm"
              title="Delete all generated bills"
            >
              <Trash2 className="h-4 w-4" /> Clear All Bills
            </button>
          )}
          <button
          
            onClick={handleOpenModal}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> New Bill
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Invoices</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{bills.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">All registered bills</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">₹{totalRevenue.toLocaleString("en-IN")}</p>
          <p className="mt-0.5 text-xs text-slate-500">Accumulated from invoices</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paid Rate</p>
          <p className="mt-1 text-2xl font-bold text-violet-600">
            {bills.length > 0
              ? `${Math.round((bills.filter(b => b.status === 'Paid').length / bills.length) * 100)}%`
              : '0%'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Successfully settled</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number or customer..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
          {(['All', 'Paid', 'Pending'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                statusFilter === status
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Mobile Cards List (Visible on mobile) */}
      <div className="space-y-3 md:hidden mb-6">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading bills...</div>
        ) : filteredBills.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 rounded-2xl border border-slate-200 bg-white p-6">
            {search || statusFilter !== 'All' ? 'No matching bills found.' : 'No invoices generated yet.'}
          </div>
        ) : (
          filteredBills.map((bill) => (
            <div
              key={bill.id || bill.invoice}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm active:bg-slate-50/50 transition"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${
                      avatarStyles[bill.tone] || avatarStyles['blue']
                    }`}
                  >
                    {bill.initials || 'SK'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{bill.customer || 'Walk-in Customer'}</p>
                    <p className="text-[11px] font-medium text-slate-400">{bill.invoice} • {bill.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900">{bill.amount}</p>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    bill.status === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {bill.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  (bill.payment_mode || 'Cash') === 'UPI'
                    ? 'bg-violet-50 text-violet-700 border border-violet-100'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {(bill.payment_mode || 'Cash') === 'UPI' ? '⚡ UPI' : '💵 Cash'}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSendWhatsApp(bill)}
                    className="flex items-center gap-1 rounded-lg bg-[#25D366]/10 px-2.5 py-1.5 text-xs font-bold text-[#25D366] hover:bg-[#25D366]/20 transition"
                  >
                    <Send className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                  <button
                    onClick={() => handlePreview(bill)}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteBill(bill)}
                    className="flex items-center justify-center rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 transition"
                    title="Delete bill"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Bills Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <th className="px-5 py-3 font-bold sm:px-6">Invoice</th>
                <th className="px-3 py-3 font-bold">Customer</th>
                <th className="px-3 py-3 font-bold">Amount</th>
                <th className="px-3 py-3 font-bold">Time</th>
                <th className="px-3 py-3 font-bold">Payment</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-5 py-3 text-right font-bold sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    Loading bill history...
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    {search || statusFilter !== 'All' ? 'No matching bills found.' : 'No invoices generated yet.'}
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr
                    key={bill.id || bill.invoice}
                    className="border-b border-slate-50 last:border-0 transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-800 sm:px-6">
                      {bill.invoice}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-bold ${
                            avatarStyles[bill.tone] || avatarStyles['blue']
                          }`}
                        >
                          {bill.initials || 'SK'}
                        </div>
                        <span className="whitespace-nowrap text-sm font-semibold text-slate-700">
                          {bill.customer || 'Walk-in Customer'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-sm font-bold text-slate-900">{bill.amount}</td>
                    <td className="px-3 py-3.5 text-xs font-medium text-slate-500">{bill.time}</td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        (bill.payment_mode || 'Cash') === 'UPI'
                          ? 'bg-violet-50 text-violet-700 border border-violet-100'
                          : (bill.payment_mode || 'Cash') === 'Card'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : (bill.payment_mode || 'Cash') === 'Credit'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {(bill.payment_mode || 'Cash') === 'UPI' && '⚡ UPI'}
                        {(bill.payment_mode || 'Cash') === 'Card' && '💳 Card'}
                        {(bill.payment_mode || 'Credit') === 'Credit' && '📋 Credit'}
                        {(!bill.payment_mode || bill.payment_mode === 'Cash') && '💵 Cash'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold ${
                          bill.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : bill.status === "Pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            bill.status === "Paid"
                              ? "bg-emerald-500"
                              : bill.status === "Pending"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                        />
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownloadPdf(bill)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                          title="Download PDF invoice"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                          title="View bill details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBill(bill)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete bill"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Invoice Details
                </h3>
                <p className="text-xs text-slate-400">{selectedBill.invoice}</p>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-500">Customer</span>
                <span className="text-sm font-bold text-slate-800">{selectedBill.customer}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-500">Total Amount</span>
                <span className="text-base font-extrabold text-slate-950">{selectedBill.amount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-500">Time / Date</span>
                <span className="text-xs font-semibold text-slate-700">{selectedBill.time}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-500">Payment Mode</span>
                <span className="text-xs font-bold text-slate-800">
                  {(selectedBill.payment_mode || 'Cash') === 'UPI' && '⚡ UPI'}
                  {(selectedBill.payment_mode || 'Cash') === 'Card' && '💳 Card'}
                  {(selectedBill.payment_mode || 'Credit') === 'Credit' && '📋 Credit / Pay Later'}
                  {(!selectedBill.payment_mode || selectedBill.payment_mode === 'Cash') && '💵 Cash'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-500">Payment Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${
                    selectedBill.status === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {selectedBill.status}
                </span>
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setUpiBill(selectedBill)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                <QrCode className="h-4 w-4" /> Pay / Collect UPI
              </button>
              <button
                onClick={() => handleDownloadPdf(selectedBill)}
                className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
              >
                <Download className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => handleDeleteBill(selectedBill)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                title="Delete this bill"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button
                onClick={() => setSelectedBill(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-display text-lg font-bold text-slate-900">Generate Manual Bill</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Invoice</label>
                    <input
                      disabled
                      value={formData.invoice}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Payment</label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none transition focus:border-violet-300 focus:bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none transition focus:border-violet-300 focus:bg-white"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Customer Name</label>
                  <input
                    required
                    value={formData.customer}
                    onChange={handleCustomerChange}
                    placeholder="Enter customer name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Total Amount</label>
                  <input
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g., ₹1,200"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI Payment Modal */}
      {upiBill && (
        <UpiPaymentModal
          amount={parseFloat((upiBill.amount || "").replace(/[^0-9.]/g, "")) || 0}
          storeName={shopkeeper?.business_name || "QBill Store"}
          upiId={(shopkeeper as any)?.upi_id || "qbill@upi"}
          invoiceNumber={upiBill.invoice}
          customerName={upiBill.customer}
          onClose={() => setUpiBill(null)}
          onPaymentConfirmed={async () => {
            try {
              if (upiBill.id) {
                await axios.patch(apiUrl(`/api/bills/${upiBill.id}/`), { status: "Paid" });
              }
              toast.success("Payment confirmed! Bill marked as Paid.");
              fetchBills();
              if (selectedBill?.id === upiBill.id) {
                setSelectedBill({ ...selectedBill, status: "Paid" });
              }
            } catch (e) {
              console.error(e);
            }
            setUpiBill(null);
          }}
        />
      )}
    </div>
  );
}
