export interface Paper {
  id: number
  title: string
  authors: string | null
  year: number | null
  doi: string | null
  journal: string | null
  tags: string | null
  pdf_path: string | null
  research_question: string | null
  method: string | null
  data_source: string | null
  conclusion: string | null
  limitations: string | null
  reusable_points: string | null
  summary: string | null
  read_duration_seconds: number
  read_count: number
  last_read_at: string | null
  xp_earned: number
  created_at: string
  updated_at: string
}

export interface Experiment {
  id: number
  title: string
  purpose: string | null
  hypothesis: string | null
  parameters: string | null
  environment: string | null
  result: string | null
  screenshot_path: string | null
  failure_reason: string | null
  next_step: string | null
  paper_id: number | null
  status: 'pending' | 'running' | 'success' | 'failed'
  xp_earned: number
  created_at: string
  updated_at: string
}

export interface Record {
  id: number
  type: 'paper' | 'experiment' | 'writing' | 'code' | 'meeting' | 'inspiration'
  title: string
  content: string | null
  tags: string | null
  related_paper_id: number | null
  xp_earned: number
  skill_points: string
  created_at: string
}

export interface Meeting {
  id: number
  title: string
  questions: string | null
  advisor_feedback: string | null
  decisions: string | null
  follow_up_tasks: string | null
  participants: string | null
  xp_earned: number
  created_at: string
}

export interface UserStats {
  id: number
  level: number
  total_xp: number
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  skill_literature: number
  skill_experiment: number
  skill_coding: number
  skill_writing: number
  skill_presentation: number
  skill_data: number
  achievements: string
  updated_at: string
}

export interface DailyLog {
  id: number
  date: string
  papers_read: number
  experiments_done: number
  xp_earned: number
  summary: string | null
}

export interface TechTreeNode {
  id: number
  parent_id: number | null
  name: string
  category: string
  level: number
  progress: number
  description: string | null
}

export interface XPNotification {
  amount: number
  newLevel: number
  newXP: number
}

export interface PDFMetadata {
  fileName: string
  title: string
  authors: string
  year: number | null
  doi: string
  journal: string
  tags: string
  abstract: string
  firstPageText: string
  pageCount: number
}

export interface ElectronAPI {
  getPapers: () => Promise<Paper[]>
  addPaper: (paper: Partial<Paper>) => Promise<number>
  updatePaper: (id: number, paper: Partial<Paper>) => Promise<any>
  getPaper: (id: number) => Promise<Paper | null>
  updatePaperReadTime: (id: number, seconds: number) => Promise<void>
  getExperiments: () => Promise<Experiment[]>
  addExperiment: (exp: Partial<Experiment>) => Promise<number>
  addRecord: (record: Partial<Record>) => Promise<any>
  getRecords: (type?: string) => Promise<Record[]>
  addMeeting: (meeting: Partial<Meeting>) => Promise<number>
  getMeetings: () => Promise<Meeting[]>
  getUserStats: () => Promise<UserStats>
  updateStreak: () => Promise<void>
  logDailyActivity: () => Promise<void>
  getDailyLogs: (days: number) => Promise<DailyLog[]>
  getTechTree: () => Promise<TechTreeNode[]>
  addTechTreeNode: (node: Partial<TechTreeNode>) => Promise<any>
  openPDFDialog: () => Promise<string | null>
  copyPDF: (sourcePath: string) => Promise<string>
  readPDF: (filePath: string) => Promise<string | null>
  extractPDFMetadata: (filePath: string) => Promise<PDFMetadata>
  exportMarkdown: (content: string) => Promise<string | null>
  onXPGained: (callback: (data: XPNotification) => void) => void
  removeXPGainedListener: () => void
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export type RecordType = 'paper' | 'experiment' | 'writing' | 'code' | 'meeting' | 'inspiration'

export const RECORD_TYPES: { value: RecordType; label: string; icon: string; color: string }[] = [
  { value: 'paper', label: '论文', icon: '📄', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'experiment', label: '实验', icon: '🧪', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { value: 'writing', label: '写作', icon: '✍️', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'code', label: '代码', icon: '💻', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { value: 'meeting', label: '组会', icon: '👥', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { value: 'inspiration', label: '灵感', icon: '💡', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
]

export const XP_RULES: { [key: string]: { xp: number; skills: Partial<{ [key: string]: number }>; desc: string } } = {
  add_paper: { xp: 5, skills: { literature: 1 }, desc: '添加论文' },
  write_summary: { xp: 25, skills: { literature: 2, writing: 1 }, desc: '写完结构化总结' },
  extract_points: { xp: 15, skills: { literature: 1 }, desc: '提取可复用观点' },
  read_30min: { xp: 20, skills: { literature: 2 }, desc: '深度阅读30分钟' },
  reproduce_experiment: { xp: 80, skills: { experiment: 3, coding: 2 }, desc: '复现实验/代码' },
  failure_review: { xp: 40, skills: { experiment: 2, writing: 1 }, desc: '写失败复盘' },
  write_review: { xp: 100, skills: { writing: 4, literature: 2 }, desc: '形成综述草稿' },
  meeting_report: { xp: 120, skills: { presentation: 3, writing: 1 }, desc: '完成组会汇报' },
  streak_7: { xp: 50, skills: {}, desc: '连续7天打卡' },
  add_experiment: { xp: 10, skills: { experiment: 1 }, desc: '添加实验记录' },
  add_code: { xp: 15, skills: { coding: 1 }, desc: '提交代码记录' },
  add_inspiration: { xp: 5, skills: {}, desc: '记录灵感' },
}

export const SKILL_NAMES: { [key: string]: string } = {
  literature: '文献力',
  experiment: '实验力',
  coding: '代码力',
  writing: '写作力',
  presentation: '表达力',
  data: '数据力',
}