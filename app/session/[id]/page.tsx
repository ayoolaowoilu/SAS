"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../components/navbar";
import { getRedisData, addRedisData } from "../../lib/redis";
import {  saveSession, getSession, deleteSession } from "../../lib/indexdb";

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

interface Attendee {
  name: string;
  regNo: string;
  checkedInAt: number;
  id: string;
}



function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function formatTimeLeft(endAt: number): string {
  const diff = endAt - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
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

function generateAttendeeId(): string {
  return "att_" + Math.random().toString(36).substring(2, 10);
}

/* ─── PDF Download Helper ─── */
function downloadAttendancePDF(session: Session, attendees: Attendee[]) {
  const { jsPDF } = require("jspdf");
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Attendance Report", pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const infoLines = [
    `Session Name: ${session.name}`,
    `Class Key: ${session.classKey}`,
    `Date: ${formatDateTime(session.startedAt)}`,
    `Duration: ${formatDuration(session.durationMs)}`,
    `Expected: ${session.expected}`,
    `Attended: ${attendees.length}`,
    `Attendance Rate: ${session.expected > 0 ? Math.round((attendees.length / session.expected) * 100) : 0}%`,
    `Status: ${session.status}`,
  ];
  infoLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 6;
  });
  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Attendees", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 8, "F");
  doc.text("#", margin + 3, y);
  doc.text("Name", margin + 20, y);
  doc.text("Reg No", margin + 80, y);
  doc.text("Check-in Time", margin + 130, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  attendees.forEach((attendee, index) => {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin + 10;
    }
    doc.text(String(index + 1), margin + 3, y);
    doc.text(attendee.name, margin + 20, y);
    doc.text(attendee.regNo, margin + 80, y);
    doc.text(formatDateTime(attendee.checkedInAt), margin + 130, y);
    y += 6;
  });

  doc.save(`${session.name.replace(/\s+/g, "_")}_attendance.pdf`);
}

