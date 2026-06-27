import { useMemo } from 'react'
import { useStore } from '../store'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BookOpen,
  FlaskConical,
  Plus,
  Lightbulb,
  Users,
  TrendingUp,
  Zap,
  Target,
  Flame,
  Clock,
} from 'lucide-react'

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}分钟`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}小时${rem}分钟` : `${hrs}小时`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { stats, papers, dailyLogs } = useStore()

  // ── 计算统计数据 ──────────────────────────────────
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const weekAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0, 10)
  }, [])

  const weekLogs = useMemo(
    () => dailyLogs.filter((l) => l.date >= weekAgo),
    [dailyLogs, weekAgo],
  )
  const todayLog = useMemo(
    () => dailyLogs.find((l) => l.date === today),
    [dailyLogs, today],
  )

  const weekPapersRead = useMemo(
    () => weekLogs.reduce((sum, l) => sum + l.papers_read, 0),
    [weekLogs],
  )
  const weekExperiments = useMemo(
    () => weekLogs.reduce((sum, l) => sum + l.experiments_done, 0),
    [weekLogs],
  )
  const todayXP = todayLog?.xp_earned ?? 0

  const recentPapers = useMemo(
    () =>
      [...papers]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5),
    [papers],
  )

  // ── 周活动图表数据 ──────────────────────────────
  const chartData = useMemo(() => {
    const days: { label: string; date: string; xp: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      const dayNames = ['日', '一', '二', '三', '四', '五', '六']
      days.push({
        label: dayNames[d.getDay()],
        date: ds,
        xp: dailyLogs.find((l) => l.date === ds)?.xp_earned ?? 0,
      })
    }
    return days
  }, [dailyLogs])

  // ── 技能数据 ─────────────────────────────────────
  const skills = useMemo(() => {
    if (!stats) return []
    return [
      { name: '文献力', key: 'skill_literature', value: stats.skill_literature },
      { name: '实验力', key: 'skill_experiment', value: stats.skill_experiment },
      { name: '代码力', key: 'skill_coding', value: stats.skill_coding },
      { name: '写作力', key: 'skill_writing', value: stats.skill_writing },
      { name: '表达力', key: 'skill_presentation', value: stats.skill_presentation },
      { name: '数据力', key: 'skill_data', value: stats.skill_data },
    ]
  }, [stats])

  const maxSkill = useMemo(() => Math.max(...skills.map((s) => s.value), 1), [skills])

  // ── XP / 等级 ────────────────────────────────────
  const level = stats?.level ?? 1
  const totalXP = stats?.total_xp ?? 0
  const currentLevelXP = ((level - 1) ** 2) * 100
  const nextLevelXP = (level ** 2) * 100
  const xpIntoLevel = totalXP - currentLevelXP
  const xpNeeded = nextLevelXP - currentLevelXP
  const xpPercent = Math.min(Math.round((xpIntoLevel / xpNeeded) * 100), 100)

  return (
    <div className="space-y-6">
      {/* ========== Hero 区域 ========== */}
      <section className="glass-card !p-8 relative overflow-hidden">
        {/* 背景光晕 */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-6">
          {/* 等级徽章 */}
          <div className="shrink-0 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <div className="text-center">
              <div className="text-xs text-indigo-200 font-medium">LV</div>
              <div className="text-4xl font-black text-white">{level}</div>
            </div>
          </div>

          {/* 信息区 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 flex-wrap mb-3">
              <h1 className="text-2xl font-bold text-white">
                研究生升级宝典
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold">
                <Flame size={16} />
                {stats?.current_streak ?? 0} 天连续
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold">
                <BookOpen size={14} />
                {papers.length} 篇论文
              </span>
            </div>

            {/* XP 进度条 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  XP {totalXP} / {nextLevelXP}
                </span>
                <span className="text-gradient font-semibold">{xpPercent}%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                距离 LV{level + 1} 还需 {xpNeeded - xpIntoLevel} XP
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 快捷操作 ========== */}
      <section className="grid grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/add?type=paper')}
          className="glass-card !p-4 flex flex-col items-center gap-2 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <BookOpen size={22} className="text-blue-400" />
          </div>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
            添加论文
          </span>
        </button>

        <button
          onClick={() => navigate('/add?type=experiment')}
          className="glass-card !p-4 flex flex-col items-center gap-2 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
            <FlaskConical size={22} className="text-green-400" />
          </div>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
            添加实验
          </span>
        </button>

        <button
          onClick={() => navigate('/add?type=meeting')}
          className="glass-card !p-4 flex flex-col items-center gap-2 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
            <Users size={22} className="text-orange-400" />
          </div>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
            记录组会
          </span>
        </button>

        <button
          onClick={() => navigate('/add?type=inspiration')}
          className="glass-card !p-4 flex flex-col items-center gap-2 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
            <Lightbulb size={22} className="text-yellow-400" />
          </div>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
            记录灵感
          </span>
        </button>
      </section>

      {/* ========== 统计卡片行 ========== */}
      <section className="grid grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <BookOpen size={18} className="text-blue-400" />
            </div>
            <span className="text-sm text-gray-400">本周读论文</span>
          </div>
          <div className="text-3xl font-bold text-white">{weekPapersRead}</div>
          <div className="text-xs text-gray-500 mt-1">篇</div>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <FlaskConical size={18} className="text-green-400" />
            </div>
            <span className="text-sm text-gray-400">本周实验</span>
          </div>
          <div className="text-3xl font-bold text-white">{weekExperiments}</div>
          <div className="text-xs text-gray-500 mt-1">次</div>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Zap size={18} className="text-amber-400" />
            </div>
            <span className="text-sm text-gray-400">今日XP</span>
          </div>
          <div className="text-3xl font-bold text-white">{todayXP}</div>
          <div className="text-xs text-gray-500 mt-1">经验值</div>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Flame size={18} className="text-red-400" />
            </div>
            <span className="text-sm text-gray-400">连续打卡</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats?.current_streak ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">
            最长 {stats?.longest_streak ?? 0} 天
          </div>
        </div>
      </section>

      {/* ========== 最近论文 + 周活跃图表 ========== */}
      <div className="grid grid-cols-2 gap-6">
        {/* 最近论文 */}
        <section className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-400" />
              最近论文
            </h3>
            <button
              onClick={() => navigate('/add?type=paper')}
              className="btn-primary !px-3 !py-1.5 !text-xs"
            >
              <Plus size={14} className="inline mr-1" />
              添加
            </button>
          </div>

          {recentPapers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">还没有论文记录</p>
              <p className="text-xs mt-1">点击上方按钮添加第一篇论文</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPapers.map((paper) => (
                <div
                  key={paper.id}
                  onClick={() => navigate(`/paper/${paper.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/50 hover:bg-gray-800/50 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer group"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <BookOpen size={16} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                      {paper.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {paper.tags ? (
                        paper.tags
                          .split(',')
                          .slice(0, 3)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="tag bg-indigo-500/10 text-indigo-400"
                            >
                              {tag.trim()}
                            </span>
                          ))
                      ) : (
                        <span className="text-xs text-gray-600">无标签</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      {formatSeconds(paper.read_duration_seconds)}
                    </div>
                    <div className="xp-badge mt-1 text-[10px]">
                      +{paper.xp_earned} XP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 周活跃图表 */}
        <section className="glass-card">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-indigo-400" />
            本周XP趋势
          </h3>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: 12,
                    color: '#f3f4f6',
                    fontSize: 13,
                  }}
                  formatter={(value: number) => [`${value} XP`, '经验值']}
                  labelFormatter={(label: string) => `周${label}`}
                />
                <Bar
                  dataKey="xp"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* ========== 技能雷达 ========== */}
      <section className="glass-card">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-5">
          <Target size={18} className="text-indigo-400" />
          技能进度
        </h3>

        <div className="grid grid-cols-3 gap-x-8 gap-y-4">
          {skills.map((skill) => (
            <div key={skill.key} className="flex items-center gap-3">
              <span className="shrink-0 w-14 text-sm text-gray-400 text-right">
                {skill.name}
              </span>
              <div className="flex-1 h-4 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.round((skill.value / maxSkill) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 w-8 text-xs text-gray-500 text-right">
                {skill.value}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
