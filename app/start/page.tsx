"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/navbar';
import { redirect, useRouter } from 'next/navigation';
import { addRedisData } from '../lib/redis';
import { getAll, save, remove } from '../lib/indexdb';

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

function generateClassKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  return suffix;
}

function downloadSession(session: Session) {
  const data = {
    id: session.id,
    name: session.name,
    startedAt: new Date(session.startedAt).toISOString(),
    duration: formatDuration(session.durationMs),
    durationMs: session.durationMs,
    expected: session.expected,
    attended: session.attended,
    status: session.status,
    classKey: session.classKey,
    attendanceRate: `${Math.round((session.attended / session.expected) * 100)}%`,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.name.replace(/\s+/g, '_')}_session.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ──────────────────────────── Session Row ──────────────────────────── */

function SessionRow({
  session,
  index,
  onClick,
}: {
  session: Session;
  index: number;
  onClick: (session: Session) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(session.classKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadSession(session);
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
      <div style={{ minWidth: '160px', flex: '2 1 160px' }}>
        <div
          style={{
            fontSize: '0.88rem',
            fontWeight: 600,
            color: '#000000',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {session.name}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#888888', marginTop: '0.125rem' }}>
          {formatDateTime(session.startedAt)}
        </div>
      </div>
      <div style={{ minWidth: '70px', flex: '0 0 70px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#333333' }}>
          {formatDuration(session.durationMs)}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#aaaaaa' }}>duration</div>
      </div>
      <div style={{ minWidth: '80px', flex: '0 0 80px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#000000' }}>
          {session.attended}
          <span style={{ color: '#aaaaaa', fontWeight: 400 }}>/{session.expected}</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#aaaaaa' }}>attended</div>
      </div>
      <div
        style={{
          minWidth: '130px',
          flex: '0 0 130px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.35rem 0.625rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '0.375rem',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: 'monospace',
            color: '#333333',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {session.classKey}
        </span>
        <motion.button
          onClick={handleCopy}
          whileTap={{ scale: 0.9 }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.15rem',
            color: copied ? '#008844' : '#999999',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: '0.7rem', fontWeight: 600 }}
              >
                ✓
              </motion.span>
            ) : (
              <motion.svg
                key="copy"
                width="12"
                height="12"
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
      <div
        style={{
          minWidth: '80px',
          flex: '0 0 80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.375rem',
        }}
      >
        <motion.button
          onClick={handleDownload}
          whileTap={{ scale: 0.9 }}
          title="Download session data"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.35rem',
            color: '#888888',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '0.25rem',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </motion.button>
        <span style={{ fontSize: '0.72rem', color: '#aaaaaa', whiteSpace: 'nowrap' }}>
          {formatTimeAgo(session.startedAt)}
        </span>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────── Main Page ──────────────────────────── */

export default function StartSessionPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [sessionName, setSessionName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [expectedParticipants, setExpectedParticipants] = useState('');
  const [customClassKey, setCustomClassKey] = useState('');
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  /* ── Load sessions from IndexedDB on mount ── */
  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const data = await getAll();
        if (!cancelled) {
          // IndexedDB getAll returns array of all stored objects
          const parsed: Session[] = Array.isArray(data)
            ? data.filter((item): item is Session => item && typeof item === 'object' && 'id' in item)
            : [];
          setSessions(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          setSessionsError('Failed to load sessions from local storage.');
          console.error('IndexedDB getAll error:', err);
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }

    loadSessions();
    return () => { cancelled = true; };
  }, []);

  const handleSessionClick = (session: Session) => {
    setSessionName(session.name);
    setDurationMinutes(String(Math.round(session.durationMs / (1000 * 60))));
    setExpectedParticipants(String(session.expected));
    setCustomClassKey(session.classKey);
    setUseCustomKey(true);
    setEditingSessionId(session.id);
    setSubmitError(null);
    setSubmitSuccess(false);

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStartSession = async () => {
    if (!sessionName.trim()) {
      setSubmitError('Session name is required.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const durationMs = parseInt(durationMinutes) * 60 * 1000 || 1000 * 60 * 60;
      const classKey = useCustomKey && customClassKey.trim()
        ? customClassKey.trim().toUpperCase()
        : generateClassKey();

      const newSession: Session = {
        id: classKey,
        name: sessionName.trim(),
        startedAt: Date.now(),
        durationMs,
        expected: parseInt(expectedParticipants) || 30,
        attended: 0,
        status: 'active',
        classKey,
      };

      // ── 1. Save to Redis ──
      const redisResult = await addRedisData(
        newSession,
        classKey,
        Math.floor(durationMs / 1000)
      );

      if (redisResult && redisResult.error) {
        setSubmitError(`Redis error: ${redisResult.error}`);
        setSubmitLoading(false);
        return;
      }

      // ── 2. Save to IndexedDB ──
      try {
        await save(newSession);
      } catch (dbErr) {
        console.error('IndexedDB save error:', dbErr);
        // Don't block — session is in Redis, just warn
      }


      const myRooms = localStorage.getItem('mySession');
      if (!myRooms) {
        localStorage.setItem('mySession', JSON.stringify([classKey]));
      } else {
        try {
          const roomList: string[] = JSON.parse(myRooms);
          if (!roomList.includes(classKey)) {
            roomList.push(classKey);
            localStorage.setItem('mySession', JSON.stringify(roomList));
          }
        } catch {
          localStorage.setItem('mySession', JSON.stringify([classKey]));
        }
      }

      // ── 4. Update UI ──
      setSessions((prev) => [newSession, ...prev]);
      setSubmitSuccess(true);

      // Reset form
      setSessionName('');
      setDurationMinutes('');
      setExpectedParticipants('');
      setCustomClassKey('');
      setUseCustomKey(false);
      setEditingSessionId(null);

      // ── 5. Navigate ──
      router.push(`/session/${classKey}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      console.error('Start session error:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setSessionName('');
    setDurationMinutes('');
    setExpectedParticipants('');
    setCustomClassKey('');
    setUseCustomKey(false);
    setEditingSessionId(null);
    setSubmitError(null);
    setSubmitSuccess(false);
  };


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
            <h1
              style={{
                margin: '0 0 0.375rem 0',
                fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
                fontWeight: 800,
                color: '#000000',
                letterSpacing: '-0.02em',
              }}
            >
              Start Session
            </h1>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#888888' }}>
              Create a new attendance session or click a previous one to reuse its details.
            </p>
          </motion.div>

          {/* ─── Form ─── */}
          <motion.div
            ref={formRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: '0.875rem',
              padding: 'clamp(1.25rem, 3vw, 1.75rem)',
              marginBottom: '2.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#000000' }}>
                {editingSessionId ? 'Edit Session' : 'New Session'}
              </h2>
              {editingSessionId && (
                <motion.button
                  onClick={handleCancelEdit}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    color: '#888888',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem',
                  }}
                >
                  Cancel
                </motion.button>
              )}
            </div>

            <div className="text-black" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Session Name */}
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
                  Session Name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g. Introduction to Python"
                  disabled={submitLoading}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e5e5',
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                    opacity: submitLoading ? 0.6 : 1,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#000000')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
                />
              </div>

              {/* Duration + Expected */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
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
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="60"
                    min="1"
                    disabled={submitLoading}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #e5e5e5',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                      opacity: submitLoading ? 0.6 : 1,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#000000')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
                  />
                </div>
                <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
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
                    Expected Participants
                  </label>
                  <input
                    type="number"
                    value={expectedParticipants}
                    onChange={(e) => setExpectedParticipants(e.target.value)}
                    placeholder="30"
                    min="1"
                    disabled={submitLoading}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #e5e5e5',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                      opacity: submitLoading ? 0.6 : 1,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#000000')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
                  />
                </div>
              </div>

              {/* Custom Key Toggle */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: submitLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#555555',
                    marginBottom: '0.5rem',
                    opacity: submitLoading ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={useCustomKey}
                    onChange={(e) => setUseCustomKey(e.target.checked)}
                    disabled={submitLoading}
                    style={{ cursor: submitLoading ? 'not-allowed' : 'pointer' }}
                  />
                  Use custom class key
                </label>

                <AnimatePresence>
                  {useCustomKey && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <input
                        type="text"
                        value={customClassKey}
                        onChange={(e) => setCustomClassKey(e.target.value.toUpperCase())}
                        placeholder="e.g. CLASS-ABC123"
                        disabled={submitLoading}
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.875rem',
                          border: '1px solid #e5e5e5',
                          borderRadius: '0.5rem',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'monospace',
                          letterSpacing: '0.05em',
                          transition: 'border-color 0.2s',
                          opacity: submitLoading ? 0.6 : 1,
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#000000')}
                        onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Preview Key */}
              {!useCustomKey && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 0.875rem',
                    backgroundColor: '#fafafa',
                    borderRadius: '0.5rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#888888' }}>
                    Class Key (auto-generated)
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      color: '#000000',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {generateClassKey()}
                  </span>
                </div>
              )}

              {/* Error / Success Messages */}
              <AnimatePresence>
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#fff0f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#cc4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {submitError}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {submitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#f0fff5',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#008844',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Session created successfully! Redirecting...
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                <motion.button
                  onClick={handleStartSession}
                  disabled={submitLoading}
                  whileHover={submitLoading ? {} : { scale: 1.02, y: -1 }}
                  whileTap={submitLoading ? {} : { scale: 0.98 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 2rem',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: submitLoading ? 'not-allowed' : 'pointer',
                    opacity: submitLoading ? 0.7 : 1,
                  }}
                >
                  {submitLoading ? (
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      {editingSessionId ? 'Update Session' : 'Start Session'}
                    </>
                  )}
                </motion.button>

                {editingSessionId && (
                  <motion.button
                    onClick={handleCancelEdit}
                    disabled={submitLoading}
                    whileHover={submitLoading ? {} : { scale: 1.02 }}
                    whileTap={submitLoading ? {} : { scale: 0.98 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#f5f5f5',
                      color: '#333333',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: submitLoading ? 'not-allowed' : 'pointer',
                      opacity: submitLoading ? 0.7 : 1,
                    }}
                  >
                    Cancel
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* ─── Previous Sessions ─── */}
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
                Previous Sessions
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#aaaaaa' }}>
                {sessions.length} total
              </span>
            </div>

            {/* Loading State */}
            {sessionsLoading && (
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
                <span style={{ fontSize: '0.85rem' }}>Loading sessions...</span>
              </div>
            )}

            {/* Error State */}
            {sessionsError && !sessionsLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: '#fff0f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  color: '#cc4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {sessionsError}
              </motion.div>
            )}

            {/* Sessions List */}
            {!sessionsLoading && !sessionsError && (
              <>
                {/* Desktop Column Headers */}
                <div
                  className="session-headers"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.625rem 1.25rem',
                    borderBottom: '1px solid #e5e5e5',
                    minWidth: 'fit-content',
                  }}
                >
                  <div style={{ width: '8px', flexShrink: 0 }} />
                  <div style={{ minWidth: '160px', flex: '2 1 160px', fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Session
                  </div>
                  <div style={{ minWidth: '70px', flex: '0 0 70px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Duration
                  </div>
                  <div style={{ minWidth: '80px', flex: '0 0 80px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Attendance
                  </div>
                  <div style={{ minWidth: '130px', flex: '0 0 130px', fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Class Key
                  </div>
                  <div style={{ minWidth: '80px', flex: '0 0 80px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Actions
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <AnimatePresence>
                    {sessions.map((session, index) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        index={index}
                        onClick={handleSessionClick}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {sessions.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#aaaaaa',
                      fontSize: '0.9rem',
                    }}
                  >
                    No sessions yet. Create your first one above.
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>

        {/* Responsive Styles */}
        <style>{`
          @media (max-width: 640px) {
            .session-headers {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}