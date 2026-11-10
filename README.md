# SoFi Financial Analytics & Asset Recommendation Dashboard

[![Deployment](https://img.shields.io/badge/Vercel-Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://sofi-dashboard-seven.vercel.app)
[![Framework](https://img.shields.io/badge/Next.js-React-blue?style=for-the-badge&logo=react)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

An interactive financial dashboard that tracks real-time Stock, ETF, and Cryptocurrency market prices. The platform incorporates an algorithmic recommendation engine designed to output buying predictions tailored to individual risk tolerance, budget caps, and price action indicators.

🚀 **[Access the Live Dashboard](https://sofi-dashboard-seven.vercel.app)**

---

## 🖼️ Dashboard Preview

![SoFi Dashboard Preview](public/preview.png)

---

## 🌟 Key Features

- **Multi-Asset Market Monitoring**: Real-time tracking and metrics for Stocks, ETFs, and Crypto assets.
- **Algorithmic Asset Recommendations**: Dynamic buying signals calculated against user-selected risk profiles and capital allocation parameters.
- **Custom React Hooks**: Modular data-fetching architecture (`hooks/useLiveData`) for clean state management and environment variable API integration.
- **Responsive High-Density UI**: Built for desktop and mobile viewports with low-latency updates.

---

## 🛠️ Tech Stack

- **Framework**: Next.js / React (App Router architecture)
- **State & Custom Hooks**: React Custom Hooks (`hooks/`)
- **Deployment**: Vercel CI/CD pipeline
- **Styling**: Tailwind CSS / Modern CSS

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18.x or higher)
- `npm` or `pnpm` / `yarn`

### Installation Steps

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/maggiemccammon/sofi-dashboard.git
   cd sofi-dashboard
   \`\`\`

2. **Install project dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   \`\`\`env
   NEXT_PUBLIC_MARKET_API_KEY=your_api_key_here
   \`\`\`

4. **Launch the development server**
   \`\`\`bash
   npm run dev
   \`\`\`
   Navigate to http://localhost:3000 in your browser to view the application.

---

## 📁 Repository Architecture

\`\`\`text
sofi-dashboard/
├── app/                  # Next.js pages, UI components, and routing
├── hooks/                # Custom React hooks (e.g., live market data polling)
├── public/               # Static assets, branding, and preview images
├── package.json          # Project dependencies and script runner
└── README.md             # Project documentation
\`\`\`

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more details.
