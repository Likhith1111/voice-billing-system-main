import { useState } from "react";
import { useLocation, Link } from "wouter";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../App";
import { apiUrl } from "../config/api";
import { registerShopkeeperOffline } from "../lib/offlineStore";
import { Store, Loader2, Sparkles } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanName = name.trim();
    const cleanStore = storeName.trim();

    try {
      const response = await axios.post(
        apiUrl("/api/register/"),
        {
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          store_name: cleanStore,
        },
        { timeout: 3500 }
      );

      if (response.data.success) {
        const offlineResult = registerShopkeeperOffline({
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          store_name: cleanStore,
        });
        const shopData = response.data.shopkeeper || offlineResult.shopkeeper || {
          id: Date.now(),
          name: cleanName,
          email: cleanEmail,
          store_name: cleanStore,
          phone: "",
        };
        login(shopData);
        toast.success(`Welcome to QBill, ${cleanName}! Your store is ready.`);
        setLocation("/");
        return;
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
        setLoading(false);
        return;
      }
      const res = registerShopkeeperOffline({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        store_name: cleanStore,
      });
      if (res.success && res.shopkeeper) {
        login(res.shopkeeper);
        toast.success(`Store created successfully! Welcome, ${cleanName}!`);
        setLocation("/");
        return;
      } else {
        toast.error(res.error || "An error occurred during registration");
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background ambient grid */}
      <div className="grid-bg" />

      {/* Registration Card */}
      <div className="auth-card" style={{ maxWidth: 460 }}>
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff7900] to-[#d75b00] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#ff7900]/25 border border-[#ffba76]/30">
            <Store className="w-7 h-7 text-white" />
          </div>
          <div className="font-display font-black text-2xl tracking-wider text-white mb-1">
            <span className="text-[#ff7900]">SMART</span>Q-BILL
          </div>
          <p className="text-[11px] text-[#899087] uppercase tracking-[1.5px] m-0">
            Register Your Store Account
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="eyebrow text-[10px] py-1.5 px-3.5">
            <Sparkles className="w-3 h-3 inline text-[#ff7900]" /> New Merchant Onboarding
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="label-sm" htmlFor="reg-name">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark"
              placeholder="e.g. Rajesh Kumar"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label className="label-sm" htmlFor="reg-email">
              Email Address
            </label>
            <input
              id="reg-email"
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
            <label className="label-sm" htmlFor="reg-store">
              Store / Business Name
            </label>
            <input
              id="reg-store"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="input-dark"
              placeholder="e.g. GreenBasket Supermarket"
              required
            />
          </div>

          <div>
            <label className="label-sm" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark"
              placeholder="Create a secure password"
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-orange w-full py-3.5 text-xs uppercase tracking-wider font-bold rounded-xl mt-3 shadow-lg shadow-[#ff7900]/25"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering store...
              </span>
            ) : (
              "Complete Setup & Launch →"
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#293329] text-center">
          <p className="text-xs text-[#899087] m-0">
            Already have a store account?{" "}
            <Link href="/login" className="text-[#ff7900] hover:text-[#ff9d42] transition-colors font-bold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
