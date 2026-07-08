"use client";



import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/navbar';


interface Session {
  id: string;
  name: string;
  date: string;
  time: string;
  attendees: number;
  total: number;
  status: 'active' | 'ended' | 'scheduled';
  classKey: string;
}

const dummySessions: Session[] = [
  {
    id: '1',
    name: 'Introduction to Machine Learning',
    date: '2026-07-08',
    time: '09:00 AM',
    attendees: 42,
    total: 50,
    status: 'active',
    classKey: 'ML-7X9K2P',
  },
  {
    id: '2',
    name: 'Advanced React Patterns',
    date: '2026-07-07',
    time: '02:00 PM',
    attendees: 38,
    total: 40,
    status: 'ended',
    classKey: 'REACT-4M8NQ1',
  },
  {
    id: '3',
    name: 'Database Design Fundamentals',
    date: '2026-07-06',
    time: '10:30 AM',
    attendees: 55,
    total: 60,
    status: 'ended',
    classKey: 'DB-9J3L7W',
  },
  {
    id: '4',
    name: 'UI/UX Design Workshop',
    date: '2026-07-09',
    time: '11:00 AM',
    attendees: 0,
    total: 30,
    status: 'scheduled',
    classKey: 'UX-2K5P8R',
  },
  {
    id: '5',
    name: 'Cloud Computing Basics',
    date: '2026-07-05',
    time: '03:00 PM',
    attendees: 28,
    total: 35,
    status: 'ended',
    classKey: 'CLOUD-6H4T9V',
  },
  {
    id: '6',
    name: 'Cybersecurity Essentials',
    date: '2026-07-10',
    time: '01:00 PM',
    attendees: 0,
    total: 45,
    status: 'scheduled',
    classKey: 'SEC-8M2K4P',
  },
];



function generateClassKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = chars.slice(0, 26).charAt(Math.floor(Math.random() * 26)) +
               chars.slice(0, 26).charAt(Math.floor(Math.random() * 26)) +
               chars.slice(0, 26).charAt(Math.floor(Math.random() * 26));
  const suffix = Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `${prefix}-${suffix}`;
}

function getStatusColor(status: Session['status']) {
  switch (status) {
    case 'active': return '#000000';
    case 'ended': return '#888888';
    case 'scheduled': return '#0066cc';
  }
}

function getStatusBg(status: Session['status']) {
  switch (status) {
    case 'active': return '#f5f5f5';
    case 'ended': return '#fafafa';
    case 'scheduled': return '#f0f7ff';
  }
}


function SessionCard({ session, index }: { session: Session; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(session.classKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        cursor: 'default',
        color: '#000',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#000000', lineHeight: 1.4 }}>
          {session.name}
        </h3>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0.25rem 0.6rem',
            borderRadius: '9999px',
            backgroundColor: getStatusBg(session.status),
            color: getStatusColor(session.status),
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {session.status}
        </span>
      </div>

      {/* Date & Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#666666' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{session.date}</span>
        <span style={{ color: '#cccccc' }}>|</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>{session.time}</span>
      </div>

      {/* Attendance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#666666' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>
          <strong style={{ color: '#000000' }}>{session.attendees}</strong> / {session.total} attended
        </span>
      </div>

      {/* Class Key */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.6rem 0.875rem',
          backgroundColor: '#fafafa',
          borderRadius: '0.5rem',
          marginTop: '0.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#888888' }}>
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, fontFamily: 'monospace', color: '#333333', letterSpacing: '0.05em' }}>
            {session.classKey}
          </span>
        </div>
        <motion.button
          onClick={handleCopy}
          whileTap={{ scale: 0.92 }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            color: copied ? '#008844' : '#888888',
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            gap: '0.25rem',
          }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
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
                strokeLinejoin="round"
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
    </motion.div>
  );
}



export default function StartSessionPage() {
  const [sessions, setSessions] = useState<Session[]>(dummySessions);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [newSessionTotal, setNewSessionTotal] = useState('');

  const handleCreateSession = () => {
    if (!newSessionName.trim()) return;
    const newSession: Session = {
      id: Date.now().toString(),
      name: newSessionName,
      date: newSessionDate || new Date().toISOString().split('T')[0],
      time: newSessionTime || '09:00 AM',
      attendees: 0,
      total: parseInt(newSessionTotal) || 30,
      status: 'scheduled',
      classKey: generateClassKey(),
    };
    setSessions([newSession, ...sessions]);
    setShowCreateModal(false);
    setNewSessionName('');
    setNewSessionDate('');
    setNewSessionTime('');
    setNewSessionTotal('');
  };

  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const endedCount = sessions.filter((s) => s.status === 'ended').length;
  const scheduledCount = sessions.filter((s) => s.status === 'scheduled').length;

  return (
  <div>
    <Navbar />
           <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        padding: '2rem',
        paddingTop: '96px',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '2rem' }}
        >
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, color: '#000000', letterSpacing: '-0.02em' }}>
            Sessions
          </h1>
          <p style={{ margin: 0, fontSize: '1rem', color: '#666666' }}>
            Manage your attendance sessions and class keys.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}
        >
          {[
            { label: 'Active', value: activeCount, color: '#000000' },
            { label: 'Ended', value: endedCount, color: '#888888' },
            { label: 'Scheduled', value: scheduledCount, color: '#0066cc' },
            { label: 'Total', value: sessions.length, color: '#333333' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              style={{
                flex: '1 1 120px',
                padding: '1rem 1.25rem',
                border: '1px solid #f0f0f0',
                borderRadius: '0.75rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: '#888888', marginTop: '0.25rem' }}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Create Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ marginBottom: '2rem' }}
        >
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1.5rem',
              backgroundColor: '#000000',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New Session
          </motion.button>
        </motion.div>

        {/* Session Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <AnimatePresence>
            {sessions.map((session, index) => (
              <SessionCard key={session.id} session={session} index={index} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1rem',
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '1rem',
                padding: '2rem',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#000000' }}>
                Create New Session
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#333333', marginBottom: '0.375rem' }}>
                    Session Name
                  </label>
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="e.g. Web Development 101"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #e5e5e5',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#333333', marginBottom: '0.375rem' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={newSessionDate}
                      onChange={(e) => setNewSessionDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        border: '1px solid #e5e5e5',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#333333', marginBottom: '0.375rem' }}>
                      Time
                    </label>
                    <input
                      type="time"
                      value={newSessionTime}
                      onChange={(e) => setNewSessionTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        border: '1px solid #e5e5e5',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#333333', marginBottom: '0.375rem' }}>
                    Expected Attendees
                  </label>
                  <input
                    type="number"
                    value={newSessionTotal}
                    onChange={(e) => setNewSessionTotal(e.target.value)}
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
                    }}
                  />
                </div>

                {/* Preview Key */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fafafa',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: '#888888' }}>Class Key (auto-generated)</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace', color: '#000000' }}>
                    {generateClassKey()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <motion.button
                  onClick={() => setShowCreateModal(false)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
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
                <motion.button
                  onClick={handleCreateSession}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Create Session
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}
