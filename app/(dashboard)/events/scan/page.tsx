"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { CheckCircleIcon, ErrorIcon, AlertIcon } from "@/icons";
import { Html5Qrcode } from "html5-qrcode";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function TicketScanPage() {
  const supabase = createClient();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [manualCode, setManualCode] = useState("");
  const [location, setLocation] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  const startScanning = async () => {
    try {
      setScanning(true);
      setResult(null);

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleQRCode(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors
        }
      );
    } catch (err: any) {
      console.error("Scanning error:", err);
      setResult({
        success: false,
        error: "scanning_error",
        message: err.message || "Failed to start camera",
      });
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
          setScanning(false);
        })
        .catch((err) => {
          console.error("Stop error:", err);
          setScanning(false);
        });
    }
  };

  const handleQRCode = async (qrData: string) => {
    stopScanning();

    try {
      // Parse QR code data
      let qrCodeData;
      try {
        qrCodeData = JSON.parse(qrData);
      } catch (e) {
        // If not JSON, treat as direct hash
        qrCodeData = qrData;
      }

      // Use the admin panel's own API endpoint
      const response = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeData: qrCodeData,
          location: location || "Main Entrance",
          staffId: null, // You can get this from auth (e.g., from Clerk)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setResult({
          success: false,
          error: errorData.error || "verification_error",
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          ...(errorData.ticket_number && { ticket_number: errorData.ticket_number }),
          ...(errorData.redeemed_at && { redeemed_at: errorData.redeemed_at }),
        });
        return;
      }

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      console.error("Verification error:", error);
      setResult({
        success: false,
        error: "verification_error",
        message: error.message || "Failed to verify ticket. Please check your connection and try again.",
      });
    }
  };

  const handleManualEntry = async () => {
    if (!manualCode.trim()) {
      setResult({
        success: false,
        error: "empty_code",
        message: "Please enter a ticket number or QR code data",
      });
      return;
    }

    await handleQRCode(manualCode);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanning();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Events" }, { label: "Scan Tickets" }]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            QR Code Scanner
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Main Entrance, VIP Gate"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
            />
          </div>

          <div
            id="reader"
            className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 overflow-hidden"
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
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter ticket number or QR data"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
                onKeyPress={(e) => {
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
              <p>Scan a ticket QR code to verify</p>
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
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Redeemed At</p>
                  <p className="font-semibold">
                    {formatFloridaTime(result.redeemed_at, 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  setResult(null);
                  setManualCode("");
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

              {result.error === "already_used" && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                        This ticket was already used
                      </p>
                      {result.ticket_number && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                          Ticket #{result.ticket_number}
                        </p>
                      )}
                      {result.redeemed_at && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Redeemed: {formatFloridaTime(result.redeemed_at, 'MMM d, yyyy h:mm a')}
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
  );
}

