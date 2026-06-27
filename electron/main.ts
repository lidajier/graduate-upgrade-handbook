import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'

let mainWindow: BrowserWindow | null = null
let db: SqlJsDatabase | null = null

const isDev = !app.isPackaged
const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'graduate-upgrade-handbook.db')

interface PDFMetadataResult {
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

interface PDFTextLine {
  text: string
  x: number
  y: number
  size: number
  page: number
}

interface PDFTitleGuess {
  title: string
  lineIndex: number
}

function cleanPDFText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').replace(/[\u0000-\u001f]+/g, '').trim()
}

function normalizePDFTitle(title: string): string {
  return title
    .replace(/\.pdf$/i, '')
    .replace(/^Microsoft Word - /i, '')
    .replace(/^arXiv:\s*/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeForCompare(text: string): string {
  return cleanPDFText(text).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '')
}

function hasUsefulTitle(text: string): boolean {
  const title = normalizePDFTitle(text)
  if (title.length < 8) return false
  if (/^(untitled|title|paper|main|article|document|microsoft word)$/i.test(title)) return false
  if (/^\d+$/.test(title)) return false
  return true
}

function extractYearFromText(text: string): number | null {
  const currentYear = new Date().getFullYear()
  const matches = text.match(/\b(19\d{2}|20\d{2})\b/g) || []
  for (const item of matches) {
    const year = Number(item)
    if (year >= 1980 && year <= currentYear + 1) return year
  }
  return null
}

function extractYearFromPDFDate(value: unknown): number | null {
  const text = cleanPDFText(value)
  const match = text.match(/D:(\d{4})/) || text.match(/\b(19\d{2}|20\d{2})\b/)
  return match ? Number(match[1]) : null
}

function extractDOI(text: string): string {
  const match = text.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i)
  return match ? match[0].replace(/[.,;)]$/, '') : ''
}

function shouldIgnoreTitleLine(text: string): boolean {
  const line = cleanPDFText(text)
  return /^(abstract|keywords?|index terms|introduction|references|acknowledg(e)?ment)$/i.test(line)
    || /^(ieee|acm|springer|elsevier|arxiv|preprint|proceedings|journal|transactions)\b/i.test(line)
    || /(copyright|vol\.|volume|no\.|issn|isbn|doi:|http|www\.|@)/i.test(line)
}

function isLikelyAffiliation(text: string): boolean {
  return /(university|institute|school|college|department|laborator|academy|center|centre|hospital|company|inc\.|ltd\.|email|@|http|www\.|corresponding author)/i.test(text)
}

function buildLinesFromTextContent(content: any, page: number): PDFTextLine[] {
  const raw = (content.items || [])
    .map((item: any) => {
      const text = cleanPDFText(item?.str)
      const transform = item?.transform || []
      const x = Number(transform[4] ?? 0)
      const y = Number(transform[5] ?? 0)
      const size = Math.abs(Number(transform[3] ?? transform[0] ?? item?.height ?? 0)) || Number(item?.height ?? 0) || 0
      return { text, x, y, size }
    })
    .filter((item: any) => item.text)

  raw.sort((a: any, b: any) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x)

  const grouped: Array<{ y: number; size: number; items: any[] }> = []
  for (const item of raw) {
    const current = grouped[grouped.length - 1]
    const tolerance = Math.max(2.5, item.size * 0.35)
    if (current && Math.abs(current.y - item.y) <= tolerance) {
      current.items.push(item)
      current.y = (current.y + item.y) / 2
      current.size = Math.max(current.size, item.size)
    } else {
      grouped.push({ y: item.y, size: item.size, items: [item] })
    }
  }

  return grouped.map((line) => {
    const items = line.items.sort((a, b) => a.x - b.x)
    const text = cleanPDFText(items.map((item) => item.text).join(' '))
    return {
      text,
      x: Math.min(...items.map((item) => item.x)),
      y: line.y,
      size: line.size,
      page,
    }
  }).filter((line) => line.text)
}

