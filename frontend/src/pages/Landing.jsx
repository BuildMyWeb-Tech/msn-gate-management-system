import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PRIMARY = "#bd9dff";
const PRIMARY_DIM = "#8a4cfc";
const PRIMARY_DARK = "#2e006c";
const BG_MAIN = "#060e20";
const SURFACE = "#0f1930";
const SURFACE_HIGH = "#141f38";
const TEXT_MAIN = "#dee5ff";
const TEXT_MUTED = "#a3aac4";
const BORDER = "rgba(109,117,140,0.2)";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#modules", label: "Modules" },
  { href: "#products", label: "Products" },
  { href: "#contact", label: "Contact" },
];

const FEATURES = [
  {
    icon: "🏗️",
    title: "Real-Time Gate Monitoring",
    desc: "Track all entries and exits at every gate with instant logs and live status updates.",
  },
  {
    icon: "👥",
    title: "Visitor Management",
    desc: "Register, verify, and log visitors with photo capture and digital pass generation.",
  },
  {
    icon: "🚗",
    title: "Vehicle Tracking",
    desc: "Complete vehicle in/out log with number plate, type, purpose, and driver details.",
  },
  {
    icon: "🛡️",
    title: "Security Patrol",
    desc: "Plan and track security patrol rounds with checkpoint verification and audit trails.",
  },
  {
    icon: "📊",
    title: "Dashboard & Reports",
    desc: "Actionable analytics on gate activity, peak hours, and security incidents.",
  },
  {
    icon: "🏢",
    title: "Multi-Site Support",
    desc: "Manage multiple factory gates and locations from a single centralized console.",
  },
];

