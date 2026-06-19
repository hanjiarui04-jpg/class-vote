import { hasSupabaseConfig, supabase } from './supabase'

export const isDemoMode = !hasSupabaseConfig

const demoOfficers = [
  { id: '01', name: '张鑫名', role: '班长' },
  { id: '02', name: '李珂', role: '团支书' },
  { id: '03', name: '韩家锐', role: '学习委员' },
  { id: '04', name: '刘广运', role: '组织委员' },
  { id: '05', name: '赛依浦丁', role: '体育委员' },
  { id: '06', name: '李超', role: '宣传委员' },
  { id: '07', name: '祖拉雅提', role: '生活委员' },
  { id: '08', name: '何晨', role: '信息委员' },
  { id: '09', name: '热依莱', role: '文艺委员' },
  { id: '10', name: '帕热达', role: '心理委员' },
  { id: '11', name: '王俊杰', role: '心理委员' },
]

const demoComments = [
  ['组织活动很认真，通知也很及时。', '希望班会可以再简短一点。'],
  ['学习资料整理得很清楚，谢谢！', '讲题很有耐心。'],
  ['活动安排很用心，气氛很好。', '可以多听听大家的建议。'],
  ['班费记录清楚，做事很细致。', '辛苦啦。'],
  ['运动会带动得很好，很有活力。', '希望平时也多组织一些活动。'],
]

function buildDemoDashboard() {
  const scores = [4.8, 4.6, 4.7, 4.5, 4.6, 4.4, 4.7, 4.5, 4.6, 4.8, 4.7]
  const tagSets = [
    { 负责: 15, 积极: 13, 沟通好: 11, 一般: 2, 不满意: 0 },
    { 负责: 14, 积极: 12, 沟通好: 15, 一般: 2, 不满意: 1 },
    { 负责: 12, 积极: 15, 沟通好: 10, 一般: 3, 不满意: 1 },
    { 负责: 16, 积极: 11, 沟通好: 12, 一般: 1, 不满意: 0 },
    { 负责: 12, 积极: 16, 沟通好: 10, 一般: 2, 不满意: 1 },
  ]
  return {
    totalVoters: 18,
    officers: demoOfficers.map((officer, index) => ({
      ...officer,
      averageScore: scores[index] || 0,
      voteCount: 18,
      tags: tagSets[index] || { 负责: 13, 积极: 12, 沟通好: 11, 一般: 2, 不满意: 0 },
      comments: (demoComments[index] || []).map((comment, commentIndex) => ({
        id: `${officer.id}-${commentIndex}`,
        comment,
        score: commentIndex ? 4 : 5,
        createdAt: new Date(Date.now() - (index * 2 + commentIndex) * 86400000).toISOString(),
      })),
    })),
  }
}

export function getOrCreateAnonymousId() {
  const key = 'class_vote_anonymous_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function hasSubmitted() {
  return localStorage.getItem('class_vote_submitted') === 'true'
}

export async function fetchOfficers() {
  if (isDemoMode) return demoOfficers
  const { data, error } = await supabase.from('officers').select('id, name, role').order('sort_order')
  if (error) throw error
  return data
}

export async function submitBallot(reviews) {
  if (hasSubmitted()) throw new Error('这台设备已经提交过投票')
  const anonymousId = getOrCreateAnonymousId()

  if (isDemoMode) {
    localStorage.setItem('class_vote_demo_ballot', JSON.stringify({ anonymousId, reviews }))
    localStorage.setItem('class_vote_submitted', 'true')
    await new Promise((resolve) => setTimeout(resolve, 650))
    return
  }

  const payload = reviews.map((item) => ({
    officerId: item.officerId,
    score: item.score,
    tags: item.tags,
    comment: item.comment.trim() || null,
  }))
  const { error } = await supabase.rpc('submit_ballot', {
    p_anonymous_id: anonymousId,
    p_reviews: payload,
  })
  if (error) throw error
  localStorage.setItem('class_vote_submitted', 'true')
}

export async function fetchAdminDashboard(password) {
  if (isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 450))
    if (password !== '20252502') throw new Error('密码不正确')
    return buildDemoDashboard()
  }

  const { data, error } = await supabase.rpc('get_admin_dashboard', { p_password: password })
  if (error) throw error
  return data
}
