import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ──────────────────────────── Navbar ──────────────────────────── */

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Docs', href: '#docs' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
  <div>
      <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 2rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        {/* Logo */}
        <motion.a
          href="#"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            color: '#000000',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <SASLogo />
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            SAS
          </span>
        </motion.a>

        {/* Desktop Links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}
        >
          {navLinks.map((link, i) => (
            <motion.a
              key={link.label}
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#333333',
                textDecoration: 'none',
                position: 'relative',
              }}
              whileHover={{ color: '#000000' }}
            >
              <span>{link.label}</span>
              <motion.span
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#000000',
                  borderRadius: '1px',
                }}
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.25 }}
              />
            </motion.a>
          ))}

          {/* Desktop CTA */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: '#000000',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Get Started
          </motion.button>
        </div>

        {/* Mobile Hamburger */}
        <motion.button
          onClick={() => setMobileOpen(!mobileOpen)}
          whileTap={{ scale: 0.9 }}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: '#000000',
          }}
          className="mobile-toggle"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <motion.line
              x1="3" y1="6" x2="21" y2="6"
              animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 0 : 0 }}
              style={{ originX: '12px', originY: '6px' }}
            />
            <motion.line
              x1="3" y1="12" x2="21" y2="12"
              animate={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <motion.line
              x1="3" y1="18" x2="21" y2="18"
              animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? 0 : 0 }}
              style={{ originX: '12px', originY: '18px' }}
            />
          </svg>
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <div style={{ padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: '#333333',
                    textDecoration: 'none',
                    padding: '0.5rem 0',
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Get Started
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle { display: block !important; }
          nav > div > div:nth-child(2) { display: none !important; }
        }
      `}</style>
    </motion.nav>

    <div className="h-14 bg-white"></div>
  </div>
  );
}

/* ──────────────────────────── Logo ──────────────────────────── */

export function SASLogo() {
  return (
    <motion.svg
      width="32"
      height="32"
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