/* ─── JSON Download Helper ─── */
function downloadAttendanceJSON(session: Session, attendees: Attendee[]) {
  const data = {
    session: {
      id: session.id,
      name: session.name,
      startedAt: new Date(session.startedAt).toISOString(),
      duration: formatDuration(session.durationMs),
      durationMs: session.durationMs,
      expected: session.expected,
      attended: attendees.length,
      status: session.status,
      classKey: session.classKey,
      attendanceRate: `${session.expected > 0 ? Math.round((attendees.length / session.expected) * 100) : 0}%`,
    },
    attendees: attendees.map((a, i) => ({
      serialNo: i + 1,
      name: a.name,
      regNo: a.regNo,
      checkedInAt: new Date(a.checkedInAt).toISOString(),
      id: a.id,
    })),
    generatedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.name.replace(/\s+/g, "_")}_attendance.json`;
  a.click();
  URL.revokeObjectURL(url);
}



function NoSessionPopup({ onGoHome }: { onGoHome: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
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
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.875rem",
          padding: "2rem 2.5rem",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "#fff0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cc4444" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: 700, color: "#000000" }}>
          Session Not Found
        </h2>
        <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.9rem", color: "#888888", lineHeight: 1.5 }}>
          This session does not exist or has expired. Please check the class key and try again.
        </p>
        <motion.button
          onClick={onGoHome}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: "0.75rem 2rem",
            backgroundColor: "#000000",
            color: "#ffffff",
            fontSize: "0.9rem",
            fontWeight: 600,
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Go to Start Page
        </motion.button>
      </div>
    </motion.div>
  );
}


function ManagerView({
  session,
  attendees,
  onEndSession,
  ending,
}: {
  session: Session;
  attendees: Attendee[];
  onEndSession: () => void;
  ending: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const attendanceRate = session.expected > 0 ? Math.round((attendees.length / session.expected) * 100) : 0;
  const endAt = session.startedAt + session.durationMs;
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(endAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeft(endAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(session.classKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Session Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.35rem", fontWeight: 800, color: "#000000", letterSpacing: "-0.02em" }}>
              {session.name}
            </h2>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#888888" }}>
              Started {formatDateTime(session.startedAt)}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 0.875rem",
              backgroundColor: session.status === "active" ? "#f0fff5" : "#f5f5f5",
              borderRadius: "2rem",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: session.status === "active" ? "#008844" : "#cccccc",
                animation: session.status === "active" ? "pulse 2s infinite" : "none",
              }}
            />
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: session.status === "active" ? "#008844" : "#888888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {session.status}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ padding: "1rem", backgroundColor: "#fafafa", borderRadius: "0.625rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#000000" }}>{attendees.length}</div>
            <div style={{ fontSize: "0.72rem", color: "#888888", marginTop: "0.25rem" }}>Attended</div>
          </div>
          <div style={{ padding: "1rem", backgroundColor: "#fafafa", borderRadius: "0.625rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#000000" }}>{session.expected}</div>
            <div style={{ fontSize: "0.72rem", color: "#888888", marginTop: "0.25rem" }}>Expected</div>
          </div>
          <div style={{ padding: "1rem", backgroundColor: "#fafafa", borderRadius: "0.625rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: attendanceRate >= 80 ? "#008844" : attendanceRate >= 50 ? "#cc8800" : "#cc4444" }}>
              {attendanceRate}%
            </div>
            <div style={{ fontSize: "0.72rem", color: "#888888", marginTop: "0.25rem" }}>Rate</div>
          </div>
          <div style={{ padding: "1rem", backgroundColor: "#fafafa", borderRadius: "0.625rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#000000", fontFamily: "monospace" }}>{timeLeft}</div>
            <div style={{ fontSize: "0.72rem", color: "#888888", marginTop: "0.25rem" }}>Time Left</div>
          </div>
        </div>

        {/* Class Key + Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#f5f5f5",
            borderRadius: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", color: "#888888" }}>Class Key</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "monospace", color: "#000000", letterSpacing: "0.05em" }}>
              {session.classKey}
            </span>
            <motion.button
              onClick={handleCopyKey}
              whileTap={{ scale: 0.9 }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", color: copied ? "#008844" : "#999999", display: "flex", alignItems: "center" }}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span key="copied" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ fontSize: "0.75rem", fontWeight: 600 }}>✓ Copied</motion.span>
                ) : (
                  <motion.svg key="copy" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <motion.button
              onClick={() => downloadAttendanceJSON(session, attendees)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", backgroundColor: "#ffffff", color: "#333333", fontSize: "0.78rem", fontWeight: 600, borderRadius: "0.375rem", border: "1px solid #e5e5e5", cursor: "pointer" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              JSON
            </motion.button>
            <motion.button
              onClick={() => downloadAttendancePDF(session, attendees)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", backgroundColor: "#000000", color: "#ffffff", fontSize: "0.78rem", fontWeight: 600, borderRadius: "0.375rem", border: "none", cursor: "pointer" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              PDF
            </motion.button>
            {session.status === "active" && (
              <motion.button
                onClick={onEndSession}
                disabled={ending}
                whileHover={ending ? {} : { scale: 1.02 }}
                whileTap={ending ? {} : { scale: 0.98 }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", backgroundColor: "#fff0f0", color: "#cc4444", fontSize: "0.78rem", fontWeight: 600, borderRadius: "0.375rem", border: "1px solid #ffcccc", cursor: ending ? "not-allowed" : "pointer", opacity: ending ? 0.6 : 1 }}
              >
                {ending ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "12px", height: "12px", border: "2px solid rgba(204,68,68,0.3)", borderTopColor: "#cc4444", borderRadius: "50%" }} />
                    Ending...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                    </svg>
                    End Session
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Attendees List */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#000000" }}>Attendees</h3>
          <span style={{ fontSize: "0.78rem", color: "#aaaaaa" }}>{attendees.length} checked in</span>
        </div>

        {attendees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaaaaa", fontSize: "0.9rem", border: "1px dashed #e5e5e5", borderRadius: "0.625rem" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5" style={{ marginBottom: "0.75rem" }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div>No attendees yet.</div>
            <div style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>Share the class key to let people check in.</div>
          </div>
        ) : (
          <div style={{ border: "1px solid #f0f0f0", borderRadius: "0.625rem", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.625rem 1.25rem", borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
              <div style={{ width: "40px", fontSize: "0.7rem", fontWeight: 600, color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>#</div>
              <div style={{ flex: 2, fontSize: "0.7rem", fontWeight: 600, color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</div>
              <div style={{ flex: 1, fontSize: "0.7rem", fontWeight: 600, color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reg No</div>
              <div style={{ width: "140px", textAlign: "right", fontSize: "0.7rem", fontWeight: 600, color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Checked In</div>
            </div>

            <AnimatePresence>
              {attendees.map((attendee, index) => (
                <motion.div
                  key={attendee.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1.25rem", borderBottom: "1px solid #f5f5f5", cursor: "default" }}
                  whileHover={{ backgroundColor: "#fafafa" }}
                >
                  <div style={{ width: "40px", fontSize: "0.8rem", fontWeight: 600, color: "#aaaaaa", fontFamily: "monospace" }}>{index + 1}</div>
                  <div style={{ flex: 2, fontSize: "0.88rem", fontWeight: 500, color: "#000000" }}>{attendee.name}</div>
                  <div style={{ flex: 1, fontSize: "0.82rem", fontWeight: 500, color: "#333333", fontFamily: "monospace" }}>{attendee.regNo}</div>
                  <div style={{ width: "140px", textAlign: "right", fontSize: "0.78rem", color: "#888888" }}>{formatDateTime(attendee.checkedInAt)}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}


function AttendeeView({
  session,
  hasCheckedIn,
  onCheckIn,
  checkingIn,
  checkInError,
}: {
  session: Session;
  hasCheckedIn: boolean;
  onCheckIn: (name: string, regNo: string) => void;
  checkingIn: boolean;
  checkInError: string | null;
}) {
  const [name, setName] = useState("");
  const [regNo, setRegNo] = useState("");
  const endAt = session.startedAt + session.durationMs;
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(endAt));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(formatTimeLeft(endAt)), 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !regNo.trim()) return;
    onCheckIn(name.trim(), regNo.trim().toUpperCase());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "520px", margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ border: "1px solid #f0f0f0", borderRadius: "0.875rem", padding: "1.5rem", textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: 700, color: "#000000" }}>{session.name}</h2>
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#888888" }}>{formatDateTime(session.startedAt)}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ padding: "0.4rem 0.875rem", backgroundColor: "#f5f5f5", borderRadius: "2rem", fontSize: "0.78rem", fontWeight: 600, color: "#333333", fontFamily: "monospace" }}>{session.classKey}</div>
          <div style={{ padding: "0.4rem 0.875rem", backgroundColor: session.status === "active" ? "#f0fff5" : "#f5f5f5", borderRadius: "2rem", fontSize: "0.78rem", fontWeight: 600, color: session.status === "active" ? "#008844" : "#888888" }}>
            {session.status === "active" ? "● Active" : "Ended"}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ padding: "0.75rem", backgroundColor: "#fafafa", borderRadius: "0.5rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#888888", marginBottom: "0.25rem" }}>Duration</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#000000" }}>{formatDuration(session.durationMs)}</div>
          </div>
          <div style={{ padding: "0.75rem", backgroundColor: "#fafafa", borderRadius: "0.5rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#888888", marginBottom: "0.25rem" }}>Time Left</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#000000", fontFamily: "monospace" }}>{timeLeft}</div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        {hasCheckedIn ? (
          <div style={{ border: "1px solid #f0f0f0", borderRadius: "0.875rem", padding: "2rem 1.5rem", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#f0fff5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#008844" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#000000" }}>You are checked in!</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#888888" }}>Your attendance has been recorded for this session.</p>
          </div>
        ) : session.status === "ended" ? (
          <div style={{ border: "1px solid #f0f0f0", borderRadius: "0.875rem", padding: "2rem 1.5rem", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fff0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cc4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#000000" }}>Session Ended</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#888888" }}>This session has ended. Check-in is no longer available.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ border: "1px solid #f0f0f0", borderRadius: "0.875rem", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, color: "#000000" }}>Check In</h3>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" disabled={checkingIn} required
                style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #e5e5e5", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", opacity: checkingIn ? 0.6 : 1 }}
                onFocus={(e) => (e.target.style.borderColor = "#000000")} onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Registration Number</label>
              <input type="text" value={regNo} onChange={(e) => setRegNo(e.target.value.toUpperCase())} placeholder="e.g. REG2024001" disabled={checkingIn} required
                style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #e5e5e5", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", fontFamily: "monospace", letterSpacing: "0.03em", opacity: checkingIn ? 0.6 : 1 }}
                onFocus={(e) => (e.target.style.borderColor = "#000000")} onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")} />
            </div>
            <AnimatePresence>
              {checkInError && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  style={{ padding: "0.75rem 1rem", backgroundColor: "#fff0f0", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#cc4444", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {checkInError}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button type="submit" disabled={checkingIn || !name.trim() || !regNo.trim()}
              whileHover={checkingIn || !name.trim() || !regNo.trim() ? {} : { scale: 1.02, y: -1 }}
              whileTap={checkingIn || !name.trim() || !regNo.trim() ? {} : { scale: 0.98 }}
              style={{ width: "100%", padding: "0.75rem", backgroundColor: "#000000", color: "#ffffff", fontSize: "0.9rem", fontWeight: 600, borderRadius: "0.5rem", border: "none", cursor: checkingIn || !name.trim() || !regNo.trim() ? "not-allowed" : "pointer", opacity: checkingIn || !name.trim() || !regNo.trim() ? 0.6 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              {checkingIn ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#ffffff", borderRadius: "50%" }} />
                  Checking in...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Check In
                </>
              )}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}



export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const classKey = (params?.id as string) || "";

  const [session, setSession] = useState<Session | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSession, setNoSession] = useState(false);

  const [isManager, setIsManager] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  /* ── Check if user is manager ── */
  const checkIsManager = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      const myRooms = localStorage.getItem("mySession");
      if (!myRooms) return false;
      const roomList: string[] = JSON.parse(myRooms);
      return roomList.includes(classKey);
    } catch { return false; }
  }, [classKey]);

  const checkHasCheckedIn = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      const myAttended = localStorage.getItem("myAttended");
      if (!myAttended) return false;
      const attendedList: string[] = JSON.parse(myAttended);
      return attendedList.includes(classKey);
    } catch { return false; }
  }, [classKey]);


  const fetchSession = useCallback(async (): Promise<Session | null> => {
    if (!classKey) return null;
   

   
    try {
      const localData:any = await getSession(classKey);
      if (localData) return localData as Session
    } catch (err) {
      console.error("[Session] Fetch session from IndexedDB error:", err);
    }

    // Fallback to Redis only if not found locally
    try {
      const data = await getRedisData(classKey);
      if (!data) return null;

      let parsed: unknown;
      if (typeof data === "string") { 
        try { parsed = JSON.parse(data); } catch { parsed = data; } 
      } else { 
        parsed = data; 
      }

      if (parsed && typeof parsed === "object" && "id" in parsed) {
        const sessionData:any = parsed as Session;
    
        try { await saveSession(sessionData); } catch(error) {
          console.log(error)
         }
        return sessionData;
      }
      return null;
    } catch (err) {
      console.error("[Session] Fetch session from Redis error:", err);
      return null;
    }
  }, [classKey]);

  
  const fetchAttendees = useCallback(async (): Promise<Attendee[]> => {
    if (!classKey) return [];
     if(!checkIsManager()) return [];

   
    try {
      const localAttendees:any = await getSession(classKey)
      console.log(JSON.parse(localAttendees).attended)
      return JSON.parse(localAttendees).attended;

    } catch (err) {
      console.error("[Session] Fetch attendees from IndexedDB error:", err);
      return [];
    }
  }, [classKey]);

 
  const syncAttendeesFromRedis = useCallback(async (): Promise<Attendee[]> => {
    if (!classKey) return [];
     if(!checkIsManager()) return [];

    try {
      const redisData = await getRedisData(`${classKey}:attendees`);
      if (!redisData) return [];

      let parsed: unknown;
      if (typeof redisData === "string") { 
        try { parsed = JSON.parse(redisData); } catch { parsed = redisData; } 
      } else { 
        parsed = redisData; 
      }

      let redisAttendees: Attendee[] = [];
      if (Array.isArray(parsed)) {
        redisAttendees = parsed as Attendee[];
      } else if (parsed && typeof parsed === "object" && "attendees" in parsed && Array.isArray((parsed as any).attendees)) {
        redisAttendees = (parsed as any).attendees as Attendee[];
      }

      if (redisAttendees.length > 0) {
        // Save Redis data to IndexedDB
          const LocalAttended:any = await getSession(classKey);
            let parsedLocalAttended;
            let newAttendees;

            try{
                parsedLocalAttended = LocalAttended.attended
            }catch{
               
                parsedLocalAttended = JSON.parse(LocalAttended).attended;
            }

            if (parsedLocalAttended.length > 0 ){
                    newAttendees = [...parsedLocalAttended , ...redisAttendees]
            }else{
               newAttendees = redisAttendees;
            }
             await deleteSession(classKey)
             const session = await fetchSession();
           await saveSession({...session , attended:newAttendees});
      }
      return [];
    } catch (err) {
      console.error("[Session] Sync attendees from Redis error:", err);
      return [];
    }
  }, [classKey]);


  const saveAttendeesToBoth = useCallback(async (newAttendees: Attendee[]) => {
    if (!classKey) return;

    // // Save to IndexedDB FIRST (primary local storage)
    // await saveAttendees(classKey, newAttendees);

    // // Save to Redis (for cross-device sync) - fire and forget
    try {
      const payload = { attendees: newAttendees, classKey, updatedAt: Date.now() };
      await addRedisData(payload, `${classKey}:attendees`, 86400 * 7);
    } catch (err) {
      console.error("[Session] Redis save attendees error:", err);
    }
  }, [classKey]);

  /* ── Initial Load ── */
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setNoSession(false);

      const sess = await fetchSession();
      if (cancelled) return;
      if (!sess) { setNoSession(true); setLoading(false); return; }

      setSession(sess);
      setIsManager(checkIsManager());
      setHasCheckedIn(checkHasCheckedIn());


      const isUserManager = checkIsManager();
      if (isUserManager) {
        await syncAttendeesFromRedis();
      }

      const atts = await fetchAttendees();
      if (cancelled) return;
      setAttendees(atts);
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchSession, fetchAttendees, syncAttendeesFromRedis, checkIsManager, checkHasCheckedIn]);

  /* ── Polling: ONLY for managers, reads from IndexedDB, syncs from Redis occasionally ── */
  useEffect(() => {
    // Only poll if user is manager AND session exists AND is active
    if (noSession || !session || !isManager || isPollingRef.current) return;

    isPollingRef.current = true;

    // Poll every 3 seconds - read from IndexedDB (fast, no network)
    // Sync from Redis every 15 seconds (less frequent network call)
    let redisSyncCounter = 0;

    pollIntervalRef.current = setInterval(async () => {
      try {
        // Always read from IndexedDB first (fast, no network)
        let localAttendees:any;
        const session_data:any = 
            await getSession(classKey);
         
        try{
             localAttendees = session_data.attended
        }catch{
             localAttendees  = JSON.parse(session_data).attended
        }

        setAttendees((prev:any) => {
          const prevJson = JSON.stringify(prev);
          const newJson = JSON.stringify(localAttendees);
          return prevJson !== newJson ? localAttendees : prev;
        });

        // Sync from Redis every 5th poll (15 seconds) to get cross-device updates
        redisSyncCounter++;
        if (redisSyncCounter >= 5) {
          redisSyncCounter = 0;
          const redisAttendees = await syncAttendeesFromRedis();

          // If Redis has more data, update state
          if (redisAttendees.length > 0) {
            setAttendees(prev => {
              const prevJson = JSON.stringify(prev);
              const newJson = JSON.stringify(redisAttendees);
              return prevJson !== newJson ? redisAttendees : prev;
            });
          }
        }

        // Refresh session status from IndexedDB
        const sess = await getSession(classKey);
        if (sess) {
          setSession((prev:any) => {
            const prevJson = JSON.stringify(prev);
            const newJson = JSON.stringify(sess);
            return prevJson !== newJson ? sess : prev;
          });
        }
      } catch (err) {
        console.error("[Session] Polling error:", err);
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) { 
        clearInterval(pollIntervalRef.current); 
        pollIntervalRef.current = null; 
      }
      isPollingRef.current = false;
    };
  }, [noSession, session, isManager, classKey, syncAttendeesFromRedis]);

  /* ── Handle Check In ── */
  const handleCheckIn = useCallback(async (name: string, regNo: string) => {
    if (!session || !classKey) return;
    setCheckingIn(true);
    setCheckInError(null);

    try {
      // Read latest from IndexedDB (primary source)

         let currentAttendees:any;
        const session_data:any = 
            await getSession(classKey);
         
        try{
             currentAttendees = session_data.attended
        }catch{
             currentAttendees = JSON.parse(session_data).attended
        }
      

      const alreadyExists = currentAttendees.some((a:any) => a.regNo.toUpperCase() === regNo.toUpperCase());
      if (alreadyExists) {
        setCheckInError("Someone with this registration number has already checked in.");
        setCheckingIn(false);
        return;
      }

      const newAttendee: Attendee = { 
        name, 
        regNo: regNo.toUpperCase(), 
        checkedInAt: Date.now(), 
        id: generateAttendeeId() 
      };
      const updatedAttendees = [...currentAttendees, newAttendee];

      // Save to IndexedDB and Redis
      await saveAttendeesToBoth(updatedAttendees);

      setAttendees(updatedAttendees);

      // Mark as checked in locally
      if (typeof window !== "undefined") {
        const myAttended = localStorage.getItem("myAttended");
        let attendedList: string[] = [];
        if (myAttended) { try { attendedList = JSON.parse(myAttended); } catch { attendedList = []; } }
        if (!attendedList.includes(classKey)) {
          attendedList.push(classKey);
          localStorage.setItem("myAttended", JSON.stringify(attendedList));
        }
      }
      setHasCheckedIn(true);
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "Failed to check in. Please try again.");
      console.error("[Session] Check-in error:", err);
    } finally {
      setCheckingIn(false);
    }
  }, [session, classKey, saveAttendeesToBoth]);

  /* ── Handle End Session ── */
  const handleEndSession = useCallback(async () => {
    if (!session || !classKey) return;
    setEndingSession(true);

    try {
      const updatedSession: Session = { ...session, status: "ended" };

      // Save to IndexedDB FIRST
      await saveSession(updatedSession);

      // Sync to Redis
      try { 
        await addRedisData(updatedSession, classKey, Math.floor(session.durationMs / 1000)); 
      } catch (err) { 
        console.error("[Session] Redis sync error:", err); 
      }

      setSession(updatedSession);
    } catch (err) {
      console.error("[Session] End session error:", err);
    } finally {
      setEndingSession(false);
    }
  }, [session, classKey]);

  /* ── Render ── */
  return (
    <div>
      <Navbar />
      <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif", padding: "2rem 1rem", paddingTop: "96px" }}>
        <div style={{ maxWidth: isManager ? "900px" : "520px", margin: "0 auto" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#aaaaaa" }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "28px", height: "28px", border: "2px solid #f0f0f0", borderTopColor: "#000000", borderRadius: "50%", margin: "0 auto 1rem" }} />
              <span style={{ fontSize: "0.9rem" }}>Loading session...</span>
            </div>
          )}
          {noSession && <NoSessionPopup onGoHome={() => router.push("/")} />}
          {!loading && !noSession && session && (
            <>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: "2rem" }}>
                <h1 style={{ margin: "0 0 0.375rem 0", fontSize: "clamp(1.4rem, 4vw, 1.75rem)", fontWeight: 800, color: "#000000", letterSpacing: "-0.02em" }}>
                  {isManager ? "Session Dashboard" : "Session Check-in"}
                </h1>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#888888" }}>
                  {isManager ? "Manage your session and track attendance in real-time." : "Enter your details to mark your attendance."}
                </p>
              </motion.div>
              {isManager ? (
                <ManagerView session={session} attendees={attendees} onEndSession={handleEndSession} ending={endingSession} />
              ) : (
                <AttendeeView session={session} hasCheckedIn={hasCheckedIn} onCheckIn={handleCheckIn} checkingIn={checkingIn} checkInError={checkInError} />
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}