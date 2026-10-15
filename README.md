# 🍽️ SSIP Cafeteria (Foodering)

A modern, fast, and mobile-friendly food ordering web application replicated and simplified from the Shimano SSIP Cafeteria system. Built with **Vite**, **React**, **TypeScript**, and **Tailwind CSS**, optimized for instant static hosting on **GitHub Pages**.

---

## ✨ Features

- **⚡ Instant Menu Browsing:** Pre-loaded snapshot of **1,012 dishes and beverages** across **14 food stalls & counters** with zero load time and zero CORS errors.
- **🏷️ Food Stall Tabs:** Quick 1-tap switching between:
  - *Malay Stall - Nasi Padang & International Cuisine*
  - *Chinese Stall - Daily Specials & Oriental Selections*
  - *Can Drinks Counter*
  - *Fruits & Pastries Counter*
  - *Ice Cream Bar*
  - *Live Station*
- **🔍 Real-Time Search & Filtering:** Instant filter-as-you-type across all meals, price sorting, and "In Stock Only" toggle.
- **🛒 Interactive Tray / Cart:** Slide-out tray drawer, instant quantity adjustment, item removal, and subtotal calculation.
- **💳 Cafeteria Checkout & Allowance Wallet:** Supports payment via simulated **Employee Meal Wallet ($45.50 allowance)**, **Payroll Deduction**, or **Cash on Pickup**.
- **🎫 Pickup Queue Slip:** Generates an order confirmation receipt with a pickup queue token (e.g. `#42`) and order summary.
- **🔒 Zero Credential Leakage:** Browser sessions are maintained exclusively in client-side memory (`sessionStorage`). No credentials or passwords are ever stored or committed to Git.

---

## 🚀 Local Development

1. Clone or open this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start local development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

To build the static production distribution:
```bash
npm run build
npm run preview
```

---

## 🌐 Deploy to GitHub Pages (Automated CI/CD)

This repository includes a preconfigured GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and publishes your site on push.

### Step 1: Push to GitHub
If you haven't pushed this repository yet:
```bash
git add .
git commit -m "Initial commit: SSIP Cafeteria modern Vite app"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/foodering.git
git push -u origin main
```

### Step 2: Enable GitHub Actions for Pages
1. Go to your repository on GitHub: `https://github.com/<YOUR_GITHUB_USERNAME>/foodering`
2. Click **Settings** ⚙️ → **Pages** (under Code and automation in the left sidebar).
3. Under **Build and deployment** > **Source**, choose **GitHub Actions** from the dropdown.
4. That's it! GitHub Actions will automatically run the deployment workflow and give you your live URL:
   `https://<YOUR_GITHUB_USERNAME>.github.io/foodering/`

---

## 🛠️ Tech Stack
- **Framework:** React 18 + TypeScript + Vite 5
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **Hosting:** GitHub Pages (via GitHub Actions)
