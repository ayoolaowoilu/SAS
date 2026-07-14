"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const POPUP_KEY = "sas_welcome_shown";

export default function PopupWrapper() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const alreadyShown = localStorage.getItem(POPUP_KEY);
    if (!alreadyShown) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(POPUP_KEY, "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            maxWidth: "360px",
            width: "calc(100% - 3rem)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #f0f0f0",
              borderRadius: "0.875rem",
              padding: "1.25rem 1.5rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <h3 style={{ margin: "0 0 0.375rem 0", fontSize: "0.95rem", fontWeight: 700, color: "#000000" }}>
                  Welcome to SAS
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#888888", lineHeight: 1.5 }}>
                  Create a session to start tracking attendance, or join one with a class key. All data is stored locally.
                </p>
              </div>
              <button
                onClick={handleDismiss}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.25rem",
                  color: "#aaaaaa",
                  display: "flex",
                  flexShrink: 0,
                  marginTop: "-0.25rem",
                  marginRight: "-0.25rem",
                }}
                aria-label="Dismiss"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}