function scoreTitleLine(line: PDFTextLine, maxSize: number, index: number): number {
  const text = normalizePDFTitle(line.text)
  let score = 0
  score += line.size / Math.max(maxSize, 1) * 60
  score += Math.max(0, 30 - index)
  score += Math.min(text.length, 120) / 6
  if (text.length < 12 || text.length > 220) score -= 60
  if (shouldIgnoreTitleLine(text)) score -= 120
  if (isLikelyAffiliation(text)) score -= 80
  if (/^[A-Z\s:.-]{5,40}$/.test(text) && text.split(/\s+/).length <= 4) score -= 20
  return score
}

function inferTitleFromLines(lines: PDFTextLine[], fileName: string): PDFTitleGuess {
  const firstPage = lines.filter((line) => line.page === 1).slice(0, 40)
  const maxSize = Math.max(...firstPage.map((line) => line.size), 1)
  const scored = firstPage
    .map((line, index) => ({ line, index, score: scoreTitleLine(line, maxSize, index) }))
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (best && best.score > 25) {
    const parts = [normalizePDFTitle(best.line.text)]
    for (let i = best.index + 1; i < Math.min(firstPage.length, best.index + 3); i += 1) {
      const next = firstPage[i]
      const nextText = normalizePDFTitle(next.text)
      if (next.size >= best.line.size * 0.75 && nextText.length >= 8 && !shouldIgnoreTitleLine(nextText) && !isLikelyAffiliation(nextText)) {
        parts.push(nextText)
      } else {
        break
      }
    }
    return { title: cleanPDFText(parts.join(" ")), lineIndex: best.index }
  }

  return { title: '', lineIndex: -1 }
}

function inferAuthorsFromLines(lines: PDFTextLine[], titleGuess: PDFTitleGuess): string {
  if (titleGuess.lineIndex < 0) return ""
  const firstPage = lines.filter((line) => line.page === 1)
  const candidates: string[] = []
  for (let i = titleGuess.lineIndex + 1; i < Math.min(firstPage.length, titleGuess.lineIndex + 8); i += 1) {
    const text = cleanPDFText(firstPage[i].text)
    if (!text) continue
    if (/^(abstract|keywords?|index terms|introduction)\b/i.test(text)) break
    if (shouldIgnoreTitleLine(text) || isLikelyAffiliation(text)) continue
    if (/\b(19\d{2}|20\d{2})\b/.test(text) && text.length < 30) continue
    if (text.length < 4 || text.length > 180) continue
    if (/[,;]|\band\b|[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text)) candidates.push(text)
    if (candidates.length >= 2) break
  }
  return cleanPDFText(candidates.join("; "))
}

function extractAbstract(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const match = normalized.match(/\bAbstract\b[\s:：.-]*([\s\S]{60,2200}?)(?=\b(?:Keywords?|Key words|Index Terms|Introduction|1\.?\s+Introduction)\b)/i)
  if (match?.[1]) return cleanPDFText(match[1]).slice(0, 1800)
  return ''
}

function extractKeywordsFromText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const match = normalized.match(/\b(?:Keywords?|Key words|Index Terms)\b[\s:：.-]*([\s\S]{5,500}?)(?=\b(?:Introduction|1\.?\s+Introduction|Abstract)\b|$)/i)
  if (!match?.[1]) return ''
  return cleanPDFText(match[1]).replace(/[;；]/g, ',').replace(/\.$/, '').slice(0, 300)
}

function extractFrontMatterLines(lines: PDFTextLine[]): PDFTextLine[] {
  const firstPage = lines.filter((line) => line.page === 1)
  const result: PDFTextLine[] = []
  for (const line of firstPage.slice(0, 90)) {
    const text = cleanPDFText(line.text)
    if (!text) continue
    if (/^references?$/i.test(text)) break
    result.push(line)
    if (/^(1\.?\s+)?introduction\b/i.test(text) && result.length > 8) break
  }
  return result.length > 0 ? result : firstPage.slice(0, 25)
}

