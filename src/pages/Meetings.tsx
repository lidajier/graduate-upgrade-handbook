import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Users, Plus, ChevronDown, ChevronUp, FileDown, Calendar, MessageSquare } from 'lucide-react'

/* ── helpers ────────────────────────────────────────────── */

function parseList(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function escapeMarkdown(text: string): string {
  return text.replace(/([*_~`>#+\-=\[\]{}()!|])/g, '\\$1')
}

const DECISION_COLORS = [
  'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  'bg-amber-500/15 text-amber-300 border-amber-500/25',
  'bg-rose-500/15 text-rose-300 border-rose-500/25',
  'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  'bg-violet-500/15 text-violet-300 border-violet-500/25',
]

/* ── component ──────────────────────────────────────────── */

const MeetingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { meetings } = useStore()

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({})

  /* ── derived stats ──────────────────────────────────── */

  const totalMeetings = meetings.length
  const totalXP = meetings.reduce((sum, m) => sum + m.xp_earned, 0)
  const lastMeetingDate =
    meetings.length > 0
      ? formatDate(
          [...meetings].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0].created_at,
        )
      : '—'

  /* ── expand / collapse ──────────────────────────────── */

  const toggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTask = (meetingId: number, taskIdx: number) => {
    const key = `${meetingId}-${taskIdx}`
    setCheckedTasks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  /* ── export ─────────────────────────────────────────── */

  const handleExport = async () => {
    const lines: string[] = ['# 组会记录', '', `> 总计 ${totalMeetings} 次组会  ·  ${totalXP} XP`, '']

    const sorted = [...meetings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    for (const m of sorted) {
      lines.push(`## ${escapeMarkdown(m.title)}`)
      lines.push(`**日期** ${formatDate(m.created_at)}  ·  **+${m.xp_earned} XP**`)
      lines.push('')

      if (m.participants) {
        lines.push(`**参会人** ${escapeMarkdown(m.participants)}`)
        lines.push('')
      }
      if (m.questions) {
        lines.push('**问题**')
        for (const q of parseList(m.questions)) lines.push(`- ${escapeMarkdown(q)}`)
        lines.push('')
      }
      if (m.advisor_feedback) {
        lines.push('**导师反馈**')
        lines.push(escapeMarkdown(m.advisor_feedback))
        lines.push('')
      }
      if (m.decisions) {
        lines.push('**决议**')
        for (const d of parseList(m.decisions)) lines.push(`- ${escapeMarkdown(d)}`)
        lines.push('')
      }
      if (m.follow_up_tasks) {
        lines.push('**待办事项**')
        for (const t of parseList(m.follow_up_tasks)) lines.push(`- [ ] ${escapeMarkdown(t)}`)
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    }

    const markdown = lines.join('\n')
    await window.electronAPI.exportMarkdown(markdown)
  }

  /* ── render ─────────────────────────────────────────── */

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <h1 className="text-2xl font-bold text-white">组会记录</h1>
        </div>

        <div className="flex items-center gap-2">
          {meetings.length > 0 && (
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <FileDown size={16} />
              导出 Markdown
            </button>
          )}

          <button onClick={() => navigate('/add')} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            新增组会
          </button>
        </div>
      </div>

      {/* ── stats bar ───────────────────────────────── */}
      {meetings.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{totalMeetings}</div>
              <div className="text-xs text-gray-500">总组会次数</div>
            </div>
          </div>

          <div className="glass-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <span className="text-amber-400 text-lg font-bold">⚡</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{totalXP}</div>
              <div className="text-xs text-gray-500">组会总经验</div>
            </div>
          </div>

          <div className="glass-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Calendar size={20} className="text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{lastMeetingDate}</div>
              <div className="text-xs text-gray-500">最近一次组会</div>
            </div>
          </div>
        </div>
      )}

      {/* ── empty state ─────────────────────────────── */}
      {meetings.length === 0 && (
        <div className="glass-card py-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
            <Users size={36} className="text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">还没有组会记录</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            每次组会都是成长的机会！记录下你的问题、导师的反馈和后续计划，让每一次讨论都有迹可循。
          </p>
          <button onClick={() => navigate('/add')} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            记录第一次组会
          </button>
        </div>
      )}

      {/* ── meeting cards ───────────────────────────── */}
      {meetings.length > 0 && (
        <div className="space-y-4">
          {[...meetings]
            .sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            .map((meeting) => {
              const isExpanded = expandedIds.has(meeting.id)
              const decisions = parseList(meeting.decisions)
              const tasks = parseList(meeting.follow_up_tasks)
              const questions = parseList(meeting.questions)
              const hasDetails =
                questions.length > 0 ||
                !!meeting.advisor_feedback ||
                decisions.length > 0 ||
                tasks.length > 0

              return (
                <div key={meeting.id} className="glass-card cursor-pointer" onClick={() => toggle(meeting.id)}>
                  {/* ── card header ─────────────────── */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-white truncate">
                          {meeting.title}
                        </h3>
                        <span className="xp-badge shrink-0">+{meeting.xp_earned} XP</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(meeting.created_at)}
                        </span>
                        {meeting.participants && (
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {meeting.participants}
                          </span>
                        )}
                        {hasDetails && (
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {questions.length > 0 && `${questions.length} 个问题`}
                            {questions.length > 0 && !!meeting.advisor_feedback && ' · '}
                            {!!meeting.advisor_feedback && '有反馈'}
                            {!questions.length && !meeting.advisor_feedback && '有详情'}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      className="shrink-0 ml-3 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(meeting.id)
                      }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {/* ── decisions preview ────────────── */}
                  {decisions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {decisions.map((d, i) => (
                        <span
                          key={i}
                          className={`tag border ${DECISION_COLORS[i % DECISION_COLORS.length]}`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ── expanded details ─────────────── */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                      {/* questions */}
                      {questions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            讨论问题
                          </h4>
                          <ul className="space-y-1.5">
                            {questions.map((q, i) => (
                              <li
                                key={i}
                                className="text-sm text-gray-300 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-indigo-400"
                              >
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* advisor feedback */}
                      {meeting.advisor_feedback && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            导师反馈
                          </h4>
                          <div className="text-sm text-gray-300 bg-gray-800/40 rounded-xl p-3 border border-gray-700/50 whitespace-pre-wrap">
                            {meeting.advisor_feedback}
                          </div>
                        </div>
                      )}

                      {/* decisions */}
                      {decisions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            会议决议
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {decisions.map((d, i) => (
                              <span
                                key={i}
                                className={`tag border ${DECISION_COLORS[i % DECISION_COLORS.length]}`}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* follow-up tasks */}
                      {tasks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            待办事项
                          </h4>
                          <ul className="space-y-2">
                            {tasks.map((t, i) => {
                              const key = `${meeting.id}-${i}`
                              const done = !!checkedTasks[key]
                              return (
                                <li
                                  key={i}
                                  className="flex items-start gap-2.5 text-sm text-gray-300"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                      done
                                        ? 'bg-emerald-500/30 border-emerald-500/50'
                                        : 'border-gray-600 hover:border-gray-400'
                                    }`}
                                    onClick={() => toggleTask(meeting.id, i)}
                                  >
                                    {done && (
                                      <svg
                                        className="w-3 h-3 text-emerald-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={3}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <span className={done ? 'line-through text-gray-600' : ''}>{t}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}

                      {/* participants */}
                      {meeting.participants && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            参会人员
                          </h4>
                          <p className="text-sm text-gray-300">{meeting.participants}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default MeetingsPage