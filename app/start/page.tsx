"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/navbar';
import { redirect } from 'next/navigation';

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



const dummySessions: Session[] = [
  {
    id: '1',
    name: 'Web Dev Bootcamp',
    startedAt: Date.now() - 1000 * 60 * 60 * 2,
    durationMs: 1000 * 60 * 60 * 3,
    expected: 40,
    attended: 38,
    status: 'active',
    classKey: 'WEB-9K2P7M',
  },
  {
    id: '2',
    name: 'Data Structures',
    startedAt: Date.now() - 1000 * 60 * 60 * 48,
    durationMs: 1000 * 60 * 90,
    expected: 55,
    attended: 52,
    status: 'ended',
    classKey: 'DS-4L8NQ1',
  },
  {
    id: '3',
    name: 'UI Design Principles',
    startedAt: Date.now() - 1000 * 60 * 60 * 120,
    durationMs: 1000 * 60 * 60 * 2,
    expected: 30,
    attended: 28,
    status: 'ended',
    classKey: 'UI-2K5P8R',
  },
  {
    id: '4',
    name: 'Cloud Architecture',
    startedAt: Date.now() - 1000 * 60 * 60 * 200,
    durationMs: 1000 * 60 * 60 * 4,
    expected: 25,
    attended: 23,
    status: 'ended',
    classKey: 'CLOUD-6H4T9V',
  },
  {
    id: '5',
    name: 'Mobile App Dev',
    startedAt: Date.now() - 1000 * 60 * 60 * 300,
    durationMs: 1000 * 60 * 60 * 2,
    expected: 35,
    attended: 33,
    status: 'ended',
    classKey: 'MOB-3J7L2W',
  },
];



function generateClassKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = Array.from({ length: 3 }, () =>
    chars.slice(0, 26).charAt(Math.floor(Math.random() * 26))
  ).join('');
  const suffix = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  return `${prefix}-${suffix}`;
}

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
  a.download = `${session.name.replace(/\\s+/g, '_')}_session.json`;
  a.click();
  URL.revokeObjectURL(url);
}



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
      {/* Status dot */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: session.status === 'active' ? '#000000' : '#cccccc',
          flexShrink: 0,
        }}
      />

      {/* Name */}
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

      {/* Duration */}
      <div style={{ minWidth: '70px', flex: '0 0 70px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#333333' }}>
          {formatDuration(session.durationMs)}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#aaaaaa' }}>duration</div>
      </div>

      {/* Attendance */}
      <div style={{ minWidth: '80px', flex: '0 0 80px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#000000' }}>
          {session.attended}
          <span style={{ color: '#aaaaaa', fontWeight: 400 }}>/{session.expected}</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#aaaaaa' }}>attended</div>
      </div>

      {/* Class Key */}
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

      {/* Actions */}
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



export default function StartSessionPage() {
  const [sessions, setSessions] = useState<Session[]>(dummySessions);
  const [sessionName, setSessionName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [expectedParticipants, setExpectedParticipants] = useState('');
  const [customClassKey, setCustomClassKey] = useState('');
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const handleSessionClick = (session: Session) => {
    setSessionName(session.name);
    setDurationMinutes(String(Math.round(session.durationMs / (1000 * 60))));
    setExpectedParticipants(String(session.expected));
    setCustomClassKey(session.classKey);
    setUseCustomKey(true);
    setEditingSessionId(session.id);

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStartSession = () => {
    if (!sessionName.trim()) return;

    const durationMs = parseInt(durationMinutes) * 60 * 1000 || 1000 * 60 * 60;
    const classKey = useCustomKey && customClassKey.trim()
      ? customClassKey.trim().toUpperCase()
      : generateClassKey();

    const newSession: Session = {
      id: editingSessionId || Date.now().toString(),
      name: sessionName.trim(),
      startedAt: Date.now(),
      durationMs,
      expected: parseInt(expectedParticipants) || 30,
      attended: 0,
      status: 'active',
      classKey,
    };
    const myRooms = localStorage.getItem('mySession');
    if(!myRooms){
        localStorage.setItem('mySession', JSON.stringify([newSession.id]));
    } else {
        const sessions = JSON.parse(myRooms);
        sessions.push(newSession);
        localStorage.setItem('mySession', JSON.stringify(sessions));
    }
    redirect(`/session/${newSession.id}`);

    if (editingSessionId) {
      setSessions((prev) =>
        prev.map((s) => (s.id === editingSessionId ? { ...newSession, attended: s.attended, status: s.status } : s))
      );
    } else {
      setSessions([newSession, ...sessions]);
    }

    // Reset
    setSessionName('');
    setDurationMinutes('');
    setExpectedParticipants('');
    setCustomClassKey('');
    setUseCustomKey(false);
    setEditingSessionId(null);
  };

  const handleCancelEdit = () => {
    setSessionName('');
    setDurationMinutes('');
    setExpectedParticipants('');
    setCustomClassKey('');
    setUseCustomKey(false);
    setEditingSessionId(null);
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

        {/* ─── Start Session Form ─── */}
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
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #e5e5e5',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#000000')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
              />
            </div>

            {/* Duration + Expected */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
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
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e5e5',
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
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
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e5e5',
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#000000')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
                />
              </div>
            </div>

            {/* Class Key Toggle */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#555555',
                  marginBottom: '0.5rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={useCustomKey}
                  onChange={(e) => setUseCustomKey(e.target.checked)}
                  style={{ cursor: 'pointer' }}
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

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '0.25rem',
                flexWrap: 'wrap',
              }}
            >
              <motion.button
                onClick={handleStartSession}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
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
                  cursor: 'pointer',
                }}
              >
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
              </motion.button>

              {editingSessionId && (
                <motion.button
                  onClick={handleCancelEdit}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                    cursor: 'pointer',
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
            <div
              style={{
                minWidth: '160px',
                flex: '2 1 160px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#aaaaaa',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Session
            </div>
            <div
              style={{
                minWidth: '70px',
                flex: '0 0 70px',
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#aaaaaa',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Duration
            </div>
            <div
              style={{
                minWidth: '80px',
                flex: '0 0 80px',
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#aaaaaa',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Attendance
            </div>
            <div
              style={{
                minWidth: '130px',
                flex: '0 0 130px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#aaaaaa',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Class Key
            </div>
            <div
              style={{
                minWidth: '80px',
                flex: '0 0 80px',
                textAlign: 'right',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#aaaaaa',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Actions
            </div>
          </div>

          {/* Rows */}
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
