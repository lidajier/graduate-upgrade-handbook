import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { FlaskConical, Plus, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Play } from 'lucide-react'
import type { Experiment } from '../types'

type FilterTab = 'all' | 'active' | 'success' | 'failed'

const STATUS_CONFIG: Record<
  Experiment['status'],
  { label: string; icon: typeof CheckCircle; bg: string; text: string; border: string }
> = {
  pending: {
    label: '待开始',
    icon: Clock,
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/20',
  },
  running: {
    label: '进行中',
    icon: Play,
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  success: {
    label: '成功',
    icon: CheckCircle,
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
  },
  failed: {
    label: '失败',
    icon: XCircle,
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'success', label: '成功' },
  { key: 'failed', label: '失败' },
]

function filterExperiments(experiments: Experiment[], tab: FilterTab): Experiment[] {
  switch (tab) {
    case 'active':
      return experiments.filter((e) => e.status === 'pending' || e.status === 'running')
    case 'success':
      return experiments.filter((e) => e.status === 'success')
    case 'failed':
      return experiments.filter((e) => e.status === 'failed')
    default:
      return experiments
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Experiments() {
  const navigate = useNavigate()
  const { experiments } = useStore()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const filtered = filterExperiments(experiments, activeTab)

  const totalCount = experiments.length
  const successCount = experiments.filter((e) => e.status === 'success').length
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0
  const totalXP = experiments.reduce((sum, e) => sum + e.xp_earned, 0)

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="text-indigo-400" size={28} />
          <h1 className="text-2xl font-bold text-white">实验日志</h1>
        </div>
        <button onClick={() => navigate('/add')} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span>新增实验</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card text-center">
          <div className="text-2xl font-bold text-white">{totalCount}</div>
          <div className="text-xs text-gray-500 mt-1">实验总数</div>
        </div>
        <div className="glass-card text-center">
          <div className="text-2xl font-bold text-green-400">{successRate}%</div>
          <div className="text-xs text-gray-500 mt-1">成功率</div>
        </div>
        <div className="glass-card text-center">
          <div className="text-2xl font-bold text-amber-400">{totalXP}</div>
          <div className="text-xs text-gray-500 mt-1">实验总经验</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Experiment Cards */}
      {filtered.length === 0 ? (
        <div className="glass-card py-16 text-center space-y-4">
          <FlaskConical size={48} className="mx-auto text-gray-600" />
          <div className="text-gray-400 text-lg">还没有实验记录</div>
          <p className="text-gray-600 text-sm">开始记录你的第一个实验，追踪科研进展</p>
          <button onClick={() => navigate('/add')} className="btn-primary inline-flex items-center gap-2 mt-2">
            <Plus size={18} />
            <span>记录第一个实验</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exp) => {
            const statusCfg = STATUS_CONFIG[exp.status]
            const StatusIcon = statusCfg.icon
            const isExpanded = expandedIds.has(exp.id)
            const hasDetails =
              exp.parameters || exp.environment || exp.failure_reason || exp.next_step

            return (
              <div
                key={exp.id}
                className="glass-card cursor-pointer"
                onClick={() => toggleExpand(exp.id)}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title + Status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-white font-semibold text-base truncate">{exp.title}</h3>
                      <span
                        className={`tag inline-flex items-center gap-1.5 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} border`}
                      >
                        <StatusIcon size={14} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Purpose preview */}
                    {exp.purpose && (
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                        {exp.purpose.length > 100
                          ? exp.purpose.slice(0, 100) + '...'
                          : exp.purpose}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                      {exp.hypothesis && (
                        <span className="truncate max-w-[200px]">
                          <span className="text-gray-600">假设：</span>
                          {exp.hypothesis}
                        </span>
                      )}
                      {exp.result && (
                        <span className="truncate max-w-[200px]">
                          <span className="text-gray-600">结果：</span>
                          {exp.result}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="xp-badge">{exp.xp_earned > 0 ? `+${exp.xp_earned} XP` : '0 XP'}</span>
                    <span className="text-xs text-gray-600">{formatDate(exp.created_at)}</span>
                    {hasDetails && (
                      <span className="text-gray-600">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && hasDetails && (
                  <div
                    className="mt-4 pt-4 border-t border-gray-800 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {exp.parameters && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">实验参数</div>
                        <div className="text-sm text-gray-300 bg-gray-900/50 rounded-lg p-3 whitespace-pre-wrap">
                          {exp.parameters}
                        </div>
                      </div>
                    )}
                    {exp.environment && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">实验环境</div>
                        <div className="text-sm text-gray-300 bg-gray-900/50 rounded-lg p-3 whitespace-pre-wrap">
                          {exp.environment}
                        </div>
                      </div>
                    )}
                    {exp.failure_reason && (
                      <div>
                        <div className="text-xs text-red-400 font-medium mb-1 flex items-center gap-1.5">
                          <XCircle size={12} />
                          失败原因
                        </div>
                        <div className="text-sm text-gray-300 bg-red-500/5 border border-red-500/10 rounded-lg p-3 whitespace-pre-wrap">
                          {exp.failure_reason}
                        </div>
                      </div>
                    )}
                    {exp.next_step && (
                      <div>
                        <div className="text-xs text-indigo-400 font-medium mb-1 flex items-center gap-1.5">
                          <Play size={12} />
                          下一步计划
                        </div>
                        <div className="text-sm text-gray-300 bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 whitespace-pre-wrap">
                          {exp.next_step}
                        </div>
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