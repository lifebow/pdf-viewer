# Modern PDF Viewer

A high-performance, feature-rich PDF viewer built with React, TypeScript, and Vite. Designed with a premium glassmorphic UI and advanced reading modes.

[Live Demo: pdf.lifebow.net](https://pdf.lifebow.net)

## 🌟 Key Features

### 📖 Reading Experience
- **Paginated & Scroll Modes**: Switch between discrete page flipping and continuous vertical scrolling.
- **Multi-page View**: View 1, 2, or 3 pages side-by-side (Book Style).
- **Custom Background Themes**: Choose from **Light**, **Smart Dark** (inverted), **Sepia**, or **Night** modes.
- **Smart Dark Mode**: PDF contents automatically adapt to the dark theme while preserving diagram colors.

### 🛠 Tools & Navigation
- **Fit to Width (Auto-Scale)**: Smart scaling that automatically fits the PDF to your window width and resets rotation/format.
- **Search & Highlight**: Dynamic full-text search with match highlighting and navigation.
- **Go to Page**: Jump directly to any page with instant validation.
- **Zoom & Rotation**: Smooth zooming (50% - 250%) and 90-degree rotation.

### ☁ Connectivity
- **Local File Upload**: Effortlessly view local PDFs without uploading them to any server.
- **External URL Support**: Enter any PDF link to view it instantly.
- **Private CORS Proxy**: Integrated with a custom Cloudflare Worker to bypass CORS restrictions for external research sites (e.g., IACR, arXiv).

## 🚀 Technology Stack
- **Framework**: [React 18+](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **PDF Core**: [react-pdf](https://projects.wojtekmaj.pl/react-pdf/) (pdf.js wrapper)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Modern CSS with Glassmorphism and CSS Variables
- **Deployment**: [GitHub Pages](https://pages.github.com/) with Custom Domain

## 🛠 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lifebow/pdf-viewer.git
   cd pdf-viewer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the dev server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Deploy**:
   ```bash
   npm run deploy
   ```

## 🌐 Private CORS Prox


---
Created with ❤️ by lifebow.
