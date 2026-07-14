"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Navbar from "../components/navbar";

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Instant Session Creation",
    description: "Create attendance sessions in seconds with a unique 6-digit class key. Set duration, expected attendees, and start tracking immediately.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Real-Time Attendance Tracking",
    description: "Watch attendees check in live as they enter their name and registration number. No refresh needed — updates appear instantly on your dashboard.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    title: "Duplicate Prevention",
    description: "Each registration number can only check in once per session. Prevents fraud and ensures accurate headcounts without manual verification.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
    title: "Attendance Rate Analytics",
    description: "See live attendance rates color-coded by performance. Green for strong turnout, orange for moderate, red when you need to rally more attendees.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: "Export Reports",
    description: "Download attendance data as PDF or JSON with one click. Includes session metadata, attendee lists with timestamps, and calculated attendance rates.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    title: "Session History",
    description: "All your created sessions are stored locally in IndexedDB forever. Browse past sessions, review attendance records, and revisit class keys anytime.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Offline-First Architecture",
    description: "Works without internet after initial load. Sessions and attendees are stored in IndexedDB. Redis syncs across devices when connectivity returns.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    title: "Auto-End on Timeout",
    description: "Sessions automatically end when the timer runs out. No need to manually close — the system handles expiration and locks check-ins automatically.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
    title: "Cross-Device Join",
    description: "Share your 6-digit class key and anyone can join from any device. Attendees simply enter the key — no accounts, no downloads, no friction.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <div className="w-screen min-h-screen bg-white text-black" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif" }}>
      <Navbar />

      <div style={{ paddingTop: "96px" }}>
        {/* Hero */}
        <section style={{ padding: "4rem 1rem 3rem", textAlign: "center", maxWidth: "680px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span
              style={{
                display: "inline-block",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#888888",
                marginBottom: "1rem",
              }}
            >
              Features
            </span>
            <h1
              style={{
                margin: "0 0 1rem 0",
                fontSize: "clamp(1.8rem, 5vw, 2.5rem)",
                fontWeight: 800,
                color: "#000000",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
              }}
            >
              Everything you need to track attendance
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "1rem",
                color: "#888888",
                lineHeight: 1.6,
                maxWidth: "480px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Built for teachers, event organizers, and team leads who need fast, reliable attendance tracking without the complexity.
            </p>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section style={{ padding: "2rem 1rem 5rem", maxWidth: "1000px", margin: "0 auto" }}>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                style={{
                  padding: "1.75rem",
                  borderRadius: "0.875rem",
                  border: "1px solid #f0f0f0",
                  backgroundColor: "#ffffff",
                  cursor: "default",
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "0.625rem",
                    backgroundColor: "#fafafa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000000",
                    marginBottom: "1rem",
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  style={{
                    margin: "0 0 0.5rem 0",
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#000000",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#888888",
                    lineHeight: 1.6,
                  }}
                >
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA */}
        <section style={{ padding: "0 1rem 5rem", textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              maxWidth: "520px",
              margin: "0 auto",
              padding: "3rem 2rem",
              borderRadius: "0.875rem",
              border: "1px solid #f0f0f0",
              backgroundColor: "#fafafa",
            }}
          >
            <h2
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#000000",
              }}
            >
              Ready to start tracking?
            </h2>
            <p
              style={{
                margin: "0 0 1.5rem 0",
                fontSize: "0.9rem",
                color: "#888888",
              }}
            >
              Create your first session in under 10 seconds. No signup required.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <motion.button
                onClick={() => router.push("/start")}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#000000",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  borderRadius: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Session
              </motion.button>
              <motion.button
                onClick={() => router.push("/join-session")}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e5e5",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Join Session
              </motion.button>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}