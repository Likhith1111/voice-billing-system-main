import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { toast } from "sonner";
import axios from "axios";
import {
  User,
  Store,
  Mail,
  Phone,
  Lock,
  Save,
  Shield,
  Bell,
  Palette,
  CreditCard,
  Info,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { apiUrl } from "../config/api";
import { updateShopkeeperProfileOffline } from "../lib/offlineStore";

export default function SettingsView() {
  const { shopkeeper, login } = useAuth();

  const [formData, setFormData] = useState({
    name: shopkeeper?.name || "",
    email: shopkeeper?.email || "",
    storeName: shopkeeper?.store_name || "",
    phone: shopkeeper?.phone || "",
    address: shopkeeper?.address || "",
    password: "",
    upi_id: (shopkeeper as any)?.upi_id || "",
  });

  const [activeTab, setActiveTab] = useState("profile");

  // UPI password verification states
  const [isUpiPasswordModalOpen, setIsUpiPasswordModalOpen] = useState(false);
  const [pendingUpiId, setPendingUpiId] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if shopkeeper changes
  useEffect(() => {
    if (shopkeeper) {
      setFormData((prev) => ({
        ...prev,
        name: shopkeeper.name || "",
        email: shopkeeper.email || "",
        storeName: shopkeeper.store_name || "",
        phone: shopkeeper.phone || "",
        address: shopkeeper.address || "",
        upi_id: (shopkeeper as any)?.upi_id || "",
      }));
    }
  }, [shopkeeper]);

  const originalUpi = ((shopkeeper as any)?.upi_id || "").trim();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenUpiModal = () => {
    setPendingUpiId(formData.upi_id || originalUpi || "");
    setVerifyPassword("");
    setPasswordError("");
    setIsUpiPasswordModalOpen(true);
  };

  const handleSaveClick = async () => {
    const currentFormUpi = formData.upi_id.trim();

    // If UPI ID was changed, ask for account password
    if (currentFormUpi !== originalUpi) {
      setPendingUpiId(currentFormUpi);
      setVerifyPassword("");
      setPasswordError("");
      setIsUpiPasswordModalOpen(true);
      return;
    }

    // Normal save without UPI change
    await executeSave();
  };

  const handleConfirmUpiSave = async () => {
    if (!verifyPassword.trim()) {
      setPasswordError("Please enter your account password");
      return;
    }
    if (!pendingUpiId.trim()) {
      setPasswordError("Please enter a valid UPI ID");
      return;
    }

    await executeSave(pendingUpiId.trim(), verifyPassword.trim());
  };

  const executeSave = async (newUpi?: string, verifyPwd?: string) => {
    setIsSaving(true);
    setPasswordError("");

    const upiToSave = newUpi !== undefined ? newUpi : formData.upi_id.trim();

    const payload: any = {
      current_email: shopkeeper?.email || formData.email,
      store_name: formData.storeName,
      ...formData,
      upi_id: upiToSave,
    };

    if (verifyPwd) {
      payload.verify_password = verifyPwd;
    }

    try {
      const res = await axios.post(apiUrl("/api/update-profile/"), payload, { timeout: 3000 });

      if (res.data.success) {
        login(res.data.shopkeeper);
        updateShopkeeperProfileOffline(res.data.shopkeeper);

        toast.success("Settings saved successfully!", {
          description: "Your changes have been applied to your account.",
        });

        setFormData((prev) => ({
          ...prev,
          password: "",
          upi_id: res.data.shopkeeper.upi_id || upiToSave,
        }));
        setIsUpiPasswordModalOpen(false);
        setVerifyPassword("");
        setPasswordError("");
      } else {
        const errMsg = res.data.error || "Failed to update settings";
        toast.error(errMsg);
        setPasswordError(errMsg);
      }
    } catch (err: any) {
      // Backend returned validation error (e.g., incorrect password)
      if (err.response?.data?.error) {
        const errMsg = err.response.data.error;
        toast.error(errMsg);
        setPasswordError(errMsg);
        setIsSaving(false);
        return;
      }

      // Backend unreachable: fallback to offline store
      console.warn("Backend profile update unavailable, saving offline:", err);
      try {
        const updated = updateShopkeeperProfileOffline(payload);
        login(updated);
        toast.success("Settings saved successfully!", {
          description: "Your changes have been applied to your account.",
        });
        setFormData((prev) => ({
          ...prev,
          password: "",
          upi_id: updated.upi_id || upiToSave,
        }));
        setIsUpiPasswordModalOpen(false);
        setVerifyPassword("");
        setPasswordError("");
      } catch (offlineErr: any) {
        const errMsg = offlineErr.message || "Failed to update profile";
        toast.error(errMsg);
        setPasswordError(errMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-950 sm:text-[34px]">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your account, store details, and preferences.</p>
        </div>
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "profile" ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <User className="h-4 w-4" /> Profile Details
          </button>
          <button
            onClick={() => setActiveTab("store")}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "store" ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Store className="h-4 w-4" /> Store Settings
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "security" ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Shield className="h-4 w-4" /> Security
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "preferences" ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Palette className="h-4 w-4" /> Preferences
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-8">
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                <p className="mt-1 text-sm text-slate-500">Update your personal details and contact info.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "store" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-lg font-bold text-slate-900">Store Settings</h2>
                <p className="mt-1 text-sm text-slate-500">Update the name and details of your business.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Store Name</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="storeName"
                      value={formData.storeName}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
                      placeholder="My Awesome Store"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Store Address (Optional)</label>
                  <textarea
                    name="address"
                    value={formData.address || ""}
                    onChange={handleChange}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
                    placeholder="Enter store address..."
                    rows={3}
                  ></textarea>
                </div>

                {/* UPI ID Section */}
                <div className="space-y-3 sm:col-span-2 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">UPI ID for Customer Payments</label>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/80">
                          <ShieldCheck className="h-3 w-3" /> Password Protected
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">Payments via QR code on bills are received at this UPI handle.</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenUpiModal}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition shrink-0"
                    >
                      <Lock className="h-3.5 w-3.5" /> Change UPI ID
                    </button>
                  </div>

                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="upi_id"
                      value={formData.upi_id}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-mono font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100/70"
                      placeholder="e.g. yourstore@upi or 9876543210@paytm"
                    />
                  </div>

                  {formData.upi_id.trim() !== originalUpi && (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 text-xs text-amber-800 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>UPI ID modified. You will be prompted to enter your account password to confirm.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, upi_id: originalUpi }))}
                        className="font-bold text-amber-900 hover:underline shrink-0"
                      >
                        Reset
                      </button>
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-xl bg-indigo-50/80 p-3 text-xs text-indigo-700 border border-indigo-100">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>This UPI ID generates the payment QR code shown on the screen and invoices. Customers can scan with GPay, PhonePe, Paytm, or BHIM.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-lg font-bold text-slate-900">Security</h2>
                <p className="mt-1 text-sm text-slate-500">Update your password to keep your account secure.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <button
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-lg font-bold text-slate-900">App Preferences</h2>
                <p className="mt-1 text-sm text-slate-500">Customize how the dashboard looks and behaves.</p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Email Notifications</p>
                      <p className="text-xs text-slate-500">Receive daily summary reports</p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" defaultChecked />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:border-gray-600 dark:bg-gray-700"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UPI Password Verification Modal */}
      {isUpiPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsUpiPasswordModalOpen(false);
                setVerifyPassword("");
                setPasswordError("");
              }}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirm UPI ID Change</h3>
                <p className="text-xs text-slate-500">Security verification required</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 text-xs text-amber-800 leading-relaxed">
              Changing your UPI ID affects where customer digital payments go. To protect your earnings from unauthorized changes, please confirm your account password.
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">New UPI ID</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pendingUpiId}
                    onChange={(e) => setPendingUpiId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-mono font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    placeholder="e.g. yourstore@upi"
                  />
                </div>
                {originalUpi && (
                  <p className="text-[11px] text-slate-400">
                    Current: <span className="font-mono font-semibold text-slate-600">{originalUpi}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Account Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showVerifyPassword ? "text" : "password"}
                    value={verifyPassword}
                    onChange={(e) => {
                      setVerifyPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmUpiSave();
                    }}
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    placeholder="Enter your account password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showVerifyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 animate-in fade-in duration-150">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {passwordError}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsUpiPasswordModalOpen(false);
                  setVerifyPassword("");
                  setPasswordError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpiSave}
                disabled={isSaving || !verifyPassword.trim()}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-50 transition"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
