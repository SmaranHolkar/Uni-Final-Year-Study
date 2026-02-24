import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Brain, 
  Network, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  BookOpen,
  BarChart3,
  Users
} from "lucide-react";

// --- Components ---

/**
 * StarBackground: A canvas-based starfield animation
 * Pure canvas API - no external libraries
 */
const StarBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars = [];
    const numStars = 150;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      stars.forEach((star) => {
        star.x += star.vx;
        star.y += star.vy;

        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        star.alpha += star.twinkleSpeed;
        if (star.alpha > 1 || star.alpha < 0.2) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.6,
      }}
    />
  );
};

/**
 * GlassCard: A reusable card component with glassmorphism
 */
const GlassCard = ({ children, className = "", delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={cardRef}
      className={`backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl hover:bg-white/10 transition-all duration-500 ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      {children}
    </div>
  );
};

/**
 * FeatureItem: Individual feature display
 */
const FeatureItem = ({ icon: Icon, title, description, delay }) => (
  <GlassCard delay={delay} className="flex flex-col items-start text-left h-full group">
    <div className="p-3 rounded-xl bg-indigo-500/20 mb-4 text-indigo-300 transition-transform duration-300 group-hover:scale-110">
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-bold mb-2 text-[var(--foreground)]">{title}</h3>
    <p className="text-[var(--muted-foreground)] leading-relaxed">{description}</p>
  </GlassCard>
);

/**
 * Main Hero Component
 */
export default function Hero() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setHeroVisible(true);
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const parallaxOffset = scrollY * 0.3;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500/30">
      <StarBackground />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          
          <div
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'scale(1)' : 'scale(0.9)',
              transition: 'all 0.8s ease-out',
            }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6 animate-pulse">
              ✨ AI-Powered Education Platform
            </span>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Unlock Your Potential <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient">
                with AI Learning
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Visualize, interact, and master your subjects with mind maps, adaptive quizzes, and real-time insights. 
              <span className="text-indigo-300 block mt-2">Study smarter, not harder.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/signup" 
                className="group relative px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.6)] flex items-center gap-2 hover:scale-105"
              >
                Start Learning Free
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="#" 
                className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg transition-all backdrop-blur-sm hover:scale-105"
              >
                View Demo
              </Link>
            </div>
          </div>

          {/* Abstract Visual Representation with Parallax */}
          <div 
            className="mt-20 relative max-w-4xl mx-auto transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${parallaxOffset}px)` }}
          >
             <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[var(--card)] hover:border-indigo-500/30 transition-colors duration-500">
                {/* Mock UI Header */}
                <div className="h-8 bg-[var(--muted)] flex items-center px-4 gap-2 border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                {/* Mock UI Body */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 opacity-80">
                   <div className="space-y-4">
                      <div className="h-32 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center hover:bg-indigo-500/30 transition-colors">
                        <Network className="text-indigo-400 w-12 h-12" />
                      </div>
                      <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
                      <div className="h-4 w-1/2 rounded bg-white/10" />
                   </div>
                   <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><CheckCircle2 size={16}/></div>
                        <div className="h-3 w-32 rounded bg-white/10" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><CheckCircle2 size={16}/></div>
                        <div className="h-3 w-40 rounded bg-white/10" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400"><Zap size={16}/></div>
                        <div className="h-3 w-24 rounded bg-white/10" />
                      </div>
                   </div>
                </div>
             </div>
             {/* Decorative blurred blobs */}
             <div className="absolute -top-20 -left-20 w-72 h-72 bg-indigo-600/30 rounded-full blur-[100px] -z-10 animate-pulse" />
             <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] -z-10" />
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to excel</h2>
            <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
              A comprehensive suite of tools designed to adapt to your unique learning style.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureItem 
              icon={Network}
              title="Interactive Mind Maps"
              description="See connections, not just facts. Build and explore visual topic maps that mimic how your brain actually works."
              delay={0.1}
            />
            <FeatureItem 
              icon={Brain}
              title="Adaptive Quizzes"
              description="Test your knowledge with quizzes that adapt in real-time to your strengths and weaknesses."
              delay={0.2}
            />
            <FeatureItem 
              icon={BarChart3}
              title="Real-Time Insights"
              description="Track your progress with beautiful analytics and get instant feedback to stay motivated."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* How it Works / Info Cards */}
      <section className="py-24 px-6 relative z-10 bg-gradient-to-b from-transparent to-[var(--card)]/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div 
              className="p-8 rounded-3xl bg-[var(--card)] border border-white/5 shadow-xl hover:-translate-y-1 transition-transform duration-300 hover:border-white/10"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                <BookOpen size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4">How It Works</h3>
              <p className="text-[var(--muted-foreground)] mb-6 leading-relaxed">
                Start by signing up, drop in your PDFs from class, and let our AI generate a quiz and a personalized mind map to track your progress.
              </p>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-blue-500/50 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Card 2 */}
            <div 
              className="p-8 rounded-3xl bg-[var(--card)] border border-white/5 shadow-xl hover:-translate-y-1 transition-transform duration-300 hover:border-white/10"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Why HydrusLearn?</h3>
              <p className="text-[var(--muted-foreground)] mb-6 leading-relaxed">
                We combine adaptive quizzes, visual learning and real-time feedback to help you truly understand, not just memorize.
              </p>
              <ul className="space-y-2">
                {['Visual Learning', 'AI Adaptation', 'Progress Tracking'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <CheckCircle2 size={14} className="text-purple-400" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 3 - CTA */}
            <div 
              className="p-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 border border-white/10 shadow-xl text-white relative overflow-hidden hover:-translate-y-1 transition-transform duration-300 group"
            >
              <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-6">
                  <Users size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Get Started</h3>
                <p className="text-indigo-100 mb-8 leading-relaxed">
                  Create your free account and unlock a smarter way to study. Join thousands of students today.
                </p>
                <Link 
                  to="/signup" 
                  className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-all hover:scale-105"
                >
                  Sign Up Free
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto rounded-[2.5rem] bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-white/10 p-12 md:p-20 text-center relative overflow-hidden group hover:border-indigo-500/30 transition-colors duration-500">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }} />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to transform your learning?</h2>
            <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">
              Join students using HydrusLearn to master their subjects with confidence. The future of education is here.
            </p>
            <Link 
              to="/signup" 
              className="inline-block px-10 py-4 rounded-full bg-white text-indigo-900 font-bold text-lg hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 relative z-10 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="text-indigo-400" />
            <span>HydrusLearn</span>
          </div>
          <div className="text-[var(--muted-foreground)] text-sm">
            &copy; {new Date().getFullYear()} HydrusLearn. All rights reserved.
          </div>
          <div className="flex gap-6">
            {['Twitter', 'GitHub', 'Discord'].map((social) => (
              <a key={social} href="#" className="text-[var(--muted-foreground)] hover:text-white transition-colors text-sm">
                {social}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </main>
  );
}