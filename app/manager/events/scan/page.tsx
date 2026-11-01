"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { Html5Qrcode } from "html5-qrcode";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function ManagerTicketScanPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [manualCode, setManualCode] = useState("");
  const [location, setLocation] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop/clear warning:", err);
      } finally {
        scannerRef.current = null;
        setScanning(false);
        isProcessingRef.current = false;
      }
    } else {
      setScanning(false);
      isProcessingRef.current = false;
    }
  };

  const startScanning = async () => {
    try {
      setResult(null);
      isProcessingRef.current = false;

      // Clean up previous scanner instance if one exists
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (e) {
          // Ignore cleanup error
        }
        scannerRef.current = null;
      }

      setScanning(true);

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const qrConfig = {
        fps: 10,
        qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
          const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.8;
          const squareSize = Math.min(size, 300);
          return { width: squareSize, height: squareSize };
        },
      };

      const onScanSuccess = (decodedText: string) => {
        // Prevent duplicate frame processing
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        handleQRCode(decodedText);
      };

      try {
        // Try environment (back) camera first
        await html5QrCode.start(
          { facingMode: "environment" },
          qrConfig,
          onScanSuccess,
          () => {}
        );
      } catch (backCamError) {
        console.warn("Back camera unavailable, falling back to default/front camera:", backCamError);
        // Fallback to front or default camera (e.g. laptop webcam)
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
    }
  };

  const handleQRCode = async (qrData: string) => {
    // Stop scanning immediately to prevent duplicate reads
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

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) {}
      }
    };
  }, []);

  const CheckIcon = () => (
    <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const ErrorIcon = () => (
    <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const AlertIcon = () => (
    <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          #reader video,
          #reader canvas {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover;
            aspect-ratio: 1 / 1;
          }
          #reader {
            position: relative;
          }
          #reader > div {
            width: 100% !important;
            height: 100% !important;
            aspect-ratio: 1 / 1;
          }
        `
      }} />
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Scan Tickets</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Scanner Section */}
          <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR Code Scanner
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                type="text"
                value={location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
                placeholder="e.g., Main Entrance, VIP Gate"
              />
            </div>

            <div
              id="reader"
              className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 overflow-hidden max-w-md mx-auto"
            />

            {!scanning ? (
              <Button onClick={startScanning} className="w-full">
                Start Scanning
              </Button>
            ) : (
              <Button variant="outline" onClick={stopScanning} className="w-full">
                Stop Scanning
              </Button>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold mb-2">Manual Entry</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualCode(e.target.value)}
                  placeholder="Enter ticket number or QR data"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleManualEntry();
                    }
                  }}
                  className="flex-1 h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                />
                <Button variant="outline" onClick={handleManualEntry}>
                  Verify
                </Button>
              </div>
            </div>
          </div>

          {/* Result Section */}
          <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Verification Result</h2>

            {!result ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <svg className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p>Scan a ticket QR code to verify</p>
              </div>
            ) : result.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/20 rounded-lg">
                  <CheckIcon />
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
                    <p className="font-semibold">{result.ticket_number}</p>
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
                    <p className="text-xs text-gray-600 dark:text-gray-400">Redeemed At</p>
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
                  <ErrorIcon />
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
                      <AlertIcon />
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
