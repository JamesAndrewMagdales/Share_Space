// ShareSpace wordmark: a "P" parking sign plus the name
const Logo = ({ light = false }) => (
  <span className={`logo ${light ? 'logo-light' : ''}`}>
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2563eb" />
      <path d="M11 24V8h6.2a5 5 0 0 1 0 10H11" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="logo-text">Share<span>Space</span></span>
  </span>
);

export default Logo;
