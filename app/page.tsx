"use client";
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from './components/navbar';
import { UPDATES } from './lib/update-data';

export default function SASLandingPage() {
  const router = useRouter();
  const latest = UPDATES[0];

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: "-apple-system, sans-serif" }}>
      <Navbar />
      <main style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '2rem 1.5rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto'
      }}>


        <motion.div    className="text-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SASLogo />
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>SAS</span>
        </motion.div>

        {/* Responsive Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ 
            fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', // Scales down automatically
            fontWeight: 800, marginBottom: '1rem', lineHeight: 1.1, letterSpacing: '-0.03em' 
          }}
          className="text-black"
        >
          Smart Attendance System
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ fontSize: '1.1rem', color: '#555', marginBottom: '2.5rem', maxWidth: '500px' }}
        >
          Effortless, accurate, and real-time attendance tracking for modern teams and classrooms.
        </motion.p>

        {/* Latest Update — always shows the newest entry from lib/updates-data.ts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileHover={{ y: -2 }}
          onClick={() => router.push('/updates')}
          style={{
            width: '100%',
            maxWidth: '520px',
            marginBottom: '2.5rem',
            border: '1px solid #f0f0f0',
            borderRadius: '0.875rem',
            padding: '0.875rem 1.25rem',
            backgroundColor: '#ffffff',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            flexWrap: 'wrap',
          }}
        >
         
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '0.72rem', color: '#aaaaaa', marginBottom: '0.125rem' }}>
              {"Latest Update"} · {latest.date}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#000000', marginBottom: '0.125rem' }}>
              {latest.title}
            </div>
            <div
              style={{
                fontSize: '0.78rem',
                color: '#888888',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {latest.summary}
            </div>
          </div>
          <span style={{ fontSize: '1rem', color: 'sky blue', flexShrink: 0 }}>Read More</span>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}
        >
          <Button onClick={() => router.push('/start')} primary>Get Started</Button>
          <Button onClick={() => router.push('/join-session')}>Join Session</Button>
          <Button onClick={() => router.push('/features')}>Features</Button>
        </motion.div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Real-time', 'PDF Reports', 'Secure', 'Easy Integration'].map((text) => (
            <span key={text} style={{ padding: '0.4rem 0.8rem', border: '1px solid #e5e5e5', borderRadius: '999px', fontSize: '0.8rem', color: '#666' }}>
              {text}
            </span>
          ))}
        </div>
      </main>

    </div>
  );
}

function Button({ children, onClick, primary }: { children: React.ReactNode, onClick: () => void, primary?: boolean }) {
  return (
    <motion.button
      whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        padding: '0.8rem 1.5rem',
        backgroundColor: primary ? '#000' : '#f9f9f9',
        color: primary ? '#fff' : '#000',
        border: primary ? 'none' : '1px solid #e5e5e5',
        borderRadius: '0.5rem',
        fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
      }}
    >
      {children}
    </motion.button>
  );
}

export function SASLogo() {
  return <Image src="/logo.svg" alt="SAS Logo" width={32} height={32} />;
}