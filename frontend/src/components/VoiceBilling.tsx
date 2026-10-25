import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Mic2, Square, Loader2, Sparkles, CheckCircle2, AlertCircle, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { useAuth } from "../App";
import UpiPaymentModal from "./UpiPaymentModal";
import PaymentModeModal, { type PaymentMode } from "./PaymentModeModal";
import { apiUrl } from "../config/api";
import { parseVoiceBillLocally, addStoreBill, getStoreCustomers, addStoreCustomer } from "../lib/offlineStore";

export default function VoiceBilling() {
  const { shopkeeper } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [billingData, setBillingData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef("");
  const isManuallyStoppedRef = useRef(false);

  // Billing & WhatsApp State
  const [showPreview, setShowPreview] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [billCustomerName, setBillCustomerName] = useState("");

  // Payment Mode & UPI State
  const [showPaymentModeModal, setShowPaymentModeModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<any>(null);

  const [lang, setLang] = useState("en-IN");
  const isRecordingRef = useRef(false);

  // Clean cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const requestMicPermission = async () => {
    // In Android Chrome, holding a getUserMedia stream locks the microphone hardware
    // and causes Google Speech Recognition to fail with:
    // "Speech Recognition and Synthesis from Google cannot record now as Chrome is recording."
    // To prevent this conflict, we immediately close any test audio stream, allowing
    // SpeechRecognition exclusive access to the microphone.
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        // Short pause to guarantee OS audio session release
        await new Promise(r => setTimeout(r, 150));
      }
      setError("");
      return true;
    } catch (err: any) {
      console.warn("Microphone permission check:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Please allow microphone in your browser URL settings.");
        return false;
      }
      return true;
    }
  };

  const startRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser does not support Speech Recognition. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    const hasPerm = await requestMicPermission();
    if (!hasPerm) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsRecording(true);
      isRecordingRef.current = true;
      setError("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let newFinals = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newFinals += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (newFinals) {
        accumulatedTranscriptRef.current += newFinals;
      }

      setTranscript((accumulatedTranscriptRef.current + interim).trim());
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition notice:", event.error);
      if (event.error === "no-speech") {
        // Silence pause in Chrome, do not kill recording
        return;
      }
      if (event.error === "not-allowed") {
        setError("Microphone access was denied. Please click the lock icon in your browser URL bar and allow Microphone.");
        setIsRecording(false);
        isRecordingRef.current = false;
        return;
      }
      if (event.error === "network") {
        setError("Speech network connection issue. You can still type items or click quick sample items below.");
        setIsRecording(false);
        isRecordingRef.current = false;
        return;
      }
    };

    recognition.onend = () => {
      if (!isManuallyStoppedRef.current && isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      } else {
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    recognitionRef.current = recognition;
    isManuallyStoppedRef.current = false;
    isRecordingRef.current = true;
    setTranscript("");
    accumulatedTranscriptRef.current = "";
    setError("");

    try {
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      try {
        recognition.abort();
        setTimeout(() => recognition.start(), 200);
      } catch (e) {}
    }
  };

  const stopRecording = () => {
    isManuallyStoppedRef.current = true;
    isRecordingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }

    // Auto-process speech immediately on Stop
    setTimeout(() => {
      const captured = accumulatedTranscriptRef.current.trim() || transcript.trim();
      if (captured) {
        processBillWithText(captured);
      }
    }, 350);
  };

  const processBillWithText = async (customText?: string) => {
    const textToProcess = (customText || transcript).trim();
    if (!textToProcess) {
      toast.error("No speech detected. Please speak or type items.");
      return;
    }
    setProcessing(true);
    setError("");

    // 1. Try backend NLP parser first (if server is reachable)
    try {
      const response = await axios.post(
        apiUrl("/api/voice-billing/"),
        {
          text: textToProcess,
          shopkeeper_email: shopkeeper?.email,
        },
        { timeout: 2500 }
      );

      if (response.data && response.data.success) {
        setBillingData(response.data);
        setItems(
          response.data.items.map((i: any) => ({
            ...i,
            quantity: i.quantity || 1,
            unit_price: i.unit_price || 0,
          }))
        );
        toast.success("Bill processed successfully!");
        setProcessing(false);
        return;
      }
    } catch (err: any) {
      console.warn("Backend voice billing unreachable, using offline voice parser:", err);
    }

    // 2. Offline Smart Voice Parser fallback (works 100% offline & on mobile)
    try {
      const localResult = parseVoiceBillLocally(textToProcess, shopkeeper?.email);
      if (localResult && localResult.items.length > 0) {
        setBillingData(localResult);
        setItems(
          localResult.items.map((i: any) => ({
            ...i,
            quantity: i.quantity || 1,
            unit_price: i.unit_price || 0,
          }))
        );
        toast.success("Voice recognized and matched with store catalog!");
      } else {
        setError("Could not identify the product and price. Please speak or type again.");
      }
    } catch (localErr) {
      console.error("Local parsing error:", localErr);
      setError("Could not identify the product and price. Please speak or type again.");
    } finally {
      setProcessing(false);
    }
  };

  const processBill = () => processBillWithText();

  const handleClear = () => {
      setTranscript("");
      setBillingData(null);
      setItems([]);
      setBillCustomerName("");
  };

  const handleItemChange = (index: number, field: string, value: number) => {
      const updatedItems = [...items];
      updatedItems[index][field] = value;
      setItems(updatedItems);
  };

  const calculateGrandTotal = () => {
      return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const sendToWhatsApp = () => {
      const grandTotal = calculateGrandTotal();
      if (grandTotal <= 0) {
          toast.error("Please add prices to the products before sending.");
          return;
      }
      
      axios.get(apiUrl("/api/customers/"), {
          params: { shopkeeper_email: shopkeeper?.email },
          timeout: 2500,
      })
          .then(res => setCustomers(res.data))
          .catch(() => setCustomers(getStoreCustomers(shopkeeper?.email)));
          
      setShowWhatsAppModal(true);
  };

  const handleSendWhatsAppMessage = async () => {
      let phone = "";
      if (selectedCustomer) {
          phone = selectedCustomer.phone;
      } else if (newCustomerPhone) {
          phone = newCustomerPhone;
          if (newCustomerName) {
              try {
                  await axios.post(apiUrl("/api/customers/"), {
                      name: newCustomerName,
                      phone: newCustomerPhone,
                      initials: newCustomerName.substring(0, 2).toUpperCase(),
                      tone: "violet",
                      shopkeeper_email: shopkeeper?.email,
                  }, { timeout: 2500 });
              } catch (e) {
                  addStoreCustomer({
                      name: newCustomerName,
                      phone: newCustomerPhone,
                      initials: newCustomerName.substring(0, 2).toUpperCase(),
                      tone: "violet",
                  }, shopkeeper?.email);
              }
          }
      } else {
          toast.error("Please select a customer or enter a phone number.");
          return;
      }

      const formattedPhone = phone.replace(/\D/g, '');
      const finalPhone = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;

      const grandTotal = calculateGrandTotal();
      
      const upiId = (shopkeeper as any)?.upi_id || "quantumvoice@upi";
      const storeName = shopkeeper?.business_name || "QuantumVoice Store";
      const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${grandTotal}&cu=INR`;

      let message = `*🛍️ ${storeName} Invoice*\n\n`;
      items.forEach((item, index) => {
          message += `${index + 1}. ${item.product}\n`;
          message += `    Qty: ${item.quantity} x ₹${item.unit_price} = ₹${item.quantity * item.unit_price}\n`;
      });
      message += `\n*Grand Total: ₹${grandTotal}*\n`;
      message += "\n*💳 Payment Options:*\n";
      message += `1. Click to pay: ${upiPayUrl}\n`;
      message += `2. Or copy UPI ID: ${upiId}\n`;
      message += "\nThank you for shopping with us!";

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      setShowWhatsAppModal(false);
  };

  const handleCompleteSale = async () => {
      const grandTotal = calculateGrandTotal();
      if (grandTotal <= 0) {
          toast.error("Please add prices before completing the sale.");
          return;
      }
      const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const customerNameToSave = billCustomerName.trim() || "Walk-in Customer";
      const customerInitials = billCustomerName.trim() ? billCustomerName.trim().substring(0, 2).toUpperCase() : "WC";
      setPendingInvoice({ invoiceNumber, customerNameToSave, customerInitials, grandTotal });
      setShowPaymentModeModal(true);
  };

  const handlePaymentModeSelected = async (
      mode: PaymentMode,
      status: "Paid" | "Pending",
      cashDetails?: { received: number; change: number }
  ) => {
      setShowPaymentModeModal(false);
      if (mode === "UPI") {
          setShowUpiModal(true);
      } else {
          await saveBillAndClear({
              ...pendingInvoice,
              payment_mode: mode,
              status: status,
          });
          if (mode === "Cash" && cashDetails && cashDetails.change > 0) {
              toast.info(`Return Change to customer: ₹${cashDetails.change}`, { duration: 5000 });
          }
      }
  };

  const saveBillAndClear = async ({
      invoiceNumber,
      customerNameToSave,
      customerInitials,
      grandTotal,
      payment_mode = "Cash",
      status = "Paid",
  }: any) => {
      const billRecord = {
          invoice: invoiceNumber,
          customer: customerNameToSave,
          amount: `₹${grandTotal}`,
          time: "Just now",
          status: status,
          payment_mode: payment_mode,
          initials: customerInitials,
          tone: status === "Paid" ? "emerald" : "amber",
          items: items,
          shopkeeper_email: shopkeeper?.email,
      };

      try {
          await axios.post(apiUrl("/api/bills/"), billRecord, { timeout: 3000 });
          toast.success(`Sale recorded via ${payment_mode}! Bill generated.`);
          handleClear();
      } catch (err) {
          console.warn("Backend offline, saving bill locally:", err);
          addStoreBill(billRecord, shopkeeper?.email);
          toast.success(`Sale recorded via ${payment_mode}! Bill generated.`);
          handleClear();
      }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col items-center rounded-2xl sm:rounded-3xl border border-violet-100 bg-white p-4 sm:p-8 shadow-xl shadow-violet-100/40">
            
            <div className="mb-4 flex flex-col items-center text-center">
                <div className="mb-3 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
                    <Sparkles className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Voice Billing</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md">
                    Speak items naturally (e.g. "2 milk, 1 bread") to automatically build the bill.
                </p>

                {/* Language Switcher */}
                <div className="mt-3.5 flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-[11px] font-semibold">
                    <button
                        type="button"
                        onClick={() => setLang("en-IN")}
                        className={`rounded-full px-2.5 py-1 transition ${lang === "en-IN" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        🇮🇳 English
                    </button>
                    <button
                        type="button"
                        onClick={() => setLang("hi-IN")}
                        className={`rounded-full px-2.5 py-1 transition ${lang === "hi-IN" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        🇮🇳 हिन्दी
                    </button>
                    <button
                        type="button"
                        onClick={() => setLang("en-US")}
                        className={`rounded-full px-2.5 py-1 transition ${lang === "en-US" ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        🇺🇸 US
                    </button>
                </div>
            </div>

            <div className="relative mb-5 flex flex-col items-center">
                {isRecording ? (
                    <button 
                        onClick={stopRecording}
                        className="group relative flex h-24 w-24 items-center justify-center rounded-full bg-rose-500 text-white shadow-2xl shadow-rose-500/50 transition hover:bg-rose-600 hover:scale-105 active:scale-95"
                        title="Click to Stop Recording & Process Bill"
                    >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                        <Square className="h-8 w-8 fill-current" />
                    </button>
                ) : (
                    <button 
                        onClick={startRecording}
                        disabled={processing}
                        className="group flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white shadow-2xl shadow-indigo-500/50 transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        title="Click to Start Speaking"
                    >
                        {processing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic2 className="h-10 w-10 transition group-hover:scale-110" />}
                    </button>
                )}

                {/* Animated Waveform when listening */}
                {isRecording && (
                    <div className="flex items-center gap-1 mt-3 h-5">
                        <span className="w-1.5 h-3 bg-violet-600 rounded-full animate-pulse [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-5 bg-violet-500 rounded-full animate-pulse [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-4 bg-fuchsia-500 rounded-full animate-pulse" />
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full animate-pulse [animation-delay:-0.2s]" />
                        <span className="w-1.5 h-3 bg-violet-400 rounded-full animate-pulse [animation-delay:-0.4s]" />
                    </div>
                )}
                
                <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-600 text-center">
                    {isRecording ? (
                        <span className="flex items-center gap-2 text-rose-500 font-bold">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span> Listening... Tap red button when done speaking
                        </span>
                    ) : processing ? (
                        <span className="text-violet-600 flex items-center gap-2 font-medium">
                            <Loader2 className="h-4 w-4 animate-spin" /> Identifying products &amp; matching catalog...
                        </span>
                    ) : (
                        "Tap the microphone and speak products"
                    )}
                </p>

                {/* Quick Voice Test Samples */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-xl">
                    <span className="text-xs font-medium text-slate-400">Quick Test:</span>
                    <button
                        type="button"
                        onClick={() => {
                            const text = "2 packets of milk and 1 bread";
                            setTranscript(text);
                            processBillWithText(text);
                        }}
                        disabled={processing || isRecording}
                        className="rounded-full border border-violet-200 bg-violet-50/70 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300 active:scale-95 disabled:opacity-50"
                    >
                        🥛 2 Milk &amp; 1 Bread
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const text = "5 kg rice for 350 rs";
                            setTranscript(text);
                            processBillWithText(text);
                        }}
                        disabled={processing || isRecording}
                        className="rounded-full border border-violet-200 bg-violet-50/70 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300 active:scale-95 disabled:opacity-50"
                    >
                        🍚 5 kg Rice (₹350)
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const text = "3 soaps and 2 toothpastes";
                            setTranscript(text);
                            processBillWithText(text);
                        }}
                        disabled={processing || isRecording}
                        className="rounded-full border border-violet-200 bg-violet-50/70 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300 active:scale-95 disabled:opacity-50"
                    >
                        🧼 3 Soaps &amp; 2 Toothpastes
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const text = "1 Britannia Marie Gold Biscuit and 2 Amul Butter";
                            setTranscript(text);
                            processBillWithText(text);
                        }}
                        disabled={processing || isRecording}
                        className="rounded-full border border-violet-200 bg-violet-50/70 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300 active:scale-95 disabled:opacity-50"
                    >
                        🍪 Biscuits &amp; Butter
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 flex w-full max-w-2xl flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 border border-rose-200">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            const granted = await requestMicPermission();
                            if (granted) {
                                toast.success("Microphone permission granted!");
                                startRecording();
                            }
                        }}
                        className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                    >
                        Grant Permission
                    </button>
                </div>
            )}

            <div className="w-full max-w-2xl">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Captured Voice / Manual Text</p>
                        {transcript && (
                            <button
                                type="button"
                                onClick={() => setTranscript("")}
                                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="min-h-[80px] rounded-xl bg-white shadow-inner focus-within:ring-2 focus-within:ring-violet-200">
                        <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            disabled={isRecording || processing}
                            placeholder="Speak to see your text here, or type it manually... e.g. 2 packets of milk and 1 bread"
                            className="w-full min-h-[90px] resize-y rounded-xl bg-transparent p-4 text-base font-medium text-slate-800 leading-relaxed outline-none disabled:bg-slate-50 disabled:text-slate-500 placeholder:text-slate-300 placeholder:italic"
                        />
                    </div>
                </div>

                {!isRecording && transcript.trim() && !processing && (
                    <button 
                        onClick={processBill}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-violet-600 active:scale-[0.98]"
                    >
                        <Sparkles className="h-4 w-4 text-violet-400" />
                        Process Bill with AI ({transcript.trim().slice(0, 30)}{transcript.length > 30 ? "..." : ""})
                    </button>
                )}
            </div>
        </div>

        {items.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-100/50">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-display text-2xl font-bold text-slate-900">Generated Bill</h3>
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> AI Processed Result
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Products and costs successfully extracted. You can edit quantities and prices.</p>
                    </div>
                    {billingData?.qgbi && (
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-wider text-violet-500">Quantum Bill ID (QGBI)</p>
                            <p className="mt-1 font-mono text-sm font-semibold text-slate-700 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100">{billingData.qgbi}</p>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
                    <table className="w-full min-w-[500px] text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Product</th>
                                <th className="px-3 py-3.5 w-36 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Qty</th>
                                <th className="px-3 py-3.5 w-32 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Price (₹)</th>
                                <th className="px-3 py-3.5 w-24 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Total (₹)</th>
                                <th className="px-2 py-3.5 w-10 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item: any, i: number) => (
                                <tr key={i} className={`transition ${item.matched_in_db === false ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50/50'}`}>
                                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate max-w-[140px] sm:max-w-xs">{item.product}</span>
                                            {item.matched_in_db === false && (
                                                <span className="flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase shrink-0" title="Not found in catalog.">
                                                    <AlertCircle className="h-3 w-3" /> New
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleItemChange(i, 'quantity', Math.max(1, (item.quantity || 1) - 1))}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 active:scale-90 hover:bg-slate-200 transition"
                                                aria-label="Decrease quantity"
                                            >
                                                -
                                            </button>
                                            <input 
                                                type="number" min="1" value={item.quantity || ''}
                                                onChange={(e) => handleItemChange(i, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-12 rounded-lg border border-slate-200 bg-white py-1 text-center text-sm font-bold outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleItemChange(i, 'quantity', (item.quantity || 1) + 1)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 active:scale-90 hover:bg-slate-200 transition"
                                                aria-label="Increase quantity"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <input 
                                            type="number" min="0" value={item.unit_price || ''}
                                            onChange={(e) => handleItemChange(i, 'unit_price', parseInt(e.target.value) || 0)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </td>
                                    <td className="px-3 py-3.5 text-right text-sm font-bold text-slate-900">
                                        ₹{(item.quantity * item.unit_price) || 0}
                                    </td>
                                    <td className="px-2 py-3.5 text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = items.filter((_, idx) => idx !== i);
                                                setItems(next);
                                                toast.info(`Removed ${item.product}`);
                                            }}
                                            className="rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                                            title="Remove item"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white">
                            <tr>
                                <td colSpan={3} className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Grand Total</td>
                                <td colSpan={2} className="px-4 py-3.5 text-right text-lg font-black text-emerald-400">₹{calculateGrandTotal()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="mb-6 rounded-2xl bg-slate-50 p-5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Name (Optional)</label>
                    <input 
                        type="text" 
                        placeholder="Leave blank for Walk-in Customer" 
                        value={billCustomerName} 
                        onChange={(e) => setBillCustomerName(e.target.value)} 
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100/70" 
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={handleClear}
                        className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-6 py-3.5 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 active:scale-[0.98]"
                    >
                        <Trash2 className="h-4 w-4" /> Clear
                    </button>
                    <button 
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-indigo-600 active:scale-[0.98]"
                    >
                        Preview
                    </button>
                    <button 
                        onClick={sendToWhatsApp}
                        className="flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#20bd5a] active:scale-[0.98]"
                    >
                        <Send className="h-4 w-4" /> Send to WhatsApp
                    </button>
                    <button 
                        onClick={handleCompleteSale}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-700 active:scale-[0.98]"
                    >
                        <CheckCircle2 className="h-4 w-4" /> Complete Sale
                    </button>
                </div>
            </div>
        )}

        {showPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                    <button onClick={() => setShowPreview(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-slate-900">QuantumVoice</h2>
                        <p className="text-sm font-medium text-slate-500">Official Invoice</p>
                    </div>
                    <div className="mb-6 space-y-2 border-b border-dashed border-slate-200 pb-6 text-sm text-slate-600">
                        {items.map((item, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{item.quantity}x {item.product}</span>
                                <span>₹{item.quantity * item.unit_price}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mb-8 flex justify-between text-lg font-black text-slate-900">
                        <span>Grand Total</span>
                        <span className="text-emerald-600">₹{calculateGrandTotal()}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl bg-slate-50 p-6">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scan with GPay / PhonePe / Paytm</p>
                        <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-100">
                            <QRCode value={`upi://pay?pa=${encodeURIComponent((shopkeeper as any)?.upi_id || "quantumvoice@upi")}&pn=${encodeURIComponent(shopkeeper?.business_name || "QuantumVoice Store")}&am=${calculateGrandTotal()}&cu=INR`} size={120} level="M" />
                        </div>
                    </div>
                    <button onClick={() => setShowPreview(false)} className="mt-6 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 active:scale-[0.98]">Close Preview</button>
                </div>
            </div>
        )}

        {showWhatsAppModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                    <button onClick={() => setShowWhatsAppModal(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
                    <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><Send className="h-5 w-5 text-[#25D366]" /> Send via WhatsApp</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Existing Customer</label>
                            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                                onChange={(e) => {
                                    const c = customers.find(cust => cust.id.toString() === e.target.value);
                                    setSelectedCustomer(c || null);
                                    if (c) { setNewCustomerPhone(""); setNewCustomerName(""); }
                                }} value={selectedCustomer?.id || ""}>
                                <option value="">-- Choose Customer --</option>
                                {customers.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.phone})</option>))}
                            </select>
                        </div>
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400">OR ENTER NEW</span><div className="flex-grow border-t border-slate-200"></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Phone Number *</label>
                            <input type="text" placeholder="e.g. 9876543210" value={newCustomerPhone} disabled={!!selectedCustomer} onChange={(e) => setNewCustomerPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-50" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Name (Optional)</label>
                            <input type="text" placeholder="Name to save" value={newCustomerName} disabled={!!selectedCustomer} onChange={(e) => setNewCustomerName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-50" />
                        </div>
                    </div>
                    <button onClick={handleSendWhatsAppMessage} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#20bd5a] active:scale-[0.98]">Send Invoice</button>
                </div>
            </div>
        )}

        {/* Payment Mode Selection Modal */}
        {showPaymentModeModal && pendingInvoice && (
            <PaymentModeModal
                amount={pendingInvoice.grandTotal}
                invoiceNumber={pendingInvoice.invoiceNumber}
                customerName={pendingInvoice.customerNameToSave}
                storeName={shopkeeper?.business_name || shopkeeper?.store_name || "SmartQ Store"}
                upiId={(shopkeeper as any)?.upi_id}
                onClose={() => setShowPaymentModeModal(false)}
                onSelectPaymentMode={handlePaymentModeSelected}
            />
        )}

        {/* UPI Payment Modal */}
        {showUpiModal && pendingInvoice && (
            <UpiPaymentModal
                amount={pendingInvoice.grandTotal}
                storeName={shopkeeper?.business_name || shopkeeper?.store_name || "Store"}
                upiId={(shopkeeper as any)?.upi_id || ""}
                invoiceNumber={pendingInvoice.invoiceNumber}
                customerName={pendingInvoice.customerNameToSave}
                onClose={() => setShowUpiModal(false)}
                onPaymentConfirmed={async () => {
                    setShowUpiModal(false);
                    await saveBillAndClear({
                        ...pendingInvoice,
                        payment_mode: "UPI",
                        status: "Paid",
                    });
                }}
            />
        )}
    </div>
  );
}