function extractDOIFromFrontMatter(lines: PDFTextLine[]): string {
  for (const line of lines) {
    const text = cleanPDFText(line.text)
    if (!/doi|doi\.org/i.test(text)) continue
    const doi = extractDOI(text)
    if (doi) return doi
  }
  return ''
}

function extractYearFromFrontMatter(lines: PDFTextLine[], journal: string): number | null {
  const safeLines = lines.filter((line) => !/\bet\s+al\.|\[[0-9,\s-]+\]|references?/i.test(line.text))
  const priorityText = safeLines
    .slice(0, 20)
    .map((line) => line.text)
    .concat(journal ? [journal] : [])
    .join(' ')
  return extractYearFromText(priorityText)
}
function extractJournalFromText(text: string, subject: string): string {
  if (subject) return subject
  const match = text.match(/\b(?:IEEE|ACM|CVPR|ICCV|ECCV|NeurIPS|AAAI|IJCAI|MICCAI|ICASSP|Proceedings|Journal|Transactions|Conference)[^\n]{0,120}/i)
  return match ? cleanPDFText(match[0]) : ''
}

function decodePDFHexString(hex: string): string {
  const clean = hex.replace(/\s+/g, '')
  if (!clean) return ''
  const bytes: number[] = []
  for (let i = 0; i < clean.length - 1; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16))
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = ''
    for (let i = 2; i < bytes.length - 1; i += 2) {
      out += String.fromCharCode((bytes[i] << 8) + bytes[i + 1])
    }
    return cleanPDFText(out)
  }
  return cleanPDFText(Buffer.from(bytes).toString('utf8'))
}

function decodePDFLiteralString(value: string): string {
  return cleanPDFText(value
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\([()\\])/g, '$1'))
}

function extractRawPDFField(raw: string, key: string): string {
  const literal = new RegExp('/' + key + '\\s*\\(([^\\)]{0,1200})\\)', 'i').exec(raw)
  if (literal?.[1]) return decodePDFLiteralString(literal[1])
  const hex = new RegExp('/' + key + '\\s*<([0-9A-Fa-f\\s]{4,2400})>', 'i').exec(raw)
  if (hex?.[1]) return decodePDFHexString(hex[1])
  return ''
}

