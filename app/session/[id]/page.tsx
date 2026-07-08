"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/app/components/navbar';
import { SASLogo } from '@/app/page';
import { getRedisData } from '@/app/lib/redis';
import { get, getAll } from '@/app/lib/indexdb';


async function loadPdfLibs() {
  const [{ jsPDF }, autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable').then(m => m.default),
  ]);
  return { jsPDF, autoTable };
}

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
  id: string;
  name: string;
  studentId: string;
  checkedInAt: number;
}

/* ──────────────────────────── Helpers ──────────────────────────── */

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}


async function generateAttendancePDF(session: Session, attendees: Attendee[]) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();

  const attendanceRate = session.expected > 0
    ? Math.round((attendees.length / session.expected) * 100)
    : 0;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(session.name, 14, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Attendance Report — ${new Date().toLocaleString()}`, 14, 28);

  // Stats boxes
  const stats = [
    { label: 'Checked In', value: String(attendees.length) },
    { label: 'Expected', value: String(session.expected) },
    { label: 'Attendance', value: `${attendanceRate}%` },
    { label: 'Duration', value: formatElapsed(session.durationMs) },
  ];

  let x = 14;
  stats.forEach((stat) => {
    const w = 42;
    const h = 22;
    const isHighlight = stat.label === 'Attendance' && attendanceRate >= 80;

    doc.setFillColor(isHighlight ? 0 : 245, isHighlight ? 0 : 245, isHighlight ? 0 : 245);
    doc.roundedRect(x, 36, w, h, 2, 2, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isHighlight ? 255 : 0);
    doc.text(stat.value, x + w / 2, 36 + 13, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(isHighlight ? 200 : 136);
    doc.text(stat.label.toUpperCase(), x + w / 2, 36 + 19, { align: 'center' });

    x += w + 4;
  });

  // Table
  autoTable(doc, {
    startY: 66,
    head: [['#', 'Name', 'Student ID', 'Check-in Time']],
    body: attendees.length > 0
      ? attendees.map((a, i) => [
          String(i + 1),
          a.name,
          a.studentId,
          formatTime(a.checkedInAt),
        ])
      : [['—', 'No attendees recorded', '', '']],
    headStyles: {
      fillColor: [250, 250, 250],
      textColor: [136, 136, 136],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 50, font: 'courier' },
      3: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    styles: {
      lineColor: [229, 229, 229],
      lineWidth: 0.5,
    },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(153);
  doc.text(`SAS — Smart Attendance System — Session ID: ${session.id}`, 14, pageHeight - 10);

  doc.save(`attendance_${session.name.replace(/\s+/g, '_')}_${session.id}.pdf`);
}

/* ──────────────────────────── Manager Page ──────────────────────────── */

function ManagerPage({ session }: { session: Session }) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownMs, setCountdownMs] = useState(session.durationMs);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'ended'>(session.status);
  const [copied, setCopied] = useState(false);
  const [loadingAttendees, setLoadingAttendees] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Check if session was already ended (from IndexedDB reload) ── */
  useEffect(() => {
    async function checkEnded() {
      try {
        const { get } = await import('@/app/lib/indexdb');
        const dbData = await get(Number(session.id));
        if (dbData && typeof dbData === 'object' && dbData.status === 'ended') {
          setSessionStatus('ended');
          setCountdownMs(0);
          setElapsedMs(dbData.durationMs || session.durationMs);
          if (dbData.attendees && Array.isArray(dbData.attendees)) {
            setAttendees(dbData.attendees);
          }
          setLoadingAttendees(false);
        }
      } catch {
        // ignore
      }
    }
    checkEnded();
  }, [session.id, session.durationMs]);

  /* ── Fetch attendees from Redis every 3s ── */
  const fetchAttendees = useCallback(async () => {
    if (sessionStatus === 'ended') {
      setLoadingAttendees(false);
      return;
    }
    try {
      const data = await getRedisData(`attendees_${session.id}`);
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) {
          setAttendees(parsed);
        }
      } else {
        const localKey = `sas_attendees_${session.id}`;
        const saved = localStorage.getItem(localKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setAttendees(parsed);
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendees from Redis:', err);
    } finally {
      setLoadingAttendees(false);
    }
  }, [session.id, sessionStatus]);

  /* ── Initial load + polling every 3s ── */
  useEffect(() => {
    if (sessionStatus === 'ended') return;

    fetchAttendees();

    pollIntervalRef.current = setInterval(() => {
      if (sessionStatus === 'active') {
        fetchAttendees();
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchAttendees, sessionStatus]);

  /* ── Timer + Countdown ── */
  useEffect(() => {
    if (sessionStatus !== 'active') return;

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - session.startedAt;
      const remaining = Math.max(0, session.durationMs - elapsed);

      setElapsedMs(elapsed);
      setCountdownMs(remaining);

      if (remaining <= 0) {
        handleAutoEnd();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sessionStatus, session.startedAt, session.durationMs]);

  /* ── Auto-end session when timer expires ── */
  const handleAutoEnd = useCallback(async () => {
    if (sessionStatus !== 'active') return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setIsEnding(true);

    try {
      const { addRedisData, deleteRedisData } = await import('@/app/lib/redis');

      const finalAttendeesData = await getRedisData(`attendees_${session.id}`);
      let finalAttendees: Attendee[] = [];
      if (finalAttendeesData) {
        const parsed = typeof finalAttendeesData === 'string' ? JSON.parse(finalAttendeesData) : finalAttendeesData;
        if (Array.isArray(parsed)) finalAttendees = parsed;
      }

      const endedSession = {
        id: Number(session.id),
        name: session.name,
        startedAt: session.startedAt,
        durationMs: session.durationMs,
        expected: session.expected,
        attended: finalAttendees.length,
        status: 'ended' as const,
        classKey: session.classKey,
        attendees: finalAttendees,
        endedAt: Date.now(),
      };

      const { save } = await import('@/app/lib/indexdb');
      await save(endedSession);

      await deleteRedisData(session.id);
      await deleteRedisData(`attendees_${session.id}`);

      localStorage.removeItem(`sas_attendees_${session.id}`);
      const mySessionsRaw = localStorage.getItem('mySession');
      if (mySessionsRaw) {
        try {
          const sessions: string[] = JSON.parse(mySessionsRaw);
          const updated = sessions.filter((id) => id !== session.id);
          localStorage.setItem('mySession', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }

      setAttendees(finalAttendees);
      setSessionStatus('ended');
      setCountdownMs(0);
    } catch (err) {
      console.error('Auto-end session failed:', err);
    } finally {
      setIsEnding(false);
    }
  }, [session, sessionStatus]);

  /* ── Listen for new check-ins from other tabs ── */
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `sas_attendees_${session.id}` && e.newValue) {
        try {
          setAttendees(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [session.id]);

  /* ── Manual End Session ── */
  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session? This will finalize attendance.')) {
      return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setIsEnding(true);

    try {
      const { addRedisData, deleteRedisData } = await import('@/app/lib/redis');

      const finalAttendeesData = await getRedisData(`attendees_${session.id}`);
      let finalAttendees: Attendee[] = [];
      if (finalAttendeesData) {
        const parsed = typeof finalAttendeesData === 'string' ? JSON.parse(finalAttendeesData) : finalAttendeesData;
        if (Array.isArray(parsed)) finalAttendees = parsed;
      }

      const endedSession = {
        id: Number(session.id),
        name: session.name,
        startedAt: session.startedAt,
        durationMs: Date.now() - session.startedAt,
        expected: session.expected,
        attended: finalAttendees.length,
        status: 'ended' as const,
        classKey: session.classKey,
        attendees: finalAttendees,
        endedAt: Date.now(),
      };

      const { save } = await import('@/app/lib/indexdb');
      await save(endedSession);

      await deleteRedisData(session.id);
      await deleteRedisData(`attendees_${session.id}`);

      localStorage.removeItem(`sas_attendees_${session.id}`);
      const mySessionsRaw = localStorage.getItem('mySession');
      if (mySessionsRaw) {
        try {
          const sessions: string[] = JSON.parse(mySessionsRaw);
          const updated = sessions.filter((id) => id !== session.id);
          localStorage.setItem('mySession', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }

      setAttendees(finalAttendees);
      setSessionStatus('ended');
      setCountdownMs(0);
    } catch (err) {
      console.error('Failed to end session:', err);
      alert('Failed to end session. Please try again.');
    } finally {
      setIsEnding(false);
    }
  };

  /* ── Download PDF ── */
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateAttendancePDF(session, attendees);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(session.classKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRemoveAttendee = async (attendeeId: string) => {
    const updated = attendees.filter((a) => a.id !== attendeeId);
    setAttendees(updated);

    try {
      const { addRedisData } = await import('@/app/lib/redis');
      await addRedisData(JSON.stringify(updated), `attendees_${session.id}`, 3600);
    } catch (err) {
      console.error('Failed to update Redis after removal:', err);
    }

    localStorage.setItem(`sas_attendees_${session.id}`, JSON.stringify(updated));
  };

  const attendanceRate = session.expected > 0
    ? Math.round((attendees.length / session.expected) * 100)
    : 0;

  const isTimeUp = countdownMs <= 0;
  const isFull = attendees.length >= session.expected;

  return (
    <div>
      <Navbar />
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
          padding: '2rem 1rem',
          paddingTop: '96px',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: '2rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
                  fontWeight: 800,
                  color: '#000000',
                  letterSpacing: '-0.02em',
                }}
              >
                {session.name}
              </h1>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: sessionStatus === 'active' ? '#000000' : '#f0f0f0',
                  color: sessionStatus === 'active' ? '#ffffff' : '#888888',
                }}
              >
                {sessionStatus}
              </span>
              {sessionStatus === 'active' && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: '#008844',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#008844',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  Live
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.4; }
                    }
                  `}</style>
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#888888' }}>
              Manage attendance for this session.
            </p>
          </motion.div>

          {/* Countdown Banner */}
          {sessionStatus === 'active' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: isTimeUp ? '#fff0f0' : '#000000',
                color: isTimeUp ? '#cc4444' : '#ffffff',
                padding: '0.875rem 1.25rem',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {isTimeUp ? 'Time is up!' : 'Time Remaining'}
              </span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                {formatCountdown(countdownMs)}
              </span>
            </motion.div>
          )}

          {/* Session Ended Banner */}
          {sessionStatus === 'ended' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: '#f0f0f0',
                color: '#666666',
                padding: '0.875rem 1.25rem',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Session Ended
              </span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                00:00:00
              </span>
            </motion.div>
          )}

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {[
              { label: 'Checked In', value: attendees.length, color: '#000000' },
              { label: 'Expected', value: session.expected, color: '#333333' },
              { label: 'Attendance', value: `${attendanceRate}%`, color: attendanceRate >= 80 ? '#008844' : '#cc6600' },
              { label: sessionStatus === 'active' ? 'Elapsed' : 'Duration', value: formatElapsed(elapsedMs), color: '#000000' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                style={{
                  padding: '1rem 1.25rem',
                  border: '1px solid #f0f0f0',
                  borderRadius: '0.75rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Class Key & Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '1rem 1.25rem',
              border: '1px solid #f0f0f0',
              borderRadius: '0.75rem',
              marginBottom: '2rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#888888' }}>Class Key</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    color: '#000000',
                    letterSpacing: '0.05em',
                  }}
                >
                  {session.classKey}
                </span>
                <motion.button
                  onClick={handleCopyKey}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.15rem',
                    color: copied ? '#008844' : '#999999',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="copied"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        Copied!
                      </motion.span>
                    ) : (
                      <motion.svg
                        key="copy"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {sessionStatus === 'ended' && (
                <motion.button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  whileHover={isGeneratingPDF ? {} : { scale: 1.02 }}
                  whileTap={isGeneratingPDF ? {} : { scale: 0.97 }}
                  style={{
                    padding: '0.625rem 1.25rem',
                    backgroundColor: '#f5f5f5',
                    color: '#000000',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e5e5',
                    cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
                    opacity: isGeneratingPDF ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isGeneratingPDF ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid rgba(0,0,0,0.2)',
                          borderTopColor: '#000000',
                          borderRadius: '50%',
                        }}
                      />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </motion.button>
              )}

              {sessionStatus === 'active' && (
                <motion.button
                  onClick={handleEndSession}
                  disabled={isEnding}
                  whileHover={isEnding ? {} : { scale: 1.02 }}
                  whileTap={isEnding ? {} : { scale: 0.97 }}
                  style={{
                    padding: '0.625rem 1.25rem',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: isEnding ? 'not-allowed' : 'pointer',
                    opacity: isEnding ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isEnding ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#ffffff',
                          borderRadius: '50%',
                        }}
                      />
                      Ending...
                    </>
                  ) : (
                    'End Session'
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Attendees List */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#000000' }}>
                Attendees
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {sessionStatus === 'active' && (
                  <span style={{ fontSize: '0.75rem', color: '#888888' }}>
                    Refreshing every 3s
                  </span>
                )}
                {isFull && sessionStatus === 'active' && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#cc6600',
                      backgroundColor: '#fff8f0',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.25rem',
                    }}
                  >
                    Full
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: '#aaaaaa' }}>
                  {attendees.length} / {session.expected}
                </span>
              </div>
            </div>

            {loadingAttendees && sessionStatus === 'active' ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#aaaaaa' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid #f0f0f0',
                    borderTopColor: '#000000',
                    borderRadius: '50%',
                    margin: '0 auto 0.75rem',
                  }}
                />
                Loading attendees...
              </div>
            ) : attendees.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  border: '1px dashed #e5e5e5',
                  borderRadius: '0.75rem',
                  color: '#aaaaaa',
                  fontSize: '0.9rem',
                }}
              >
                No attendees yet. Share the class key to start collecting check-ins.
              </div>
            ) : (
              <div style={{ border: '1px solid #f0f0f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                {/* Headers */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 60px',
                    gap: '1rem',
                    padding: '0.625rem 1.25rem',
                    borderBottom: '1px solid #e5e5e5',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checked In</span>
                  <span></span>
                </div>

                {/* Rows */}
                <AnimatePresence>
                  {attendees.map((attendee, index) => (
                    <motion.div
                      key={attendee.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 60px',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '0.875rem 1.25rem',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#000000' }}>{attendee.name}</span>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#555555' }}>{attendee.studentId}</span>
                      <span style={{ fontSize: '0.78rem', color: '#888888' }}>{formatTime(attendee.checkedInAt)}</span>
                      <motion.button
                        onClick={() => handleRemoveAttendee(attendee.id)}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#cc4444',
                          padding: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Remove attendee"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </motion.button>
                    </motion.div>
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

/* ──────────────────────────── Attendee Page ──────────────────────────── */

function AttendeePage({ sessionId, session }: { sessionId: string; session: Session }) {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  /* ── Check if user already checked in or session ended ── */
  useEffect(() => {
    const checkedInKey = `sas_checked_in_${sessionId}`;
    const hasCheckedIn = localStorage.getItem(checkedInKey);
    if (hasCheckedIn === 'true') {
      setAlreadyCheckedIn(true);
      setSubmitted(true);
    }

    if (session.status === 'ended') {
      setIsEnded(true);
    }
  }, [sessionId, session.status]);

  /* ── Poll for session status & attendee count ── */
  useEffect(() => {
    async function checkStatus() {
      try {
        const data = await getRedisData(`attendees_${sessionId}`);
        if (data) {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (Array.isArray(parsed)) {
            setIsFull(parsed.length >= session.expected);
          }
        }
      } catch {
        // ignore
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [sessionId, session.expected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isFull) {
      setError('This session has reached maximum capacity.');
      return;
    }
    if (isEnded) {
      setError('This session has ended.');
      return;
    }
    if (!name.trim() || !studentId.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    const attendee: Attendee = {
      id: Date.now().toString(),
      name: name.trim(),
      studentId: studentId.trim().toUpperCase(),
      checkedInAt: Date.now(),
    };

    try {
      const { addRedisData } = await import('@/app/lib/redis');

      const existingData = await getRedisData(`attendees_${sessionId}`);
      let attendees: Attendee[] = [];
      if (existingData) {
        const parsed = typeof existingData === 'string' ? JSON.parse(existingData) : existingData;
        if (Array.isArray(parsed)) attendees = parsed;
      }

      // Check max capacity
      if (attendees.length >= session.expected) {
        setIsFull(true);
        setError('This session has reached maximum capacity.');
        setSubmitting(false);
        return;
      }

      // Check for duplicate student ID globally
      if (attendees.some((a) => a.studentId === attendee.studentId)) {
        setError('This ID has already checked in.');
        setSubmitting(false);
        return;
      }

      attendees.push(attendee);

      const result = await addRedisData(JSON.stringify(attendees), `attendees_${sessionId}`, 3600);
      if (result && result.error) {
        throw new Error(result.error);
      }

      localStorage.setItem(`sas_attendees_${sessionId}`, JSON.stringify(attendees));
      localStorage.setItem(`sas_checked_in_${sessionId}`, 'true');

      setSubmitted(true);
    } catch (err) {
      console.error('Failed to save attendance:', err);
      setError('Failed to check in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <Navbar />
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            paddingTop: '96px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              textAlign: 'center',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, type: 'spring' }}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700, color: '#000000' }}>
              {alreadyCheckedIn ? 'Already Checked In!' : 'Checked In!'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#888888', lineHeight: 1.5 }}>
              {alreadyCheckedIn
                ? 'You have already recorded your attendance for this session.'
                : 'Your attendance has been recorded. You can close this page now.'}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isEnded) {
    return (
      <div>
        <Navbar />
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            paddingTop: '96px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', maxWidth: '400px' }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700, color: '#000000' }}>
              Session Ended
            </h2>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#888888', lineHeight: 1.5 }}>
              This attendance session has ended. You can no longer check in.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          paddingTop: '96px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: '400px' }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SASLogo />
            </div>
            <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#000000', letterSpacing: '-0.02em' }}>
              SAS
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#888888' }}>
              Smart Attendance System
            </p>
          </div>

          <h2
            style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#000000',
              textAlign: 'center',
            }}
          >
            Check In
          </h2>

          {isFull && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fff8f0',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                color: '#cc6600',
                textAlign: 'center',
                marginBottom: '1rem',
                fontWeight: 500,
              }}
            >
              This session has reached maximum capacity.
            </motion.div>
          )}

          <form className="text-black" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#333333',
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={submitting || isFull}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e5e5e5',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  opacity: submitting || isFull ? 0.6 : 1,
                }}
                onFocus={(e) => (e.target.style.borderColor = '#000000')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#333333',
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Student / ID Number
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. STU-2026-001"
                disabled={submitting || isFull}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e5e5e5',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  letterSpacing: '0.03em',
                  transition: 'border-color 0.2s',
                  opacity: submitting || isFull ? 0.6 : 1,
                }}
                onFocus={(e) => (e.target.style.borderColor = '#000000')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    padding: '0.625rem 0.875rem',
                    backgroundColor: '#fff0f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    color: '#cc4444',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={submitting || isFull}
              whileHover={submitting || isFull ? {} : { scale: 1.02, y: -1 }}
              whileTap={submitting || isFull ? {} : { scale: 0.98 }}
              style={{
                width: '100%',
                padding: '0.875rem',
                backgroundColor: isFull ? '#cccccc' : '#000000',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                border: 'none',
                cursor: submitting || isFull ? 'not-allowed' : 'pointer',
                marginTop: '0.5rem',
                opacity: submitting || isFull ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {submitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                    }}
                  />
                  Checking in...
                </>
              ) : isFull ? (
                'Session Full'
              ) : (
                'Check In'
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

/* ──────────────────────────── Main Page ──────────────────────────── */

export default function SessionPage() {
  const params = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = params?.id as string;

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function loadSession() {
      setLoading(true);
      setError(null);

      try {
        // ── 1. Check if manager (session ID in mySession localStorage) ──
        const mySessionsRaw = localStorage.getItem('mySession');
        let mySessions: string[] = [];
        if (mySessionsRaw) {
          try {
            mySessions = JSON.parse(mySessionsRaw);
          } catch {
            mySessions = [];
          }
        }

        const isManagerView = mySessions.includes(sessionId);

        if (isManagerView) {
          // ── Manager: fetch full session data from IndexedDB ──
          try {
            const dbData = await get(Number(sessionId));
            if (dbData && !cancelled) {
              // dbData is the full object since store.get() returns the value
              const dbSession = dbData as any;
              if (dbSession.status === 'ended') {
                // Reconstruct Session from archived data
                const sessionObj: Session = {
                  id: String(dbSession.id || sessionId),
                  name: dbSession.name || 'Session',
                  startedAt: dbSession.startedAt || Date.now(),
                  durationMs: dbSession.durationMs || 0,
                  expected: dbSession.expected || 30,
                  attended: dbSession.attended || 0,
                  status: 'ended',
                  classKey: dbSession.classKey || sessionId.slice(0, 10).toUpperCase(),
                };
                setSession(sessionObj);
              } else {
                setSession(dbData as Session);
              }
              setIsManager(true);
              setLoading(false);
              return;
            }
          } catch (dbErr) {
            console.error('IndexedDB get error:', dbErr);
          }

          // Fallback: try Redis
          try {
            const redisData = await getRedisData(sessionId);
            if (redisData && !cancelled) {
              const parsed = typeof redisData === 'string' ? JSON.parse(redisData) : redisData;
              setSession(parsed as Session);
              setIsManager(true);
              setLoading(false);
              return;
            }
          } catch (redisErr) {
            console.error('Redis get error:', redisErr);
          }

          // Last resort: minimal session object
          if (!cancelled) {
            setSession({
              id: sessionId,
              name: 'Session',
              startedAt: Date.now(),
              durationMs: 1000 * 60 * 60,
              expected: 30,
              attended: 0,
              status: 'active',
              classKey: sessionId.slice(0, 10).toUpperCase(),
            });
            setIsManager(true);
            setLoading(false);
          }
          return;
        }

        // ── 2. Attendee view: check if session exists at all ──
        // Try Redis first
        let foundSession: Session | null = null;

        try {
          const redisData = await getRedisData(sessionId);
          if (redisData && !cancelled) {
            const parsed = typeof redisData === 'string' ? JSON.parse(redisData) : redisData;
            foundSession = parsed as Session;
          }
        } catch (redisErr) {
          console.error('Redis get error:', redisErr);
        }

        // Try IndexedDB as fallback
        if (!foundSession) {
          try {
            const dbData = await get(Number(sessionId));
            if (dbData && !cancelled) {
              const dbSession = dbData as any;
              if (dbSession.status === 'ended') {
                foundSession = {
                  id: String(dbSession.id || sessionId),
                  name: dbSession.name || 'Session',
                  startedAt: dbSession.startedAt || Date.now(),
                  durationMs: dbSession.durationMs || 0,
                  expected: dbSession.expected || 30,
                  attended: dbSession.attended || 0,
                  status: 'ended',
                  classKey: dbSession.classKey || sessionId.slice(0, 10).toUpperCase(),
                };
              } else {
                foundSession = dbData as Session;
              }
            }
          } catch (dbErr) {
            console.error('IndexedDB get error:', dbErr);
          }
        }

        // Check if there's attendee data (session was visited before)
        if (!foundSession) {
          const attendeeKey = `sas_attendees_${sessionId}`;
          const hasAttendeeData = localStorage.getItem(attendeeKey) !== null;

          if (hasAttendeeData) {
            foundSession = {
              id: sessionId,
              name: 'Session',
              startedAt: Date.now(),
              durationMs: 1000 * 60 * 60,
              expected: 30,
              attended: 0,
              status: 'active',
              classKey: sessionId.slice(0, 10).toUpperCase(),
            };
          }
        }

        if (!cancelled) {
          if (foundSession) {
            setSession(foundSession);
            setIsManager(false);
          } else {
            setError('Session not found. Please check the URL or ask the host for the correct link.');
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load session. Please try again.');
          setLoading(false);
        }
        console.error('Session load error:', err);
      }
    }

    loadSession();
    return () => { cancelled = true; };
  }, [sessionId]);


  if (loading) {
    return (
      <div>
        <Navbar />
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            paddingTop: '96px',
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
              width: '32px',
              height: '32px',
              border: '2px solid #f0f0f0',
              borderTopColor: '#000000',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>
    );
  }

  /* ── Error State ── */
  if (error) {
    return (
      <div>
        <Navbar />
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            padding: '2rem 1rem',
            paddingTop: '96px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', maxWidth: '400px' }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fff0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cc4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#000000' }}>
              Session Not Found
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#888888', lineHeight: 1.5 }}>
              {error}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── Manager View ── */
  if (isManager && session) {
    return <ManagerPage session={session} />;
  }

  /* ── Attendee View ── */
  return <AttendeePage sessionId={sessionId} session={session!} />;
}