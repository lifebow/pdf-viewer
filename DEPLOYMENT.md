# Hướng dẫn Deployment lên GitHub Pages

Tài liệu này hướng dẫn bạn cách build và đưa ứng dụng PDF Viewer lên GitHub một cách tự động (Serverless).

## 1. Chuẩn bị (Chỉ làm một lần)

### a. Khởi tạo Git

Mở terminal (PowerShell hoặc Bash) tại thư mục `pdf-viewer` và chạy:

```bash
git init
git add .
git commit -m "Initial commit: PDF Viewer with Search and Dark Mode"
```

### b. Tạo Repository trên GitHub

1. Truy cập [github.com/new](https://github.com/new).
2. Tên repository: `pdf-viewer` (hoặc tên tùy ý).
3. Đừng thêm README hay .gitignore (vì chúng ta đã có rồi).
4. Sau khi tạo, hãy copy URL của repo (dạng `https://github.com/username/pdf-viewer.git`).

### c. Kết nối với GitHub

```bash
git remote add origin https://github.com/username/pdf-viewer.git
git branch -M main
git push -u origin main
```

## 2. Cấu hình Deployment

### a. Cập nhật `vite.config.ts`

Mở file `vite.config.ts` và thêm thông số `base`:

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/pdf-viewer/', // Tên repository của bạn
})
```

### b. Cập nhật `package.json`

Thêm trường `homepage` (thay `username` bằng tên thật của bạn):

```json
"homepage": "https://username.github.io/pdf-viewer/",
```

## 3. Thực hiện Deploy

Chỉ cần chạy lệnh sau:

```bash
npm run deploy
```

Lệnh này sẽ tự động:

1. Build ứng dụng vào thư mục `dist`.
2. Đẩy nội dung thư mục `dist` lên một nhánh mới tên là `gh-pages` trên GitHub.

## 4. Kích hoạt trên GitHub

1. Vào Repo của bạn trên GitHub -> **Settings** -> **Pages**.
2. Tại mục **Build and deployment** -> **Branch**, chọn nhánh `gh-pages` và folder `/(root)`.
3. Nhấn **Save**.

Sau khoảng 1-2 phút, ứng dụng của bạn sẽ online tại địa chỉ trong mục **homepage**!