function extractRawPDFMetadata(filePath: string, base: PDFMetadataResult): PDFMetadataResult {
  try {
    const raw = fs.readFileSync(filePath).toString('latin1')
    const title = normalizePDFTitle(extractRawPDFField(raw, 'Title'))
    const authors = extractRawPDFField(raw, 'Author') || extractRawPDFField(raw, 'Creator')
    const journal = extractRawPDFField(raw, 'Subject')
    const tags = extractRawPDFField(raw, 'Keywords')
    const date = extractRawPDFField(raw, 'CreationDate') || extractRawPDFField(raw, 'ModDate')
    return {
      ...base,
      title: hasUsefulTitle(title) ? title : base.title,
      authors: authors || base.authors,
      year: base.year,
      doi: base.doi,
      journal: journal || base.journal,
      tags: tags || base.tags,
    }
  } catch {
    return base
  }
}
async function extractPDFMetadata(filePath: string): Promise<PDFMetadataResult> {
  const fileName = path.basename(filePath)
  const fallback: PDFMetadataResult = {
    fileName,
    title: '',
    authors: '',
    year: null,
    doi: '',
    journal: '',
    tags: '',
    abstract: '',
    firstPageText: '',
    pageCount: 0,
  }
  const rawFallback = extractRawPDFMetadata(filePath, fallback)

  try {
    const buffer = fs.readFileSync(filePath)
    const data = new Uint8Array(buffer)
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any
    const workerCandidates = [
      path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs'),
      path.join(app.getAppPath(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs'),
      path.join(__dirname, 'pdf.worker.mjs'),
    ]
    const workerPath = workerCandidates.find((candidate) => fs.existsSync(candidate))
    if (workerPath && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'file:///' + workerPath.replace(/\\/g, '/')
    }

    const loadingTask = pdfjsLib.getDocument({
      data,
      disableWorker: true,
      disableFontFace: true,
      isEvalSupported: false,
      useSystemFonts: true,
    })
    const doc = await loadingTask.promise
    const metadata = await doc.getMetadata().catch(() => null)
    const info = (metadata?.info || {}) as Record<string, unknown>

    const pageLines: PDFTextLine[] = []
    const maxPages = Math.min(doc.numPages, 3)
    for (let i = 1; i <= maxPages; i += 1) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      pageLines.push(...buildLinesFromTextContent(content, i))
    }

    const firstPageText = cleanPDFText(pageLines.map((line) => line.text).join(" ")).slice(0, 9000)
    const frontMatterLines = extractFrontMatterLines(pageLines)
    const subject = cleanPDFText(info.Subject)
    const keywordInfo = cleanPDFText(info.Keywords)
    const allText = firstPageText + ' ' + subject + ' ' + keywordInfo

    const titleFromInfo = normalizePDFTitle(cleanPDFText(info.Title))
    const inferredTitle = inferTitleFromLines(frontMatterLines, fileName)
    const titleGuess = hasUsefulTitle(titleFromInfo)
      ? { title: titleFromInfo, lineIndex: inferredTitle.lineIndex }
      : inferredTitle

    const authorFromInfo = cleanPDFText(info.Author)
    const authors = authorFromInfo && !/^anonymous$/i.test(authorFromInfo)
      ? authorFromInfo
      : inferAuthorsFromLines(frontMatterLines, titleGuess)

    const result: PDFMetadataResult = {
      fileName,
      title: hasUsefulTitle(titleGuess.title) ? titleGuess.title : rawFallback.title,
      authors: authors || rawFallback.authors,
      year: extractYearFromFrontMatter(frontMatterLines, subject) || rawFallback.year,
      doi: extractDOIFromFrontMatter(frontMatterLines) || rawFallback.doi,
      journal: extractJournalFromText(firstPageText, subject) || rawFallback.journal,
      tags: keywordInfo || extractKeywordsFromText(firstPageText) || rawFallback.tags,
      abstract: extractAbstract(firstPageText),
      firstPageText,
      pageCount: doc.numPages,
    }

    await doc.destroy?.()
    return result
  } catch (e) {
    console.error('PDF metadata extraction failed:', e)
    return rawFallback
  }
}
// ============ 数据库持久化 ============
function saveDatabase() {
  if (!db) return
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('Failed to save database:', e)
  }
}

// 自动保存
let autoSaveInterval: NodeJS.Timeout | null = null
function startAutoSave() {
  autoSaveInterval = setInterval(saveDatabase, 30000) // 每30秒保存
}
function stopAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval)
}

