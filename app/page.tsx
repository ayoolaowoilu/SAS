"use client"
import { motion } from 'framer-motion';
import Navbar from './components/navbar';
import Image from 'next/image';

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
    <Image src="/logo.svg" alt="SAS Logo" width={48} height={48} />

  );
}