"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/app/components/navbar';
import { SASLogo } from '@/app/page';



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



function ManagerPage({ session }: { session: Session }) {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'ended'>(session.status);
  const [copied, setCopied] = useState(false);

  // Load attendees from localStorage
  useEffect(() => {
    const key = `sas_attendees_${session.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setAttendees(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, [session.id]);

  // Save attendees to localStorage
  useEffect(() => {
    const key = `sas_attendees_${session.id}`;
    localStorage.setItem(key, JSON.stringify(attendees));
  }, [attendees, session.id]);

  // Timer
  useEffect(() => {
    if (sessionStatus !== 'active') return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - session.startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus, session.startedAt]);

  // Listen for new check-ins from other tabs
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

  const handleEndSession = () => {
    setSessionStatus('ended');
    // Update session in sessions list
    const sessionsKey = 'sas_sessions';
    const saved = localStorage.getItem(sessionsKey);
    if (saved) {
      try {
        const sessions: Session[] = JSON.parse(saved);
        const updated = sessions.map((s) =>
          s.id === session.id ? { ...s, status: 'ended' as const, attended: attendees.length } : s
        );
        localStorage.setItem(sessionsKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(session.classKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRemoveAttendee = (attendeeId: string) => {
    setAttendees((prev) => prev.filter((a) => a.id !== attendeeId));
  };

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const attendanceRate = session.expected > 0
    ? Math.round((attendees.length / session.expected) * 100)
    : 0;

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
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#888888' }}>
            Manage attendance for this session.
          </p>
        </motion.div>

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
            { label: 'Duration', value: formatElapsed(elapsedMs), color: '#000000' },
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

          {sessionStatus === 'active' && (
            <motion.button
              onClick={handleEndSession}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              End Session
            </motion.button>
          )}
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
            <span style={{ fontSize: '0.8rem', color: '#aaaaaa' }}>
              {attendees.length} checked in
            </span>
          </div>

          {attendees.length === 0 ? (
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



function AttendeePage({ sessionId }: { sessionId: string }) {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !studentId.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    const attendee: Attendee = {
      id: Date.now().toString(),
      name: name.trim(),
      studentId: studentId.trim().toUpperCase(),
      checkedInAt: Date.now(),
    };

    // Save to localStorage for this session
    const key = `sas_attendees_${sessionId}`;
    const existing = localStorage.getItem(key);
    let attendees: Attendee[] = [];
    if (existing) {
      try {
        attendees = JSON.parse(existing);
      } catch {
        // ignore
      }
    }

    // Check for duplicate student ID
    if (attendees.some((a) => a.studentId === attendee.studentId)) {
      setError('This ID has already checked in.');
      return;
    }

    attendees.push(attendee);
    localStorage.setItem(key, JSON.stringify(attendees));

    setSubmitted(true);
    setError('');
  };

  if (submitted) {
    return (
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
            Checked In!
          </h2>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#888888', lineHeight: 1.5 }}>
            Your attendance has been recorded. You can close this page now.
          </p>
        </motion.div>
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
        <div className="mx-auto flex justify-center">  <SASLogo /> </div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#000000', letterSpacing: '-0.02em' }}>
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
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #e5e5e5',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
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
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: '#000000',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              marginTop: '0.5rem',
            }}
          >
            Check In
          </motion.button>
        </form>
      </motion.div>
    </div>
     </div>
  );
}


export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  const sessionId = params?.id as string;

  useEffect(() => {
    if (!sessionId) return;

    // Check if this session exists in localStorage (manager view)
    const sessionsKey = 'mySession';
    const saved = localStorage.getItem(sessionsKey);
    if (saved) {
      try {
        const sessions = JSON.parse(saved);
        const found = sessions.find((s:string) => s === sessionId);
        if (found) {
          setSession(found);
          setIsManager(true);
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }
    }

    // Not found in sessions list — it's an attendee view
    // We still need the session data though, so check if there's attendee data
    const attendeeKey = `sas_attendees_${sessionId}`;
    const hasAttendeeData = localStorage.getItem(attendeeKey) !== null;

    if (hasAttendeeData) {
      // Session exists but not in the sessions list (maybe created elsewhere)
      // For now, create a minimal session object
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
    }

    setIsManager(false);
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
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
    );
  }

  if (isManager && session) {
    return <ManagerPage session={session} />;
  }

  return <AttendeePage sessionId={sessionId} />;
}
