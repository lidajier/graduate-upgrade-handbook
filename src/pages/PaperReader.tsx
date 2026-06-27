import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ArrowLeft, Clock, FileText, Upload, Languages, Save, CheckCircle } from 'lucide-react'

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PaperReader() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const paperId = Number(id)

  const {
    papers,
    setPapers,
    startReading,
    stopReading,
    openSummaryModal,
  } = useStore()

  const paper = papers.find((p) => p.id === paperId)

  // ── PDF state ──────────────────────────────────────────────
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  // ── Timer state ────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cleanedUpRef = useRef(false)

  // ── Translation panel state ────────────────────────────────
  const [translationInput, setTranslationInput] = useState('')
  const [translationResult, setTranslationResult] = useState('')
  const [translating, setTranslating] = useState(false)
  const [showTranslationPanel, setShowTranslationPanel] = useState(false)

  // ── Metadata form state ────────────────────────────────────
  const [researchQuestion, setResearchQuestion] = useState('')
  const [method, setMethod] = useState('')
  const [dataSource, setDataSource] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [limitations, setLimitations] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const formInitializedRef = useRef(false)

  // ── Initialize form from paper ─────────────────────────────
  useEffect(() => {
    if (paper && !formInitializedRef.current) {
      setResearchQuestion(paper.research_question || '')
      setMethod(paper.method || '')
      setDataSource(paper.data_source || '')
      setConclusion(paper.conclusion || '')
      setLimitations(paper.limitations || '')
      formInitializedRef.current = true
    }
  }, [paper])

  // ── Load PDF & start reading timer ─────────────────────────
  useEffect(() => {
    if (!paper) return

    if (paper.pdf_path) {
      loadPDF(paper.pdf_path)
    }

    // Start the store-level reading timer (saves every 30s)
    startReading(paperId)

    // Start the display timer (updates every 1s)
    displayTimerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => {
      cleanup()
    }
  }, [paperId])

  // ── Cleanup on unmount ─────────────────────────────────────
  const cleanup = useCallback(() => {
    if (cleanedUpRef.current) return
    cleanedUpRef.current = true

    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current)
      displayTimerRef.current = null
    }

    // Save remaining unsaved reading time
    const totalElapsed = stopReading()
    if (totalElapsed > 0) {
      const savedBlocks = Math.floor(totalElapsed / 30)
      const remaining = totalElapsed - savedBlocks * 30
      if (remaining > 0) {
        window.electronAPI.updatePaperReadTime(paperId, remaining).catch(() => {})
      }
    }

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }
  }, [paperId, pdfUrl, stopReading])

  // ── Load PDF as base64 → blob URL ──────────────────────────
  const loadPDF = async (pdfPath: string) => {
    setPdfLoading(true)
    setPdfError(null)
    try {
      const base64 = await window.electronAPI.readPDF(pdfPath)
      if (!base64) {
        setPdfError('无法读取 PDF 文件')
        setPdfLoading(false)
        return
      }

      // Convert base64 to Uint8Array in chunks for performance
      const binaryString = atob(base64)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      // Revoke old URL if exists
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)

      setPdfUrl(url)
    } catch (e) {
      console.error('PDF load error:', e)
      setPdfError('PDF 加载失败，请检查文件路径')
    }
    setPdfLoading(false)
  }

  // ── Import PDF ─────────────────────────────────────────────
  const handleImportPDF = async () => {
    setImporting(true)
    try {
      const filePath = await window.electronAPI.openPDFDialog()
      if (!filePath) {
        setImporting(false)
        return
      }

      const savedPath = await window.electronAPI.copyPDF(filePath)
      await window.electronAPI.updatePaper(paperId, { pdf_path: savedPath })

      // Refresh papers in store
      const updatedPapers = await window.electronAPI.getPapers()
      setPapers(updatedPapers)

      // Load the new PDF
      await loadPDF(savedPath)
    } catch (e) {
      console.error('Import PDF error:', e)
    }
    setImporting(false)
  }

  // ── Translation simulation ─────────────────────────────────
  const handleTranslate = async () => {
    if (!translationInput.trim()) return
    setTranslating(true)
    setTranslationResult('')

    // Simulate translation delay
    await new Promise((resolve) => setTimeout(resolve, 1200))

    setTranslationResult(
      '🔍 翻译功能 (需配置API Key)\n\n' +
        '当前为模拟翻译结果。要启用真实翻译功能，请在设置中配置翻译 API Key（如百度翻译、DeepL、OpenAI 等）。\n\n' +
        '原文摘要：\n' +
        translationInput.slice(0, 200) +
        (translationInput.length > 200 ? '...' : '')
    )
    setTranslating(false)
  }

  // ── Save metadata ──────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await window.electronAPI.updatePaper(paperId, {
        research_question: researchQuestion,
        method,
        data_source: dataSource,
        conclusion,
        limitations,
      })

      // Refresh papers
      const updatedPapers = await window.electronAPI.getPapers()
      setPapers(updatedPapers)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Save error:', e)
    }
    setSaving(false)
  }

  // ── Close reading ──────────────────────────────────────────
  const handleCloseReading = async () => {
    // Stop display timer
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current)
      displayTimerRef.current = null
    }

    // Stop reading timer and save remaining time
    const totalElapsed = stopReading()
    if (totalElapsed > 0) {
      const savedBlocks = Math.floor(totalElapsed / 30)
      const remaining = totalElapsed - savedBlocks * 30
      if (remaining > 0) {
        await window.electronAPI.updatePaperReadTime(paperId, remaining)
      }

      // Refresh papers
      const updatedPapers = await window.electronAPI.getPapers()
      setPapers(updatedPapers)
    }

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }

    cleanedUpRef.current = true

    // Open summary modal
    openSummaryModal(paperId)

    // Navigate back
    navigate('/')
  }

  // ── Guard: paper not found ─────────────────────────────────
  if (!paper) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
        <FileText size={48} className="text-gray-600" />
        <p className="text-lg">论文未找到</p>
        <button onClick={() => navigate('/')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} />
          返回首页
        </button>
      </div>
    )
  }

  // ── Parse tags ─────────────────────────────────────────────
  const tags = paper.tags
    ? paper.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
    : []

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* ════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════ */}
      <div className="glass-card">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Back button + title */}
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/')}
                className="btn-ghost p-1.5 flex-shrink-0"
                title="返回"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-white truncate">{paper.title}</h1>
            </div>

            {/* Authors · Year · Journal */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 ml-10">
              {paper.authors && (
                <>
                  <span className="text-gray-300">{paper.authors}</span>
                  <span className="text-gray-600">·</span>
                </>
              )}
              {paper.year && (
                <>
                  <span>{paper.year}</span>
                  <span className="text-gray-600">·</span>
                </>
              )}
              {paper.journal && (
                <span className="italic">{paper.journal}</span>
              )}
              {paper.doi && (
                <span className="text-xs text-gray-500 ml-2 truncate max-w-[200px]">
                  DOI: {paper.doi}
                </span>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-10">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="tag bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reading timer */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0 ml-4">
            <Clock size={18} className="text-amber-400" />
            <span className="text-amber-400 font-mono text-lg font-bold tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT: PDF Viewer + Translation Panel
      ════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* ── LEFT: PDF Viewer ──────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 glass-card flex flex-col overflow-hidden">
            {/* PDF toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <FileText size={16} />
                <span className="truncate max-w-[300px]">
                  {paper.pdf_path
                    ? paper.pdf_path.split(/[/\\]/).pop() || paper.pdf_path
                    : '未导入PDF'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleImportPDF}
                  disabled={importing}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Upload size={14} />
                  {importing ? '导入中...' : paper.pdf_path ? '更换PDF' : '导入PDF'}
                </button>
                <button
                  onClick={() => setShowTranslationPanel((v) => !v)}
                  className={`btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 ${
                    showTranslationPanel ? 'text-indigo-400 bg-indigo-500/10' : ''
                  }`}
                >
                  <Languages size={14} />
                  翻译
                </button>
              </div>
            </div>

            {/* PDF content */}
            <div className="flex-1 relative bg-gray-900/50">
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">加载 PDF...</span>
                  </div>
                </div>
              )}

              {pdfError && !pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <FileText size={48} className="text-red-500/50" />
                    <p className="text-sm text-red-400">{pdfError}</p>
                    <button onClick={handleImportPDF} className="btn-primary text-sm">
                      重新导入
                    </button>
                  </div>
                </div>
              )}

              {!pdfUrl && !pdfLoading && !pdfError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handleImportPDF}
                    disabled={importing}
                    className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-300 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                      <Upload size={28} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-lg font-medium">点击导入PDF</p>
                      <p className="text-gray-500 text-sm mt-1">支持 PDF 格式的论文文件</p>
                    </div>
                  </button>
                </div>
              )}

              {pdfUrl && !pdfLoading && (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                  sandbox="allow-scripts allow-same-origin"
                />
              )}
            </div>
          </div>

          {/* ── Metadata Form (below PDF) ───────────────────── */}
          <div className="glass-card mt-4 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" />
              论文元数据
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">研究问题</label>
                <input
                  type="text"
                  value={researchQuestion}
                  onChange={(e) => setResearchQuestion(e.target.value)}
                  placeholder="这篇文章要解决什么问题？"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">方法</label>
                <input
                  type="text"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="用了什么方法/模型？"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">数据来源</label>
                <input
                  type="text"
                  value={dataSource}
                  onChange={(e) => setDataSource(e.target.value)}
                  placeholder="使用了哪些数据集？"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">结论</label>
                <input
                  type="text"
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="得出了什么结论？"
                  className="input-field text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">局限性</label>
                <input
                  type="text"
                  value={limitations}
                  onChange={(e) => setLimitations(e.target.value)}
                  placeholder="这篇文章有什么局限性？"
                  className="input-field text-sm"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle size={14} />
                    已保存
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} />
                  {saving ? '保存中...' : '保存元数据'}
                </button>
                <button
                  onClick={handleCloseReading}
                  className="btn-secondary flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  结束阅读
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Translation Panel ──────────────────────── */}
        {showTranslationPanel && (
          <div className="w-80 flex-shrink-0 glass-card flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Languages size={16} className="text-purple-400" />
                翻译面板
              </h3>
              <button
                onClick={() => setShowTranslationPanel(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            {/* Input area */}
            <div className="flex-1 flex flex-col space-y-3 min-h-0">
              <textarea
                value={translationInput}
                onChange={(e) => setTranslationInput(e.target.value)}
                placeholder="粘贴需要翻译的英文文本..."
                className="input-field flex-1 min-h-[160px] resize-none text-sm"
              />

              <button
                onClick={handleTranslate}
                disabled={translating || !translationInput.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Languages size={16} />
                {translating ? '翻译中...' : '翻译'}
              </button>

              {/* Result area */}
              {translationResult && (
                <div className="flex-1 min-h-[120px] overflow-y-auto">
                  <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700 text-sm text-gray-300 whitespace-pre-wrap">
                    {translationResult}
                  </div>
                </div>
              )}

              {!translationResult && !translating && (
                <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                  <p className="text-center">
                    翻译结果将显示在此处
                    <br />
                    <span className="text-xs text-gray-700">
                      (需配置翻译 API Key)
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}