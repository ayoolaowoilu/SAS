"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "../../components/navbar";
import { getRedisData, addRedisData } from "../../lib/redis";
import { saveSession, getSession } from "../../lib/indexdb";

interface FieldDef {
  key: string;
  label: string;
}

interface Session {
  id: string;
  name: string;
  startedAt: number;
  durationMs: number;
  expected: number;
  attended: Attendee[];
  status: "active" | "ended";
  classKey: string;
  fields: FieldDef[];
}

interface Attendee {
  id: string;
  values: Record<string, string>;
  checkedInAt: number;
}

const DEFAULT_FIELDS: FieldDef[] = [{ key: "name", label: "Full Name" }];

// Which field acts as the "business key" for duplicate detection / cross-device merge.
// Prefer a unique-ish identifier (reg no / email / phone) over a free-text name.
function getUniqueFieldKey(fields: FieldDef[] | undefined): string {
  const list = fields && fields.length ? fields : DEFAULT_FIELDS;
  const priority = ["regNo", "email", "phone"];
  for (const p of priority) {
    if (list.some((f) => f.key === p)) return p;
  }
  return list[0].key;
}

function getFields(session: Session): FieldDef[] {
  return session.fields && session.fields.length ? session.fields : DEFAULT_FIELDS;
}

/* ── Redis usage tuning ──
   Attendees now live INSIDE the session record (one Redis key instead of two),
   so every sync is a single GET/SET. Reads prefer IndexedDB first and only
   touch Redis when necessary, throttled to avoid back-to-back calls. */
const LOCAL_POLL_MS = 5000;
const REDIS_SYNC_EVERY_N_POLLS = 6; // ~30s between cross-device Redis syncs
const MIN_REDIS_GAP_MS = 8000;

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

  const fields = getFields(session);
  const usableWidth = pageWidth - margin * 2;
  const hashW = 12;
  const numDataCols = fields.length + 1; // + Checked In column
  const colWidth = (usableWidth - hashW) / numDataCols;

  const colX: number[] = [];
  let cursor = margin + hashW;
  fields.forEach(() => {
    colX.push(cursor);
    cursor += colWidth;
  });
  const checkinX = cursor;

  doc.setFontSize(10);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, usableWidth, 8, "F");
  doc.text("#", margin + 3, y);
  fields.forEach((f, i) => doc.text(f.label, colX[i] + 2, y));
  doc.text("Checked In", checkinX + 2, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  attendees.forEach((attendee, index) => {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin + 10;
    }
    doc.text(String(index + 1), margin + 3, y);
    fields.forEach((f, i) => {
      const val = attendee.values?.[f.key] ?? "";
      doc.text(String(val).slice(0, 28), colX[i] + 2, y);
    });
    doc.text(formatDateTime(attendee.checkedInAt), checkinX + 2, y);
    y += 6;
  });

  doc.save(`${session.name.replace(/\s+/g, "_")}_attendance.pdf`);
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



