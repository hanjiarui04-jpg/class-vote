import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { BarChart3, QrCode, Vote } from 'lucide-react'
import VotePage from './pages/VotePage'
import AdminPage from './pages/AdminPage'
import SharePage from './pages/SharePage'
import { isDemoMode } from './lib/api'

function AppShell({ children }) {
  const location = useLocation()
  const navItems = [
    { to: '/', label: '投票', icon: Vote },
    { to: '/share', label: '分享', icon: QrCode },
    { to: '/admin', label: '统计', icon: BarChart3 },
  ]

  return (
    <div className="app-shell">
      {isDemoMode && <div className="demo-strip">演示模式 · 配置 Supabase 后自动切换云端数据</div>}
      <main>{children}</main>
      <nav className="bottom-nav" aria-label="主导航">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to
          return (
            <Link className={active ? 'nav-item active' : 'nav-item'} to={to} key={to}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<VotePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="*" element={<VotePage />} />
      </Routes>
    </AppShell>
  )
}
