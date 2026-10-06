export interface RepMetrics {
  id: string
  name: string
  initials: string
  rank: number
  weeklyScores: number[]
  weeklySessions: number[]
  streak: number
  weeklyGoal: number
  weeklyDone: number
  skills: {
    objectionHandling: number
    clarity: number
    confidence: number
    compliance: number
    adaptability: number
    rapport: number
  }
  totalSessions: number
  avgScore: number
  achievements: string[]
}

export interface TeamGoal {
  label: string
  current: number
  target: number
  unit: string
  color: string
}

export interface Achievement {
  id: string
  label: string
  icon: string
  desc: string
  unlocked: boolean
  unlockedDate?: string
}

export interface HeatmapDay {
  date: string
  count: number
}

// Deterministic seeded PRNG so heatmap is stable across loads
function seededRand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(1664525, s) + 1013904223
    return (s >>> 0) / 0xffffffff
  }
}

function generateHeatmap(): HeatmapDay[] {
  const rand = seededRand(42)
  const days: HeatmapDay[] = []
  const now = new Date('2026-10-05')
  const totalDays = 15 * 7
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    const recency = 1 - i / totalDays
    const base = isWeekend ? 0.15 : 0.45
    const roll = rand()
    let count = 0
    if (roll < base + recency * 0.35) {
      count = Math.floor(rand() * 3) + 1
    }
    days.push({ date: d.toISOString().split('T')[0], count: Math.min(count, 4) })
  }
  return days
}

export const myMetrics: RepMetrics = {
  id: 'rep-me',
  name: 'Arjun Mehta',
  initials: 'AM',
  rank: 2,
  weeklyScores: [62, 65, 71, 68, 74, 72, 78, 76, 80, 82, 79, 85],
  weeklySessions: [1, 2, 1, 3, 2, 2, 3, 2, 3, 3, 4, 3],
  streak: 8,
  weeklyGoal: 4,
  weeklyDone: 3,
  skills: {
    objectionHandling: 82,
    clarity: 78,
    confidence: 74,
    compliance: 91,
    adaptability: 69,
    rapport: 76,
  },
  totalSessions: 29,
  avgScore: 76,
  achievements: ['first_session', 'streak_7', 'score_85'],
}

export const leaderboard: RepMetrics[] = [
  {
    id: 'rep-1',
    name: 'Priya Nair',
    initials: 'PN',
    rank: 1,
    weeklyScores: [70, 72, 75, 78, 80, 82, 85, 83, 87, 88, 90, 91],
    weeklySessions: [2, 3, 2, 3, 3, 4, 3, 4, 4, 4, 5, 4],
    streak: 21,
    weeklyGoal: 5,
    weeklyDone: 4,
    skills: { objectionHandling: 92, clarity: 88, confidence: 90, compliance: 94, adaptability: 85, rapport: 89 },
    totalSessions: 41,
    avgScore: 83,
    achievements: ['first_session', 'streak_7', 'streak_21', 'score_85', 'ten_sessions', 'top_leaderboard'],
  },
  myMetrics,
  {
    id: 'rep-3',
    name: 'Rohit Saxena',
    initials: 'RS',
    rank: 3,
    weeklyScores: [55, 60, 58, 63, 65, 67, 70, 69, 72, 71, 74, 76],
    weeklySessions: [1, 1, 2, 2, 2, 2, 3, 2, 3, 3, 3, 3],
    streak: 5,
    weeklyGoal: 3,
    weeklyDone: 3,
    skills: { objectionHandling: 74, clarity: 70, confidence: 68, compliance: 80, adaptability: 65, rapport: 72 },
    totalSessions: 27,
    avgScore: 67,
    achievements: ['first_session', 'streak_7'],
  },
  {
    id: 'rep-4',
    name: 'Deepa Verma',
    initials: 'DV',
    rank: 4,
    weeklyScores: [50, 54, 57, 60, 63, 62, 65, 68, 66, 70, 72, 73],
    weeklySessions: [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3],
    streak: 3,
    weeklyGoal: 3,
    weeklyDone: 3,
    skills: { objectionHandling: 70, clarity: 68, confidence: 65, compliance: 78, adaptability: 60, rapport: 70 },
    totalSessions: 25,
    avgScore: 63,
    achievements: ['first_session'],
  },
  {
    id: 'rep-5',
    name: 'Karan Thakur',
    initials: 'KT',
    rank: 5,
    weeklyScores: [45, 48, 50, 53, 55, 57, 60, 62, 64, 65, 67, 70],
    weeklySessions: [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3],
    streak: 2,
    weeklyGoal: 3,
    weeklyDone: 2,
    skills: { objectionHandling: 65, clarity: 62, confidence: 60, compliance: 75, adaptability: 58, rapport: 64 },
    totalSessions: 23,
    avgScore: 59,
    achievements: ['first_session'],
  },
]

export const teamGoals: TeamGoal[] = [
  { label: 'Weekly Sessions',      current: 3,  target: 4,  unit: 'sessions', color: '#F0A500' },
  { label: 'Avg Score',            current: 76, target: 85, unit: 'pts',      color: '#58A6FF' },
  { label: 'Active Streak',        current: 8,  target: 30, unit: 'days',     color: '#3FB950' },
  { label: 'Sessions This Month',  current: 29, target: 50, unit: 'total',    color: '#BC8CFF' },
]

export const achievements: Achievement[] = [
  {
    id: 'first_session', label: 'First Rep',   icon: '🎯',
    desc: 'Completed your first practice session',
    unlocked: true, unlockedDate: 'Sep 1',
  },
  {
    id: 'streak_7',      label: 'Week Warrior', icon: '🔥',
    desc: '7-day practice streak achieved',
    unlocked: true, unlockedDate: 'Sep 14',
  },
  {
    id: 'score_85',      label: 'Sharp Closer', icon: '⚡',
    desc: 'Scored 85+ in a single session',
    unlocked: true, unlockedDate: 'Sep 28',
  },
  {
    id: 'ten_sessions',  label: 'Consistent Rep', icon: '📈',
    desc: '10 practice sessions completed',
    unlocked: false,
  },
  {
    id: 'streak_21',     label: 'Marathon Rep',   icon: '🏃',
    desc: '21-day unbroken practice streak',
    unlocked: false,
  },
  {
    id: 'top_leaderboard', label: 'Team Leader',  icon: '🏆',
    desc: 'Reached #1 on the team leaderboard',
    unlocked: false,
  },
]

export const heatmapData = generateHeatmap()

export const weekLabels = Array.from({ length: 12 }, (_, i) => `W${i + 1}`)

export const scoreTrend = weekLabels.map((_, i) => ({
  week: `W${i + 1}`,
  me:   myMetrics.weeklyScores[i],
  team: Math.round(
    leaderboard.reduce((s, r) => s + r.weeklyScores[i], 0) / leaderboard.length,
  ),
  top:  leaderboard[0].weeklyScores[i],
}))

export const skillRadarData = [
  { skill: 'Objection',    me: myMetrics.skills.objectionHandling, team: 79 },
  { skill: 'Clarity',      me: myMetrics.skills.clarity,            team: 75 },
  { skill: 'Confidence',   me: myMetrics.skills.confidence,         team: 71 },
  { skill: 'Compliance',   me: myMetrics.skills.compliance,         team: 83 },
  { skill: 'Adaptability', me: myMetrics.skills.adaptability,       team: 67 },
  { skill: 'Rapport',      me: myMetrics.skills.rapport,            team: 74 },
]
