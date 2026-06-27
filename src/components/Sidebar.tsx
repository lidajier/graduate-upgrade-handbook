import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { BookOpen, PlusCircle, FlaskConical, TrendingUp, Users, GitGraph, LayoutDashboard } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/add', label: '添加战绩', icon: PlusCircle },
  { path: '/experiments', label: '实验日志', icon: FlaskConical },
  { path: '/meetings', label: '组会记录', icon: Users },
  { path: '/growth', label: '成长树', icon: TrendingUp },
  { path: '/techtree', label: '科技树', icon: GitGraph },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { stats, sidebarCollapsed, papers } = useStore()

  return (
    <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} glass border-r border-gray-800 flex flex-col transition-all duration-300`}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-800">
        {!sidebarCollapsed && (
          <span className="text-gradient font-bold text-base">🎓 学术RPG</span>
        )}
        {sidebarCollapsed && (
          <span className="text-xl mx-auto">🎓</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                ${isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Quick Stats */}
      {!sidebarCollapsed && stats && (
        <div className="p-4 border-t border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">等级</span>
            <span className="text-amber-400 font-bold">Lv.{stats.level}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 rounded-full h-1.5 transition-all"
              style={{ width: `${(() => {
                const xpProgress = stats.total_xp - ((stats.level - 1) ** 2) * 100
                const xpNeeded = (stats.level ** 2) * 100 - ((stats.level - 1) ** 2) * 100
                return Math.min(100, (xpProgress / xpNeeded) * 100)
              })()}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">论文</span>
            <span className="text-blue-400">{papers.length}篇</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">连续</span>
            <span className="text-orange-400">🔥{stats.current_streak}天</span>
          </div>
        </div>
      )}
    </aside>
  )
}