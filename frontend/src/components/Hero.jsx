import React from "react";
import ReactFlow from "reactflow";
import "reactflow/dist/style.css";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-bg-decor hero-decor-left"></div>
      <div className="hero-bg-decor hero-decor-right"></div>

      <div className="hero-container">
        <h1 className="hero-title">AI-Powered Learning<br/>That helps you understand</h1>
        <p className="hero-subtitle">Explore topics visually through mind maps, adaptive quizzes, and real-time insights designed to boost your understanding.</p>
        <Link to="/signup" className="shadow__btn hero-cta">Sign up</Link>
      </div>
    </section>
  );
}
