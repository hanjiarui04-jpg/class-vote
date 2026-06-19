import { useState } from 'react'
import { BarChart3, Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut, MessageSquareText, Star, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fetchAdminDashboard } from '../lib/api'

const TAG_COLORS = ['#2d6a58', '#df9e39', '#638e80', '#9c9d8e', '#c66e5c']

function LoginPanel({ onLogin, loading, error }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    onLogin(password)
  }

  return (
    <div className="login-wrap">
      <div className="login-icon"><LockKeyhole size={26} /></div>
      <span className="eyebrow">管理入口</span>
      <h1>查看投票结果</h1>
      <p>请输入班级管理员密码</p>
      <form onSubmit={submit}>
        <label htmlFor="admin-password">管理密码</label>
        <div className="password-field">
          <input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label="显示或隐藏密码">
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="button primary full" disabled={!password || loading}>
          {loading && <LoaderCircle className="spin" size={18} />}{loading ? '验证中…' : '进入统计后台'}
        </button>
      </form>
      <small>初始密码：admin123</small>
    </div>
  )
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeOfficer, setActiveOfficer] = useState(0)

  const login = async (password) => {
    setLoading(true)
    setError('')
    try {
      setDashboard(await fetchAdminDashboard(password))
    } catch (err) {
      setError(err.message?.includes('Invalid admin password') ? '密码不正确' : (err.message || '登录失败'))
    } finally {
      setLoading(false)
    }
  }

  if (!dashboard) {
    return <section className="page centered-page"><LoginPanel onLogin={login} loading={loading} error={error} /></section>
  }

  const current = dashboard.officers[activeOfficer]

  return (
    <section className="page admin-page">
      <PageHeader
        eyebrow="数据看板"
        title="评议结果"
        description="实时汇总，仅管理员可见。"
        action={<button className="icon-button" type="button" onClick={() => setDashboard(null)} title="退出"><LogOut size={19} /></button>}
      />

      <div className="stat-grid">
        <article className="stat-card dark">
          <Users size={21} />
          <strong>{dashboard.totalVoters}</strong>
          <span>已投人数</span>
        </article>
        <article className="stat-card">
          <Star size={21} />
          <strong>{(dashboard.officers.reduce((sum, item) => sum + Number(item.averageScore || 0), 0) / dashboard.officers.length).toFixed(1)}</strong>
          <span>整体均分</span>
        </article>
        <article className="stat-card">
          <MessageSquareText size={21} />
          <strong>{dashboard.officers.reduce((sum, item) => sum + item.comments.length, 0)}</strong>
          <span>有效评论</span>
        </article>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-title"><div><span>评分概览</span><h2>班干部表现</h2></div><BarChart3 size={22} /></div>
        <div className="score-list">
          {dashboard.officers.map((officer, index) => (
            <button type="button" className={index === activeOfficer ? 'score-row active' : 'score-row'} key={officer.id} onClick={() => setActiveOfficer(index)}>
              <div className={`mini-avatar avatar-${(index % 5) + 1}`}>{officer.name.slice(-1)}</div>
              <div className="score-meta"><strong>{officer.name}</strong><span>{officer.role} · {officer.voteCount} 票</span></div>
              <div className="score-bar"><i style={{ width: `${(officer.averageScore / 5) * 100}%` }} /></div>
              <b>{Number(officer.averageScore).toFixed(1)}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-section detail-section">
        <div className="dashboard-title"><div><span>{current.role}</span><h2>{current.name} · 详细评价</h2></div><b className="score-badge">{Number(current.averageScore).toFixed(1)} 分</b></div>
        <div className="tag-stats">
          {Object.entries(current.tags).map(([tag, count], index) => {
            const max = Math.max(...Object.values(current.tags), 1)
            return (
              <div className="tag-stat" key={tag}>
                <span><i style={{ background: TAG_COLORS[index] }} />{tag}</span>
                <div><i style={{ width: `${(count / max) * 100}%`, background: TAG_COLORS[index] }} /></div>
                <b>{count}</b>
              </div>
            )
          })}
        </div>
      </div>

      <div className="dashboard-section comments-section">
        <div className="dashboard-title"><div><span>匿名留言</span><h2>同学们这样说</h2></div><MessageSquareText size={22} /></div>
        {current.comments.length ? current.comments.map((item) => (
          <article className="comment-item" key={item.id}>
            <div><span>匿名同学</span><time>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</time></div>
            <p>{item.comment}</p>
            <span className="comment-score"><Star size={13} fill="currentColor" /> {item.score}</span>
          </article>
        )) : <div className="empty-state">暂时还没有文字评论</div>}
      </div>
    </section>
  )
}