function ShareCard({ session }: { session: Session }) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Set after mount so SSR/hydration never see a mismatched URL.
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${session.name.replace(/\s+/g, "_")}_checkin_qr.png`;
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="share-card"
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: "0.875rem",
        padding: "1.25rem",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
        flexWrap: "wrap",
      }}
    >
      <div
        ref={qrRef}
        className="qr-box"
        style={{ padding: "0.5rem", border: "1px solid #f0f0f0", borderRadius: "0.5rem", backgroundColor: "#ffffff", lineHeight: 0 }}
      >
        {shareUrl ? (
          <QRCodeCanvas value={shareUrl} size={148} bgColor="#ffffff" fgColor="#000000" level="M" />
        ) : (
          <div style={{ width: 148, height: 148, backgroundColor: "#fafafa", borderRadius: "0.25rem" }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: "200px" }}>
        <h3 style={{ margin: "0 0 0.375rem 0", fontSize: "0.95rem", fontWeight: 700, color: "#000000" }}>
          Share Check-in
        </h3>
        <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "#888888", lineHeight: 1.5 }}>
          Attendees scan the QR code or open this link to check in.
        </p>
        <div
          title={shareUrl}
          style={{
            padding: "0.5rem 0.75rem",
            backgroundColor: "#f5f5f5",
            borderRadius: "0.5rem",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            color: "#333333",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "0.75rem",
          }}
        >
          {shareUrl || "Loading link..."}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <motion.button
            onClick={handleCopyLink}
            disabled={!shareUrl}
            whileHover={shareUrl ? { scale: 1.02 } : {}}
            whileTap={shareUrl ? { scale: 0.98 } : {}}
            className="share-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", backgroundColor: "#000000", color: "#ffffff", fontSize: "0.78rem", fontWeight: 600, borderRadius: "0.375rem", border: "none", cursor: shareUrl ? "pointer" : "not-allowed", opacity: shareUrl ? 1 : 0.6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {copied ? "Copied!" : "Copy Link"}
          </motion.button>
          <motion.button
            onClick={handleDownloadQR}
            disabled={!shareUrl}
            whileHover={shareUrl ? { scale: 1.02 } : {}}
            whileTap={shareUrl ? { scale: 0.98 } : {}}
            className="share-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", backgroundColor: "#ffffff", color: "#333333", fontSize: "0.78rem", fontWeight: 600, borderRadius: "0.375rem", border: "1px solid #e5e5e5", cursor: shareUrl ? "pointer" : "not-allowed", opacity: shareUrl ? 1 : 0.6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download QR
          </motion.button>
        </div>
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
  const fields = getFields(session);

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
    <div className="mgr-root" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Session Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mgr-card"
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
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
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
          className="key-bar"
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

          <div className="mgr-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <motion.button
              onClick={() => downloadAttendancePDF(session, attendees)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", backgroundColor: "#000000", color: "#ffffff", fontSize: "0.78rem", fontWeight: 600, borderRadius: "0.375rem", border: "none", cursor: "pointer" }}
            >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
              Download Attendance PDF
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

      {/* Share / QR Card */}
      <ShareCard session={session} />

      {/* Attendees List */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#000000" }}>Attendees</h3>
          <span style={{ fontSize: "0.78rem", color: "#aaaaaa" }}>{attendees.length} checked in</span>
        </div>

        {attendees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaaaaa", fontSize: "0.9rem", border: "1px dashed #e5e5e5", borderRadius: "0.625rem" }}>
            <svg width="32" className="mx-auto" height="32" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5" style={{ marginBottom: "0.75rem" }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div>No attendees yet.</div>
            <div style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>Share the class key to let people check in.</div>
          </div>
        ) : (
          <div className="attendee-scroll" style={{ border: "1px solid #f0f0f0", borderRadius: "0.625rem", overflow: "hidden", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.625rem 1.25rem", borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
              <div style={{ width: "40px", fontSize: "0.7rem", fontWeight: 600, color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>#</div>
              {fields.map((f) => (
                <div key={f.key} style={{ flex: 1, fontSize: "0.7rem", fontWeight: 600, color: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</div>
              ))}
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
                  {fields.map((f) => (
                    <div key={f.key} style={{ flex: 1, fontSize: "0.88rem", fontWeight: 500, color: "#000000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {attendee.values?.[f.key] || "—"}
                    </div>
                  ))}
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
  onCheckIn: (values: Record<string, string>) => void;
  checkingIn: boolean;
  checkInError: string | null;
}) {
  const fields = getFields(session);
  const [values, setValues] = useState<Record<string, string>>({});
  const endAt = session.startedAt + session.durationMs;
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(endAt));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(formatTimeLeft(endAt)), 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  const handleChange = (key: string, raw: string) => {
    const val = key === "regNo" ? raw.toUpperCase() : raw;
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const allFilled = fields.every((f) => (values[f.key] || "").trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed: Record<string, string> = {};
    for (const f of fields) {
      const v = (values[f.key] || "").trim();
      if (!v) return;
      trimmed[f.key] = f.key === "regNo" ? v.toUpperCase() : v;
    }
    onCheckIn(trimmed);
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
          <form onSubmit={handleSubmit} className="text-black" style={{ border: "1px solid #f0f0f0", borderRadius: "0.875rem", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, color: "#000000" }}>Check In</h3>
            {fields.map((f) => (
              <div key={f.key} style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#333333", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>{f.label}</label>
                <input
                  type={f.key === "email" ? "email" : "text"}
                  value={values[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={`Enter your ${f.label.toLowerCase()}`}
                  disabled={checkingIn}
                  required
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    border: "1px solid #e5e5e5",
                    borderRadius: "0.5rem",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                    fontFamily: f.key === "regNo" ? "monospace" : "inherit",
                    letterSpacing: f.key === "regNo" ? "0.03em" : "normal",
                    opacity: checkingIn ? 0.6 : 1,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#000000")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
                />
              </div>
            ))}
            <AnimatePresence>
              {checkInError && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  style={{ padding: "0.75rem 1rem", backgroundColor: "#fff0f0", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#cc4444", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {checkInError}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button type="submit" disabled={checkingIn || !allFilled}
              whileHover={checkingIn || !allFilled ? {} : { scale: 1.02, y: -1 }}
              whileTap={checkingIn || !allFilled ? {} : { scale: 0.98 }}
              style={{ width: "100%", padding: "0.75rem", backgroundColor: "#000000", color: "#ffffff", fontSize: "0.9rem", fontWeight: 600, borderRadius: "0.5rem", border: "none", cursor: checkingIn || !allFilled ? "not-allowed" : "pointer", opacity: checkingIn || !allFilled ? 0.6 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
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
  const lastRedisFetchRef = useRef(0);

  // Throttle guard: refuses a Redis call if one just happened, unless forced.
  const canHitRedis = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastRedisFetchRef.current < MIN_REDIS_GAP_MS) return false;
    lastRedisFetchRef.current = now;
    return true;
  }, []);

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
      const local = await getSession(classKey);
      if (local) return local as any;
    } catch (err) {
      console.error("[Session] IndexedDB read error:", err);
    }

    if (!canHitRedis()) return null;
    try {
      const data = await getRedisData(classKey);
      if (data) {
        const parsed = typeof data === "string" ? (() => { try { return JSON.parse(data); } catch { return data; } })() : data;
        if (parsed && typeof parsed === "object" && "id" in parsed) {
          try { await saveSession(parsed as Session); } catch (e) { console.log(e); }
          return parsed as Session;
        }
      }
    } catch (err) {
      console.error("[Session] Fetch session from Redis error:", err);
    }
    return null;
  }, [classKey, canHitRedis]);

  /* Single combined GET that carries both session state AND attendees
     (attendees now live on session.attended in Redis — no second key).
     Merges with whatever is cached locally so a check-in made on this
     device is never clobbered by a slightly-behind Redis snapshot. */
  const syncSessionFromRedis = useCallback(async (force = false): Promise<Session | null> => {
    if (!classKey) return null;
    if (!canHitRedis(force)) return null;

    try {
      const raw = await getRedisData(classKey);
      if (!raw) return null;
      const remote = (typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw) as Session | null;
      if (!remote || typeof remote !== "object" || !("id" in remote)) return null;

      let local: Session | null = null;
      try { local = (await getSession(classKey)) as any; } catch { local = null; }

      const fields = remote.fields || local?.fields || DEFAULT_FIELDS;
      const uniqueKey = getUniqueFieldKey(fields);

      const localAttended: Attendee[] = local?.attended || [];
      const remoteAttended: Attendee[] = remote.attended || [];

      const mergedMap = new Map<string, Attendee>();
      for (const a of localAttended) {
        mergedMap.set(String(a.values?.[uniqueKey] ?? a.id).toUpperCase(), a);
      }
      for (const a of remoteAttended) {
        const key = String(a.values?.[uniqueKey] ?? a.id).toUpperCase();
        const existing = mergedMap.get(key);
        if (!existing || a.checkedInAt < existing.checkedInAt) mergedMap.set(key, a);
      }
      const mergedAttended = Array.from(mergedMap.values()).sort((a, b) => a.checkedInAt - b.checkedInAt);

      const mergedSession: Session = { ...remote, attended: mergedAttended };

      try { await saveSession(mergedSession); } catch (e) { console.log(e); }
      return mergedSession;
    } catch (err) {
      console.error("[Session] Redis sync error:", err);
      return null;
    }
  }, [classKey, canHitRedis]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setNoSession(false);

      let sess = await fetchSession();
      if (cancelled) return;
      if (!sess) { setNoSession(true); setLoading(false); return; }

      const manager = checkIsManager();
      setIsManager(manager);
      setHasCheckedIn(checkHasCheckedIn());

      if (manager) {
        const synced = await syncSessionFromRedis(true);
        if (synced) sess = synced;
      }

      if (cancelled) return;
      setSession(sess);
      setAttendees(sess.attended || []);
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchSession, syncSessionFromRedis, checkIsManager, checkHasCheckedIn]);

  useEffect(() => {
    if (noSession || !session || !isManager || isPollingRef.current) return;

    isPollingRef.current = true;
    let pollCount = 0;

    pollIntervalRef.current = setInterval(async () => {
      try {
        pollCount++;

        // Cheap local read every tick — no network cost.
        const local = (await getSession(classKey).catch(() => null)) as Session | null;
        if (local) {
          setSession((prev) => (JSON.stringify(prev) !== JSON.stringify(local) ? local : prev));
          setAttendees((prev) => {
            const next = local.attended || [];
            return JSON.stringify(prev) !== JSON.stringify(next) ? next : prev;
          });
        }

        // Only hit Redis every Nth tick, to catch cross-device check-ins
        // without spending a request every 3-5 seconds.
        if (pollCount % REDIS_SYNC_EVERY_N_POLLS === 0) {
          const synced = await syncSessionFromRedis();
          if (synced) {
            setSession(synced);
            setAttendees(synced.attended || []);
          }
        }
      } catch (err) {
        console.error("[Session] Polling error:", err);
      }
    }, LOCAL_POLL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [noSession, session, isManager, classKey, syncSessionFromRedis]);

  /* ── Handle Check In ── */
  const handleCheckIn = useCallback(async (values: Record<string, string>) => {
    if (!session || !classKey) return;
    setCheckingIn(true);
    setCheckInError(null);

    try {
      const latest = (await getSession(classKey).catch(() => null)) as Session | null;
      const currentAttendees: Attendee[] = latest?.attended || session.attended || [];

      const uniqueKey = getUniqueFieldKey(session.fields);
      const newKeyVal = (values[uniqueKey] || "").toUpperCase();
      const alreadyExists = currentAttendees.some((a) => String(a.values?.[uniqueKey] || "").toUpperCase() === newKeyVal);
      if (alreadyExists) {
        const label = getFields(session).find((f) => f.key === uniqueKey)?.label.toLowerCase() || "detail";
        setCheckInError(`Someone with this ${label} has already checked in.`);
        setCheckingIn(false);
        return;
      }

      const newAttendee: Attendee = { id: generateAttendeeId(), values, checkedInAt: Date.now() };
      const updatedAttendees = [...currentAttendees, newAttendee];
      const updatedSession: Session = { ...(latest || session), attended: updatedAttendees };

      // One write covers both the local cache and cross-device sync —
      // no more separate "<key>:attendees" Redis record.
      await saveSession(updatedSession);
      try {
        await addRedisData(updatedSession, classKey, Math.floor(updatedSession.durationMs / 1000));
      } catch (err) {
        console.error("[Session] Redis save attendee error:", err);
      }

      setSession(updatedSession);
      setAttendees(updatedAttendees);

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
  }, [session, classKey]);

  /* ── Handle End Session ── */
  const handleEndSession = useCallback(async () => {
    if (!session || !classKey) return;
    setEndingSession(true);

    try {
      const updatedSession: Session = { ...session, status: "ended" };

      await saveSession(updatedSession);

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


  return (
    <div>
      <Navbar />
      <div className="page-wrap" style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif", padding: "2rem 1rem", paddingTop: "96px" }}>
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
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* ── Mobile-only UI tuning (<=640px). Desktop is untouched. ── */
        @media (max-width: 640px) {
          .page-wrap { padding: 1rem 0.75rem !important; padding-top: 84px !important; }
          .mgr-root { gap: 1rem !important; }
          .mgr-card { padding: 1rem !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.5rem !important; margin-bottom: 0.875rem !important; }
          .stats-grid > div { padding: 0.625rem 0.5rem !important; border-radius: 0.5rem !important; }
          .stats-grid > div > div:first-child { font-size: 1.05rem !important; }
          .key-bar { padding: 0.5rem 0.625rem !important; gap: 0.5rem !important; }
          .key-bar span { font-size: 0.72rem !important; }
          .key-bar button, .share-btn { padding: 0.375rem 0.625rem !important; font-size: 0.68rem !important; gap: 0.25rem !important; }
          .share-card { padding: 1rem !important; gap: 0.875rem !important; }
          .qr-box { padding: 0.375rem !important; }
          .qr-box canvas { width: 118px !important; height: 118px !important; }
          .mgr-actions { gap: 0.375rem !important; width: 100%; }

          /* Horizontally scrollable attendees table — columns never squash */
          .attendee-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .attendee-scroll > * { min-width: 560px; box-sizing: border-box; }
          .attendee-scroll > div { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
          .attendee-scroll > div > div { font-size: 0.78rem !important; }
          .attendee-scroll > div > div:first-child { width: 28px !important; }
          .attendee-scroll > div > div:last-child { width: 110px !important; }
        }
      `}</style>
    </div>
  );
}