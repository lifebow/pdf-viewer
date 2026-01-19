import React, { useState, useEffect } from 'react';
import { FileText, Link as LinkIcon, ExternalLink, Moon, Sun } from 'lucide-react';
import PdfViewer from './components/PdfViewer';

function App() {
  const [url, setUrl] = useState('');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleView = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setViewUrl(url);
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  if (viewUrl) {
    return <PdfViewer url={viewUrl} onBack={() => setViewUrl(null)} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', position: 'relative' }}>
      <button
        onClick={toggleTheme}
        className="btn-secondary"
        style={{ position: 'absolute', top: '1rem', right: '1rem', borderRadius: '50%', padding: '12px' }}
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(73, 145, 226, 0.1)', borderRadius: '20px', marginBottom: '1.5rem' }}>
          <FileText size={48} color="#4991e2" />
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #4991e2 0%, #357abd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          SmallPDF View
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px' }}>
          Dán link PDF của bạn vào bên dưới để bắt đầu xem với trải nghiệm premium.
        </p>
      </header>

      <form onSubmit={handleView} className="glass" style={{ padding: '2rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <LinkIcon size={20} />
          </div>
          <input
            type="url"
            className="input-field"
            placeholder="https://example.com/document.pdf"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ paddingLeft: '48px' }}
            required
          />
        </div>
        <button type="submit" className="btn-primary" style={{ justifyContent: 'center', width: '100%', height: '52px', fontSize: '1.1rem' }}>
          Xem ngay <ExternalLink size={20} />
        </button>
      </form>

      <footer style={{ marginTop: 'auto', paddingTop: '4rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        © 2026 SmallPDF - Built with Privacy in Mind
      </footer>
    </div>
  );
}

export default App;
