import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  BookOpen, Plus, Search, Filter, Phone, MessageSquare, 
  ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, 
  IndianRupee, X, Send, AlertCircle, RefreshCw, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { apiUrl } from '../config/api';
import { 
  getStoreKhataSummary, 
  recordKhataTransaction, 
  type KhataEntry,
  getStoreCustomers 
} from '../lib/offlineStore';
import { openWhatsApp } from '../lib/whatsapp';

export default function KhataView() {
  const { shopkeeper } = useAuth();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('pending');
  const [summary, setSummary] = useState(() => getStoreKhataSummary(shopkeeper?.email));

  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [modalType, setModalType] = useState<'GIVEN' | 'RECEIVED'>('GIVEN');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    amount: '',
    note: '',
  });

  const refreshData = () => {
    // 1. Load offline summary first
    const local = getStoreKhataSummary(shopkeeper?.email);
    setSummary(local);

    // 2. Sync with backend if available
    setLoading(true);
    axios.get(apiUrl('/api/khata/'), {
      params: { shopkeeper_email: shopkeeper?.email },
      timeout: 3000
    })
      .then(res => {
        if (res.data && res.data.success && res.data.customers) {
          // If server returned valid data, merge with summary
          setSummary(prev => ({
            ...prev,
            totalPending: res.data.total_pending ?? prev.totalPending,
            totalRecovered: res.data.total_recovered ?? prev.totalRecovered,
            debtorsCount: res.data.debtors_count ?? prev.debtorsCount,
            customers: res.data.customers.length > 0 ? res.data.customers : prev.customers,
          }));
        }
      })
      .catch(() => {
        // Safe offline fallback
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshData();
  }, [shopkeeper?.email]);

  // Open modal for Give Udhar or Collect Payment
  const handleOpenTransaction = (type: 'GIVEN' | 'RECEIVED', customer?: any) => {
    setModalType(type);
    if (customer) {
      setFormData({
        customerName: customer.customerName || customer.name || '',
        customerPhone: customer.customerPhone || customer.phone || '',
        amount: type === 'RECEIVED' ? String(customer.balance || '') : '',
        note: type === 'RECEIVED' ? 'Payment received' : 'Grocery purchase on credit',
      });
    } else {
      setFormData({
        customerName: '',
        customerPhone: '',
        amount: '',
        note: '',
      });
    }
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!formData.customerName.trim()) {
      toast.error('Please enter customer name.');
      return;
    }

    // 1. Record locally for instant offline response
    recordKhataTransaction({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      amount: amt,
      entryType: modalType,
      note: formData.note,
    }, shopkeeper?.email);

    // 2. Try recording in backend
    try {
      await axios.post(apiUrl('/api/khata/'), {
        shopkeeper_email: shopkeeper?.email,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        amount: amt,
        entry_type: modalType,
        note: formData.note,
      }, { timeout: 2500 });
    } catch (err) {
      console.warn('Backend Khata sync will be handled offline:', err);
    }

    toast.success(
      modalType === 'GIVEN'
        ? `Added ₹${amt} Udhar for ${formData.customerName}`
        : `Collected ₹${amt} from ${formData.customerName}`
    );
    setShowTransactionModal(false);
    refreshData();
  };

  // 1-Click WhatsApp Payment Reminder
  const handleSendReminder = (customer: any) => {
    const phone = customer.customerPhone || customer.phone;
    if (!phone) {
      toast.error('Customer phone number not available for WhatsApp reminder.');
      return;
    }

    const storeName = shopkeeper?.store_name || 'Our Grocery Store';
    const upiId = shopkeeper?.upi_id || '9704955713-2@ybl';
    const amount = customer.balance || 0;

    const upiPayLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${amount}&cu=INR`;

    const message = 
      `Namaste ${customer.customerName || 'Customer'} ji 🙏\n\n` +
      `This is a gentle payment reminder from *${storeName}*.\n` +
      `Your outstanding Udhar / Credit balance is *₹${amount.toLocaleString('en-IN')}*.\n\n` +
      `💳 *Pay easily via UPI:*\n` +
      `UPI ID: *${upiId}*\n` +
      `Pay Link: ${upiPayLink}\n\n` +
      `Thank you for shopping with us! Have a wonderful day.`;

    openWhatsApp(phone, message);
    toast.success(`WhatsApp reminder opened for ${customer.customerName}!`);
  };

  // View Customer Ledger
  const handleViewLedger = (customer: any) => {
    setSelectedCustomer(customer);
    setShowLedgerModal(true);
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return (summary.customers || []).filter((c: any) => {
      const matchSearch =
        (c.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.customerPhone || '').includes(search);

      if (!matchSearch) return false;

      if (filter === 'pending') return (c.balance || 0) > 0;
      if (filter === 'settled') return (c.balance || 0) <= 0;
      return true;
    });
  }, [summary.customers, search, filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Digital Khata Book
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Customer Credit, Udhar Ledger &amp; 1-Click WhatsApp Reminders
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenTransaction('GIVEN')}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 active:scale-95"
          >
            <ArrowUpRight className="h-4 w-4" /> Give Udhar (+ Credit)
          </button>
          <button
            onClick={() => handleOpenTransaction('RECEIVED')}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
          >
            <ArrowDownLeft className="h-4 w-4" /> Collect Payment (- Recv)
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Udhar */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/80 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Total Pending Udhar
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-rose-700">
              ₹{summary.totalPending.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-rose-500 font-medium">
              Across {summary.debtorsCount} customer{summary.debtorsCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Total Recovered */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Total Recovered
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-emerald-700">
              ₹{summary.totalRecovered.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Repayments collected successfully
            </p>
          </div>
        </div>

        {/* Active Debtors */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Customers With Udhar
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-amber-700">
              {summary.debtorsCount}
            </p>
            <p className="mt-1 text-xs text-amber-600 font-medium">
              Out of {(summary.customers || []).length} registered customers
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or phone..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-amber-400 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['pending', 'all', 'settled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition ${
                filter === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'pending' ? 'Pending Udhar' : tab}
            </button>
          ))}
          <button
            onClick={refreshData}
            className="ml-auto rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            title="Refresh Khata"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredCustomers.length === 0 ? (
          <div className="py-14 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">No Khata records found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === 'pending' ? 'No customers currently have pending Udhar.' : 'Start by giving Udhar or adding a customer.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((cust: any) => {
              const balance = cust.balance || 0;
              const hasBalance = balance > 0;

              return (
                <div
                  key={cust.customerPhone || cust.customerName}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-white text-sm shadow-sm">
                      {cust.customerName ? cust.customerName.substring(0, 2).toUpperCase() : 'CU'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{cust.customerName}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3" /> {cust.customerPhone || 'No phone'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Balance Due
                      </p>
                      <p
                        className={`text-base font-black ${
                          hasBalance ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {hasBalance ? `₹${balance.toLocaleString('en-IN')}` : '₹0 (Settled)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasBalance && (
                        <>
                          <button
                            onClick={() => handleSendReminder(cust)}
                            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                            title="Send WhatsApp Payment Reminder"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">WhatsApp</span> Reminder
                          </button>
                          <button
                            onClick={() => handleOpenTransaction('RECEIVED', cust)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                          >
                            Collect
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleViewLedger(cust)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Ledger
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Modal (Give Udhar / Collect Payment) */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl text-white ${
                    modalType === 'GIVEN' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                >
                  {modalType === 'GIVEN' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {modalType === 'GIVEN' ? 'Give Udhar (+ Credit)' : 'Collect Payment (- Repayment)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {modalType === 'GIVEN'
                      ? 'Record grocery item purchase on credit'
                      : 'Record cash/UPI repayment from customer'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Customer Mobile Number (for WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="₹ 0.00"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-base font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Note / Item description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="e.g. 2 Milk packets + 1kg Atta"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition ${
                    modalType === 'GIVEN'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  Confirm &amp; Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger History Modal */}
      {showLedgerModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold">
                  {selectedCustomer.customerName ? selectedCustomer.customerName.substring(0, 2).toUpperCase() : 'CU'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {selectedCustomer.customerName}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCustomer.customerPhone || 'No phone'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Total Outstanding</p>
                <p
                  className={`text-lg font-black ${
                    (selectedCustomer.balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  ₹{(selectedCustomer.balance || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowLedgerModal(false);
                    handleOpenTransaction('GIVEN', selectedCustomer);
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  + Add Udhar
                </button>
                <button
                  onClick={() => {
                    setShowLedgerModal(false);
                    handleOpenTransaction('RECEIVED', selectedCustomer);
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  - Collect
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(!selectedCustomer.entries || selectedCustomer.entries.length === 0) ? (
                <p className="py-8 text-center text-xs text-slate-400">No transaction records</p>
              ) : (
                selectedCustomer.entries.map((item: any, idx: number) => {
                  const isGiven = item.entryType === 'GIVEN' || item.entry_type === 'GIVEN';
                  return (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isGiven ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          {isGiven ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {isGiven ? 'Udhar Given' : 'Payment Received'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.note || (item.billInvoice ? `Invoice ${item.billInvoice}` : 'Transaction')} ·{' '}
                            {item.date || item.created_at ? new Date(item.date || item.created_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-black ${
                          isGiven ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isGiven ? `+₹${item.amount}` : `-₹${item.amount}`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

