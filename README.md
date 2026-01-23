# 🏢 Landmark Track - Luxury Property Management System

A sophisticated, real-time property management solution designed for luxury rental properties. Built with Next.js 14, TypeScript, and Supabase for seamless data management and live updates.

## ✨ Features

### 🏠 **Property Management**
- **Room Status Tracking** - Monitor available, secured, and damaged rooms in real-time
- **Tenant Management** - Complete tenant profiles with payment schedules
- **Dynamic Room Assignment** - Easy tenant-to-room matching with status updates

### 💳 **Payment Tracking**
- **Real-time Payment Monitoring** - Track paid, pending, and overdue payments
- **Payment Schedule Overview** - Visual calendar showing upcoming due dates
- **Automated Payment Logging** - Streamlined payment recording system

### 🔔 **Alert System**
- **Smart Notifications** - Late payments, damage reports, room availability alerts
- **Alert History** - Complete audit trail of all notifications
- **Real-time Updates** - Instant alerts for critical events

### 📊 **Dashboard Analytics**
- **Live Statistics** - Occupancy rates, revenue tracking, and performance metrics
- **Recent Activity Feed** - Real-time updates on all property activities
- **Quick Actions** - One-click access to common tasks

### 🎨 **Premium UI/UX**
- **Luxury Dark Theme** - Professional design with gold accent colors
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Smooth Animations** - Elegant transitions and micro-interactions

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Real-time subscriptions)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel-ready

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Supabase project (create at [supabase.com](https://supabase.com))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Kutlwano-Take/landmark-track.git
cd landmark-track
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database Setup**
Run the SQL schema from `supabase-schema.sql` in your Supabase project.

5. **Start Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📱 Live Demo

Deployed on Vercel: [landmark-track.vercel.app](https://landmark-track.vercel.app)

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── RoomManagement.tsx
│   ├── PaymentTracking.tsx
│   └── AlertSystem.tsx
├── lib/                # Utilities and API
└── types/              # TypeScript definitions
```

## 🔧 Configuration

### Database Schema
The application uses a comprehensive property management schema:
- **Properties** - Building/complex information
- **Rooms** - Individual rental units
- **Tenants** - Resident information and payment schedules
- **Payments** - Transaction records
- **Alerts** - System notifications

### Real-time Features
All components use Supabase real-time subscriptions for instant data updates across connected clients.

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy automatically

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Backend powered by [Supabase](https://supabase.com)
- Styled with [Tailwind CSS](https://tailwindcss.com)

---

**Landmark Track** - Elevating Property Management to Luxury Standards 🏢✨
