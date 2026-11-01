"use client";

import React, { useState, useEffect, useRef } from "react";
import BackButton from "@/components/common/BackButton";
import Button from "@/components/ui/button/Button";
import { CheckCircleIcon, ErrorIcon, AlertIcon } from "@/icons";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function ManagerTicketScanPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [manualCode, setManualCode] = useState("");
  const [location, setLocation] = useState("");
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load available camera devices
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((d) =>
            /back|rear|environment/i.test(d.label)
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not enumerate cameras automatically:", err);
      });

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, []);

  const stopScanning = async () => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (err) {
        console.warn("Scanner stop warning:", err);
      }
    }
    setScanning(false);
    isProcessingRef.current = false;
    setIsProcessing(false);
  };

  const startScanning = async () => {
    try {
      setResult(null);
      isProcessingRef.current = false;
      setIsProcessing(false);

      if (scannerRef.current) {
        await stopScanning();
      }

      setScanning(true);

      const html5QrCode = new Html5Qrcode("reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = html5QrCode;

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(Math.floor(minEdge * 0.75), 200);
          return { width: size, height: size };
        },
      };

      const onScanSuccess = (decodedText: string) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsProcessing(true);
        handleQRCode(decodedText);
      };

      if (selectedCameraId) {
        try {
          await html5QrCode.start(
            selectedCameraId,
            qrConfig,
            onScanSuccess,
            () => {}
          );
          return;
        } catch (camIdErr) {
          console.warn("Could not start selected camera ID, trying constraints:", camIdErr);
        }
      }

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          qrConfig,
          onScanSuccess,
          () => {}
        );
      } catch (backCamError) {
        console.warn("Back camera unavailable, falling back to front camera:", backCamError);
        await html5QrCode.start(
          { facingMode: "user" },
          qrConfig,
          onScanSuccess,
          () => {}
        );
      }
    } catch (err: any) {
      console.error("Scanning error:", err);
      setResult({
        success: false,
        error: "scanning_error",
        message: err.message || "Failed to start camera. Please verify camera permissions.",
      });
      setScanning(false);
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleQRCode = async (qrData: string) => {
    await stopScanning();

    try {
      const response = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeData: qrData,
          location: location || "Main Entrance",
          staffId: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error: data.error || "verification_error",
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
          ticket_number: data.ticket_number,
          customer_name: data.customer_name,
          ticket_type: data.ticket_type,
          event_title: data.event_title,
          redeemed_at: data.redeemed_at,
        });
        return;
      }

      setResult(data);
    } catch (error: any) {
      console.error("Verification error:", error);
      setResult({
        success: false,
        error: "verification_error",
        message: error.message || "Failed to verify ticket. Please check your connection and try again.",
      });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleManualEntry = async () => {
    const code = manualCode.trim();
    if (!code) {
      setResult({
        success: false,
        error: "empty_code",
        message: "Please enter a ticket number or QR code data",
      });
      return;
    }

    await handleQRCode(code);
  };

  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setResult(null);
      await stopScanning();

      // Use a hidden temporary container so the primary reader is not disturbed
      const tempScanner = new Html5Qrcode("file-reader-temp", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const decodedText = await tempScanner.scanFile(file, false);
      try {
        await tempScanner.clear();
      } catch (e) {}

      if (decodedText) {
        handleQRCode(decodedText);
      }
    } catch (err: any) {
      console.error("Error scanning uploaded image:", err);
      setResult({
        success: false,
        error: "file_scan_failed",
        message: "No QR code could be detected in the uploaded image. Please make sure the QR code is clearly visible and well-lit.",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          #reader {
            position: relative;
            overflow: hidden;
            width: 100% !important;
            height: 100% !important;
            border-radius: 0.75rem;
          }
          #reader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 0.75rem;
          }
        `
      }} />
      <div className="space-y-6">
        <BackButton />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            QR Code Scanner
          </h2>

          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Check-in Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Main Entrance, VIP Gate"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
              />
            </div>

            {cameras.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-1">Select Camera</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (scanning) {
                      stopScanning().then(() => startScanning());
                    }
                  }}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${c.id.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl mb-4 overflow-hidden max-w-md mx-auto flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700">
            {/* Dedicated container for html5-qrcode: NO children in React JSX */}
            <div id="reader" className="w-full h-full" />

            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6 text-gray-400">
                <svg className="h-16 w-16 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm">Click Start Scanning or Upload an Image</p>
              </div>
            )}
          </div>

          {/* Hidden helper container for file uploads */}
          <div id="file-reader-temp" className="hidden" />

          <div className="space-y-3">
            {!scanning ? (
              <Button onClick={startScanning} className="w-full">
                Start Scanning
              </Button>
            ) : (
              <Button variant="outline" onClick={stopScanning} className="w-full">
                Stop Scanning
              </Button>
            )}

            {/* Upload QR Image Option */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileScan}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Scan from Photo / Image File
              </Button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold mb-2">Manual Ticket Verification</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter ticket number (e.g. TKT-20261102-ALAM01)"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualEntry();
                  }
                }}
              />
              <Button variant="outline" onClick={handleManualEntry}>
                Verify
              </Button>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-6">
          <h2 className="text-xl font-semibold mb-4">Verification Result</h2>

          {!result ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p>Scan a ticket QR code or upload an image to verify</p>
            </div>
          ) : result.success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/20 rounded-lg">
                <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-bold text-green-800 dark:text-green-300">Ticket Verified!</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {result.message}
                  </p>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Ticket Number</p>
                  <p className="font-semibold text-lg">{result.ticket_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Customer</p>
                  <p className="font-semibold">{result.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Ticket Type</p>
                  <p className="font-semibold">{result.ticket_type}</p>
                </div>
                {result.event_title && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Event</p>
                    <p className="font-semibold">{result.event_title}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Checked In At</p>
                  <p className="font-semibold">
                    {formatFloridaTime(result.redeemed_at, 'MM-dd-yyyy h:mm a')}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  setResult(null);
                  setManualCode("");
                  startScanning();
                }}
                className="w-full"
              >
                Scan Another Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/20 rounded-lg">
                <ErrorIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-bold text-red-800 dark:text-red-300">Verification Failed</p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {result.message || "Invalid ticket"}
                  </p>
                </div>
              </div>

              {(result.error === "already_used" || result.error === "already_redeemed") && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                        This ticket was already used / checked in
                      </p>
                      {result.ticket_number && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                          Ticket #{result.ticket_number}
                        </p>
                      )}
                      {result.customer_name && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Customer: {result.customer_name} ({result.ticket_type || "General"})
                        </p>
                      )}
                      {result.event_title && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Event: {result.event_title}
                        </p>
                      )}
                      {result.redeemed_at && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Checked In: {formatFloridaTime(result.redeemed_at, 'MM-dd-yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setManualCode("");
                  startScanning();
                }}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
