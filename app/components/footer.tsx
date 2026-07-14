"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SASLogo } from "../page";

export default function Footer() {
  const router = useRouter();

  return (
    <footer style={{ borderTop: "1px solid #f0f0f0", backgroundColor: "#ffffff" }}>
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "1rem 1.5rem",
          display: "flex",
          flexWrap: "wrap", // Enables wrapping on small screens
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
        className="footer-container"
      >
        {/* Left: Logo */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
          onClick={() => router.push("/")}
        >
          <SASLogo />
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#000000", letterSpacing: "-0.02em" }}>
            SAS
          </span>
        </div>

        {/* Center: Made with love (hidden on very small screens if necessary) */}
        <p style={{ fontSize: "0.8rem", color: "#888888", margin: 0, display: "flex", alignItems: "center", gap: "0.3rem" }}>
          Made with
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#cc4444" stroke="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          by the SAS team
        </p>

        {/* Right: Socials + Copyright */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          {[
            { href: "https://github.com", icon: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" },
            { href: "https://x.com", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" }
          ].map((social, i) => (
            <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" style={socialStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff" stroke="none"><path d={social.icon} /></svg>
            </a>
          ))}
          
          <div style={{ width: "1px", height: "16px", backgroundColor: "#e5e5e5" }} />
          
          <p style={{ fontSize: "0.75rem", color: "#aaaaaa" }}>&copy; {new Date().getFullYear()}</p>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .footer-container { justify-content: center !important; flex-direction: column; text-align: center; }
        }
      `}</style>
    </footer>
  );
}

const socialStyle = {
  width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#000000",
  display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s"
};