// ============ 数据库初始化 ============
async function initDatabase() {
  const SQL = await initSqlJs()
  
  // 尝试从文件加载
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
      console.log('Database loaded from:', dbPath)
    } catch (e) {
      console.error('Failed to load database, creating new:', e)
      db = new SQL.Database()
    }
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      authors TEXT,
      year INTEGER,
      doi TEXT,
      journal TEXT,
      tags TEXT,
      pdf_path TEXT,
      research_question TEXT,
      method TEXT,
      data_source TEXT,
      conclusion TEXT,
      limitations TEXT,
      reusable_points TEXT,
      summary TEXT,
      read_duration_seconds INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      last_read_at TEXT,
      xp_earned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      purpose TEXT,
      hypothesis TEXT,
      parameters TEXT,
      environment TEXT,
      result TEXT,
      screenshot_path TEXT,
      failure_reason TEXT,
      next_step TEXT,
      paper_id INTEGER,
      status TEXT DEFAULT 'pending',
      xp_earned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paper_id) REFERENCES papers(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('paper','experiment','writing','code','meeting','inspiration')),
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      related_paper_id INTEGER,
      xp_earned INTEGER DEFAULT 0,
      skill_points TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (related_paper_id) REFERENCES papers(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      questions TEXT,
      advisor_feedback TEXT,
      decisions TEXT,
      follow_up_tasks TEXT,
      participants TEXT,
      xp_earned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      level INTEGER DEFAULT 1,
      total_xp INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      skill_literature INTEGER DEFAULT 0,
      skill_experiment INTEGER DEFAULT 0,
      skill_coding INTEGER DEFAULT 0,
      skill_writing INTEGER DEFAULT 0,
      skill_presentation INTEGER DEFAULT 0,
      skill_data INTEGER DEFAULT 0,
      achievements TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run('INSERT OR IGNORE INTO user_stats (id) VALUES (1)')

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      papers_read INTEGER DEFAULT 0,
      experiments_done INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      summary TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS tech_tree (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      progress REAL DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (parent_id) REFERENCES tech_tree(id)
    )
  `)

  saveDatabase()
  startAutoSave()
  console.log('Database initialized at:', dbPath)
}

// Helper: 将查询结果转为对象数组
function queryAll(sql: string, params?: any[]): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare(sql)
    if (params) stmt.bind(params)
    const rows: any[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  } catch (e) {
    console.error('Query error:', sql, e)
    return []
  }
}

function queryOne(sql: string, params?: any[]): any | null {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

function runSQL(sql: string, params?: any[]): number {
  if (!db) return 0
  try {
    db.run(sql, params)
    const result = queryOne('SELECT last_insert_rowid() as id')
    saveDatabase()
    return result?.id || 0
  } catch (e) {
    console.error('Run error:', sql, e)
    return 0
  }
}

// ============ 经验系统 ============
function addXP(amount: number, skills: Record<string, number>) {
  const stats = queryOne('SELECT * FROM user_stats WHERE id = 1')
  if (!stats) return

  const newXP = stats.total_xp + amount
  const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1

  const updates: string[] = []
  if (skills.literature) updates.push(`skill_literature = skill_literature + ${skills.literature}`)
  if (skills.experiment) updates.push(`skill_experiment = skill_experiment + ${skills.experiment}`)
  if (skills.coding) updates.push(`skill_coding = skill_coding + ${skills.coding}`)
  if (skills.writing) updates.push(`skill_writing = skill_writing + ${skills.writing}`)
  if (skills.presentation) updates.push(`skill_presentation = skill_presentation + ${skills.presentation}`)
  if (skills.data) updates.push(`skill_data = skill_data + ${skills.data}`)
  const setClauses = updates.length > 0 ? ', ' + updates.join(', ') : ''

  runSQL(`UPDATE user_stats SET total_xp = ${newXP}, level = ${newLevel},
    updated_at = datetime('now','localtime') ${setClauses} WHERE id = 1`)

  const today = new Date().toISOString().split('T')[0]
  runSQL('UPDATE daily_log SET xp_earned = xp_earned + ? WHERE date = ?', [amount, today])

  if (mainWindow) {
    mainWindow.webContents.send('xp:gained', { amount, newLevel, newXP })
  }
}

// ============ IPC Handlers ============
function setupIPC() {
  // 论文
  ipcMain.handle('db:getPapers', () => {
    return queryAll('SELECT * FROM papers ORDER BY updated_at DESC')
  })

  ipcMain.handle('db:addPaper', (_event, paper) => {
    const id = runSQL(`
      INSERT INTO papers (title, authors, year, doi, journal, tags, pdf_path,
        research_question, method, data_source, conclusion, limitations, reusable_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [paper.title, paper.authors, paper.year, paper.doi, paper.journal, paper.tags, paper.pdf_path,
      paper.research_question, paper.method, paper.data_source, paper.conclusion, paper.limitations, paper.reusable_points])
    addXP(5, { literature: 1 })
    return id
  })

  ipcMain.handle('db:updatePaper', (_event, id, paper) => {
    const current = queryOne('SELECT * FROM papers WHERE id = ?', [id])
    if (!current) return { success: false, error: 'Paper not found' }
    const merged = { ...current, ...paper }

    runSQL(`
      UPDATE papers SET title=?, authors=?, year=?, doi=?,
        journal=?, tags=?, pdf_path=?, research_question=?,
        method=?, data_source=?, conclusion=?,
        limitations=?, reusable_points=?, summary=?,
        updated_at=datetime('now','localtime')
      WHERE id=?
    `, [merged.title, merged.authors, merged.year, merged.doi,
      merged.journal, merged.tags, merged.pdf_path, merged.research_question,
      merged.method, merged.data_source, merged.conclusion,
      merged.limitations, merged.reusable_points, merged.summary, id])
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('db:getPaper', (_event, id) => {
    return queryOne('SELECT * FROM papers WHERE id = ?', [id])
  })

  ipcMain.handle('db:updatePaperReadTime', (_event, id, seconds) => {
    runSQL(`
      UPDATE papers SET read_duration_seconds = read_duration_seconds + ?,
      read_count = read_count + 1, last_read_at = datetime('now','localtime'),
      updated_at = datetime('now','localtime')
      WHERE id = ?
    `, [seconds, id])
  })

  // 实验
  ipcMain.handle('db:getExperiments', () => {
    return queryAll('SELECT * FROM experiments ORDER BY updated_at DESC')
  })

  ipcMain.handle('db:addExperiment', (_event, experiment) => {
    const id = runSQL(`
      INSERT INTO experiments (title, purpose, hypothesis, parameters, environment,
        result, screenshot_path, failure_reason, next_step, paper_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [experiment.title, experiment.purpose, experiment.hypothesis, experiment.parameters,
      experiment.environment, experiment.result, experiment.screenshot_path,
      experiment.failure_reason, experiment.next_step, experiment.paper_id, experiment.status])
    addXP(10, { experiment: 1 })
    return id
  })

  ipcMain.handle('db:updateExperiment', (_event, id, experiment) => {
    runSQL(`
      UPDATE experiments SET title=?, purpose=?, hypothesis=?, parameters=?,
      environment=?, result=?, failure_reason=?, next_step=?, status=?,
      updated_at=datetime('now','localtime')
      WHERE id=?
    `, [experiment.title, experiment.purpose, experiment.hypothesis, experiment.parameters,
      experiment.environment, experiment.result, experiment.failure_reason,
      experiment.next_step, experiment.status, id])
    saveDatabase()
    return { success: true }
  })

  // 通用记录
  ipcMain.handle('db:addRecord', (_event, record) => {
    const id = runSQL(`
      INSERT INTO records (type, title, content, tags, related_paper_id, xp_earned, skill_points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [record.type, record.title, record.content, record.tags,
      record.related_paper_id, record.xp_earned || 0, record.skill_points || '{}'])
    // 根据类型给经验
    const xpMap: Record<string, { xp: number; skills: Record<string, number> }> = {
      writing: { xp: 15, skills: { writing: 1 } },
      code: { xp: 15, skills: { coding: 1 } },
      inspiration: { xp: 5, skills: {} },
    }
    const rule = xpMap[record.type]
    if (rule) addXP(rule.xp, rule.skills)
    return id
  })

  ipcMain.handle('db:getRecords', (_event, type) => {
    if (type) {
      return queryAll('SELECT * FROM records WHERE type = ? ORDER BY created_at DESC', [type])
    }
    return queryAll('SELECT * FROM records ORDER BY created_at DESC')
  })

  // 组会
  ipcMain.handle('db:addMeeting', (_event, meeting) => {
    const id = runSQL(`
      INSERT INTO meetings (title, questions, advisor_feedback, decisions, follow_up_tasks, participants)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [meeting.title, meeting.questions, meeting.advisor_feedback,
      meeting.decisions, meeting.follow_up_tasks, meeting.participants])
    addXP(120, { presentation: 3 })
    return id
  })

  ipcMain.handle('db:getMeetings', () => {
    return queryAll('SELECT * FROM meetings ORDER BY created_at DESC')
  })

  // 用户状态
  ipcMain.handle('db:getUserStats', () => {
    return queryOne('SELECT * FROM user_stats WHERE id = 1')
  })

  ipcMain.handle('db:updateStreak', () => {
    const today = new Date().toISOString().split('T')[0]
    const stats = queryOne('SELECT * FROM user_stats WHERE id = 1')
    if (!stats) return

    const lastDate = stats.last_active_date
    if (lastDate === today) return

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    let streak = stats.current_streak

    if (lastDate === yesterday) {
      streak += 1
    } else {
      streak = 1
    }

    const longest = Math.max(streak, stats.longest_streak || 0)

    runSQL(`
      UPDATE user_stats SET current_streak = ?, longest_streak = ?,
      last_active_date = ?, updated_at = datetime('now','localtime')
      WHERE id = 1
    `, [streak, longest, today])

    if (streak === 7) {
      addXP(50, {})
    }
  })

  // 每日日志
  ipcMain.handle('db:logDailyActivity', () => {
    const today = new Date().toISOString().split('T')[0]
    runSQL(`
      INSERT INTO daily_log (date, papers_read, experiments_done, xp_earned)
      VALUES (?, 0, 0, 0)
      ON CONFLICT(date) DO NOTHING
    `, [today])
  })

  ipcMain.handle('db:getDailyLogs', (_event, days) => {
    return queryAll('SELECT * FROM daily_log ORDER BY date DESC LIMIT ?', [days || 30])
  })

  // 科技树
  ipcMain.handle('db:getTechTree', () => {
    return queryAll('SELECT * FROM tech_tree ORDER BY category, level')
  })

  ipcMain.handle('db:addTechTreeNode', (_event, node) => {
    const id = runSQL(`
      INSERT INTO tech_tree (parent_id, name, category, level, description)
      VALUES (?, ?, ?, ?, ?)
    `, [node.parent_id, node.name, node.category, node.level || 0, node.description])
    return id
  })

  // 文件操作
  ipcMain.handle('dialog:openPDF', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '导入PDF论文',
      filters: [{ name: 'PDF文件', extensions: ['pdf'] }],
      properties: ['openFile']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('file:copyPDF', async (_event, sourcePath) => {
    const pdfDir = path.join(userDataPath, 'pdfs')
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })
    const fileName = path.basename(sourcePath)
    const destPath = path.join(pdfDir, `${Date.now()}_${fileName}`)
    fs.copyFileSync(sourcePath, destPath)
    return destPath
  })

  ipcMain.handle('file:readPDF', async (_event, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath)
      return buffer.toString('base64')
    } catch (e) {
      return null
    }
  })

  ipcMain.handle('file:extractPDFMetadata', async (_event, filePath) => {
    return extractPDFMetadata(filePath)
  })

  // 导出
  ipcMain.handle('dialog:exportMarkdown', async (_event, content) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出Markdown',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: `academic-export-${Date.now()}.md`
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  })

  // 窗口控制
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })
}

// ============ 窗口创建 ============
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: '研究生升级宝典',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    backgroundColor: '#030712',
    show: false,
    frame: false,
    titleBarStyle: 'hidden'
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ============ 应用生命周期 ============
app.whenReady().then(async () => {
  await initDatabase()
  setupIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopAutoSave()
  saveDatabase()
  if (db) db.close()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopAutoSave()
  saveDatabase()
})
