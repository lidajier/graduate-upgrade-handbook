import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { RECORD_TYPES, type RecordType, XP_RULES, type PDFMetadata } from '../types'
import { Upload, Save, Sparkles } from 'lucide-react'

/* ---------- helper: XP lookup ---------- */
function getXPForType(type: RecordType): { xp: number; desc: string } {
  const map: Record<RecordType, keyof typeof XP_RULES> = {
    paper: 'add_paper',
    experiment: 'add_experiment',
    writing: 'add_paper',       // 写作记录走通用 addRecord
    code: 'add_code',
    meeting: 'meeting_report',
    inspiration: 'add_inspiration',
  }
  const rule = XP_RULES[map[type]]
  return rule ? { xp: rule.xp, desc: rule.desc } : { xp: 5, desc: '提交记录' }
}

/* ---------- form state shapes ---------- */
interface PaperForm {
  title: string; authors: string; year: string; doi: string; journal: string
  tags: string; pdf_path: string; research_question: string; method: string
  data_source: string; conclusion: string; limitations: string
}
interface ExperimentForm {
  title: string; purpose: string; hypothesis: string; parameters: string
  environment: string; result: string; failure_reason: string; next_step: string
  status: 'pending' | 'running' | 'success' | 'failed'
}
interface SimpleForm {
  title: string; content: string; tags: string
}
interface MeetingForm {
  title: string; questions: string; advisor_feedback: string; decisions: string
  follow_up_tasks: string; participants: string
}

type FormState = PaperForm | ExperimentForm | SimpleForm | MeetingForm

/* ---------- initial values ---------- */
const emptyPaper: PaperForm = {
  title: '', authors: '', year: '', doi: '', journal: '', tags: '', pdf_path: '',
  research_question: '', method: '', data_source: '', conclusion: '', limitations: '',
}
const emptyExperiment: ExperimentForm = {
  title: '', purpose: '', hypothesis: '', parameters: '', environment: '',
  result: '', failure_reason: '', next_step: '', status: 'pending',
}
const emptySimple: SimpleForm = { title: '', content: '', tags: '' }
const emptyMeeting: MeetingForm = {
  title: '', questions: '', advisor_feedback: '', decisions: '',
  follow_up_tasks: '', participants: '',
}

function initForm(type: RecordType): FormState {
  switch (type) {
    case 'paper': return { ...emptyPaper }
    case 'experiment': return { ...emptyExperiment }
    case 'meeting': return { ...emptyMeeting }
    default: return { ...emptySimple }
  }
}

