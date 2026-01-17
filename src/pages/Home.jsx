import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <style>{`
        body { margin: 0; padding: 0; }
        .hero { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; background: linear-gradient(180deg, #FFFFFF 0%, #F8F8F6 100%); }
        .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 20% 50%, rgba(255, 90, 95, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 90, 95, 0.02) 0%, transparent 50%); animation: gradientShift 15s ease infinite; pointer-events: none; }
        @keyframes gradientShift { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } }
        .logo-container { margin-bottom: 60px; animation: fadeInUp 1.2s ease-out; position: relative; z-index: 1; }
        .logo-container::after { content: ''; position: absolute; top: 50%; left: 50%; width: 120px; height: 120px; background: radial-gradient(circle, rgba(255, 90, 95, 0.1) 0%, transparent 70%); transform: translate(-50%, -50%); border-radius: 50%; animation: pulse 3s ease-in-out infinite; z-index: -1; }
        @keyframes pulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; } 50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; } }
        .hero-text { text-align: center; max-width: 720px; padding: 0 20px; animation: fadeInUp 1.4s ease-out; z-index: 1; }
        .hero-text h1 { font-size: 64px; font-weight: 600; letter-spacing: -1.5px; margin-bottom: 24px; color: #1A1A1A; position: relative; display: inline-block; }
        .hero-text h1::after { content: ''; position: absolute; bottom: -8px; left: 0; width: 60px; height: 3px; background: linear-gradient(90deg, #FF5A5F 0%, transparent 100%); animation: underlineGrow 1.5s ease-out 0.5s forwards; transform-origin: left; transform: scaleX(0); }
        @keyframes underlineGrow { to { transform: scaleX(1); } }
        .hero-text p { font-size: 21px; font-weight: 400; color: #5A5A5A; line-height: 1.7; margin-bottom: 48px; }
        .cta-button { display: inline-block; padding: 16px 40px; background: #2C2C2C; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); letter-spacing: 0.3px; position: relative; overflow: hidden; }
        .cta-button::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent); transition: left 0.5s; }
        .cta-button:hover::before { left: 100%; }
        .cta-button:hover { background: #1A1A1A; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); }
        .philosophy { padding: 140px 20px; background: #FFFFFF; position: relative; overflow: hidden; }
        .philosophy::before { content: ''; position: absolute; top: -50%; right: -10%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(255, 90, 95, 0.03) 0%, transparent 70%); border-radius: 50%; animation: float 20s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 33% { transform: translate(30px, -30px) rotate(120deg); } 66% { transform: translate(-20px, 20px) rotate(240deg); } }
        .section-header { max-width: 1000px; margin: 0 auto 80px; text-align: center; position: relative; z-index: 1; }
        .section-header h2 { font-size: 48px; font-weight: 600; letter-spacing: -1px; margin-bottom: 20px; color: #1A1A1A; position: relative; display: inline-block; }
        .section-header h2::before { content: ''; position: absolute; top: 50%; left: -60px; width: 40px; height: 2px; background: linear-gradient(90deg, transparent 0%, #FF5A5F 100%); transform: translateY(-50%); }
        .section-subtitle { font-size: 19px; color: #6A6A6A; font-weight: 400; max-width: 640px; margin: 0 auto; line-height: 1.6; position: relative; padding: 20px 0; }
        .section-subtitle::before, .section-subtitle::after { content: ''; position: absolute; left: 50%; width: 60px; height: 1px; background: linear-gradient(90deg, transparent 0%, #E0E0DE 50%, transparent 100%); transform: translateX(-50%); }
        .section-subtitle::before { top: 0; }
        .section-subtitle::after { bottom: 0; }
        .contact { padding: 140px 20px; background: #2C2C2C; text-align: center; color: #FFFFFF; position: relative; overflow: hidden; }
        .contact::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255, 90, 95, 0.3) 50%, transparent 100%); }
        .contact::after { content: ''; position: absolute; bottom: -200px; left: -200px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(255, 90, 95, 0.05) 0%, transparent 70%); border-radius: 50%; animation: float 25s ease-in-out infinite reverse; }
        .contact h2 { font-size: 48px; font-weight: 600; letter-spacing: -1px; margin-bottom: 20px; color: #FFFFFF; position: relative; z-index: 1; }
        .contact p { font-size: 19px; font-weight: 400; color: #B0B0B0; margin-bottom: 48px; position: relative; z-index: 1; }
        .contact-email { font-size: 28px; color: #FFFFFF; text-decoration: none; font-weight: 500; transition: all 0.3s ease; border-bottom: 2px solid rgba(255, 255, 255, 0.3); padding-bottom: 4px; position: relative; display: inline-block; z-index: 1; }
        .contact-email::before { content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 2px; background: #FF5A5F; transition: width 0.4s ease; }
        .contact-email:hover::before { width: 100%; }
        .contact-email:hover { color: #FF5A5F; border-bottom-color: transparent; }
        footer { padding: 48px 20px; background: #1A1A1A; color: #8A8A8A; text-align: center; font-size: 14px; font-weight: 400; position: relative; }
        footer::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 100px; height: 1px; background: linear-gradient(90deg, transparent 0%, #3A3A3A 50%, transparent 100%); }
        .admin-link { position: absolute; bottom: 20px; right: 20px; color: #5A5A5A; text-decoration: none; font-size: 12px; transition: color 0.3s; }
        .admin-link:hover { color: #FF5A5F; }
        .scroll-indicator { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); animation: bounce 2s infinite; opacity: 0.4; }
        .scroll-indicator::before { content: ''; display: block; width: 20px; height: 32px; border: 2px solid #2C2C2C; border-radius: 16px; position: relative; }
        .scroll-indicator::after { content: ''; display: block; width: 3px; height: 6px; background: #2C2C2C; border-radius: 2px; position: absolute; top: 6px; left: 8.5px; animation: scroll 2s infinite; }
        @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); } 40% { transform: translateX(-50%) translateY(-8px); } 60% { transform: translateX(-50%) translateY(-4px); } }
        @keyframes scroll { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(16px); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .hero-text h1 { font-size: 42px; }
          .hero-text p { font-size: 18px; }
          .section-header h2, .contact h2 { font-size: 36px; }
        }
      `}</style>

      <section className="hero">
        <div className="logo-container">
          <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="400">
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#FF5A5F',stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'#E34850',stopOpacity:1}} />
              </linearGradient>
            </defs>
            <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3"/>
            <g transform="translate(40, 45)">
              <path d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                    stroke="url(#flowGrad)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M 35 15 Q 25 12, 18 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
              <path d="M 50 15 Q 60 12, 67 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
              <circle cx="45" cy="28" r="2" fill="#FF5A5F">
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="35" cy="65" r="1.5" fill="#FF5A5F">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="55" cy="65" r="1.5" fill="#FF5A5F">
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" begin="0.5s" repeatCount="indefinite"/>
              </circle>
            </g>
            <text x="160" y="85" fontFamily="'Helvetica Neue', 'Arial', sans-serif" fontSize="42" fontWeight="500" fill="#2C2C2C" letterSpacing="1">
              Artery Capital
            </text>
            <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.3"/>
          </svg>
        </div>

        <div className="hero-text">
          <h1>Africa's innovation starts here</h1>
          <p>We believe the next generation of world-changing companies will be built in Africa. We back the founders brave enough to prove it.</p>
          <Link to="/apply" className="cta-button">Start Your Journey</Link>
        </div>

        <div className="scroll-indicator"></div>
      </section>

      <section className="philosophy">
        <div className="section-header">
          <h2>$15,000. Plus everything else.</h2>
          <p className="section-subtitle">We give African startups what they need most. Capital to start. Strategic guidance to scale. Partnership to win.</p>
        </div>
      </section>

      <section className="contact" id="contact">
        <h2>Partner with Africa's Next Wave</h2>
        <p>Join us in backing the founders and innovations shaping Africa's future</p>
        <a href="mailto:invest@arterycapital.com" className="contact-email">invest@arterycapital.com</a>
      </section>

      <footer>
        <p>© 2026 Artery Capital. All rights reserved.</p>
        <Link to="/admin" className="admin-link">Admin</Link>
      </footer>
    </div>
  );
}