const MODULES = [
  { icon: "🔐", name: "Gate Entry / Exit" },
  { icon: "🧑‍💼", name: "Visitor Register" },
  { icon: "🚚", name: "Vehicle Log" },
  { icon: "🗺️", name: "Patrol Planning" },
  { icon: "⚙️", name: "Setup & Config" },
  { icon: "📋", name: "Audit Reports" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const s = {
    body: {
      background: BG_MAIN,
      color: TEXT_MAIN,
      fontFamily: "'Inter', 'Manrope', sans-serif",
      minHeight: "100vh",
      overflowX: "hidden",
    },
    nav: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: scrolled ? "rgba(6,14,32,0.95)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? `1px solid ${BORDER}` : "none",
      transition: "all 0.3s ease",
    },
    navInner: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "0 2rem",
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logo: {
      fontFamily: "'Manrope', sans-serif",
      fontWeight: 800,
      fontSize: "1.25rem",
      color: TEXT_MAIN,
      letterSpacing: "-0.02em",
    },
    navLinks: {
      display: "flex",
      gap: "2rem",
      alignItems: "center",
    },
    navLink: {
      color: TEXT_MUTED,
      fontSize: "0.9rem",
      fontWeight: 500,
      transition: "color 0.2s",
      cursor: "pointer",
      textDecoration: "none",
    },
    btnPrimary: {
      background: `linear-gradient(135deg, ${PRIMARY_DIM} 0%, ${PRIMARY} 100%)`,
      color: "#fff",
      border: "none",
      borderRadius: 9999,
      padding: "0.6rem 1.5rem",
      fontWeight: 700,
      fontSize: "0.9rem",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    btnLarge: {
      padding: "1rem 2rem",
      fontSize: "1.05rem",
    },
    btnGlass: {
      background: "rgba(189,157,255,0.08)",
      color: PRIMARY,
      border: `1px solid rgba(189,157,255,0.3)`,
      borderRadius: 9999,
      padding: "0.6rem 1.5rem",
      fontWeight: 700,
      fontSize: "0.9rem",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    hero: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      position: "relative",
      overflow: "hidden",
      paddingTop: 80,
    },
    glow1: {
      position: "absolute",
      top: "-20%",
      right: "-10%",
      width: 700,
      height: 700,
      background: `radial-gradient(circle, rgba(142,76,252,0.12) 0%, transparent 65%)`,
      pointerEvents: "none",
    },
    glow2: {
      position: "absolute",
      bottom: "-10%",
      left: "-5%",
      width: 500,
      height: 500,
      background: `radial-gradient(circle, rgba(149,146,255,0.08) 0%, transparent 65%)`,
      pointerEvents: "none",
    },
    container: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "0 2rem",
      position: "relative",
      zIndex: 1,
    },
    heroGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "4rem",
      alignItems: "center",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.5rem",
      background: "rgba(142,76,252,0.12)",
      border: `1px solid rgba(189,157,255,0.2)`,
      borderRadius: 9999,
      padding: "0.35rem 1rem",
      fontSize: "0.8rem",
      fontWeight: 600,
      color: PRIMARY,
      marginBottom: "1.5rem",
    },
    badgeDot: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "#4ade80",
      boxShadow: "0 0 6px #4ade80",
    },
    h1: {
      fontFamily: "'Manrope', sans-serif",
      fontSize: "3.5rem",
      fontWeight: 800,
      lineHeight: 1.1,
      marginBottom: "1.25rem",
      letterSpacing: "-0.03em",
    },
    gradient: {
      background: `linear-gradient(135deg, ${PRIMARY_DIM}, ${PRIMARY})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    heroP: {
      color: TEXT_MUTED,
      fontSize: "1.1rem",
      lineHeight: 1.7,
      marginBottom: "2.5rem",
      maxWidth: 480,
    },
    buttonGroup: {
      display: "flex",
      gap: "1rem",
      flexWrap: "wrap",
    },
    statsCard: {
      background: `rgba(15,25,48,0.6)`,
      backdropFilter: "blur(20px)",
      border: `1px solid ${BORDER}`,
      borderRadius: "1.25rem",
      padding: "2rem",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1.5rem",
    },
    statItem: {
      textAlign: "center",
    },
    statNum: {
      fontFamily: "'Manrope', sans-serif",
      fontSize: "2.2rem",
      fontWeight: 800,
      background: `linear-gradient(135deg, ${PRIMARY_DIM}, ${PRIMARY})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      lineHeight: 1.1,
    },
    statLabel: {
      fontSize: "0.78rem",
      color: TEXT_MUTED,
      marginTop: "0.3rem",
      fontWeight: 500,
    },
    section: {
      padding: "5rem 0",
    },
    sectionDark: {
      padding: "5rem 0",
      background: "#091328",
    },
    eyebrow: {
      display: "inline-block",
      fontSize: "0.72rem",
      fontWeight: 700,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      color: PRIMARY,
      marginBottom: "0.75rem",
    },
    h2: {
      fontFamily: "'Manrope', sans-serif",
      fontSize: "2.4rem",
      fontWeight: 800,
      letterSpacing: "-0.02em",
      marginBottom: "1rem",
    },
    sectionSubP: {
      color: TEXT_MUTED,
      fontSize: "1rem",
      maxWidth: 560,
      margin: "0 auto",
      lineHeight: 1.7,
    },
    sectionHead: {
      textAlign: "center",
      marginBottom: "3.5rem",
    },
    grid3: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "1.5rem",
    },
    featureCard: {
      background: "rgba(20,31,56,0.5)",
      border: `1px solid ${BORDER}`,
      borderRadius: "1rem",
      padding: "1.75rem",
      transition: "border-color 0.2s, transform 0.2s",
      cursor: "default",
    },
    featureIcon: {
      fontSize: "2rem",
      marginBottom: "1rem",
    },
    featureTitle: {
      fontFamily: "'Manrope', sans-serif",
      fontWeight: 700,
      fontSize: "1.05rem",
      marginBottom: "0.5rem",
    },
    featureDesc: {
      color: TEXT_MUTED,
      fontSize: "0.88rem",
      lineHeight: 1.6,
    },
    moduleGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "1rem",
    },
    moduleChip: {
      background: "rgba(142,76,252,0.08)",
      border: `1px solid rgba(189,157,255,0.2)`,
      borderRadius: "0.75rem",
      padding: "1rem 1.25rem",
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      fontWeight: 600,
      fontSize: "0.9rem",
      color: TEXT_MAIN,
    },
    ctaSection: {
      padding: "5rem 0",
      textAlign: "center",
    },
    ctaCard: {
      background: `linear-gradient(135deg, rgba(46,0,108,0.5), rgba(142,76,252,0.15))`,
      border: `1px solid rgba(189,157,255,0.2)`,
      borderRadius: "1.5rem",
      padding: "4rem 2rem",
      maxWidth: 700,
      margin: "0 auto",
    },
    footer: {
      borderTop: `1px solid ${BORDER}`,
      padding: "2rem 0",
      textAlign: "center",
      color: TEXT_MUTED,
      fontSize: "0.85rem",
    },
    mobileMenu: {
      background: "rgba(6,14,32,0.98)",
      backdropFilter: "blur(16px)",
      borderTop: `1px solid ${BORDER}`,
      padding: "1rem 2rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
    },
  };

  return (
    <div style={s.body}>
      {/* Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.logo}>MSN Gate</div>
          <div style={{ ...s.navLinks, display: window.innerWidth < 768 ? "none" : "flex" }}>
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={s.navLink}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              style={{ ...s.btnPrimary, display: window.innerWidth < 768 ? "none" : "inline-flex" }}
              onClick={() => navigate("/login")}
            >
              Login →
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "none",
                border: `1px solid ${BORDER}`,
                color: TEXT_MUTED,
                borderRadius: "0.5rem",
                padding: "0.4rem 0.6rem",
                cursor: "pointer",
                display: window.innerWidth < 768 ? "block" : "none",
                fontSize: "1.2rem",
              }}
            >
              ☰
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={s.mobileMenu}>
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{ ...s.navLink, color: TEXT_MAIN }}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <button style={{ ...s.btnPrimary, ...s.btnLarge }} onClick={() => navigate("/login")}>
              Login →
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section style={s.hero} id="home">
        <div style={s.glow1} />
        <div style={s.glow2} />
        <div style={s.container}>
          <div style={s.heroGrid}>
            <div>
              <div style={s.badge}>
                <div style={s.badgeDot} />
                <span>Smart Gate Management</span>
              </div>
              <h1 style={s.h1}>
                Secure Your{" "}
                <span style={s.gradient}>Factory Gates</span>{" "}
                with Precision.
              </h1>
              <p style={s.heroP}>
                MSN Gate merges industrial-grade security with modern software to manage all entry
                points, visitors, vehicles, and patrol rounds in one unified platform.
              </p>
              <div style={s.buttonGroup}>
                <button
                  style={{ ...s.btnPrimary, ...s.btnLarge }}
                  onClick={() => navigate("/login")}
                >
                  Login to Portal →
                </button>
                <a href="#features" style={{ ...s.btnGlass, ...s.btnLarge, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  Explore Features
                </a>
              </div>
            </div>
            <div style={s.statsCard}>
              {[
                { num: "5+", label: "Companies" },
                { num: "24/7", label: "Live Monitoring" },
                { num: "100%", label: "Digital Logs" },
                { num: "Real-Time", label: "Patrol Tracking" },
              ].map((st) => (
                <div key={st.label} style={s.statItem}>
                  <div style={s.statNum}>{st.num}</div>
                  <div style={s.statLabel}>{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={s.sectionDark} id="features">
        <div style={s.container}>
          <div style={s.sectionHead}>
            <span style={s.eyebrow}>Core Features</span>
            <h2 style={s.h2}>
              Everything You Need to{" "}
              <span style={s.gradient}>Run a Secure Gate</span>
            </h2>
            <p style={s.sectionSubP}>
              From visitor logs to vehicle tracking and patrol management — MSN Gate covers every
              aspect of factory security.
            </p>
          </div>
          <div style={s.grid3}>
            {FEATURES.map((f) => (
              <div key={f.title} style={s.featureCard}>
                <div style={s.featureIcon}>{f.icon}</div>
                <div style={s.featureTitle}>{f.title}</div>
                <div style={s.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section style={s.section} id="modules">
        <div style={s.container}>
          <div style={s.sectionHead}>
            <span style={s.eyebrow}>Modules</span>
            <h2 style={s.h2}>
              All <span style={s.gradient}>Security Modules</span> in One Place
            </h2>
          </div>
          <div style={s.moduleGrid}>
            {MODULES.map((m) => (
              <div key={m.name} style={s.moduleChip}>
                <span style={{ fontSize: "1.5rem" }}>{m.icon}</span>
                {m.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section style={s.sectionDark} id="products">
        <div style={s.container}>
          <div style={s.sectionHead}>
            <span style={s.eyebrow}>MSN Products</span>
            <h2 style={s.h2}>
              Part of the <span style={s.gradient}>MSN Infotech Suite</span>
            </h2>
            <p style={s.sectionSubP}>
              MSN Gate works seamlessly alongside MSN PayRoll and other MSN products for a fully
              integrated factory management experience.
            </p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { name: "MSN PayRoll", desc: "Payroll & Attendance", color: "#bd9dff" },
              { name: "MSN Gate", desc: "Gate & Security", color: "#4ade80", active: true },
              { name: "MSN ERP", desc: "Enterprise Resource", color: "#60a5fa" },
            ].map((p) => (
              <div
                key={p.name}
                style={{
                  background: p.active ? "rgba(74,222,128,0.08)" : "rgba(20,31,56,0.5)",
                  border: `1px solid ${p.active ? "rgba(74,222,128,0.3)" : BORDER}`,
                  borderRadius: "1rem",
                  padding: "2rem",
                  width: 220,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                  {p.name === "MSN PayRoll" ? "💼" : p.name === "MSN Gate" ? "🏗️" : "📦"}
                </div>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: p.color, marginBottom: "0.35rem" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "0.82rem", color: TEXT_MUTED }}>{p.desc}</div>
                {p.active && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      display: "inline-block",
                      background: "rgba(74,222,128,0.15)",
                      border: "1px solid rgba(74,222,128,0.3)",
                      borderRadius: 9999,
                      padding: "0.2rem 0.75rem",
                      fontSize: "0.72rem",
                      color: "#4ade80",
                      fontWeight: 600,
                    }}
                  >
                    Current App
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={s.ctaSection} id="contact">
        <div style={s.container}>
          <div style={s.ctaCard}>
            <h2 style={{ ...s.h2, marginBottom: "1rem" }}>
              Ready to Secure Your{" "}
              <span style={s.gradient}>Factory Gates?</span>
            </h2>
            <p style={{ ...s.sectionSubP, margin: "0 auto 2.5rem" }}>
              Log in to your company's gate management portal and take full control of your
              security operations today.
            </p>
            <button
              style={{ ...s.btnPrimary, ...s.btnLarge }}
              onClick={() => navigate("/login")}
            >
              Login to Portal →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.container}>
          <p>© {new Date().getFullYear()} MSN Infotech. All rights reserved. · MSN Gate Management System</p>
        </div>
      </footer>
    </div>
  );
}