/* ---------- component ---------- */
export default function AddRecord() {
  const navigate = useNavigate()
  const { showXPNotification } = useStore()

  const [activeType, setActiveType] = useState<RecordType>('paper')
  const [form, setForm] = useState<FormState>(emptyPaper)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfParseMessage, setPdfParseMessage] = useState('')

  const xpInfo = getXPForType(activeType)

  /* ---------- field helpers ---------- */
  const get = (key: string): string => {
    const f = form as unknown as { [key: string]: unknown }
    return f[key] as string ?? ''
  }
  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function fillIfEmpty(current: string, next?: string | number | null): string {
    if (next !== null && next !== undefined && String(next).trim()) return String(next).trim()
    return current
  }

  function applyPDFMetadata(pdfPath: string, metadata: PDFMetadata) {
    setForm((prev) => {
      const paper = prev as PaperForm
      return {
        ...prev,
        pdf_path: pdfPath,
        title: fillIfEmpty(paper.title, metadata.title),
        authors: fillIfEmpty(paper.authors, metadata.authors),
        year: fillIfEmpty(paper.year, metadata.year),
        doi: fillIfEmpty(paper.doi, metadata.doi),
        journal: fillIfEmpty(paper.journal, metadata.journal),
        tags: fillIfEmpty(paper.tags, metadata.tags),
      }
    })
  }

  async function handleSelectPDF() {
    if (pdfParsing) return
    setPdfParsing(true)
    setPdfParseMessage('')
    try {
      const sourcePath = await window.electronAPI.openPDFDialog()
      if (!sourcePath) return

      const metadata = await window.electronAPI.extractPDFMetadata(sourcePath)
      const dest = await window.electronAPI.copyPDF(sourcePath)
      applyPDFMetadata(dest, metadata)

      const found: string[] = []
      if (metadata.title) found.push('标题')
      if (metadata.authors) found.push('作者')
      if (metadata.year) found.push('年份')
      if (metadata.doi) found.push('DOI')
      if (metadata.tags) found.push('关键词')
      setPdfParseMessage(
        found.length > 0
          ? '已自动识别：' + found.join('、') + '。请检查后再保存。'
          : 'PDF 已导入，但未识别到足够的元数据，请手动补充。'
      )
    } catch (e) {
      console.error('PDF import failed:', e)
      setPdfParseMessage('PDF 导入或自动识别失败，请重新选择文件。')
    } finally {
      setPdfParsing(false)
    }
  }

  /* ---------- type switch ---------- */
  function switchType(t: RecordType) {
    if (submitting) return
    setActiveType(t)
    setForm(initForm(t))
  }

  /* ---------- generic input/textarea ---------- */
  function Field({ label, field, required, isArea }: {
    label: string; field: string; required?: boolean; isArea?: boolean
  }) {
    const Tag = isArea ? 'textarea' : 'input'
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <Tag
          className="input-field"
          value={get(field)}
          onChange={(e: any) => set(field, e.target.value)}
          rows={isArea ? 4 : undefined}
          placeholder={required ? '必填' : '可选'}
        />
      </div>
    )
  }

  /* ---------- type-specific renderers ---------- */

  function renderPaperForm() {
    const f = form as PaperForm
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="论文标题" field="title" required />
        </div>
        <Field label="作者" field="authors" />
        <Field label="发表年份" field="year" />
        <Field label="DOI" field="doi" />
        <Field label="期刊/会议" field="journal" />
        <Field label="标签 (逗号分隔)" field="tags" />

        {/* PDF upload */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
            PDF 文件
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-secondary flex items-center gap-2 text-sm"
              onClick={handleSelectPDF}
              disabled={pdfParsing}
            >
              <Upload className="w-4 h-4" />
              选择 PDF
            </button>
            {f.pdf_path && (
              <span className="text-xs text-green-400 truncate max-w-[240px]" title={f.pdf_path}>
                {f.pdf_path.split(/[\\/]/).pop()}
              </span>
            )}
          </div>
          {pdfParseMessage && (
            <p className="mt-2 text-xs text-amber-300/90">
              {pdfParseMessage}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Field label="研究问题" field="research_question" isArea />
        </div>
        <Field label="研究方法" field="method" />
        <Field label="数据来源" field="data_source" />
        <div className="md:col-span-2">
          <Field label="结论" field="conclusion" isArea />
        </div>
        <div className="md:col-span-2">
          <Field label="局限性" field="limitations" isArea />
        </div>
      </div>
    )
  }

  function renderExperimentForm() {
    const f = form as ExperimentForm
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="实验标题" field="title" required />
        </div>
        <Field label="实验目的" field="purpose" />
        <Field label="假设" field="hypothesis" />
        <Field label="参数配置" field="parameters" />
        <Field label="实验环境" field="environment" />

        {/* status */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
            状态
          </label>
          <div className="flex gap-2 flex-wrap">
            {(['pending', 'running', 'success', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  f.status === s
                    ? s === 'success'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                      : s === 'failed'
                      ? 'bg-red-500/15 text-red-400 border-red-500/40'
                      : s === 'running'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                      : 'bg-gray-500/15 text-gray-400 border-gray-500/40'
                    : 'bg-gray-800/40 text-gray-500 border-gray-700/40 hover:border-gray-600'
                }`}
              >
                {s === 'pending' ? '待开始' : s === 'running' ? '进行中' : s === 'success' ? '成功' : '失败'}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <Field label="实验结果" field="result" isArea />
        </div>
        <div className="md:col-span-2">
          <Field label="失败原因" field="failure_reason" isArea />
        </div>
        <div className="md:col-span-2">
          <Field label="下一步计划" field="next_step" isArea />
        </div>
      </div>
    )
  }

  function renderSimpleForm() {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Field label="标题" field="title" required />
        <Field label="内容" field="content" isArea />
        <Field label="标签 (逗号分隔)" field="tags" />
      </div>
    )
  }

  function renderMeetingForm() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="组会主题" field="title" required />
        </div>
        <Field label="参会人员" field="participants" />
        <div className="md:col-span-2">
          <Field label="讨论问题" field="questions" isArea />
        </div>
        <div className="md:col-span-2">
          <Field label="导师反馈" field="advisor_feedback" isArea />
        </div>
        <div className="md:col-span-2">
          <Field label="决议事项" field="decisions" isArea />
        </div>
        <div className="md:col-span-2">
          <Field label="后续任务" field="follow_up_tasks" isArea />
        </div>
      </div>
    )
  }

  function renderForm() {
    switch (activeType) {
      case 'paper': return renderPaperForm()
      case 'experiment': return renderExperimentForm()
      case 'meeting': return renderMeetingForm()
      default: return renderSimpleForm()
    }
  }

  /* ---------- submit ---------- */
  const isFormValid = (): boolean => {
    const title = get('title')
    return title.trim().length > 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid() || submitting) return

    setSubmitting(true)
    try {
      switch (activeType) {
        case 'paper': {
          const f = form as PaperForm
          await window.electronAPI.addPaper({
            title: f.title.trim(),
            authors: f.authors.trim() || null,
            year: f.year.trim() ? parseInt(f.year.trim(), 10) : null,
            doi: f.doi.trim() || null,
            journal: f.journal.trim() || null,
            tags: f.tags.trim() || null,
            pdf_path: f.pdf_path.trim() || null,
            research_question: f.research_question.trim() || null,
            method: f.method.trim() || null,
            data_source: f.data_source.trim() || null,
            conclusion: f.conclusion.trim() || null,
            limitations: f.limitations.trim() || null,
          })
          break
        }
        case 'experiment': {
          const f = form as ExperimentForm
          await window.electronAPI.addExperiment({
            title: f.title.trim(),
            purpose: f.purpose.trim() || null,
            hypothesis: f.hypothesis.trim() || null,
            parameters: f.parameters.trim() || null,
            environment: f.environment.trim() || null,
            result: f.result.trim() || null,
            failure_reason: f.failure_reason.trim() || null,
            next_step: f.next_step.trim() || null,
            status: f.status,
          })
          break
        }
        case 'meeting': {
          const f = form as MeetingForm
          await window.electronAPI.addMeeting({
            title: f.title.trim(),
            questions: f.questions.trim() || null,
            advisor_feedback: f.advisor_feedback.trim() || null,
            decisions: f.decisions.trim() || null,
            follow_up_tasks: f.follow_up_tasks.trim() || null,
            participants: f.participants.trim() || null,
          })
          break
        }
        default: {
          const f = form as SimpleForm
          await window.electronAPI.addRecord({
            type: activeType,
            title: f.title.trim(),
            content: f.content.trim() || null,
            tags: f.tags.trim() || null,
            xp_earned: xpInfo.xp,
            skill_points: '',
          })
          break
        }
      }

      showXPNotification({ amount: xpInfo.xp, newLevel: 0, newXP: 0 })
      setShowSuccess(true)
      setTimeout(() => navigate('/'), 1800)
    } catch (err) {
      console.error('Submit failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- tab colors ---------- */
  const activeColor = RECORD_TYPES.find((t) => t.value === activeType)?.color ?? ''

  /* ---------- render ---------- */
  if (showSuccess) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 animate-[fadeIn_0.4s_ease-out]">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center
                          shadow-lg shadow-amber-500/30 animate-[bounce_0.6s_ease-out]">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">记录成功！</h2>
          <p className="text-gray-400">
            获得 <span className="text-amber-400 font-bold">+{xpInfo.xp} XP</span> — {xpInfo.desc}
          </p>
          <p className="text-xs text-gray-500">即将跳转回首页...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">新增记录</h1>
          <p className="text-sm text-gray-500 mt-0.5">记录你的学术进展，获取经验值</p>
        </div>
        <div className="xp-badge text-sm px-3 py-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          +{xpInfo.xp} XP
          <span className="text-gray-500 font-normal ml-1">({xpInfo.desc})</span>
        </div>
      </div>

      {/* type tabs */}
      <div className="flex gap-1.5 p-1.5 glass rounded-2xl overflow-x-auto">
        {RECORD_TYPES.map((t) => {
          const isActive = t.value === activeType
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => switchType(t.value)}
              disabled={submitting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap
                          transition-all duration-200 disabled:opacity-50
                          ${isActive
                            ? `${t.color} border shadow-sm`
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent'
                          }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* form */}
      <form onSubmit={handleSubmit} className="glass-card space-y-6">
        {renderForm()}

        {/* submit row */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost text-sm"
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!isFormValid() || submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                提交中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                提交记录
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}