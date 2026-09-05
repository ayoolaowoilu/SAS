"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UPDATES, UPDATE_STORAGE_KEY } from "../lib/update-data";


export default function LatestUpdatePopup() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const latest = UPDATES[0];
    // Small delay so the popup doesn't flash during initial page render.
    const timer = setTimeout(() => {
      try {
        const lastRead = localStorage.getItem(UPDATE_STORAGE_KEY);
        if (lastRead !== latest.id) setShow(true);
      } catch {
        setShow(true);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const markRead = () => {
    try {
      localStorage.setItem(UPDATE_STORAGE_KEY, UPDATES[0].id);
    } catch {
      // storage unavailable — popup will simply show again next visit
    }
  };

  const handleRead = () => {
    markRead();
    setShow(false);
    router.push("/updates");
  };

  const handleLater = () => {
    markRead();
    setShow(false);
  };

  const latest = UPDATES[0];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.35 }}
            className="update-popup-card"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.875rem",
              padding: "2rem 2.25rem",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              position: "relative",
            }}
          >
            {/* Dismiss × */}
            <button
              onClick={handleLater}
              aria-label="Dismiss"
              style={{
                position: "absolute",
                top: "0.875rem",
                right: "0.875rem",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#f5f5f5",
                color: "#888888",
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l18-8-8 18-2.5-7.5L3 11z" />
              </svg>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  padding: "0.2rem 0.625rem",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "2rem",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: "#333333",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {latest.tag}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#aaaaaa" }}>{latest.date}</span>
            </div>

            <h2
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "#000000",
                letterSpacing: "-0.02em",
              }}
            >
              {latest.title}
            </h2>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.88rem", color: "#888888", lineHeight: 1.6 }}>
              {latest.summary}
            </p>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <motion.button
                onClick={handleRead}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: "0.65rem 1.5rem",
                  backgroundColor: "#000000",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  borderRadius: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Read Update
              </motion.button>
              <motion.button
                onClick={handleLater}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: "0.65rem 1.5rem",
                  backgroundColor: "#ffffff",
                  color: "#555555",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e5e5",
                  cursor: "pointer",
                }}
              >
                Maybe Later
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}