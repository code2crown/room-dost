# Room Dost — Advanced MERN + PWA Roommate Portal

Full-stack roommate management portal built with **MongoDB Atlas, Express.js, React (Vite + Tailwind CSS), Node.js, Socket.io, and PWA**.

## Features Included
- **Multi-User & Room System**: JWT Auth, Create Room or Join via 6-character Invite Code, Admin/Member roles, UPI ID profiles.
- **Daily Expenses & Smart Split**: Equal or Custom exact splits, categories (Food & Groceries, Rent, Electricity, WiFi, Gas & Water, Cleaning, Outing, Other), filters, and CSV export.
- **Kisko Kitna Dena / Lena Hai (Auto Debt Simplification)**: Minimum-transfer settlement calculator, one-click UPI ID copy, Mark Settled modal, and full Settlement History.
- **Real-Time Notifications**: Instant Socket.io alerts + Notification Bell with unread badge + Browser/PWA Push Notifications on every expense, settlement, stock alert, or recipe.
- **Room Ration & Stock Tracker**: Track items as `In Stock`, `Hone Wala Hai (Low)`, or `Khatm Ho Gaya (Out)`, plus one-click **"Bought & Log Expense"** to restock and split the bill automatically.
- **Room Kitchen Recipes**: Add, browse, filter, and like roommate recipes with ingredients, cooking steps, prep/cook times, and tips.
- **Installable PWA**: Configured with `vite-plugin-pwa`, Web Manifest, Service Worker caching, and mobile bottom navigation.

## Quick Start

### 1. Setup MongoDB Atlas (Free Tier)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free M0 cluster.
2. Create a database user (username & password) under **Database Access**.
3. Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere) for development.
4. Click **Connect -> Drivers** and copy your connection string:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/roomdost?retryWrites=true&w=majority`

### 2. Run Backend (`server/`)
```bash
cd server
cp .env.example .env
# Paste your MONGO_URI and a strong JWT_SECRET inside .env
npm install
npm run dev
```

### 3. Run Frontend (`client/`)
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173** in your browser!
