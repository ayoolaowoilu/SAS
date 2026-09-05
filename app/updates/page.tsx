"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/navbar";
import { UPDATES, UPDATE_STORAGE_KEY, UpdateEntry } from "../lib/update-data";

function UpdateCard({ update, isLatest, index }: { update: UpdateEntry; isLatest: boolean; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="update-card"
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: "0.875rem",
        padding: "1.5rem",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "0.875rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "0.25rem 0.75rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "2rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#333333",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {update.tag}
          </span>
          {isLatest && (
            <span
              style={{
                padding: "0.25rem 0.75rem",
                backgroundColor: "#f0fff5",
                borderRadius: "2rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#008844",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              New
            </span>
          )}
        </div>
        <span style={{ fontSize: "0.78rem", color: "#aaaaaa" }}>{update.date}</span>
      </div>

      <h2
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "1.15rem",
          fontWeight: 800,
          color: "#000000",
          letterSpacing: "-0.02em",
        }}
      >
        {update.title}
      </h2>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "#888888", lineHeight: 1.6 }}>
        {update.summary}
      </p>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: "1px solid #f5f5f5", marginTop: "1rem", paddingTop: "1rem" }}>
              {update.body.map((paragraph, i) => (
                <p
                  key={i}
                  style={{
                    margin: i === update.body.length - 1 ? 0 : "0 0 0.875rem 0",
                    fontSize: "0.9rem",
                    color: "#555555",
                    lineHeight: 1.7,
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          marginTop: "1.25rem",
          padding: "0.5rem 1rem",
          backgroundColor: open ? "#ffffff" : "#000000",
          color: open ? "#333333" : "#ffffff",
          fontSize: "0.78rem",
          fontWeight: 600,
          borderRadius: "0.375rem",
          border: open ? "1px solid #e5e5e5" : "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
        }}
      >
        {open ? "Show less" : "Read more"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </motion.button>
    </motion.div>
  );
}

export default function UpdatesPage() {
  // Visiting the updates page counts as "read" so the popup stays gone.
  useEffect(() => {
    try {
      localStorage.setItem(UPDATE_STORAGE_KEY, UPDATES[0].id);
    } catch {
      // ignore
    }
  }, []);

  const latestId = UPDATES[0]?.id;

  return (
    <div>
      <Navbar />
      <div
        className="updates-wrap"
        style={{
          minHeight: "100vh",
          backgroundColor: "#ffffff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
          padding: "2rem 1rem",
          paddingTop: "96px",
        }}
      >
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: "2rem" }}
          >
            <h1
              style={{
                margin: "0 0 0.375rem 0",
                fontSize: "clamp(1.4rem, 4vw, 1.75rem)",
                fontWeight: 800,
                color: "#000000",
                letterSpacing: "-0.02em",
              }}
            >
              Updates
            </h1>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#888888" }}>
              What is new in SAS — every improvement, explained.
            </p>
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {UPDATES.map((update, index) => (
              <UpdateCard key={update.id} update={update} isLatest={update.id === latestId} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer — swap for your own Footer component if you have one */}
      <footer style={{ borderTop: "1px solid #f0f0f0", backgroundColor: "#ffffff", padding: "2rem 1rem" }}>
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#000000", letterSpacing: "-0.01em" }}>SAS</div>
            <div style={{ fontSize: "0.75rem", color: "#aaaaaa", marginTop: "0.125rem" }}>Student Attendance System</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/" style={{ fontSize: "0.78rem", color: "#888888", textDecoration: "none" }}>
              Home
            </Link>
            <Link href="/updates" style={{ fontSize: "0.78rem", color: "#000000", textDecoration: "none", fontWeight: 600 }}>
              Updates
            </Link>
            <span style={{ fontSize: "0.78rem", color: "#cccccc" }}>© 2026 SAS</span>
          </div>
        </div>
      </footer>

      <style>{`
        /* ── Mobile-only tuning (<=640px) — desktop untouched ── */
        @media (max-width: 640px) {
          .updates-wrap { padding: 1rem 0.75rem !important; padding-top: 84px !important; }
          .update-card { padding: 1rem !important; }
          .update-popup-card { padding: 1.5rem 1.25rem !important; }
        }
      `}</style>
    </div>
  );
}