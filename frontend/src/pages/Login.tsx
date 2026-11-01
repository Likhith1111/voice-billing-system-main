import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import axios from "axios";
import { useAuth } from "../App";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
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
        // Cache credentials in offlineStore so offline logins on this device work
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
      // Backend may be offline, port unreachable, or account created offline
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

    toast.error("Invalid email/phone or password. Please check your credentials.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 transition-transform hover:scale-[1.01] duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-400">Sign in to your Shopkeeper Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300"
              placeholder="shopkeeper@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-medium text-gray-300">
                Password
              </label>
              <span className="text-xs text-gray-500">
                Case-sensitive
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-11 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-300"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl px-4 py-3 shadow-lg shadow-indigo-500/25 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>


        </form>

        <p className="text-center text-sm text-gray-400 mt-8">
          Don't have an account?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            Register your store
          </Link>
        </p>
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <Link
            href="/admin"
            className="text-xs text-gray-500 hover:text-violet-400 transition-colors inline-flex items-center justify-center gap-1.5 font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Platform Super Admin Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

