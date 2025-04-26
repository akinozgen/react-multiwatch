import { Link } from "react-router-dom";
import { ClipboardPaste, Github, LayoutGrid, Rocket, Share2 } from "lucide-react";
import "./index.scss";

export default function LandingPage() {
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--x", `${x}px`);
    target.style.setProperty("--y", `${y}px`);
  }

  return (
    <div className="landing-page">
      <div className="hero">
        <div className="hero-icon-wrapper">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-monitor-play hero-icon"
            aria-hidden="true"
          >
            <path d="M10 7.75a.75.75 0 0 1 1.142-.638l3.664 2.249a.75.75 0 0 1 0 1.278l-3.664 2.25a.75.75 0 0 1-1.142-.64z"></path>
            <path d="M12 17v4"></path>
            <path d="M8 21h8"></path>
            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
          </svg>
        </div>
        <h1 className="title">Welcome to Multiwatch</h1>
        <p className="subtitle">
          Organize, customize, and share your favorite YouTube streams easily.
        </p>
        <Link to="/grid" className="start-button">
          <Rocket size={20} /> Launch Multiwatch
        </Link>
      </div>

      <div className="features">
        <div
          className="feature feature-layout animate-slide-up delay-0"
          onMouseMove={handleMouseMove}
        >
          <div className="content">
            <LayoutGrid size={36} />
            <h3>Flexible Layout</h3>
            <p>Drag, resize, and organize your streams however you like.</p>
          </div>
        </div>

        <div
          className="feature feature-paste animate-slide-up delay-1"
          onMouseMove={handleMouseMove}
        >
          <div className="content">
            <ClipboardPaste size={36} />
            <h3>Easy Setup</h3>
            <p>Paste YouTube URLs or IDs directly, no account needed.</p>
          </div>
        </div>

        <div
          className="feature feature-share animate-slide-up delay-2"
          onMouseMove={handleMouseMove}
        >
          <div className="content">
            <Share2 size={36} />
            <h3>Instant Sharing</h3>
            <p>Share your custom layouts instantly with a URL.</p>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} Multiwatch. Built with 💻 and ☕
          <a href="https://github.com/akinozgen/react-multiwatch" target="_blank" rel="noopener noreferrer">
            GitHub
            </a>
        </p>
      </footer>
    </div>
  );
}
