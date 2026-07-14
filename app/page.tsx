"use client"
import { motion } from 'framer-motion';
import Navbar from './components/navbar';

export default function SASLandingPage() {
  return (
   <div>
      <Navbar />
        <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        padding: '2rem',
        textAlign: 'center',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
      }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
        }}
      >
        <SASLogo />
        <span
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#000000',
            letterSpacing: '-0.02em',
          }}
        >
          SAS
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          color: '#000000',
          marginBottom: '1rem',
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
        }}
      >
        Smart Attendance System
      </motion.h1>


      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        style={{
          fontSize: '1.25rem',
          color: '#555555',
          maxWidth: '560px',
          marginBottom: '2.5rem',
          lineHeight: 1.6,
        }}
      >
        Effortless, accurate, and real-time attendance tracking. Built for modern
        teams, classrooms, and organizations.
      </motion.p>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
        whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)' }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem 2.5rem',
          backgroundColor: '#000000',
          color: '#ffffff',
          fontSize: '1rem',
          fontWeight: 600,
          borderRadius: '0.5rem',
          border: 'none',
          cursor: 'pointer',
        }}
        onClick={() => window.location.href = '/start'}
      >
        Get Started
      </motion.button>
      

      {/* Feature Pills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
        style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '3rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {['Real-time Tracking', 'Instant PDF Reports', 'Secure & Reliable' , 'Easy Integration'].map(
          (text, i) => (
            <motion.span
              key={text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e5e5e5',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                color: '#333333',
                backgroundColor: '#fafafa',
              }}
            >
              {text}
            </motion.span>
          )
        )}
      </motion.div>
    </div>
   </div>
  );
}

export function SASLogo() {
  return (
    <motion.svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ rotate: -10, opacity: 0 }}
      animate={{ rotate: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      whileHover={{ rotate: 10, scale: 1.1 }}
      style={{ color: '#000000' }}
    >
      {/* Fingerprint-style attendance icon */}
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 2a10 10 0 0 0-10 10" />
      <path d="M12 6a6 6 0 0 1 6 6" />
      <path d="M12 6a6 6 0 0 0-6 6" />
      <path d="M12 10a2 2 0 0 1 2 2" />
      <path d="M12 10a2 2 0 0 0-2 2" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
      <motion.path
        d="M8 22l4-4 4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
}