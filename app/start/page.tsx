"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/navbar';
import { useRouter } from 'next/navigation';
import { addRedisData, getRedisData } from '../lib/redis';
import { getAllSessions, saveSession, getAttendees, saveAttendees } from '../lib/indexdb';

interface Session {
  id: string;
  name: string;
  startedAt: number;
  durationMs: number;
  expected: number;
  attended: number;
  status: 'active' | 'ended';
  classKey: string;
}

interface Attendee {
  name: string;
  regNo: string;
  checkedInAt: number;
  id: string;
}

/* ──────────────────────────── Helpers ──────────────────────────── */

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ─── PDF Download Helper ─── */
async function downloadAttendancePDF(session: Session, attendees: Attendee[]) {
  try {
    const { jsPDF } = await import("jspdf");
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
  } catch (err) {
    console.error("[StartPage] PDF download error:", err);
    alert("Failed to generate PDF. Make sure jspdf is installed: npm install jspdf");
  }
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

/* ─── Fetch attendees from Redis (PRIMARY) with IndexedDB fallback ─── */
async function fetchAttendeesWithSync(classKey: string): Promise<Attendee[]> {
  if (!classKey) return [];

  // Try Redis FIRST for cross-device sync
  try {
    const data = await getRedisData(`${classKey}:attendees`);
    
    if (data) {
      let parsed: unknown;
      if (typeof data === "string") { 
        try { parsed = JSON.parse(data); } catch { parsed = data; } 
      } else { 
        parsed = data; 
      }
      
      let redisAttendees: Attendee[] = [];
      if (Array.isArray(parsed)) {
        redisAttendees = parsed as Attendee[];
      } else if (parsed && typeof parsed === "object" && "attendees" in parsed && Array.isArray((parsed as any).attendees)) {
        redisAttendees = (parsed as any).attendees as Attendee[];
      }
      
      // If we got valid attendees from Redis, sync to IndexedDB and return
      if (redisAttendees.length > 0) {
        await saveAttendees(classKey, redisAttendees);
        return redisAttendees;
      }
    }
  } catch (err) {
    console.error(`[StartPage] Redis fetch error for ${classKey}:`, err);
  }

  // Fallback to IndexedDB
  return await getAttendees(classKey);
}

/* ─── Update session's attended count from Redis/IndexedDB ─── */
async function syncSessionAttendedCount(session: Session): Promise<Session> {
  const attendees = await fetchAttendeesWithSync(session.classKey);
  if (attendees.length !== session.attended) {
    const updated = { ...session, attended: attendees.length };
    // Sync back to IndexedDB so the count persists
    try {
      await saveSession(updated);
    } catch (err) {
      console.error(`[StartPage] Failed to sync session count:`, err);
    }
    return updated;
  }
  return session;
}

function SessionRow({
  session,
  index,
  onClick,
  onDownloadPDF,
  onDownloadJSON,
}: {
  session: Session;
  index: number;
  onClick: (session: Session) => void;
  onDownloadPDF: (session: Session) => void;
  onDownloadJSON: (session: Session) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(session.classKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadJSON = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownloadJSON(session);
  };

  const handleDownloadPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownloadPDF(session);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ backgroundColor: '#fafafa' }}
      onClick={() => onClick(session)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        minWidth: 'fit-content',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: session.status === 'active' ? '#000000' : '#cccccc',
          flexShrink: 0,
        }}
      />