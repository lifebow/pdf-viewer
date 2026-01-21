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
    <div className="app-landing-container">
      <button
        onClick={toggleTheme}
        className="btn-secondary theme-toggle-btn"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <header className="app-header">
        <div className="app-logo-wrapper">
          <FileText size={48} color="#4991e2" />
        </div>
        <h1 className="app-title">
          PDF Viewer
        </h1>
        <p className="app-subtitle">
          Dán link PDF hoặc tải file từ máy tính để bắt đầu xem.
        </p>
      </header>

      <form onSubmit={handleView} className="glass landing-form">
        <div style={{ position: 'relative' }}>
          <div className="input-icon">
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

        <div className="form-actions">
          <button type="submit" className="btn-primary landing-btn">
            Xem ngay <ExternalLink size={20} />
          </button>

          <label className="btn-secondary landing-btn file-upload-label">
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

      <footer className="app-footer">
        <div>© 2026 lifebow - Built with Privacy in Mind</div>
        <div className="app-version">Version v{version}</div>
      </footer>
    </div>
  );
}

export default App;
