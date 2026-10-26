import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
import { ScanLine, Trash2, Send, CheckCircle2, AlertCircle, Upload, Image as ImageIcon, Crop as CropIcon, RefreshCw, Zap, Download } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useAuth } from "../App";
import UpiPaymentModal from "./UpiPaymentModal";
import PaymentModeModal, { type PaymentMode } from "./PaymentModeModal";
import WhatsAppModal from "./WhatsAppModal";
import { apiUrl } from "../config/api";
import {
  getStoreProducts,
  saveStoreProducts,
  addStoreBill,
  getStoreCustomers,
  addStoreCustomer,
  type ProductItem,
} from "../lib/offlineStore";
import { downloadInvoicePdf } from "../lib/pdfGenerator";

export default function BarcodeBilling() {
  const { shopkeeper } = useAuth();
  const [items, setItems] = useState<any[]>(() => {
      const saved = sessionStorage.getItem('barcodeBilling_items');
      return saved ? JSON.parse(saved) : [];
  });
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [autoResumeCamera, setAutoResumeCamera] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const toggleTorch = async () => {
    try {
      const video = document.querySelector("#reader video") as HTMLVideoElement;
      const stream = video?.srcObject as MediaStream;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        // @ts-ignore
        const capabilities = track.getCapabilities?.() || {};
        // @ts-ignore
        if (capabilities.torch) {
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
          setTorchOn(!torchOn);
          toast.info(`Flashlight ${!torchOn ? "ON" : "OFF"}`);
        } else {
          toast.info("Flashlight not supported on this camera.");
        }
      } else {
        toast.info("Camera stream is not active.");
      }
    } catch {
      toast.error("Could not toggle flashlight.");
    }
  };
  
  // Cropping State
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  
  // New Product Modal State
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newBarcode, setNewBarcode] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");

  // WhatsApp Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [billCustomerName, setBillCustomerName] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");

  // Payment Mode & UPI State
  const [showPaymentModeModal, setShowPaymentModeModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<any>(null);

  const handleManualScan = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const code = manualBarcode.trim();
      if (!code) {
          toast.error("Please enter a barcode number.");
          return;
      }
      onScanSuccess(code, false);
      setManualBarcode("");
  };

  useEffect(() => {
      sessionStorage.setItem('barcodeBilling_items', JSON.stringify(items));
  }, [items]);

  const handleFlipCamera = () => {
      setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
      toast.info(`Switched to ${facingMode === "environment" ? "Front" : "Back"} camera`);
  };

  useEffect(() => {
      let html5QrCode: Html5Qrcode | null = null;
      
      if (scanning) {
          html5QrCode = new Html5Qrcode("reader");
          
          html5QrCode.start(
              { facingMode: facingMode },
              {
                  fps: 10,
              },
              onScanSuccess,
              onScanFailure
          ).catch(err => {
              console.warn(`Camera start failed with ${facingMode}, trying alternate`, err);
              const fallbackMode = facingMode === "environment" ? "user" : "environment";
              html5QrCode?.start(
                  { facingMode: fallbackMode },
                  { fps: 10 },
                  onScanSuccess,
                  onScanFailure
              ).catch(e => {
                  toast.error("Could not start camera. Check camera permissions.");
                  setScanning(false);
              });
          });
      }

      return () => {
          if (html5QrCode && html5QrCode.isScanning) {
              html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
          }
      };
  }, [scanning, facingMode]);

  const playBeep = () => {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(1, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.1);
  };

  const onScanSuccess = async (decodedText: string, resumeCamera: boolean = true) => {
      // Pause scanning momentarily
      if (resumeCamera) setScanning(false);
      setAutoResumeCamera(resumeCamera);
      playBeep();
      if (navigator.vibrate) navigator.vibrate(100);

      const cleanCode = decodedText.trim();

      // 1. Check offline catalog first (instant & works 100% on mobile without backend dependency)
      const localProducts = getStoreProducts(shopkeeper?.email);
      const localMatch = localProducts.find(
          p => p.barcode === cleanCode || 
               p.barcode.endsWith(cleanCode) || 
               cleanCode.endsWith(p.barcode)
      );

      if (localMatch) {
          const price = localMatch.price || parseInt(localMatch.value.replace(/[^0-9]/g, '')) || 0;
          setItems(prev => {
              const existing = prev.find(i => i.product.toLowerCase() === localMatch.name.toLowerCase());
              if (existing) {
                  return prev.map(i => i.product.toLowerCase() === localMatch.name.toLowerCase() ? { ...i, quantity: i.quantity + 1 } : i);
              } else {
                  return [...prev, { product: localMatch.name, quantity: 1, unit_price: price }];
              }
          });
          toast.success(`Added ${localMatch.name} (₹${price})`);
          if (resumeCamera) setTimeout(() => setScanning(true), 1500);
          return;
      }

      // 2. If not found locally, query backend with a quick timeout
      try {
          const response = await axios.get(apiUrl(`/api/products/?barcode=${encodeURIComponent(cleanCode)}`), {
              params: { shopkeeper_email: shopkeeper?.email },
              timeout: 2000
          });
          if (response.data && response.data.length > 0) {
              const product = response.data[0];
              const priceStr = product.value.replace('₹', '').replace(',', '');
              const price = parseInt(priceStr) || 0;
              
              // Save to offline catalog so next scan is instant
              saveStoreProducts([product, ...localProducts], shopkeeper?.email);

              setItems(prev => {
                  const existing = prev.find(i => i.product === product.name);
                  if (existing) {
                      return prev.map(i => i.product === product.name ? { ...i, quantity: i.quantity + 1 } : i);
                  } else {
                      return [...prev, { product: product.name, quantity: 1, unit_price: price }];
                  }
              });
              toast.success(`Added ${product.name}`);
              if (resumeCamera) setTimeout(() => setScanning(true), 1500);
              return;
          }
      } catch (err) {
          console.warn("Backend barcode lookup unavailable:", err);
      }

      // 3. If barcode is unknown in both local catalog & backend, open modal to register it
      setNewBarcode(cleanCode);
      setShowNewProductModal(true);
      toast.info(`Barcode ${cleanCode} not in catalog. Add product details to save.`);
  };

  const onScanFailure = (error: any) => {
      // ignore frame errors
  };

  const handleCaptureFrame = () => {
      const video = document.querySelector('#reader video') as HTMLVideoElement;
      if (video) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/png');
              setScanning(false); // Stop camera momentarily
              setAutoResumeCamera(true); 
              setCrop(undefined);
              setCompletedCrop(undefined);
              setImgSrc(dataUrl);
          }
      } else {
          toast.error("Camera feed not found. Please wait for the camera to start.");
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setCrop(undefined);
      setCompletedCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
      
      e.target.value = "";
  };

  const handleCropComplete = async () => {
      // Helper function to decode barcode from canvas or image using ZXing with TryHarder hints
      const decodeWithZXing = async (sourceUrl: string) => {
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.ITF,
              BarcodeFormat.QR_CODE,
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);
          const reader = new BrowserMultiFormatReader(hints);
          const result = await reader.decodeFromImageUrl(sourceUrl);
          return result?.getText() || null;
      };

      // Helper function to call server-side AI barcode reader (Gemini Vision)
      const detectWithAI = async (base64Image: string) => {
          try {
              const res = await axios.post(apiUrl("/api/detect-barcode/"), {
                  image: base64Image
              });
              if (res.data?.success && res.data?.barcode) {
                  return res.data.barcode;
              }
          } catch (e) {
              console.warn("AI detection endpoint response:", e);
          }
          return null;
      };

      if (imgRef.current && completedCrop?.width && completedCrop?.height) {
          const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
          const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

          const cropX = Math.floor(completedCrop.x * scaleX);
          const cropY = Math.floor(completedCrop.y * scaleY);
          const cropW = Math.floor(completedCrop.width * scaleX);
          const cropH = Math.floor(completedCrop.height * scaleY);

          // 1. Padded canvas with white quiet zone margins (essential for 1D EAN/UPC barcodes)
          const padX = Math.max(40, Math.floor(cropW * 0.15));
          const padY = Math.max(25, Math.floor(cropH * 0.15));

          const canvas = document.createElement('canvas');
          canvas.width = cropW + padX * 2;
          canvas.height = cropH + padY * 2;
          const ctx = canvas.getContext('2d');

          if (!ctx) return;

          // Fill white quiet zone background
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
              imgRef.current,
              cropX,
              cropY,
              cropW,
              cropH,
              padX,
              padY,
              cropW,
              cropH
          );

          // Step A: Native BarcodeDetector
          if ('BarcodeDetector' in window) {
              try {
                  // @ts-ignore
                  const supported = await window.BarcodeDetector.getSupportedFormats?.() || [];
                  // @ts-ignore
                  const barcodeDetector = new window.BarcodeDetector(supported.length ? { formats: supported } : undefined);
                  const barcodes = await barcodeDetector.detect(canvas);
                  if (barcodes && barcodes.length > 0) {
                      onScanSuccess(barcodes[0].rawValue, false);
                      setImgSrc("");
                      return;
                  }
              } catch (e) {
                  console.warn("Native BarcodeDetector failed", e);
              }
          }

          // Step B: ZXing with padded quiet zone
          const paddedDataUrl = canvas.toDataURL("image/png");
          try {
              const code = await decodeWithZXing(paddedDataUrl);
              if (code) {
                  onScanSuccess(code, false);
                  setImgSrc("");
                  return;
              }
          } catch (e) {
              // continue to contrast pass
          }

          // Step C: High contrast & grayscale pass (handles glare & shiny cylindrical packaging)
          try {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const d = imgData.data;
              for (let i = 0; i < d.length; i += 4) {
                  const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
                  const boosted = lum > 140 ? 255 : (lum < 90 ? 0 : lum);
                  d[i] = boosted;
                  d[i + 1] = boosted;
                  d[i + 2] = boosted;
              }
              ctx.putImageData(imgData, 0, 0);
              const contrastDataUrl = canvas.toDataURL("image/png");
              const code = await decodeWithZXing(contrastDataUrl);
              if (code) {
                  onScanSuccess(code, false);
                  setImgSrc("");
                  return;
              }
          } catch (e) {
              // continue to AI fallback
          }

          // Step D: AI Vision Fallback (Gemini Vision Reads Numbers and Barcode Directly)
          const loadingToast = toast.loading("Reading barcode with AI vision...");
          try {
              // Crop exactly what user selected
              const rawCanvas = document.createElement('canvas');
              rawCanvas.width = cropW;
              rawCanvas.height = cropH;
              const rawCtx = rawCanvas.getContext('2d');
              if (rawCtx) {
                  rawCtx.drawImage(imgRef.current, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                  const rawBase64 = rawCanvas.toDataURL("image/jpeg", 0.95);
                  const aiCode = await detectWithAI(rawBase64);
                  if (aiCode) {
                      toast.dismiss(loadingToast);
                      toast.success(`Barcode detected: ${aiCode}`);
                      onScanSuccess(aiCode, false);
                      setImgSrc("");
                      return;
                  }
              }
          } catch (aiErr) {
              console.error("AI Barcode detector failed", aiErr);
          } finally {
              toast.dismiss(loadingToast);
          }

          toast.error("Could not find barcode in the selected region. Try drawing the box around the numbers below the stripes too.");
      } else {
          // No crop selection — try entire image
          const loadingToast = toast.loading("Scanning entire image...");
          try {
              if (imgRef.current && 'BarcodeDetector' in window) {
                  try {
                      // @ts-ignore
                      const supported = await window.BarcodeDetector.getSupportedFormats?.() || [];
                      // @ts-ignore
                      const barcodeDetector = new window.BarcodeDetector(supported.length ? { formats: supported } : undefined);
                      const barcodes = await barcodeDetector.detect(imgRef.current);
                      if (barcodes && barcodes.length > 0) {
                          toast.dismiss(loadingToast);
                          onScanSuccess(barcodes[0].rawValue, false);
                          setImgSrc("");
                          return;
                      }
                  } catch (e) {}
              }

              const code = await decodeWithZXing(imgSrc);
              if (code) {
                  toast.dismiss(loadingToast);
                  onScanSuccess(code, false);
                  setImgSrc("");
                  return;
              }
          } catch(err) {
              // Try AI fallback on full image
              const aiCode = await detectWithAI(imgSrc);
              if (aiCode) {
                  toast.dismiss(loadingToast);
                  toast.success(`Barcode detected: ${aiCode}`);
                  onScanSuccess(aiCode, false);
                  setImgSrc("");
                  return;
              }
          } finally {
              toast.dismiss(loadingToast);
          }

          toast.error("Could not find barcode in the image. Please draw a box around the barcode stripes & numbers.");
      }
  };

  const handleSaveNewProduct = async () => {
      if (!newProductName || !newProductPrice) {
          toast.error("Please enter name and price.");
          return;
      }
      
      const priceNum = parseInt(newProductPrice) || 0;
      const newProd: ProductItem = {
          id: Date.now(),
          name: newProductName.trim(),
          barcode: newBarcode.trim(),
          sold: "0 sold",
          value: `₹${priceNum}`,
          width: "30%",
          color: "bg-indigo-500",
          price: priceNum
      };

      // 1. Save locally so it's instantly available offline
      const localProducts = getStoreProducts(shopkeeper?.email);
      saveStoreProducts([newProd, ...localProducts], shopkeeper?.email);

      // 2. Attempt backend sync in background
      try {
          await axios.post(apiUrl("/api/products/"), {
              name: newProductName.trim(),
              barcode: newBarcode.trim(),
              sold: "0 sold",
              value: `₹${priceNum}`,
              width: "30%",
              color: "bg-indigo-500",
              shopkeeper_email: shopkeeper?.email
          }, { timeout: 2500 });
      } catch (err) {
          console.warn("Backend product save deferred:", err);
      }
      
      setItems(prev => [...prev, { product: newProductName.trim(), quantity: 1, unit_price: priceNum }]);
      toast.success("Product saved and added to bill!");
      
      setShowNewProductModal(false);
      setNewProductName("");
      setNewProductPrice("");
      if (autoResumeCamera) setScanning(true);
  };

  const handleClear = () => {
      setItems([]);
      sessionStorage.removeItem('barcodeBilling_items');
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
          toast.error("Please add products before sending.");
          return;
      }
      setShowWhatsAppModal(true);
  };

  const handleCompleteSale = async () => {
      const grandTotal = calculateGrandTotal();
      if (grandTotal <= 0) {
          toast.error("Please add products before completing the sale.");
          return;
      }
      const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const customerNameToSave = billCustomerName.trim() || "Walk-in Customer";
      const customerInitials = billCustomerName.trim() ? billCustomerName.trim().substring(0, 2).toUpperCase() : "WC";
      const invoicePayload = { invoiceNumber, customerNameToSave, customerInitials, grandTotal };
      setPendingInvoice(invoicePayload);
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
      const _now = new Date();
      const billRecord = {
          invoice: invoiceNumber,
          customer: customerNameToSave,
          amount: `₹${grandTotal}`,
          time: new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(_now),
          created_at: _now.toISOString(),
          status: status,
          payment_mode: payment_mode,
          initials: customerInitials,
          tone: status === "Paid" ? "emerald" : "amber",
          items: items,
          shopkeeper_email: shopkeeper?.email
      };

      try {
          const res = await axios.post(apiUrl("/api/bills/"), billRecord, { timeout: 3000 });
          const savedBill = res.data?.invoice ? res.data : billRecord;
          addStoreBill(savedBill, shopkeeper?.email);
          toast.success(`Sale recorded via ${payment_mode}! Bill generated. Downloading PDF...`);
          await downloadInvoicePdf(savedBill, shopkeeper);
          setBillCustomerName("");
          handleClear();
      } catch (err) {
          console.warn("Backend offline, saving bill locally:", err);
          const savedBill = addStoreBill(billRecord, shopkeeper?.email);
          toast.success(`Sale recorded via ${payment_mode}! Bill generated. Downloading PDF...`);
          await downloadInvoicePdf(savedBill, shopkeeper);
          setBillCustomerName("");
          handleClear();
      }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col items-center rounded-2xl sm:rounded-3xl border border-indigo-100 bg-white p-4 sm:p-8 shadow-xl shadow-indigo-100/40">
            <div className="mb-5 flex flex-col items-center text-center">
                <div className="mb-3 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/30">
                    <ScanLine className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Barcode Scanner</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md">
                    Scan products to instantly build your customer's invoice.
                </p>
            </div>

            {error && (
                <div className="mb-6 flex w-full max-w-2xl items-center gap-3 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="w-full max-w-2xl flex flex-col items-center">
                {!scanning ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span>Camera:</span>
                            <button
                                type="button"
                                onClick={() => setFacingMode(prev => prev === "environment" ? "user" : "environment")}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-xs font-bold transition"
                            >
                                <RefreshCw className="h-3.5 w-3.5" /> {facingMode === "environment" ? "Back Camera (Default)" : "Front Camera"}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                            <button 
                                onClick={() => setScanning(true)}
                                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 w-full sm:w-auto"
                            >
                                <ScanLine className="h-6 w-6" /> Start Camera
                            </button>
                            
                            <label className="flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-indigo-100 px-8 py-4 text-lg font-bold text-indigo-600 shadow-lg shadow-indigo-100/25 transition hover:bg-indigo-50 cursor-pointer w-full sm:w-auto">
                                <ImageIcon className="h-6 w-6" /> Upload Image
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleImageUpload} 
                                />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-md space-y-4">
                        <div className="relative overflow-hidden rounded-2xl border-4 border-indigo-200 shadow-xl bg-black">
                            <div id="reader" className="w-full"></div>
                            
                            {/* Scanning Guide Reticle Overlay */}
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
                                <div className="relative h-40 w-64 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center">
                                    <span className="absolute -left-1 -top-1 h-5 w-5 border-l-4 border-t-4 border-emerald-400" />
                                    <span className="absolute -right-1 -top-1 h-5 w-5 border-r-4 border-t-4 border-emerald-400" />
                                    <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400" />
                                    <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400" />
                                    
                                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_10px_#f43f5e] animate-pulse" />
                                    <span className="text-[11px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">Align Barcode Here</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Camera Controls Row */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={handleFlipCamera}
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 py-3 text-xs font-bold text-indigo-700 shadow-sm transition active:scale-95"
                            >
                                <RefreshCw className="h-4 w-4" /> Flip ({facingMode === "environment" ? "Back" : "Front"})
                            </button>
                            <button
                                type="button"
                                onClick={toggleTorch}
                                className={`flex items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-bold shadow-sm transition active:scale-95 ${torchOn ? "bg-amber-400 text-slate-900 border-amber-500" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"}`}
                            >
                                <Zap className="h-4 w-4" /> Torch: {torchOn ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => setScanning(false)}
                                className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
                            >
                                Stop Camera
                            </button>
                            <button 
                                onClick={handleCaptureFrame}
                                className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700 flex justify-center items-center gap-2"
                            >
                                <CropIcon className="h-4 w-4" /> Capture & Crop
                            </button>
                        </div>
                        <div className="flex justify-center">
                            <label className="w-full rounded-xl bg-white border-2 border-slate-200 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer flex justify-center items-center gap-2">
                                <Upload className="h-4 w-4" /> Upload Barcode Photo
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleImageUpload} 
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* Manual Barcode Input */}
                <form onSubmit={handleManualScan} className="mt-6 flex w-full max-w-md items-center gap-2">
                    <div className="relative flex-1">
                        <ScanLine className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={manualBarcode}
                            onChange={(e) => setManualBarcode(e.target.value)}
                            placeholder="Enter barcode (e.g. 8901262010053)..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                        />
                    </div>
                    <button
                        type="submit"
                        className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-indigo-600 active:scale-95 shadow-md"
                    >
                        Add to Bill
                    </button>
                </form>

                <div id="file-reader" style={{ position: "fixed", top: "-9999px", opacity: 0 }}></div>
            </div>
        </div>

        {items.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl border border-emerald-100 bg-white p-4 sm:p-8 shadow-xl shadow-emerald-100/50">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-display text-2xl font-bold text-slate-900">Current Bill</h3>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Edit quantities or prices if needed.</p>
                    </div>
                </div>

                {/* ── Mobile card list (< md) ── */}
                <div className="md:hidden space-y-3 mb-6">
                    {items.map((item: any, i: number) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <p className="text-sm font-bold text-slate-800 leading-snug flex-1 min-w-0">{item.product}</p>
                                <button
                                    type="button"
                                    onClick={() => { const next = items.filter((_, idx) => idx !== i); setItems(next); toast.info(`Removed ${item.product}`); }}
                                    className="flex-shrink-0 rounded-xl p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 active:scale-90 transition"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Quantity</p>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => handleItemChange(i, 'quantity', Math.max(1, (item.quantity || 1) - 1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-bold text-slate-700 active:scale-90 transition">-</button>
                                        <input type="number" min="1" value={item.quantity || ''} onChange={(e) => handleItemChange(i, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} className="w-12 rounded-xl border border-slate-200 bg-white py-1.5 text-center text-sm font-bold outline-none" />
                                        <button type="button" onClick={() => handleItemChange(i, 'quantity', (item.quantity || 1) + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-bold text-slate-700 active:scale-90 transition">+</button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Price (₹)</p>
                                    <input type="number" min="0" value={item.unit_price || ''} onChange={(e) => handleItemChange(i, 'unit_price', parseInt(e.target.value) || 0)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                                </div>
                            </div>
                            <div className="mt-3 flex justify-between items-center border-t border-slate-200 pt-3">
                                <p className="text-xs text-slate-500 font-medium">Item Total</p>
                                <p className="text-base font-black text-slate-900">₹{(item.quantity * item.unit_price) || 0}</p>
                            </div>
                        </div>
                    ))}
                    <div className="rounded-2xl bg-slate-900 p-4 flex justify-between items-center">
                        <p className="text-sm font-bold uppercase tracking-wider text-white">Grand Total</p>
                        <p className="text-xl font-black text-emerald-400">₹{calculateGrandTotal()}</p>
                    </div>
                </div>

                {/* ── Desktop table (≥ md) ── */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 mb-6">
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
                                <tr key={i} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-800">
                                        <span className="truncate max-w-[140px] sm:max-w-xs">{item.product}</span>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <div className="flex items-center justify-center gap-1">
                                            <button type="button" onClick={() => handleItemChange(i, 'quantity', Math.max(1, (item.quantity || 1) - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 active:scale-90 hover:bg-slate-200 transition">-</button>
                                            <input type="number" min="1" value={item.quantity || ''} onChange={(e) => handleItemChange(i, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} className="w-12 rounded-lg border border-slate-200 bg-white py-1 text-center text-sm font-bold outline-none" />
                                            <button type="button" onClick={() => handleItemChange(i, 'quantity', (item.quantity || 1) + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 active:scale-90 hover:bg-slate-200 transition">+</button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <input type="number" min="0" value={item.unit_price || ''} onChange={(e) => handleItemChange(i, 'unit_price', parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                                    </td>
                                    <td className="px-3 py-3.5 text-right text-sm font-bold text-slate-900">₹{(item.quantity * item.unit_price) || 0}</td>
                                    <td className="px-2 py-3.5 text-center">
                                        <button type="button" onClick={() => { const next = items.filter((_, idx) => idx !== i); setItems(next); toast.info(`Removed ${item.product}`); }} className="rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"><Trash2 className="h-4 w-4" /></button>
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

                {/* Action buttons — grid on mobile, row on desktop */}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 md:flex md:justify-end md:gap-3">
                    <button onClick={handleClear} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs sm:text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 active:scale-[0.98]"><Trash2 className="h-4 w-4" /> Clear</button>
                    <button onClick={() => setShowPreview(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs sm:text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]">Preview</button>
                    <button 
                        onClick={() => {
                            const grandTotal = calculateGrandTotal();
                            if (grandTotal <= 0) {
                                toast.error("Please add items/prices before downloading PDF.");
                                return;
                            }
                            downloadInvoicePdf({
                                invoice: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
                                customer: billCustomerName.trim() || "Walk-in Customer",
                                amount: `₹${grandTotal}`,
                                items: items,
                                payment_mode: "Cash",
                                status: "Paid"
                            }, shopkeeper);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs sm:text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 active:scale-[0.98]"
                    >
                        <Download className="h-4 w-4 text-indigo-600" /> PDF
                    </button>
                    <button onClick={sendToWhatsApp} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#20bd5a] active:scale-[0.98]"><Send className="h-4 w-4" /> WhatsApp</button>
                    <button onClick={handleCompleteSale} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-700 active:scale-[0.98]"><CheckCircle2 className="h-4 w-4" /> Complete Sale</button>
                </div>
            </div>
        )}

        {showNewProductModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
                    <button onClick={() => { setShowNewProductModal(false); if (autoResumeCamera) setScanning(true); }} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100">✕</button>
                    <h2 className="text-xl font-black text-slate-900 mb-2">New Product</h2>
                    <p className="text-sm text-slate-500 mb-6">Barcode {newBarcode} is unknown.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Product Name</label>
                            <input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Price (₹)</label>
                            <input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white" />
                        </div>
                        <button onClick={handleSaveNewProduct} className="mt-4 w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700">Save & Add to Bill</button>
                    </div>
                </div>
            </div>
        )}

        {/* Similar Preview and WhatsApp Modals as ImageBilling */}
        {showPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
                    <button onClick={() => setShowPreview(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100">✕</button>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-slate-900">QBill</h2>
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
                        <span>Grand Total</span><span className="text-emerald-600">₹{calculateGrandTotal()}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl bg-slate-50 p-6">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scan with GPay / PhonePe / Paytm</p>
                        <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-100">
                            <QRCode value={`upi://pay?pa=${encodeURIComponent((shopkeeper as any)?.upi_id || "qbill@upi")}&pn=${encodeURIComponent(shopkeeper?.business_name || "QBill Store")}&am=${calculateGrandTotal()}&cu=INR`} size={120} level="M" />
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => {
                                downloadInvoicePdf({
                                    invoice: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
                                    customer: billCustomerName.trim() || "Walk-in Customer",
                                    amount: `₹${calculateGrandTotal()}`,
                                    items: items,
                                    payment_mode: "Cash",
                                    status: "Paid"
                                }, shopkeeper);
                            }}
                            className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-xs font-bold text-indigo-700 shadow transition hover:bg-indigo-100 active:scale-[0.98]"
                        >
                            <Download className="h-4 w-4" /> Download PDF
                        </button>
                        <button onClick={() => setShowPreview(false)} className="rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-slate-800 active:scale-[0.98]">Close Preview</button>
                    </div>
                </div>
            </div>
        )}
        
        <WhatsAppModal
            isOpen={showWhatsAppModal}
            onClose={() => setShowWhatsAppModal(false)}
            items={items}
            grandTotal={calculateGrandTotal()}
            initialCustomerName={billCustomerName}
            shopkeeper={shopkeeper}
        />

        {imgSrc && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col items-center animate-in zoom-in-95 duration-200">
                    <div className="w-full flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <CropIcon className="h-5 w-5 text-indigo-500" /> Select Barcode Region
                        </h2>
                        <button onClick={() => { setImgSrc(""); if (autoResumeCamera) setScanning(true); }} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">✕</button>
                    </div>
                    
                    <p className="text-sm font-medium text-slate-500 mb-6 text-center w-full bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        Drag to draw a box around the barcode to help the scanner recognize it.
                    </p>
                    
                    <div className="max-h-[50vh] w-full overflow-auto rounded-2xl border-4 border-slate-100 bg-slate-50 flex justify-center items-center">
                        <ReactCrop 
                            crop={crop} 
                            onChange={(_, percentCrop) => setCrop(percentCrop)} 
                            onComplete={(c) => setCompletedCrop(c)}
                            className="max-h-[50vh]"
                        >
                            <img ref={imgRef} src={imgSrc} alt="Upload" className="max-h-[50vh] object-contain" />
                        </ReactCrop>
                    </div>
                    
                    <div className="mt-8 flex w-full gap-4">
                        <button onClick={() => { setImgSrc(""); if(autoResumeCamera) setScanning(true); }} className="flex-1 rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-200 transition">Cancel</button>
                        <button onClick={handleCropComplete} className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition">
                            Scan Selection
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Payment Mode Selection Modal */}
        {showPaymentModeModal && pendingInvoice && (
            <PaymentModeModal
                amount={pendingInvoice.grandTotal}
                invoiceNumber={pendingInvoice.invoiceNumber}
                customerName={pendingInvoice.customerNameToSave}
                storeName={shopkeeper?.business_name || "SmartQ Store"}
                upiId={(shopkeeper as any)?.upi_id}
                onClose={() => setShowPaymentModeModal(false)}
                onSelectPaymentMode={handlePaymentModeSelected}
            />
        )}

        {/* UPI Payment Modal */}
        {showUpiModal && pendingInvoice && (
            <UpiPaymentModal
                amount={pendingInvoice.grandTotal}
                storeName={shopkeeper?.business_name || "SmartQ Store"}
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
