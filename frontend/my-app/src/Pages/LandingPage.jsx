import "../App.css";
import React from "react";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="LandingPage">
      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo">Zoom</h2>
        <div className="nav-links">
          <p className="link">Join as Guest</p>
          <p className="link clickable" onClick={() => navigate("/auth", { state: { mode: "signin" } })}>
            Sign In
          </p>
          <button className="login-btn" onClick={() => navigate("/auth", { state: { mode: "login" } })}>
            Login
          </button>
        </div>
      </nav>

      {/* Main Section */}
      <div className="main">
        <div className="content">
          <span className="tag">💬 Video Calling Made Simple</span>
          <h2>Connect on Live Call</h2>
          <p>
            Join a meeting with your friends, family, or colleagues from
            anywhere in the world.
          </p>
          <button className="primary-btn" onClick={() => navigate("/auth")}>
            Get Started
          </button>
          <div className="features">
            <div>🛡️ Secure Meetings</div>
            <div>🌍 Global Access</div>
            <div>⚡ Low Latency</div>
          </div>
        </div>


        <div className="photo">
          <img src="/landing3.png" alt="Landing" />
        </div>
      </div>
    </div>
  );
}
