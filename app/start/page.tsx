"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/navbar";
import { addRedisData } from "../lib/redis";
import { saveSession, getAllSessions, deleteSession } from "../lib/indexdb";

/* ──────────────────────────── Types ──────────────────────────── */

interface Session {
  id: string;
  name: string;
  startedAt: number;
  durationMs: number;
  expected: number;
  attended: number;
  status: "active" | "ended";
  classKey: string;
}

/* ──────────────────────────── Helpers ──────────────────────────── */

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateClassKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/* ──────────────────────────── Create Session Form ──────────────────────────── */

function CreateSessionForm({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [expected, setExpected] = useState(30);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const durationMs = (durationHours * 60 + durationMinutes) * 60 * 1000;
      const classKey = generateClassKey();
      const session: Session = {
        id: classKey,
        name: name.trim(),
        startedAt: Date.now(),
        durationMs,
        expected: Math.max(1, expected),
        attended: 0,
        status: "active",
        classKey,
      };

      // Save to IndexedDB FIRST (primary storage)
      await saveSession(session);

      // Sync to Redis (fire and forget)
      try {
        await addRedisData(session, classKey, Math.floor(durationMs / 1000));
      } catch (err) {
        console.error("[Start] Redis sync error:", err);
      }

      // Track this session as "my session" (manager)
      if (typeof window !== "undefined") {
        const mySessions = localStorage.getItem("mySession");
        let sessionList: string[] = [];
        if (mySessions) {
          try { sessionList = JSON.parse(mySessions); } catch { sessionList = []; }
        }
        if (!sessionList.includes(classKey)) {
          sessionList.push(classKey);
          localStorage.setItem("mySession", JSON.stringify(sessionList));
        }
      }

      onCreated();
      router.push(`/session/${classKey}`);
    } catch (err) {
      console.error("[Start] Create session error:", err);
      setCreating(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ border: "1px solid #f0f0f0", borderRadius: "0.875rem", padding: "1.5rem", backgroundColor: "#ffffff" }}
    >
      <h2 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#000000" }}>Create New Session</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Session Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Introduction to React"
          required
          disabled={creating}
          style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #e5e5e5", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", opacity: creating ? 0.6 : 1 }}
          onFocus={(e) => (e.target.style.borderColor = "#000000")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Duration (hrs)</label>
          <input
            type="number"
            min={0}
            max={12}
            value={durationHours}
            onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={creating}
            style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #e5e5e5", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Duration (mins)</label>
          <input
            type="number"
            min={0}
            max={59}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            disabled={creating}
            style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #e5e5e5", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Expected Attendees</label>
        <input
          type="number"
          min={1}
          value={expected}
          onChange={(e) => setExpected(Math.max(1, parseInt(e.target.value) || 1))}
          disabled={creating}
          style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #e5e5e5", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      <motion.button
        type="submit"
        disabled={creating || !name.trim()}
        whileHover={creating || !name.trim() ? {} : { scale: 1.02, y: -1 }}
        whileTap={creating || !name.trim() ? {} : { scale: 0.98 }}
        style={{ width: "100%", padding: "0.75rem", backgroundColor: "#000000", color: "#ffffff", fontSize: "0.9rem", fontWeight: 600, borderRadius: "0.5rem", border: "none", cursor: creating || !name.trim() ? "not-allowed" : "pointer", opacity: creating || !name.trim() ? 0.6 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
      >
        {creating ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#ffffff", borderRadius: "50%" }} />
            Creating...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create Session
          </>
        )}
      </motion.button>
    </motion.form>
  );
}

/* ──────────────────────────── Join Session Form ──────────────────────────── */

function JoinSessionForm() {
  const router = useRouter();
  const [classKey, setClassKey] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classKey.trim()) return;

    const key = classKey.trim().toUpperCase();
    setJoining(true);
    setError(null);

    try {
      // Check if session exists in IndexedDB first (fast, no network)
      const { getSession } = await import("../lib/indexdb");
      const localSession = await getSession(key);

      if (localSession) {
        router.push(`/session/${key}`);
        return;
      }

      // If not found locally, try Redis once
      const { getRedisData } = await import("../lib/redis");
      const redisData = await getRedisData(key);

      if (redisData) {
        // Save to IndexedDB for future offline access
        let parsed: unknown;
        if (typeof redisData === "string") {
          try { parsed = JSON.parse(redisData); } catch { parsed = redisData; }
        } else {
          parsed = redisData;
        }

        if (parsed && typeof parsed === "object" && "id" in parsed) {
          await saveSession(parsed as Session);
        }
        router.push(`/session/${key}`);
        return;
      }

      setError("Session not found. Please check the class key and try again.");
    } catch (err) {
      setError("Failed to join session. Please try again.");
      console.error("[Start] Join session error:", err);
    } finally {
      setJoining(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ border: "1px solid #f0f0f0", borderRadius: "0.875rem", padding: "1.5rem", backgroundColor: "#ffffff" }}
    >
      <h2 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#000000" }}>Join Session</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Class Key</label>
        <input
          type="text"
          value={classKey}
          onChange={(e) => setClassKey(e.target.value.toUpperCase())}
          placeholder="Enter 6-digit class key"
          maxLength={6}
          required
          disabled={joining}
          style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #e5e5e5", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", opacity: joining ? 0.6 : 1 }}
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
            style={{ padding: "0.75rem 1rem", backgroundColor: "#fff0f0", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#cc4444", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={joining || !classKey.trim()}
        whileHover={joining || !classKey.trim() ? {} : { scale: 1.02, y: -1 }}
        whileTap={joining || !classKey.trim() ? {} : { scale: 0.98 }}
        style={{ width: "100%", padding: "0.75rem", backgroundColor: "#000000", color: "#ffffff", fontSize: "0.9rem", fontWeight: 600, borderRadius: "0.5rem", border: "none", cursor: joining || !classKey.trim() ? "not-allowed" : "pointer", opacity: joining || !classKey.trim() ? 0.6 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
      >
        {joining ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#ffffff", borderRadius: "50%" }} />
            Joining...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
            Join Session
          </>
        )}
      </motion.button>
    </motion.form>
  );
}

/* ──────────────────────────── Session Card ──────────────────────────── */

function SessionCard({ session, onDelete }: { session: Session; onDelete: (key: string) => void }) {
  const router = useRouter();
  const attendanceRate = session.expected > 0 ? Math.round((session.attended / session.expected) * 100) : 0;
  const isEnded = session.status === "ended";
  const endAt = session.startedAt + session.durationMs;
  const isExpired = !isEnded && Date.now() > endAt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: "0.75rem",
        padding: "1.25rem",
        backgroundColor: "#ffffff",
        cursor: "pointer",
        transition: "box-shadow 0.2s",
      }}
      onClick={() => router.push(`/session/${session.classKey}`)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: 700, color: "#000000" }}>{session.name}</h3>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#888888" }}>{formatDateTime(session.startedAt)}</p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.3rem 0.75rem",
            backgroundColor: isEnded || isExpired ? "#f5f5f5" : "#f0fff5",
            borderRadius: "2rem",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: isEnded || isExpired ? "#cccccc" : "#008844",
            }}
          />
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: isEnded || isExpired ? "#888888" : "#008844", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {isEnded ? "Ended" : isExpired ? "Expired" : "Active"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ textAlign: "center", padding: "0.5rem", backgroundColor: "#fafafa", borderRadius: "0.5rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#000000" }}>{session.attended}</div>
          <div style={{ fontSize: "0.68rem", color: "#888888" }}>Attended</div>
        </div>
        <div style={{ textAlign: "center", padding: "0.5rem", backgroundColor: "#fafafa", borderRadius: "0.5rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#000000" }}>{session.expected}</div>
          <div style={{ fontSize: "0.68rem", color: "#888888" }}>Expected</div>
        </div>
        <div style={{ textAlign: "center", padding: "0.5rem", backgroundColor: "#fafafa", borderRadius: "0.5rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: attendanceRate >= 80 ? "#008844" : attendanceRate >= 50 ? "#cc8800" : "#cc4444" }}>{attendanceRate}%</div>
          <div style={{ fontSize: "0.68rem", color: "#888888" }}>Rate</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.72rem", color: "#888888" }}>Key:</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, fontFamily: "monospace", color: "#000000", letterSpacing: "0.05em" }}>{session.classKey}</span>
        </div>
        <span style={{ fontSize: "0.72rem", color: "#aaaaaa" }}>{formatDuration(session.durationMs)}</span>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────── Main Page ──────────────────────────── */

export default function StartPage() {
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Load sessions from IndexedDB ONLY (no Redis polling) ── */
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await getAllSessions();
      // Sort by startedAt desc
      sessions.sort((a:any, b:any) => b.startedAt - a.startedAt);
      setMySessions(sessions as any);
    } catch (err) {
      console.error("[Start] Load sessions error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDelete = useCallback(async (classKey: string) => {
    try {
      await deleteSession(classKey);
      // Also remove from localStorage mySession list
      if (typeof window !== "undefined") {
        const mySessionList = localStorage.getItem("mySession");
        if (mySessionList) {
          try {
            const list: string[] = JSON.parse(mySessionList);
            const updated = list.filter((k) => k !== classKey);
            localStorage.setItem("mySession", JSON.stringify(updated));
          } catch { /* ignore */ }
        }
      }
      setMySessions((prev) => prev.filter((s) => s.classKey !== classKey));
    } catch (err) {
      console.error("[Start] Delete session error:", err);
    }
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif", padding: "2rem 1rem", paddingTop: "96px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: "2rem", textAlign: "center" }}>
            <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800, color: "#000000", letterSpacing: "-0.02em" }}>
              Attendance Tracker
            </h1>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#888888" }}>Create or join a session to track attendance.</p>
          </motion.div>

          {/* Forms Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            <CreateSessionForm onCreated={loadSessions} />
            <JoinSessionForm />
          </div>

          {/* My Sessions */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#000000" }}>My Sessions</h2>
              <span style={{ fontSize: "0.78rem", color: "#aaaaaa" }}>{mySessions.length} total</span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaaaaa" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "24px", height: "24px", border: "2px solid #f0f0f0", borderTopColor: "#000000", borderRadius: "50%", margin: "0 auto 0.75rem" }} />
                <span style={{ fontSize: "0.85rem" }}>Loading sessions...</span>
              </div>
            ) : mySessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaaaaa", fontSize: "0.9rem", border: "1px dashed #e5e5e5", borderRadius: "0.75rem" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5" style={{ marginBottom: "0.75rem" }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <div>No sessions yet.</div>
                <div style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>Create a new session to get started.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                <AnimatePresence>
                  {mySessions.map((session) => (
                    <SessionCard key={session.classKey} session={session} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}