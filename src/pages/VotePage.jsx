import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, Send, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StarRating from '../components/StarRating'
import { fetchOfficers, hasSubmitted, submitBallot } from '../lib/api'

const TAGS = ['负责', '积极', '沟通好', '一般', '不满意']
const STEP_META = [
  { title: '打个分', hint: '根据日常表现，为每位班干部评分' },
  { title: '选印象', hint: '选择你对每位班干部的真实印象' },
  { title: '说两句', hint: '留下建议，评论为匿名且可选' },
]

function OfficerIdentity({ officer, index }) {
  return (
    <div className="officer-identity">
      <div className={`avatar avatar-${(index % 5) + 1}`}>{officer.name.slice(-1)}</div>
      <div>
        <strong>{officer.name}</strong>
        <span>{officer.role}</span>
      </div>
    </div>
  )
}

export default function VotePage() {
  const [officers, setOfficers] = useState([])
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(() => hasSubmitted())
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOfficers()
      .then((data) => {
        setOfficers(data)
        setAnswers(Object.fromEntries(data.map((item) => [item.id, { score: 0, tags: [], comment: '' }])))
      })
      .catch(() => setError('名单加载失败，请检查网络后重试'))
      .finally(() => setLoading(false))
  }, [])

  const ratedCount = useMemo(
    () => officers.filter((item) => answers[item.id]?.score > 0).length,
    [answers, officers],
  )

  const updateAnswer = (id, patch) => {
    setAnswers((current) => ({ ...current, [id]: { ...current[id], ...patch } }))
  }

  const nextStep = () => {
    setError('')
    if (step === 0 && ratedCount !== officers.length) {
      setError(`还差 ${officers.length - ratedCount} 位没有评分`)
      return
    }
    setStep((current) => Math.min(2, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await submitBallot(
        officers.map((officer) => ({ officerId: officer.id, ...answers[officer.id] })),
      )
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message || '提交失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <section className="page centered-page">
        <div className="success-card">
          <div className="success-mark"><Check size={42} /></div>
          <span className="eyebrow">提交成功</span>
          <h1>谢谢你的认真评价</h1>
          <p>你的选票已匿名记录。每一条真诚的反馈，都会让班级变得更好一点。</p>
          <div className="privacy-note"><ShieldCheck size={18} /> 不收集姓名、手机号等个人信息</div>
        </div>
      </section>
    )
  }

  return (
    <section className="page vote-page">
      <PageHeader
        eyebrow="2026 · 班级评议"
        title="班干部匿名评议"
        description="无需登录，放心说出你的真实感受。"
        action={<span className="anonymous-pill"><ShieldCheck size={15} /> 匿名</span>}
      />

      <div className="stepper" aria-label="投票进度">
        {STEP_META.map((item, index) => (
          <div className={`step ${index === step ? 'current' : ''} ${index < step ? 'done' : ''}`} key={item.title}>
            <span>{index < step ? <Check size={14} /> : index + 1}</span>
            <small>{item.title}</small>
          </div>
        ))}
      </div>

      <div className="section-heading">
        <div>
          <span>第 {step + 1} 步，共 3 步</span>
          <h2>{STEP_META[step].title}</h2>
          <p>{STEP_META[step].hint}</p>
        </div>
        {step === 0 && !loading && <b>{ratedCount}/{officers.length}</b>}
      </div>

      {loading ? (
        <div className="state-card"><LoaderCircle className="spin" /> 正在加载班干部名单…</div>
      ) : (
        <div className="officer-list">
          {officers.map((officer, index) => (
            <article className="officer-card" key={officer.id}>
              <div className="officer-card-top">
                <OfficerIdentity officer={officer} index={index} />
                <span className="card-number">0{index + 1}</span>
              </div>

              {step === 0 && (
                <div className="rating-block">
                  <StarRating
                    value={answers[officer.id]?.score || 0}
                    onChange={(score) => updateAnswer(officer.id, { score })}
                  />
                  <span>{answers[officer.id]?.score ? `${answers[officer.id].score} 分` : '点击星星评分'}</span>
                </div>
              )}

              {step === 1 && (
                <div className="tag-grid">
                  {TAGS.map((tag) => {
                    const selected = answers[officer.id]?.tags.includes(tag)
                    return (
                      <button
                        type="button"
                        key={tag}
                        className={selected ? 'tag-chip selected' : 'tag-chip'}
                        onClick={() => {
                          const current = answers[officer.id].tags
                          updateAnswer(officer.id, { tags: selected ? current.filter((item) => item !== tag) : [...current, tag] })
                        }}
                      >
                        {selected && <Check size={14} />} {tag}
                      </button>
                    )
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="comment-block">
                  <textarea
                    value={answers[officer.id]?.comment || ''}
                    onChange={(event) => updateAnswer(officer.id, { comment: event.target.value.slice(0, 200) })}
                    placeholder={`想对${officer.role}说点什么？（选填）`}
                    rows="3"
                  />
                  <span>{answers[officer.id]?.comment.length || 0}/200</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {error && <div className="error-message"><CheckCircle2 size={18} /> {error}</div>}

      {!loading && officers.length > 0 && (
        <div className="page-actions">
          {step > 0 && (
            <button className="button secondary" type="button" onClick={() => setStep((current) => current - 1)}>
              <ArrowLeft size={18} /> 上一步
            </button>
          )}
          {step < 2 ? (
            <button className="button primary" type="button" onClick={nextStep}>
              下一步 <ArrowRight size={18} />
            </button>
          ) : (
            <button className="button primary" type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
              {submitting ? '匿名提交中…' : '提交匿名评价'}
            </button>
          )}
        </div>
      )}

      <p className="footer-note">一次设备仅可提交一次 · 结果仅供班级内部参考</p>
    </section>
  )
}
