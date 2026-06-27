import { create } from 'zustand'
import type { Paper, Experiment, Meeting, UserStats, DailyLog, TechTreeNode, Record, XPNotification } from './types'

interface AppState {
  // 用户状态
  stats: UserStats | null
  setStats: (stats: UserStats) => void

  // 论文
  papers: Paper[]
  setPapers: (papers: Paper[]) => void
  currentPaper: Paper | null
  setCurrentPaper: (paper: Paper | null) => void

  // 实验
  experiments: Experiment[]
  setExperiments: (experiments: Experiment[]) => void

  // 记录
  records: Record[]
  setRecords: (records: Record[]) => void

  // 组会
  meetings: Meeting[]
  setMeetings: (meetings: Meeting[]) => void

  // 每日日志
  dailyLogs: DailyLog[]
  setDailyLogs: (logs: DailyLog[]) => void

  // 科技树
  techTree: TechTreeNode[]
  setTechTree: (tree: TechTreeNode[]) => void

  // XP通知
  xpNotification: XPNotification | null
  showXPNotification: (notification: XPNotification) => void
  clearXPNotification: () => void

  // 读取计时器
  readingTimer: number | null
  readingPaperId: number | null
  readingStartTime: number | null
  startReading: (paperId: number) => void
  stopReading: () => number

  // 弹窗
  summaryModalOpen: boolean
  summaryPaperId: number | null
  openSummaryModal: (paperId: number) => void
  closeSummaryModal: () => void

  // 侧边栏
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useStore = create<AppState>((set, get) => ({
  stats: null,
  setStats: (stats) => set({ stats }),

  papers: [],
  setPapers: (papers) => set({ papers }),
  currentPaper: null,
  setCurrentPaper: (paper) => set({ currentPaper: paper }),

  experiments: [],
  setExperiments: (experiments) => set({ experiments }),

  records: [],
  setRecords: (records) => set({ records }),

  meetings: [],
  setMeetings: (meetings) => set({ meetings }),

  dailyLogs: [],
  setDailyLogs: (logs) => set({ dailyLogs: logs }),

  techTree: [],
  setTechTree: (tree) => set({ techTree: tree }),

  xpNotification: null,
  showXPNotification: (notification) => {
    set({ xpNotification: notification })
    setTimeout(() => set({ xpNotification: null }), 2500)
  },
  clearXPNotification: () => set({ xpNotification: null }),

  readingTimer: null,
  readingPaperId: null,
  readingStartTime: null,
  startReading: (paperId) => {
    const existing = get().readingTimer
    if (existing) clearInterval(existing)
    const timer = window.setInterval(() => {
      // 每30秒保存一次阅读时间
      const { readingPaperId, readingStartTime } = get()
      if (readingPaperId && readingStartTime) {
        const elapsed = Math.floor((Date.now() - readingStartTime) / 1000)
        if (elapsed > 0 && elapsed % 30 === 0) {
          window.electronAPI.updatePaperReadTime(readingPaperId, 30)
        }
      }
    }, 30000)
    set({ readingTimer: timer, readingPaperId: paperId, readingStartTime: Date.now() })
  },
  stopReading: () => {
    const { readingTimer, readingPaperId, readingStartTime } = get()
    if (readingTimer) clearInterval(readingTimer)
    const elapsed = readingStartTime ? Math.floor((Date.now() - readingStartTime) / 1000) : 0
    set({ readingTimer: null, readingPaperId: null, readingStartTime: null })
    return elapsed
  },

  summaryModalOpen: false,
  summaryPaperId: null,
  openSummaryModal: (paperId) => set({ summaryModalOpen: true, summaryPaperId: paperId }),
  closeSummaryModal: () => set({ summaryModalOpen: false, summaryPaperId: null }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))