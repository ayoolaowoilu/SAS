"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/navbar";
import { getRedisData } from "../lib/redis";
import { getSession, saveSession } from "../lib/indexdb";

interface Session {
  id: string;
  name: string;
  startedAt: number;
  durationMs: number;
  expected: number;
  attended: any[];
  status: "active" | "ended";
  classKey: string;
}

export default function JoinSessionPage() {
  const router = useRouter();
  const [classKey, setClassKey] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classKey.trim()) return;

    const key = classKey.trim().toUpperCase();
    setJoining(true);
    setError(null);

    try {
      // 1. Try Redis FIRST
      const redisData = await getRedisData(key);
      if (redisData) {
        let parsed: unknown;
        if (typeof redisData === "string") {
          try { parsed = JSON.parse(redisData); } catch { parsed = redisData; }
        } else {
          parsed = redisData;
        }

        if (parsed && typeof parsed === "object" && "id" in parsed) {
          // Cache to IndexedDB for future offline access
          try { await saveSession(parsed as Session); } catch { /* ignore cache errors */ }
          router.push(`/session/${key}`);
          return;
        }
      }

      // 2. Fallback to IndexedDB
      const localSession = await getSession(key);
      if (localSession) {
        router.push(`/session/${key}`);
        return;
      }

      // 3. Not found anywhere
      setError("Session not found. Please check the class key and try again.");
    } catch (err) {
      setError("Failed to join session. Please try again.");
      console.error("[Join] Error:", err);
    } finally {
      setJoining(false);
    }
  }, [classKey, router]);

  return (
    <div className="w-screen min-h-screen bg-white text-black" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif" }}>
      <Navbar />
      <div style={{ minHeight: "100vh", padding: "2rem 1rem", paddingTop: "96px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center", marginBottom: "2rem" }}
          >
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "clamp(1.4rem, 4vw, 1.75rem)", fontWeight: 800, color: "#000000", letterSpacing: "-0.02em" }}>
              Join Session
            </h1>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#888888" }}>
              Enter a class key to join an existing session.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ border: "1px solid #f0f0f0", borderRadius: "0.875rem", padding: "1.5rem", backgroundColor: "#ffffff" }}
          >
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Class Key
              </label>
              <input
                type="text"
                value={classKey}
                onChange={(e) => setClassKey(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit class key"
                maxLength={6}
                required
                disabled={joining}
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e5e5",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                  fontFamily: "monospace",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  opacity: joining ? 0.6 : 1,
                }}
                onFocus={(e) => (e.target.style.borderColor = "#000000")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: "#fff0f0",
                    borderRadius: "0.5rem",
                    fontSize: "0.85rem",
                    color: "#cc4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={joining || classKey.trim().length < 6}
              whileHover={joining || classKey.trim().length < 6 ? {} : { scale: 1.02, y: -1 }}
              whileTap={joining || classKey.trim().length < 6 ? {} : { scale: 0.98 }}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#000000",
                color: "#ffffff",
                fontSize: "0.9rem",
                fontWeight: 600,
                borderRadius: "0.5rem",
                border: "none",
                cursor: joining || classKey.trim().length < 6 ? "not-allowed" : "pointer",
                opacity: joining || classKey.trim().length < 6 ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {joining ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#ffffff", borderRadius: "50%" }}
                  />
                  Joining...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Join Session
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ textAlign: "center", marginTop: "1.5rem" }}
          >
            <button
              onClick={() => router.push("/")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
                color: "#888888",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Start
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}