import type {
  DailyLog,
  ElectronAPI,
  Experiment,
  Meeting,
  Paper,
  PDFMetadata,
  TechTreeNode,
  XPNotification,
  Record as AcademicRecord,
} from './types'

type SkillMap = Partial<{ literature: number; experiment: number; coding: number; writing: number; presentation: number; data: number }>

interface BrowserDB {
  counters: { papers: number; experiments: number; records: number; meetings: number; dailyLogs: number; techTree: number }
  papers: Paper[]
  experiments: Experiment[]
  records: AcademicRecord[]
  meetings: Meeting[]
  dailyLogs: DailyLog[]
  techTree: TechTreeNode[]
  stats: {
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
  pdfs: Record<string, { fileName: string; base64: string; created_at: string }>
}

const DB_KEY = 'graduate-upgrade-handbook.browser-db.v1'
const listeners = new Set<(data: XPNotification) => void>()

function now() {
  return new Date().toISOString()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function defaultDB(): BrowserDB {
  return {
    counters: { papers: 0, experiments: 0, records: 0, meetings: 0, dailyLogs: 0, techTree: 0 },
    papers: [],
    experiments: [],
    records: [],
    meetings: [],
    dailyLogs: [],
    techTree: [],
    stats: {
      id: 1,
      level: 1,
      total_xp: 0,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      skill_literature: 0,
      skill_experiment: 0,
      skill_coding: 0,
      skill_writing: 0,
      skill_presentation: 0,
      skill_data: 0,
      achievements: '[]',
      updated_at: now(),
    },
    pdfs: {},
  }
}

function loadDB(): BrowserDB {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) return defaultDB()
  try {
    return { ...defaultDB(), ...JSON.parse(raw) }
  } catch {
    return defaultDB()
  }
}

function saveDB(db: BrowserDB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function ensureDailyLog(db: BrowserDB): DailyLog {
  const date = today()
  let log = db.dailyLogs.find((item) => item.date === date)
  if (!log) {
    db.counters.dailyLogs += 1
    log = { id: db.counters.dailyLogs, date, papers_read: 0, experiments_done: 0, xp_earned: 0, summary: null }
    db.dailyLogs.push(log)
  }
  return log
}

function notifyXP(amount: number, newLevel: number, newXP: number) {
  const payload = { amount, newLevel, newXP }
  listeners.forEach((listener) => listener(payload))
}

function addXP(db: BrowserDB, amount: number, skills: SkillMap = {}) {
  if (amount <= 0) return
  const stats = db.stats
  stats.total_xp += amount
  stats.level = Math.floor(Math.sqrt(stats.total_xp / 100)) + 1
  stats.skill_literature += skills.literature ?? 0
  stats.skill_experiment += skills.experiment ?? 0
  stats.skill_coding += skills.coding ?? 0
  stats.skill_writing += skills.writing ?? 0
  stats.skill_presentation += skills.presentation ?? 0
  stats.skill_data += skills.data ?? 0
  stats.updated_at = now()
  ensureDailyLog(db).xp_earned += amount
  notifyXP(amount, stats.level, stats.total_xp)
}

function nextId(db: BrowserDB, key: keyof BrowserDB['counters']) {
  db.counters[key] += 1
  return db.counters[key]
}

function sortByUpdated<T extends { updated_at?: string; created_at?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result ?? '')
      resolve(value.includes(',') ? value.split(',')[1] : value)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function pickPDF(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,.pdf'
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = async () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) return resolve(null)
      try {
        const db = loadDB()
        const key = `browser-pdf:${Date.now()}:${file.name}`
        db.pdfs[key] = { fileName: file.name, base64: await fileToBase64(file), created_at: now() }
        saveDB(db)
        resolve(key)
      } catch (error) {
        console.error('Browser PDF import failed:', error)
        alert('PDF 保存到浏览器本地存储失败，可能是文件过大或 iOS 存储空间不足。')
        resolve(null)
      }
    }
    input.oncancel = () => {
      input.remove()
      resolve(null)
    }
    input.click()
  })
}

