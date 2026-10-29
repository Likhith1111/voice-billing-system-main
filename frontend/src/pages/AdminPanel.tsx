import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLocation, Link } from "wouter";
import { apiUrl } from "../config/api";
import { toast } from "sonner";
import {
  ShieldCheck,
  Store,
  Users,
  FileText,
  IndianRupee,
  Package,
  Search,
  RefreshCw,
  LogOut,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Trash2,
  X,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Download,
  Activity,
  Layers,
  ArrowUpRight,
  UserCheck
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useAuth } from "../App";

interface Shopkeeper {
  id: number;
  name: string;
  store_name: string;
  email: string;
  phone: string;
  address: string;
  upi_id: string;
  created_at: string;
  created_at_formatted: string;
  bills_count: number;
  total_revenue: number;
  formatted_revenue: string;
  products_count: number;
  customers_count: number;
  last_active: string;
  status: "Active" | "Catalog Ready" | "New Store";
}

interface PlatformSummary {
  total_shops: number;
  active_shops: number;
  total_platform_revenue: number;
  formatted_platform_revenue: string;
  total_bills: number;
  total_products: number;
  total_customers: number;
  today_revenue: number;
  formatted_today_revenue: string;
  today_bills_count: number;
}

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { login: switchShopkeeperAuth } = useAuth();

  // Admin auth state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem("qbill_admin_token");
  });
  const [adminUser, setAdminUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("qbill_admin_user") || "null");
    } catch {
      return null;
    }
  });

  // Login form state
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"overview" | "shops" | "activity">("shops");
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [shops, setShops] = useState<Shopkeeper[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topShops, setTopShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "revenue" | "bills" | "name">("newest");

  // Shop inspection modal
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [selectedShopDetail, setSelectedShopDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"bills" | "products" | "customers">("bills");

  // Delete confirmation modal
  const [shopToDelete, setShopToDelete] = useState<Shopkeeper | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- Handlers: Admin Login / Logout ---
  const OFFLINE_ADMIN_CREDENTIALS = [
    { username: "admin", password: "admin123" },
    { username: "admin@example.com", password: "admin123" },
    { username: "admin@qbill.com", password: "admin123" },
  ];

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const uname = loginUsername.trim();
    const pwd = loginPassword.trim();

    // 1. Try backend authentication first
    try {
      const res = await axios.post(apiUrl("/api/admin/login/"), {
        username: uname,
        password: pwd,
      }, { timeout: 4000 });

      if (res.data.success) {
        localStorage.setItem("qbill_admin_token", res.data.token);
        localStorage.setItem("qbill_admin_user", JSON.stringify(res.data.admin));
        setAdminUser(res.data.admin);
        setIsAdminAuthenticated(true);
        toast.success("Welcome, Super Administrator!");
        setLoginLoading(false);
        return;
      }

      // Backend responded but rejected credentials
      toast.error(res.data?.error || "Invalid admin credentials.");
      setLoginLoading(false);
      return;

    } catch (err: any) {
      // Network/connection error — backend may not be running
      const isNetworkError = !err.response;
      const backendError = err.response?.data?.error;

      if (!isNetworkError && backendError) {
        // Backend replied with an explicit rejection
        toast.error(backendError);
        setLoginLoading(false);
        return;
      }

      // 2. Offline fallback: match against known admin credentials
      const matched = OFFLINE_ADMIN_CREDENTIALS.some(
        (c) => c.username === uname && c.password === pwd
      );

      if (matched) {
        const offlineAdmin = {
          id: 0,
          username: "admin",
          email: "admin@qbill.com",
          is_staff: true,
          is_superuser: true,
          role: "Super Administrator (Offline Mode)",
        };
        const offlineToken = `offline_admin_${Date.now()}`;
        localStorage.setItem("qbill_admin_token", offlineToken);
        localStorage.setItem("qbill_admin_user", JSON.stringify(offlineAdmin));
        setAdminUser(offlineAdmin);
        setIsAdminAuthenticated(true);
        toast.success("Logged in (offline mode — backend unreachable)");
      } else {
        toast.error(
          isNetworkError
            ? "Backend not running. Use admin / admin123 to enter offline mode."
            : "Invalid admin credentials. Use admin / admin123"
        );
      }
    }

    setLoginLoading(false);
  };


  const handleAdminLogout = () => {
    localStorage.removeItem("qbill_admin_token");
    localStorage.removeItem("qbill_admin_user");
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    toast.info("Logged out from Admin Panel");
  };

  // --- Fetch Admin Data ---
  const fetchAdminData = async () => {
    if (!isAdminAuthenticated) return;
    try {
      setRefreshing(true);
      const [overviewRes, shopsRes] = await Promise.all([
        axios.get(apiUrl("/api/admin/overview/"), { timeout: 5000 }),
        axios.get(apiUrl("/api/admin/shops/"), { timeout: 5000 }),
      ]);

      if (overviewRes.data.success) {
        setSummary(overviewRes.data.summary);
        setTopShops(overviewRes.data.top_shops || []);
        setRecentActivity(overviewRes.data.recent_activity || []);
      }

      if (shopsRes.data.success) {
        setShops(shopsRes.data.shops || []);
      }
    } catch (err: any) {
      const isOffline = !err.response;
      if (isOffline) {
        // Backend not running — show empty state with a helpful banner (no toast spam)
        console.warn("Admin: Backend unreachable, showing offline state.");
        setSummary(null);
        setShops([]);
        setTopShops([]);
        setRecentActivity([]);
      } else {
        toast.error("Error fetching platform data from server.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchAdminData();
    }
  }, [isAdminAuthenticated]);

  // --- Inspect Specific Shop ---
  const handleInspectShop = async (shopId: number) => {
    setSelectedShopId(shopId);
    setDetailLoading(true);
    try {
      const res = await axios.get(apiUrl(`/api/admin/shops/${shopId}/`));
      if (res.data.success) {
        setSelectedShopDetail(res.data.shop);
      }
    } catch (err) {
      toast.error("Could not load shop details.");
      setSelectedShopId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // --- Delete Shop ---
  const confirmDeleteShop = async () => {
    if (!shopToDelete) return;
    setDeleting(true);
    try {
      const res = await axios.delete(apiUrl(`/api/admin/shops/${shopToDelete.id}/delete/`));
      if (res.data.success) {
        toast.success(res.data.message || "Store removed successfully");
        setShops((prev) => prev.filter((s) => s.id !== shopToDelete.id));
        setShopToDelete(null);
        if (selectedShopId === shopToDelete.id) {
          setSelectedShopId(null);
          setSelectedShopDetail(null);
        }
        fetchAdminData();
      }
    } catch (err) {
      toast.error("Failed to delete store.");
    } finally {
      setDeleting(false);
    }
  };

  // --- Impersonate / Switch to Shopkeeper View ---
  const handleImpersonateShop = (shop: Shopkeeper | any) => {
    switchShopkeeperAuth({
      id: shop.id,
      name: shop.name,
      store_name: shop.store_name,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      upi_id: shop.upi_id,
    });
    toast.success(`Switched to ${shop.store_name} POS view!`);
    setLocation("/");
  };

  // --- Export CSV of Registered Shops ---
  const handleExportCSV = () => {
    if (shops.length === 0) {
      toast.error("No registered shops to export");
      return;
    }
    const headers = [
      "ID",
      "Store Name",
      "Owner Name",
      "Email",
      "Phone",
      "Address",
      "UPI ID",
      "Registered Date",
      "Total Bills",
      "Total Revenue (INR)",
      "Products Count",
      "Customers Count",
      "Status",
    ];
    const rows = filteredShops.map((s) => [
      s.id,
      `"${s.store_name.replace(/"/g, '""')}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      s.email,
      s.phone || "N/A",
      `"${(s.address || "").replace(/"/g, '""')}"`,
      s.upi_id || "N/A",
      s.created_at_formatted,
      s.bills_count,
      s.total_revenue,
      s.products_count,
      s.customers_count,
      s.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `registered_shops_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Shops list exported to CSV!");
  };

  // --- Filter and Sort Shops ---
  const filteredShops = useMemo(() => {
    return shops
      .filter((s) => {
        const matchesSearch =
          s.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.phone && s.phone.includes(searchQuery)) ||
          (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;
        if (statusFilter === "active") return s.bills_count > 0;
        if (statusFilter === "catalog") return s.products_count > 0 && s.bills_count === 0;
        if (statusFilter === "new") return s.bills_count === 0 && s.products_count === 0;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "revenue") return b.total_revenue - a.total_revenue;
        if (sortBy === "bills") return b.bills_count - a.bills_count;
        if (sortBy === "name") return a.store_name.localeCompare(b.store_name);
        return b.id - a.id; // newest first
      });
  }, [shops, searchQuery, statusFilter, sortBy]);

  // Chart data for revenue across top shops
  const chartData = useMemo(() => {
    return shops.slice(0, 6).map((s) => ({
      name: s.store_name.length > 12 ? s.store_name.slice(0, 12) + "…" : s.store_name,
      revenue: s.total_revenue,
      bills: s.bills_count,
    }));
  }, [shops]);

  // ==========================================
  // RENDER: Admin Login Form if not logged in
  // ==========================================
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Glowing Orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-violet-600/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-9 shadow-2xl relative z-10">
          <div className="text-center mb-7">
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/25 ring-8 ring-white/5">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-bold tracking-wider uppercase mb-2">
              <Sparkles className="w-3 h-3" /> Platform Supervisor Access
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Super Admin Portal</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Monitor registered shops, live store activities, sales, and platform metrics.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Username or Email
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-11 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Pre-fill helper */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Default credentials:</span>
              <button
                type="button"
                onClick={() => {
                  setLoginUsername("admin");
                  setLoginPassword("admin123");
                  toast.info("Filled: admin / admin123");
                }}
                className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-2"
              >
                Use admin / admin123
              </button>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl py-3 text-sm shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loginLoading ? "Verifying Access..." : "Enter Admin Portal →"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <Store className="w-3.5 h-3.5" /> Return to Shopkeeper POS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Super Admin Portal Main Dashboard
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-500 selection:text-white">
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 ring-2 ring-violet-400/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">QBill Platform Admin</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Monitor
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Platform Supervisor & Shopkeeper Activity Dashboard
            </p>
          </div>
        </div>

        {/* Global Stats Ribbon (Desktop) */}
        <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 text-xs">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-violet-400" />
            <span className="text-slate-400">Total Shops:</span>
            <span className="font-bold text-white text-sm">{summary?.total_shops ?? shops.length}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Gross Sales:</span>
            <span className="font-bold text-emerald-400 text-sm">
              {summary?.formatted_platform_revenue ?? "₹0"}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-400">Total Invoices:</span>
            <span className="font-bold text-white text-sm">{summary?.total_bills ?? 0}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchAdminData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition active:scale-95"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-violet-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shopkeeper POS</span>
          </Link>

          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-400 transition"
            title="Log Out Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start">
            <button
              onClick={() => setActiveTab("shops")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "shops"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Registered Shops</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
                {shops.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Platform Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "activity"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Live Invoices Stream</span>
            </button>
          </div>

          {/* Quick Actions (Export, Timestamp) */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition"
            >
              <Download className="w-3.5 h-3.5 text-violet-400" /> Export CSV
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* TAB 1: REGISTERED SHOPS DIRECTORY & MONITOR */}
        {/* ========================================== */}
        {activeTab === "shops" && (
          <div className="space-y-6">
            {/* Top KPI Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-violet-900/30 to-slate-900 border border-violet-500/20 p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
                    Total Registered Shops
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-300">
                    <Store className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white">{shops.length}</span>
                  <span className="text-xs text-emerald-400 font-semibold">Stores Live</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">All registered kirana and retail stores</p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-emerald-900/30 to-slate-900 border border-emerald-500/20 p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Active Billing Stores
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                    {shops.filter((s) => s.bills_count > 0).length}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">of {shops.length}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Generated invoices & processed bills</p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-indigo-900/30 to-slate-900 border border-indigo-500/20 p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    Platform Gross Sales
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white">
                    {summary?.formatted_platform_revenue || "₹0"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Cumulative sales across all stores</p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-amber-900/30 to-slate-900 border border-amber-500/20 p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Total Invoices Generated
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-amber-300">
                    {summary?.total_bills || shops.reduce((acc, s) => acc + s.bills_count, 0)}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">Invoices</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Via Voice, Image & Barcode billing</p>
              </div>
            </div>

            {/* Search, Filter & Controls Bar */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by store name, owner, phone, email…"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                  {[
                    { label: "All Stores", key: "all" },
                    { label: "Active", key: "active" },
                    { label: "Catalog Ready", key: "catalog" },
                    { label: "New", key: "new" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        statusFilter === f.key
                          ? "bg-violet-600 text-white font-bold shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="newest">Sort: Newest Registered</option>
                  <option value="revenue">Sort: Highest Revenue</option>
                  <option value="bills">Sort: Most Bills</option>
                  <option value="name">Sort: Store Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Registered Shops Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-violet-400" />
                    <span>Registered Stores Directory</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                      Showing {filteredShops.length} of {shops.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click any store to inspect detailed bills, products catalog, and shopkeeper activity.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-violet-400" />
                  <span>Loading registered shops...</span>
                </div>
              ) : filteredShops.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <Store className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-300">No shops match your search</p>
                  <p className="text-slate-500 mt-1">Try clearing filters or search query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3.5">Store / Business</th>
                        <th className="px-4 py-3.5">Shopkeeper Owner</th>
                        <th className="px-4 py-3.5">Contact Details</th>
                        <th className="px-4 py-3.5">Registered On</th>
                        <th className="px-4 py-3.5 text-right">Invoices</th>
                        <th className="px-4 py-3.5 text-right">Total Revenue</th>
                        <th className="px-4 py-3.5 text-center">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredShops.map((shop) => (
                        <tr
                          key={shop.id}
                          className="hover:bg-slate-800/40 transition group cursor-pointer"
                          onClick={() => handleInspectShop(shop.id)}
                        >
                          {/* Store Name & Avatar */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600/30 to-indigo-600/30 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-sm shrink-0">
                                {shop.store_name ? shop.store_name[0].toUpperCase() : "S"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-100 text-sm group-hover:text-violet-300 transition truncate">
                                  {shop.store_name}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>{shop.address || "Location not set"}</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Shopkeeper Name */}
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-200">{shop.name}</p>
                            {shop.upi_id && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                                <CreditCard className="w-3 h-3 text-emerald-400" />
                                <span>{shop.upi_id}</span>
                              </p>
                            )}
                          </td>

                          {/* Contact */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <a
                                href={`mailto:${shop.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-slate-300 hover:text-violet-300 transition"
                              >
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[150px]">{shop.email}</span>
                              </a>
                              {shop.phone && (
                                <a
                                  href={`tel:${shop.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-300 transition"
                                >
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>{shop.phone}</span>
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Registered On */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-slate-300 font-medium">{shop.created_at_formatted}</span>
                            <p className="text-[10px] text-slate-500 mt-0.5">Last active: {shop.last_active}</p>
                          </td>

                          {/* Invoices Count */}
                          <td className="px-4 py-4 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold">
                              <FileText className="w-3 h-3 text-indigo-400" />
                              {shop.bills_count}
                            </span>
                          </td>

                          {/* Total Revenue */}
                          <td className="px-4 py-4 text-right">
                            <span className="font-bold text-sm text-emerald-400">
                              {shop.formatted_revenue}
                            </span>
                            <p className="text-[10px] text-slate-500">
                              {shop.products_count} products
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                shop.status === "Active"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : shop.status === "Catalog Ready"
                                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                                  : "bg-slate-700/50 text-slate-400 border border-slate-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  shop.status === "Active"
                                    ? "bg-emerald-400"
                                    : shop.status === "Catalog Ready"
                                    ? "bg-indigo-400"
                                    : "bg-slate-400"
                                }`}
                              />
                              {shop.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleInspectShop(shop.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 text-[11px] font-semibold transition"
                                title="Inspect Activity"
                              >
                                Inspect
                              </button>

                              <button
                                onClick={() => handleImpersonateShop(shop)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition"
                                title="Launch Store POS"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setShopToDelete(shop)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 transition"
                                title="Delete Store"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: PLATFORM ANALYTICS OVERVIEW */}
        {/* ========================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Shop Bar Chart */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-white">Store Revenue Distribution</h3>
                    <p className="text-[11px] text-slate-400">Comparing gross sales across top registered stores</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Live Data
                  </span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" />
                      <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Sales"]}
                      />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Performing Stores Leaderboard */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-white">Top Performing Stores</h3>
                      <p className="text-[11px] text-slate-400">Stores ranked by transaction volume & billing</p>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="space-y-3">
                    {topShops.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-10">No store sales recorded yet.</p>
                    ) : (
                      topShops.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-xs text-white">{s.store_name}</p>
                              <p className="text-[10px] text-slate-400">Owner: {s.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-xs text-emerald-400">{s.formatted_revenue}</p>
                            <p className="text-[10px] text-slate-400">{s.bills_count} bills generated</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-right">
                  <button
                    onClick={() => setActiveTab("shops")}
                    className="text-xs font-bold text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
                  >
                    View All Registered Stores <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Platform Metrics Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Products Hosted</span>
                <p className="text-2xl font-black text-white mt-1">{summary?.total_products ?? 0}</p>
                <p className="text-[10px] text-slate-500 mt-1">Across all store inventories</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Registered Customers</span>
                <p className="text-2xl font-black text-white mt-1">{summary?.total_customers ?? 0}</p>
                <p className="text-[10px] text-slate-500 mt-1">Direct store patrons</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Today's Invoices</span>
                <p className="text-2xl font-black text-indigo-400 mt-1">{summary?.today_bills_count ?? 0}</p>
                <p className="text-[10px] text-slate-500 mt-1">Bills created today</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Today's Platform Revenue</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {summary?.formatted_today_revenue ?? "₹0"}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Sales volume today</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: LIVE BILLING ACTIVITY STREAM */}
        {/* ========================================== */}
        {activeTab === "activity" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Invoicing Activity Feed</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Live stream of bills generated across all registered shops
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {recentActivity.length} recent transactions
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <span>No live transactions recorded yet.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                        ₹
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{item.invoice}</span>
                          <span className="text-slate-400 text-xs">for {item.customer}</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[10px] font-semibold">
                            {item.payment_mode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Store className="w-3 h-3 text-violet-400" />
                          <span className="font-semibold text-slate-300">{item.store_name}</span>
                          <span className="text-slate-500">({item.shopkeeper_name})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between text-right">
                      <span className="font-bold text-sm text-emerald-400">{item.amount}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL: SHOP DEEP-DIVE INSPECTION DRAWER */}
      {/* ========================================== */}
      {selectedShopId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
              {detailLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                  <span>Loading store details...</span>
                </div>
              ) : selectedShopDetail ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/20">
                    {selectedShopDetail.store_name ? selectedShopDetail.store_name[0].toUpperCase() : "S"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">{selectedShopDetail.store_name}</h2>
                      <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                        Store #{selectedShopDetail.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Owner: <span className="text-slate-200 font-semibold">{selectedShopDetail.name}</span> •{" "}
                      {selectedShopDetail.email}
                    </p>
                  </div>
                </div>
              ) : null}

              <button
                onClick={() => {
                  setSelectedShopId(null);
                  setSelectedShopDetail(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {selectedShopDetail && (
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
                {/* Store Profile Info Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Invoices</span>
                    <p className="text-xl font-black text-white mt-1">
                      {selectedShopDetail.stats?.total_bills ?? 0}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase text-emerald-400">Total Revenue</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">
                      {selectedShopDetail.stats?.formatted_revenue ?? "₹0"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase text-indigo-400">Catalog Products</span>
                    <p className="text-xl font-black text-white mt-1">
                      {selectedShopDetail.stats?.total_products ?? 0}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase text-amber-400">Customers</span>
                    <p className="text-xl font-black text-white mt-1">
                      {selectedShopDetail.stats?.total_customers ?? 0}
                    </p>
                  </div>
                </div>

                {/* Store Contact & Setup Meta */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Phone Number</span>
                    <span className="text-slate-200 font-semibold">{selectedShopDetail.phone || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">UPI ID</span>
                    <span className="text-emerald-400 font-mono font-semibold">
                      {selectedShopDetail.upi_id || "Not configured"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Store Address</span>
                    <span className="text-slate-200 font-medium">{selectedShopDetail.address || "Not set"}</span>
                  </div>
                </div>

                {/* Sub-tabs for Invoices, Products, Customers */}
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <button
                      onClick={() => setDetailTab("bills")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        detailTab === "bills" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Invoices & Bills ({selectedShopDetail.recent_bills?.length || 0})
                    </button>
                    <button
                      onClick={() => setDetailTab("products")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        detailTab === "products" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Catalog Products ({selectedShopDetail.products?.length || 0})
                    </button>
                    <button
                      onClick={() => setDetailTab("customers")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        detailTab === "customers" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Customers Directory ({selectedShopDetail.customers?.length || 0})
                    </button>
                  </div>

                  {/* Bills Sub-tab */}
                  {detailTab === "bills" && (
                    <div className="mt-3">
                      {selectedShopDetail.recent_bills?.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-500">
                          This shopkeeper has not generated any bills yet.
                        </p>
                      ) : (
                        <div className="overflow-x-auto max-h-60 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                                <th className="py-2">Invoice #</th>
                                <th className="py-2">Customer</th>
                                <th className="py-2">Payment Mode</th>
                                <th className="py-2">Time</th>
                                <th className="py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {selectedShopDetail.recent_bills?.map((b: any) => (
                                <tr key={b.invoice || b.id}>
                                  <td className="py-2 font-bold text-slate-200">{b.invoice}</td>
                                  <td className="py-2 text-slate-300">{b.customer}</td>
                                  <td className="py-2">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                                      {b.payment_mode || "Cash"}
                                    </span>
                                  </td>
                                  <td className="py-2 text-slate-400 text-[11px]">{b.created_at_formatted || b.time}</td>
                                  <td className="py-2 text-right font-bold text-emerald-400">{b.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Products Sub-tab */}
                  {detailTab === "products" && (
                    <div className="mt-3">
                      {selectedShopDetail.products?.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-500">No products in catalog yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {selectedShopDetail.products?.map((p: any) => (
                            <div
                              key={p.id}
                              className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-xs text-white">{p.name}</p>
                                <p className="text-[10px] text-slate-400">
                                  {p.barcode ? `Barcode: ${p.barcode}` : "No barcode"}
                                </p>
                              </div>
                              <span className="font-bold text-xs text-violet-300">{p.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customers Sub-tab */}
                  {detailTab === "customers" && (
                    <div className="mt-3">
                      {selectedShopDetail.customers?.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-500">No saved customers yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {selectedShopDetail.customers?.map((c: any) => (
                            <div
                              key={c.id}
                              className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40 flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 font-bold text-xs flex items-center justify-center">
                                {c.initials || "CU"}
                              </div>
                              <div>
                                <p className="font-semibold text-xs text-white">{c.name}</p>
                                <p className="text-[10px] text-slate-400">{c.phone}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            {selectedShopDetail && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
                <button
                  onClick={() => {
                    handleImpersonateShop(selectedShopDetail);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Launch {selectedShopDetail.store_name} POS
                </button>

                <button
                  onClick={() => {
                    setSelectedShopId(null);
                    setSelectedShopDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================== */}
      {shopToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Registered Store?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to delete <span className="font-bold text-white">{shopToDelete.store_name}</span>{" "}
                (Owner: {shopToDelete.name})? This will delete all associated products, bills, and customer records.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShopToDelete(null)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteShop}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete Store"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
