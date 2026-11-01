import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import axios from "axios";
import { useAuth } from "../App";
import { toast } from "sonner";
import { Eye, EyeOff, Mic2, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { apiUrl } from "../config/api";
import { loginShopkeeperOffline, registerShopkeeperOffline } from "../lib/offlineStore";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      const response = await axios.post(
        apiUrl("/api/login/"),
        {
          email: cleanEmail,
          password: cleanPassword,
        },
        { timeout: 3500 }
      );

      if (response.data.success && response.data.shopkeeper) {
        registerShopkeeperOffline({
          name: response.data.shopkeeper.name,
          email: response.data.shopkeeper.email,
          password: cleanPassword,
          store_name: response.data.shopkeeper.store_name,
        });
        login(response.data.shopkeeper);
        toast.success(`Welcome back, ${response.data.shopkeeper.name}!`);
        setLocation("/");
        return;
      }
    } catch (error: any) {
      console.warn("Backend login failed, checking offline store:", error);
    }

    // Fallback: Check offline store
    const res = loginShopkeeperOffline(cleanEmail, cleanPassword);
    if (res.success && res.shopkeeper) {
      login(res.shopkeeper);
      toast.success(`Welcome back, ${res.shopkeeper.name}!`);
      setLocation("/");
      return;
    }

    toast.error("Invalid email or password. Please verify your credentials.");
    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* Background ambient grid */}
      <div className="grid-bg" />

      {/* Login Card */}
      <div className="auth-card">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff7900] to-[#d75b00] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#ff7900]/25 border border-[#ffba76]/30">
            <Mic2 className="w-7 h-7 text-white" />
          </div>
          <div className="font-display font-black text-2xl tracking-wider text-white mb-1">
            <span className="text-[#ff7900]">SMART</span>Q-BILL
          </div>
          <p className="text-[11px] text-[#899087] uppercase tracking-[1.5px] m-0">
            AI-Driven Voice Billing &amp; Retail POS
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="eyebrow text-[10px] py-1.5 px-3.5">
            <Sparkles className="w-3 h-3 inline text-[#ff7900]" /> Cashier &amp; Shopkeeper Access
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-sm" htmlFor="login-email">
              Email Address / ID
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark"
              placeholder="shopkeeper@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label-sm mb-0" htmlFor="login-password">
                Password
              </label>
              <span className="text-[10px] text-[#60675f]">Case-sensitive</span>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark pr-11"
                placeholder="Enter your account password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#60675f] hover:text-[#ff7900] transition-colors p-1"
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-orange w-full py-3.5 text-xs uppercase tracking-wider font-bold rounded-xl mt-2 shadow-lg shadow-[#ff7900]/25"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Access Terminal →"
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#293329] text-center space-y-3">
          <p className="text-xs text-[#899087] m-0">
            Don't have an account?{" "}
            <Link href="/register" className="text-[#ff7900] hover:text-[#ff9d42] transition-colors font-bold">
              Register store
            </Link>
          </p>

          <div>
            <Link
              href="/admin"
              className="text-[11px] text-[#60675f] hover:text-[#a6ad9f] transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff7900]/70" />
              Platform Super Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
