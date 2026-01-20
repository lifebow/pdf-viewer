import React, { useState, useEffect } from 'react';
import { FileText, Link as LinkIcon, ExternalLink, Moon, Sun } from 'lucide-react';
import PdfViewer from './components/PdfViewer';
import { version } from '../package.json';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const objectUrl = URL.createObjectURL(file);
      setViewUrl(objectUrl);
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  if (viewUrl) {
    return <PdfViewer url={viewUrl} onBack={() => {
      if (viewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(viewUrl);
      }
      setViewUrl(null);
    }} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
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
          PDF Viewer
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px' }}>
          Dán link PDF hoặc tải file từ máy tính để bắt đầu xem.
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
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', height: '52px', fontSize: '1.1rem' }}>
            Xem ngay <ExternalLink size={20} />
          </button>

          <label className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', height: '52px', fontSize: '1.1rem' }}>
            <FileText size={20} /> Tải file
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </form>

      <footer style={{ marginTop: 'auto', paddingTop: '4rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>© 2026 lifebow - Built with Privacy in Mind</div>
        <div style={{ opacity: 0.6, fontSize: '0.8rem' }}>Version v{version}</div>
      </footer>
    </div>
  );
}

export default App;
