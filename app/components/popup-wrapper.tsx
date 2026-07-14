"use client";

import React, { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // 1. Listen for the browser's install event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Prevent default browser mini-infobar
      setDeferredPrompt(e);
      setShowInstall(true); // Show your custom UI
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // 2. Trigger the browser's install prompt
    deferredPrompt.prompt();

    // 3. Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("User accepted the install");
    }

    // 4. Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "1.5rem", zIndex: 9999,
      backgroundColor: "#ffffff", padding: "1rem", borderRadius: "0.75rem",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
    }}>
      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Install SAS for a better experience?</p>
      <button 
        onClick={handleInstallClick}
        style={{
          backgroundColor: "#000", color: "#fff", border: "none",
          padding: "0.5rem 1rem", borderRadius: "0.5rem", cursor: "pointer"
        }}
      >
        Install App
      </button>
    </div>
  );
}