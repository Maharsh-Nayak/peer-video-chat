import "../App.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import TextField from '@mui/material/TextField';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="LandingPage">
      <nav className="navbar">
        <h2 className="logo">Zoom</h2>
        <div className="nav-links">
          <p className="link">About Us</p>
          <p className="link clickable" onClick={() => navigate("/login", { state: { mode: "signin" } })}>
            Sign In
          </p>
          <button className="login-btn" onClick={() => navigate("/login", { state: { mode: "login" } })}>
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
          <div className="GuestJoin" style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <TextField id="outlined-basic" label="Enter meet code" variant="outlined" />
            <button className="primary-btn" onClick={() => {
              const meetCode = document.getElementById("outlined-basic").value;
              if(meetCode!=="")
                navigate(`/meet/${meetCode}`);
            }}>
              Join as Guest
            </button>
          </div>
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