function inferSkillsForRecord(type?: string): SkillMap {
  switch (type) {
    case 'experiment': return { experiment: 1 }
    case 'writing': return { writing: 1 }
    case 'code': return { coding: 1 }
    case 'meeting': return { presentation: 3, writing: 1 }
    case 'paper': return { literature: 1 }
    default: return {}
  }
}

export function installBrowserElectronAPI() {
  if (window.electronAPI) return

  const api: ElectronAPI = {
    async getPapers() {
      return sortByUpdated(loadDB().papers)
    },
    async addPaper(paper) {
      const db = loadDB()
      const id = nextId(db, 'papers')
      const created = now()
      const item: Paper = {
        id,
        title: paper.title || '未命名论文',
        authors: paper.authors ?? null,
        year: paper.year ?? null,
        doi: paper.doi ?? null,
        journal: paper.journal ?? null,
        tags: paper.tags ?? null,
        pdf_path: paper.pdf_path ?? null,
        research_question: paper.research_question ?? null,
        method: paper.method ?? null,
        data_source: paper.data_source ?? null,
        conclusion: paper.conclusion ?? null,
        limitations: paper.limitations ?? null,
        reusable_points: paper.reusable_points ?? null,
        summary: paper.summary ?? null,
        read_duration_seconds: 0,
        read_count: 0,
        last_read_at: null,
        xp_earned: 5,
        created_at: created,
        updated_at: created,
      }
      db.papers.push(item)
      addXP(db, 5, { literature: 1 })
      saveDB(db)
      return id
    },
    async updatePaper(id, patch) {
      const db = loadDB()
      const paper = db.papers.find((item) => item.id === id)
      if (!paper) return { changes: 0 }
      const summaryWasEmpty = !paper.summary?.trim()
      const pointsWereEmpty = !paper.reusable_points?.trim()
      Object.assign(paper, patch, { updated_at: now() })
      let gained = 0
      if (summaryWasEmpty && paper.summary?.trim()) gained += 25
      if (pointsWereEmpty && paper.reusable_points?.trim()) gained += 15
      if (gained > 0) {
        paper.xp_earned += gained
        addXP(db, gained, { literature: 2, writing: 1 })
      }
      saveDB(db)
      return { changes: 1 }
    },
    async getPaper(id) {
      return loadDB().papers.find((paper) => paper.id === id) ?? null
    },
    async updatePaperReadTime(id, seconds) {
      const db = loadDB()
      const paper = db.papers.find((item) => item.id === id)
      if (!paper || seconds <= 0) return
      const before = paper.read_duration_seconds
      const wasReadToday = paper.last_read_at?.slice(0, 10) === today()
      paper.read_duration_seconds += seconds
      paper.last_read_at = now()
      paper.updated_at = now()
      if (!wasReadToday) {
        paper.read_count += 1
        ensureDailyLog(db).papers_read += 1
      }
      if (before < 1800 && paper.read_duration_seconds >= 1800) {
        paper.xp_earned += 20
        addXP(db, 20, { literature: 2 })
      }
      saveDB(db)
    },
    async getExperiments() {
      return sortByUpdated(loadDB().experiments)
    },
    async addExperiment(exp) {
      const db = loadDB()
      const id = nextId(db, 'experiments')
      const created = now()
      db.experiments.push({
        id,
        title: exp.title || '未命名实验',
        purpose: exp.purpose ?? null,
        hypothesis: exp.hypothesis ?? null,
        parameters: exp.parameters ?? null,
        environment: exp.environment ?? null,
        result: exp.result ?? null,
        screenshot_path: exp.screenshot_path ?? null,
        failure_reason: exp.failure_reason ?? null,
        next_step: exp.next_step ?? null,
        paper_id: exp.paper_id ?? null,
        status: exp.status ?? 'pending',
        xp_earned: 10,
        created_at: created,
        updated_at: created,
      })
      ensureDailyLog(db).experiments_done += 1
      addXP(db, 10, { experiment: 1 })
      saveDB(db)
      return id
    },
    async addRecord(record) {
      const db = loadDB()
      const id = nextId(db, 'records')
      const xp = record.xp_earned ?? 5
      db.records.push({
        id,
        type: record.type ?? 'inspiration',
        title: record.title || '未命名记录',
        content: record.content ?? null,
        tags: record.tags ?? null,
        related_paper_id: record.related_paper_id ?? null,
        xp_earned: xp,
        skill_points: record.skill_points ?? '{}',
        created_at: now(),
      })
      addXP(db, xp, inferSkillsForRecord(record.type))
      saveDB(db)
      return { lastInsertRowid: id }
    },
    async getRecords(type) {
      const records = loadDB().records
      return records.filter((record) => !type || record.type === type).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },
    async addMeeting(meeting) {
      const db = loadDB()
      const id = nextId(db, 'meetings')
      db.meetings.push({
        id,
        title: meeting.title || '未命名组会',
        questions: meeting.questions ?? null,
        advisor_feedback: meeting.advisor_feedback ?? null,
        decisions: meeting.decisions ?? null,
        follow_up_tasks: meeting.follow_up_tasks ?? null,
        participants: meeting.participants ?? null,
        xp_earned: 120,
        created_at: now(),
      })
      addXP(db, 120, { presentation: 3, writing: 1 })
      saveDB(db)
      return id
    },
    async getMeetings() {
      return [...loadDB().meetings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },
    async getUserStats() {
      return loadDB().stats
    },
    async updateStreak() {
      const db = loadDB()
      const date = today()
      if (db.stats.last_active_date === date) return
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      db.stats.current_streak = db.stats.last_active_date === yesterday ? db.stats.current_streak + 1 : 1
      db.stats.longest_streak = Math.max(db.stats.longest_streak, db.stats.current_streak)
      db.stats.last_active_date = date
      db.stats.updated_at = now()
      if (db.stats.current_streak === 7) addXP(db, 50, {})
      saveDB(db)
    },
    async logDailyActivity() {
      const db = loadDB()
      ensureDailyLog(db)
      saveDB(db)
    },
    async getDailyLogs(days) {
      return [...loadDB().dailyLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, days || 30)
    },
    async getTechTree() {
      return [...loadDB().techTree].sort((a, b) => a.category.localeCompare(b.category) || a.level - b.level)
    },
    async addTechTreeNode(node) {
      const db = loadDB()
      const id = nextId(db, 'techTree')
      db.techTree.push({
        id,
        parent_id: node.parent_id ?? null,
        name: node.name || '未命名方向',
        category: node.category || '研究方向',
        level: node.level ?? 1,
        progress: node.progress ?? 0,
        description: node.description ?? null,
      })
      saveDB(db)
      return { lastInsertRowid: id }
    },
    openPDFDialog: pickPDF,
    async copyPDF(sourcePath) {
      return sourcePath
    },
    async readPDF(filePath) {
      return loadDB().pdfs[filePath]?.base64 ?? null
    },
    async extractPDFMetadata(filePath) {
      const item = loadDB().pdfs[filePath]
      const fileName = item?.fileName ?? filePath.split(':').pop() ?? 'paper.pdf'
      const title = fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
      return { fileName, title, authors: '', year: null, doi: '', journal: '', tags: '', abstract: '', firstPageText: '', pageCount: 0 } satisfies PDFMetadata
    },
    async exportMarkdown(content) {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `research-export-${Date.now()}.md`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return link.download
    },
    onXPGained(callback) {
      listeners.add(callback)
    },
    removeXPGainedListener() {
      listeners.clear()
    },
    async minimizeWindow() {},
    async maximizeWindow() {},
    async closeWindow() {},
  }

  window.electronAPI = api
}
