"use client";

import React, { useState, useEffect } from "react";

// Define the interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

// Extend the global Window interface
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const handleInstallClick = async (): Promise<void> => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("User accepted the install");
    }

    setDeferredPrompt(null);
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "1.5rem",
        zIndex: 9999,
        backgroundColor: "#ffffff",
        padding: "1rem",
        borderRadius: "0.75rem",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        border: "1px solid #f0f0f0",
      }}
    >
      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#333" }}>
        Install SAS for a better experience?
      </p>
      <button
        onClick={handleInstallClick}
        style={{
          backgroundColor: "#000",
          color: "#fff",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "0.5rem",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 500,
        }}
      >
        Install App
      </button>
    </div>
  );
}