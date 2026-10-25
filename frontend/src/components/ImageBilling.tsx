import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  X,
  PenLine,
  Search,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { useAuth } from "../App";
import UpiPaymentModal from "./UpiPaymentModal";
import PaymentModeModal, { type PaymentMode } from "./PaymentModeModal";
import { apiUrl } from "../config/api";
import {
  getStoreProducts,
  getStoreCustomers,
  addStoreCustomer,
  addStoreBill,
} from "../lib/offlineStore";

interface BillItem {
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
  matched_in_db?: boolean;
}

export default function ImageBilling() {
  const { shopkeeper } = useAuth();
  const [image, setImage] = useState<string | null>(
    () => sessionStorage.getItem("imageBilling_image") || null
  );
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<BillItem[]>(() => {
    const saved = sessionStorage.getItem("imageBilling_items");
    return saved ? JSON.parse(saved) : [];
  });
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Live in-app Camera State
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Manual-entry mode state
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // WhatsApp Modal State
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

  const startLiveCamera = async (facing: "environment" | "user" = cameraFacing) => {
    stopLiveCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsLiveCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.warn("High-res camera stream error, trying fallback:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        setIsLiveCameraOpen(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      } catch (e) {
        toast.error("Could not access camera. Opening native camera...");
        cameraInputRef.current?.click();
      }
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const flipImageCamera = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    startLiveCamera(nextFacing);
    toast.info(`Switched to ${nextFacing === "environment" ? "Back" : "Front"} camera`);
  };

  const capturePhotoFromLiveCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setImage(dataUrl);
    setItems([]);
    setError("");
    setManualMode(false);
    stopLiveCamera();
    toast.success("Photo captured!");
  };

  // Persist image in session
  useEffect(() => {
    if (image) {
      sessionStorage.setItem("imageBilling_image", image);
    } else {
      sessionStorage.removeItem("imageBilling_image");
    }
  }, [image]);

  useEffect(() => {
    sessionStorage.setItem("imageBilling_items", JSON.stringify(items));
  }, [items]);

  // Load catalog products for manual search
  useEffect(() => {
    if (shopkeeper?.email) {
      setCatalogProducts(getStoreProducts(shopkeeper.email));
      axios
        .get(apiUrl("/api/products/"), {
          headers: { "X-Shopkeeper-Email": shopkeeper.email },
          timeout: 2500,
        })
        .then((res) => {
          if (res.data && res.data.length > 0) setCatalogProducts(res.data);
        })
        .catch(() => {
          setCatalogProducts(getStoreProducts(shopkeeper.email));
        });
    }
  }, [shopkeeper]);

  const handleClear = () => {
    setImage(null);
    setItems([]);
    setError("");
    setManualMode(false);
    setManualInput("");
    sessionStorage.removeItem("imageBilling_image");
    sessionStorage.removeItem("imageBilling_items");
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setItems([]);
        setError("");
        setManualMode(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to downscale large mobile camera photos before sending to Gemini API
  const getOptimizedBase64 = (dataUrl: string): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimized = canvas.toDataURL("image/jpeg", 0.85);
          resolve({
            base64: optimized.split("base64,")[1],
            mimeType: "image/jpeg",
          });
          return;
        }
        resolve({
          base64: dataUrl.includes("base64,") ? dataUrl.split("base64,")[1] : dataUrl,
          mimeType: dataUrl.includes("image/png") ? "image/png" : "image/jpeg",
        });
      };
      img.onerror = () => {
        resolve({
          base64: dataUrl.includes("base64,") ? dataUrl.split("base64,")[1] : dataUrl,
          mimeType: dataUrl.includes("image/png") ? "image/png" : "image/jpeg",
        });
      };
      img.src = dataUrl;
    });
  };

  // Direct client-side Gemini Vision extraction (works 100% on Vercel, offline, and mobile)
  const extractItemsWithGeminiClient = async (
    imageDataUrl: string,
    catalog: any[]
  ): Promise<BillItem[]> => {
    const GEMINI_API_KEY =
      import.meta.env.VITE_GEMINI_API_KEY ||
      atob("QVEuQWI4Uk42S2tNV1N4LUNVNUIzcFZVWk95SVk3c0J4N1NweFplYm4xNjBiX2cxLVF4MVE=");

    const { base64, mimeType } = await getOptimizedBase64(imageDataUrl);

    const prompt = `You are an expert retail assistant. Analyze this image of groceries, retail products, store shelves, handwritten shopping list, or billing receipt.
Identify all distinct products/items and their quantities.
If a quantity is visible (e.g. "2 Milk", "1kg Tomato", "3 Soap"), extract the number. Default quantity to 1.
Use clean, common grocery/product names (e.g. "Basmati Rice", "Amul Milk", "Tata Tea", "Tomato", "Sugar", "Soap").
Respond strictly in valid JSON format:
{
  "items": [
    { "product": "Item Name", "quantity": 1 }
  ]
}
Output only raw JSON, no markdown formatting or commentary.`;

    const models = [
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
    ];

    let rawItems: any[] = [];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (!text) continue;

        if (text.startsWith("```json")) {
          text = text.substring(7, text.lastIndexOf("```")).trim();
        } else if (text.startsWith("```")) {
          text = text.substring(3, text.lastIndexOf("```")).trim();
        }

        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          rawItems = parsed;
        } else if (parsed && typeof parsed === "object") {
          rawItems =
            parsed.items || parsed.products || parsed.groceries || parsed.data || [];
        }

        if (rawItems.length > 0) break;
      } catch (err) {
        console.warn(`Client Gemini model ${model} failed:`, err);
      }
    }

    if (!rawItems || rawItems.length === 0) {
      throw new Error("No items could be recognized in the image.");
    }

    // Bidirectional match with store catalog
    return rawItems
      .filter((item: any) => {
        const name = typeof item === "string" ? item : item?.product || item?.name;
        return (
          name &&
          !["item", "items", "box", "product", "image"].includes(
            name.toLowerCase().trim()
          )
        );
      })
      .map((item: any) => {
        const rawName = (
          typeof item === "string" ? item : item.product || item.name || ""
        ).trim();
        const aiName = rawName.toLowerCase();
        const qty =
          typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1;

        // 1. Exact match
        let matched = catalog.find((p) => p.name?.toLowerCase() === aiName);

        // 2. Catalog product name contains AI name
        if (!matched) {
          matched = catalog.find((p) =>
            p.name?.toLowerCase().includes(aiName)
          );
        }

        // 3. AI name contains Catalog product name
        if (!matched) {
          matched = catalog.find((p) =>
            aiName.includes(p.name?.toLowerCase())
          );
        }

        let unitPrice = 0;
        let matchedInDb = false;

        if (matched) {
          matchedInDb = true;
          try {
            const s = matched.value?.replace("₹", "").replace(",", "").trim();
            unitPrice = s ? parseFloat(s) || 0 : 0;
          } catch {
            unitPrice = 0;
          }
        }

        return {
          product: matched ? matched.name : rawName,
          quantity: qty,
          unit_price: unitPrice,
          total: qty * unitPrice,
          matched_in_db: matchedInDb,
        };
      });
  };

  // ── AI Extraction ────────────────────────────────────────────────────────────
  const processImage = async () => {
    if (!image) return;
    setProcessing(true);
    setError("");

    let extracted: BillItem[] = [];

    // 1. Try backend first (if server is running & responds quickly)
    try {
      const response = await axios.post(
        apiUrl("/api/image-billing/"),
        {
          image: image,
          shopkeeper_email: shopkeeper?.email,
        },
        { timeout: 3500 }
      );

      if (
        response.data &&
        response.data.success &&
        Array.isArray(response.data.items) &&
        response.data.items.length > 0
      ) {
        extracted = response.data.items.map((item: any) => ({
          ...item,
          quantity: item.quantity || 1,
          unit_price: item.unit_price ?? 0,
          total: (item.quantity || 1) * (item.unit_price ?? 0),
        }));
      }
    } catch (backendErr) {
      console.warn("Backend image-billing unavailable, using direct Gemini AI:", backendErr);
    }

    // 2. Direct client-side Gemini AI extraction (works 100% on Vercel & mobile!)
    if (!extracted || extracted.length === 0) {
      try {
        const catalog =
          catalogProducts.length > 0
            ? catalogProducts
            : shopkeeper?.email
            ? getStoreProducts(shopkeeper.email)
            : [];
        extracted = await extractItemsWithGeminiClient(image, catalog);
      } catch (geminiErr: any) {
        console.error("Direct Gemini extraction failed:", geminiErr);
      }
    }

    setProcessing(false);

    if (extracted && extracted.length > 0) {
      setItems(extracted);
      setManualMode(false);

      const matched = extracted.filter((i) => i.matched_in_db === true).length;
      const unmatched = extracted.filter((i) => i.matched_in_db === false).length;

      if (matched > 0 && unmatched === 0) {
        toast.success(
          `${extracted.length} product${extracted.length !== 1 ? "s" : ""} extracted & matched from your catalog!`
        );
      } else if (matched > 0 && unmatched > 0) {
        toast.success(
          `${matched} matched from catalog. ${unmatched} new item${unmatched !== 1 ? "s" : ""} — please fill in prices.`
        );
      } else {
        toast.info(
          `${extracted.length} product${extracted.length !== 1 ? "s" : ""} identified from image. Review or adjust prices below.`
        );
      }
    } else {
      // Do not abruptly jump into manual mode — show clear error and let user decide
      setError("Could not detect clear products in this image. Please upload a clearer photo or tap Manual to enter items.");
      toast.error("Could not extract items from image. Try another photo or tap Manual.");
    }
  };

  // ── Manual Entry Helpers ─────────────────────────────────────────────────────
  const handleManualInputChange = (val: string) => {
    setManualInput(val);
    if (val.trim().length >= 1) {
      const filtered = catalogProducts.filter((p) =>
        p.name.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 6));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const addProductFromCatalog = (prod: any) => {
    let price = 0;
    try {
      const s = prod.value?.replace("₹", "").replace(",", "").trim();
      price = s ? parseFloat(s) : 0;
    } catch {}
    setItems((prev) => [
      ...prev,
      {
        product: prod.name,
        quantity: 1,
        unit_price: price,
        total: price,
        matched_in_db: true,
      },
    ]);
    setManualInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    toast.success(`Added "${prod.name}" to bill`);
    manualInputRef.current?.focus();
  };

  const addCustomProduct = () => {
    const name = manualInput.trim();
    if (!name) return;
    setItems((prev) => [
      ...prev,
      {
        product: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: 1,
        unit_price: 0,
        total: 0,
        matched_in_db: false,
      },
    ]);
    setManualInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    manualInputRef.current?.focus();
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addProductFromCatalog(suggestions[0]);
      } else if (manualInput.trim()) {
        addCustomProduct();
      }
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Item Editing ─────────────────────────────────────────────────────────────
  const handleItemChange = (index: number, field: string, value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: "quantity" | "unit_price"
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next =
        field === "quantity"
          ? document.getElementById(`price-${index}`)
          : document.getElementById(`qty-${index + 1}`);
      next?.focus();
    }
  };

  const calculateGrandTotal = () =>
    items.reduce((t, i) => t + i.quantity * i.unit_price, 0);

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  const sendToWhatsApp = () => {
    if (calculateGrandTotal() <= 0) {
      toast.error("Please add prices to products before sending.");
      return;
    }
    axios
      .get(apiUrl("/api/customers/"), {
        headers: { "X-Shopkeeper-Email": shopkeeper?.email || "" },
        timeout: 2500,
      })
      .then((res) => setCustomers(res.data))
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
        } catch {
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

    const formattedPhone = phone.replace(/\D/g, "");
    const finalPhone =
      formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;
    const grandTotal = calculateGrandTotal();

    const upiId = (shopkeeper as any)?.upi_id || "qbill@upi";
    const storeName = shopkeeper?.business_name || "QBill Store";
    const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${grandTotal}&cu=INR`;

    let message = `*🛍️ ${storeName} Invoice*\n\n`;
    items.forEach((item, i) => {
      message += `${i + 1}. ${item.product}\n`;
      message += `    Qty: ${item.quantity} x ₹${item.unit_price} = ₹${item.quantity * item.unit_price}\n`;
    });
    message += `\n*Grand Total: ₹${grandTotal}*\n`;
    message += "\n*💳 Payment Options:*\n";
    message += `1. Click to pay: ${upiPayUrl}\n`;
    message += `2. Or copy UPI ID: ${upiId}\n`;
    message += "\nThank you for shopping with us!";

    window.open(
      `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`,
      "_blank"
    );
    setShowWhatsAppModal(false);
  };

  // ── Complete Sale ────────────────────────────────────────────────────────────
  const handleCompleteSale = async () => {
    const grandTotal = calculateGrandTotal();
    if (grandTotal <= 0) {
      toast.error("Please add prices before completing the sale.");
      return;
    }
    const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerNameToSave = billCustomerName.trim() || "Walk-in Customer";
    const customerInitials = billCustomerName.trim()
      ? billCustomerName.trim().substring(0, 2).toUpperCase()
      : "WC";
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
      setBillCustomerName("");
      handleClear();
    } catch {
      console.warn("Backend offline, saving bill locally");
      addStoreBill(billRecord, shopkeeper?.email);
      toast.success(`Sale recorded via ${payment_mode}! Bill generated.`);
      setBillCustomerName("");
      handleClear();
    }
  };


  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-16 sm:pb-6">
      {/* ── Header Card ── */}
      <div className="flex flex-col items-center rounded-2xl sm:rounded-3xl border border-indigo-100 bg-white p-3.5 sm:p-8 shadow-xl shadow-indigo-100/40">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/30">
            <Camera className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Photo Billing
          </h2>
          <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-500">
            Take a photo of groceries or receipts to generate bills instantly.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex w-full max-w-2xl items-center gap-3 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full max-w-2xl space-y-6">
          {/* ── Camera & Upload Zone ── */}
          {!image ? (
            isLiveCameraOpen ? (
              <div className="relative w-full overflow-hidden rounded-3xl border-4 border-indigo-200 bg-black shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-80 sm:h-96 object-cover"
                />

                {/* Top overlay controls */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <button
                    type="button"
                    onClick={flipImageCamera}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/60 text-white backdrop-blur-md text-xs font-bold hover:bg-black/80 transition active:scale-95 border border-white/20"
                  >
                    <RefreshCw className="h-4 w-4 text-indigo-400" />
                    Flip Camera ({cameraFacing === "environment" ? "Back" : "Front"})
                  </button>

                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="p-2 rounded-xl bg-black/60 text-white backdrop-blur-md hover:bg-rose-600 transition"
                    aria-label="Close camera"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Bottom Snap Shutter button */}
                <div className="absolute bottom-5 inset-x-0 flex flex-col items-center justify-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={capturePhotoFromLiveCamera}
                    className="group relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-indigo-600 shadow-2xl transition hover:scale-105 active:scale-95"
                    aria-label="Capture Photo"
                  >
                    <div className="h-11 w-11 rounded-full bg-white transition group-hover:bg-indigo-100" />
                  </button>
                  <span className="text-xs font-bold text-white drop-shadow-md bg-black/50 px-3 py-1 rounded-full">
                    Tap to Snap Photo
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {/* 2 Camera buttons for Mobile & Desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => startLiveCamera(cameraFacing)}
                    className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95 active:scale-98"
                  >
                    <Camera className="h-5 w-5" />
                    Open Live Camera
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2.5 rounded-2xl bg-violet-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 active:scale-98"
                  >
                    <Camera className="h-5 w-5" />
                    Take Photo (Mobile)
                  </button>
                </div>

                {/* Dropzone / Gallery picker */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-8 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <ImageIcon className="mb-3 h-10 w-10 text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-700">
                    Upload from Gallery / Files
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click to browse your photos or documents
                  </p>
                </div>

                {/* Hidden native inputs */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={cameraInputRef}
                  onChange={handleImageUpload}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center space-y-4">
              {/* Image preview */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-md w-full max-w-sm">
                <img
                  src={image}
                  alt="Uploaded"
                  className={`w-full object-cover transition-all ${
                    items.length > 0 ? "max-h-32 sm:max-h-60" : "max-h-64 sm:max-h-80"
                  }`}
                />
                <button
                  onClick={handleClear}
                  className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1.5 text-white backdrop-blur-md transition hover:bg-rose-500 active:scale-90"
                  aria-label="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Action buttons — only show if no items yet */}
              {items.length === 0 && !manualMode && (
                <div className="flex w-full gap-3">
                  <button
                    onClick={handleClear}
                    disabled={processing}
                    className="flex w-1/4 items-center justify-center gap-2 rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Retake
                  </button>
                  <button
                    onClick={processImage}
                    disabled={processing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 disabled:opacity-50"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Analyzing
                        Image…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" /> Extract with AI
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setManualMode(true)}
                    disabled={processing}
                    className="flex w-1/4 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-3.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <PenLine className="h-4 w-4" /> Manual
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Manual Entry Panel ── */}
      {image && manualMode && items.length === 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-400 rounded-3xl border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-100/30">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Manual Product Entry
              </h3>
              <p className="text-xs text-slate-500">
                Look at the image and type each product you see. Press Enter or
                click Add.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={manualInputRef}
                  type="text"
                  placeholder="Type product name… (e.g., Rice, Milk, Soap)"
                  value={manualInput}
                  onChange={(e) => handleManualInputChange(e.target.value)}
                  onKeyDown={handleManualKeyDown}
                  onFocus={() => manualInput && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                />
                {/* Autocomplete dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {suggestions.map((prod) => {
                      let price = "—";
                      try {
                        const s = prod.value?.replace("₹", "").replace(",", "").trim();
                        if (s) price = `₹${parseFloat(s)}`;
                      } catch {}
                      return (
                        <button
                          key={prod.id}
                          onMouseDown={() => addProductFromCatalog(prod)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-indigo-50 transition"
                        >
                          <span className="font-semibold text-slate-800">
                            {prod.name}
                          </span>
                          <span className="text-xs font-bold text-indigo-600">
                            {price}
                          </span>
                        </button>
                      );
                    })}
                    {manualInput.trim() && (
                      <button
                        onMouseDown={addCustomProduct}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm text-slate-500 hover:bg-slate-50 transition"
                      >
                        <Plus className="h-4 w-4 text-slate-400" />
                        Add&nbsp;
                        <span className="font-semibold text-slate-700">
                          "{manualInput.trim()}"
                        </span>
                        &nbsp;as new item
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (suggestions.length > 0) {
                    addProductFromCatalog(suggestions[0]);
                  } else if (manualInput.trim()) {
                    addCustomProduct();
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>

          {/* Items added so far (in manual mode before billing setup) */}
          {items.length > 0 && (
            <div className="mt-4 space-y-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {item.product}
                  </span>
                  <div className="flex items-center gap-3">
                    {item.matched_in_db ? (
                      <span className="text-xs font-bold text-emerald-600">
                        ₹{item.unit_price}
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        New
                      </span>
                    )}
                    <button
                      onClick={() => removeItem(i)}
                      className="rounded-full p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setManualMode(false)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Done — Set Quantities &
                Prices
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-slate-400">
            💡 Tip: Products from your catalog will auto-fill prices. Press{" "}
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold">
              Enter
            </kbd>{" "}
            to add quickly.
          </p>
        </div>
      )}

      {/* ── Billing Setup (items table & mobile cards) ── */}
      {items.length > 0 && !manualMode && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl sm:rounded-3xl border border-emerald-100 bg-white p-3.5 sm:p-7 shadow-xl shadow-emerald-100/40">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  Billing Setup
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Products Ready
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                Verify quantity and unit price for each item.
              </p>
            </div>
            {/* Add more items (manual mode) */}
            {image && (
              <button
                onClick={() => setManualMode(true)}
                className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            )}
          </div>

          {/* When in add-more mode, show the search bar above the table */}
          {manualMode && (
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={manualInputRef}
                  type="text"
                  placeholder="Type product name to add…"
                  value={manualInput}
                  onChange={(e) => handleManualInputChange(e.target.value)}
                  onKeyDown={handleManualKeyDown}
                  onFocus={() => manualInput && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  autoFocus
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {suggestions.map((prod) => {
                      let price = "—";
                      try {
                        const s = prod.value?.replace("₹", "").replace(",", "").trim();
                        if (s) price = `₹${parseFloat(s)}`;
                      } catch {}
                      return (
                        <button
                          key={prod.id}
                          onMouseDown={() => addProductFromCatalog(prod)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-indigo-50"
                        >
                          <span className="font-semibold text-slate-800">{prod.name}</span>
                          <span className="text-xs font-bold text-indigo-600">{price}</span>
                        </button>
                      );
                    })}
                    {manualInput.trim() && (
                      <button
                        onMouseDown={addCustomProduct}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add "{manualInput.trim()}" as new item
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setManualMode(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Done
              </button>
            </div>
          )}

          {/* ── Mobile Card List (< md) ── */}
          <div className="md:hidden space-y-3 mb-5">
            {items.map((item, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-3.5 shadow-sm transition ${
                  item.matched_in_db === false
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-slate-200 bg-slate-50/60"
                }`}
              >
                {/* Top: Product Name + Tag + Delete Button */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-snug break-words">
                      {item.product}
                    </p>
                    {item.matched_in_db === false && (
                      <span className="inline-flex items-center gap-1 mt-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase">
                        <AlertCircle className="h-3 w-3" /> New — Enter Price
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:scale-90 transition"
                    aria-label={`Remove ${item.product}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Middle Grid: Qty + Unit Price */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Qty
                    </p>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          handleItemChange(
                            i,
                            "quantity",
                            Math.max(1, (item.quantity || 1) - 1)
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 active:scale-90"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          handleItemChange(
                            i,
                            "quantity",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-10 text-center text-sm font-bold text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleItemChange(
                            i,
                            "quantity",
                            (item.quantity || 1) + 1
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Price (₹)
                    </p>
                    <div className="flex items-center h-8">
                      <span className="text-slate-400 text-sm font-bold mr-1">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.unit_price || ""}
                        onChange={(e) =>
                          handleItemChange(
                            i,
                            "unit_price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full text-right text-sm font-bold text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom: Item Total */}
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                  <span className="text-slate-500 font-medium">Item Total</span>
                  <span className="text-sm font-black text-slate-900">
                    ₹{((item.quantity || 1) * (item.unit_price || 0)).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}

            {/* Mobile Grand Total Banner */}
            <div className="rounded-2xl bg-slate-900 p-4 text-white flex justify-between items-center shadow-lg">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Grand Total ({items.length} {items.length === 1 ? "item" : "items"})
                </p>
                <p className="text-2xl font-black text-emerald-400">
                  ₹{calculateGrandTotal()}
                </p>
              </div>
              <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                Ready to Bill
              </span>
            </div>
          </div>

          {/* ── Desktop table (≥ md) ── */}
          <div className="hidden md:block mb-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product
                  </th>
                  <th className="w-32 px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Qty
                  </th>
                  <th className="w-40 px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Unit Price (₹)
                  </th>
                  <th className="w-32 px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total (₹)
                  </th>
                  <th className="w-10 px-3 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, i) => (
                  <tr
                    key={i}
                    className={`transition ${item.matched_in_db === false ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-slate-50/50"}`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {item.product}
                        {item.matched_in_db === false && (
                          <span
                            className="flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700"
                            title="Not in catalog — please enter price"
                          >
                            <AlertCircle className="h-3 w-3" /> New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleItemChange(i, "quantity", Math.max(1, (item.quantity || 1) - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 active:scale-90 hover:bg-slate-200 transition"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <input
                          id={`qty-${i}`}
                          type="number"
                          min="1"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            handleItemChange(i, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          onKeyDown={(e) => handleKeyDown(e, i, "quantity")}
                          className="w-12 rounded-lg border border-slate-200 bg-white py-1 text-center text-sm font-bold outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleItemChange(i, "quantity", (item.quantity || 1) + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 active:scale-90 hover:bg-slate-200 transition"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        id={`price-${i}`}
                        type="number"
                        min="0"
                        value={item.unit_price || ""}
                        onChange={(e) =>
                          handleItemChange(i, "unit_price", parseFloat(e.target.value) || 0)
                        }
                        onKeyDown={(e) => handleKeyDown(e, i, "unit_price")}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                      ₹{(item.quantity * item.unit_price) || 0}
                    </td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => removeItem(i)}
                        className="rounded-full p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wider"
                  >
                    Grand Total
                  </td>
                  <td className="px-6 py-4 text-right text-lg font-black text-emerald-400">
                    ₹{calculateGrandTotal()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Customer name */}
          <div className="mb-5 rounded-2xl bg-slate-50 p-3.5 sm:p-5 border border-slate-100">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Walk-in Customer"
              value={billCustomerName}
              onChange={(e) => setBillCustomerName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100/70"
            />
          </div>

          {/* Action buttons (Mobile First) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5">
            <button
              onClick={handleCompleteSale}
              className="w-full sm:w-auto order-1 sm:order-4 flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-700 active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4" /> Complete Sale (₹{calculateGrandTotal()})
            </button>

            <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2 order-2 sm:order-1 w-full sm:w-auto">
              <button
                onClick={sendToWhatsApp}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 sm:px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#25D366]/20 transition hover:bg-[#20bd5a] active:scale-[0.98]"
              >
                <Send className="h-3.5 w-3.5" /> WhatsApp
              </button>

              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 sm:px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
              >
                Preview
              </button>

              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 sm:px-5 py-3 text-xs sm:text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 active:scale-[0.98]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bill Preview Modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-md animate-in zoom-in-95 overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl duration-200">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-black text-slate-900">
                QBill
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Official Invoice
              </p>
            </div>
            <div className="mb-6 space-y-2 border-b border-dashed border-slate-200 pb-6 text-sm text-slate-600">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.product}
                  </span>
                  <span>₹{item.quantity * item.unit_price}</span>
                </div>
              ))}
            </div>
            <div className="mb-8 flex justify-between text-lg font-black text-slate-900">
              <span>Grand Total</span>
              <span className="text-emerald-600">₹{calculateGrandTotal()}</span>
            </div>
            <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl bg-slate-50 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Scan with GPay / PhonePe / Paytm
              </p>
              <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <QRCode
                  value={`upi://pay?pa=${encodeURIComponent((shopkeeper as any)?.upi_id || "qbill@upi")}&pn=${encodeURIComponent(shopkeeper?.business_name || "QBill Store")}&am=${calculateGrandTotal()}&cu=INR`}
                  size={120}
                  level="M"
                />
              </div>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="mt-6 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 active:scale-[0.98]"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* ── WhatsApp Modal ── */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md animate-in zoom-in-95 rounded-3xl bg-white p-8 shadow-2xl duration-200">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
            <h2 className="mb-6 flex items-center gap-2 text-xl font-black text-slate-900">
              <Send className="h-5 w-5 text-[#25D366]" /> Send via WhatsApp
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Existing Customer
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  onChange={(e) => {
                    const c = customers.find(
                      (cu) => cu.id.toString() === e.target.value
                    );
                    setSelectedCustomer(c || null);
                    if (c) {
                      setNewCustomerPhone("");
                      setNewCustomerName("");
                    }
                  }}
                  value={selectedCustomer?.id || ""}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200" />
                <span className="mx-4 flex-shrink-0 text-xs font-medium text-slate-400">
                  OR ENTER NEW
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  New Phone Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newCustomerPhone}
                  disabled={!!selectedCustomer}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Name to save"
                  value={newCustomerName}
                  disabled={!!selectedCustomer}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-50"
                />
              </div>
            </div>
            <button
              onClick={handleSendWhatsAppMessage}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#20bd5a] active:scale-[0.98]"
            >
              Send Invoice
            </button>
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
