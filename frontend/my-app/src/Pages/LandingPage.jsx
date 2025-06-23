import "../App.css";
import React from "react";

export function LandingPage() {
  return (
    <div className="LandingPage">
      <nav>
        <div className="navbar">
            <h2>Zoom</h2>
        </div>
        <div className="list">
            <p>Join as Guest</p>
            <p>Sign In</p>
            <div>
                <p>Login</p>
            </div>
        </div>
      </nav>
      <div className="main">
        <div className="content">
          <h2>Connect on Live call</h2>
          <p>
            Join a meeting with your friends, family, or colleagues from anywhere in the world.
          </p>
        </div>
        <div className="photo">
          <img src="/landing3.png" alt="Photo" />
        </div>
      </div>
    </div>
  );
}