import { useState } from 'react'
import { useStore } from '../store'
import { X, Save } from 'lucide-react'

export default function SummaryModal() {
  const { summaryModalOpen, summaryPaperId, closeSummaryModal, papers } = useStore()
  const [summary, setSummary] = useState('')
  const [reusablePoints, setReusablePoints] = useState('')
  const [saving, setSaving] = useState(false)

  if (!summaryModalOpen || !summaryPaperId) return null

  const paper = papers.find(p => p.id === summaryPaperId)

  const handleSave = async () => {
    if (!summary.trim()) return
    setSaving(true)
    try {
      await window.electronAPI.updatePaper(summaryPaperId, {
        summary,
        reusable_points: reusablePoints,
      })
      // 刷新
      const papers = await window.electronAPI.getPapers()
      useStore.getState().setPapers(papers)
      closeSummaryModal()
      setSummary('')
      setReusablePoints('')
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-[600px] max-h-[80vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gradient">📝 读完论文，来写总结吧！</h2>
          <button onClick={closeSummaryModal} className="btn-ghost p-1">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-400">
          正在阅读：<span className="text-white">{paper?.title}</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              结构化总结 <span className="text-red-400">*</span>
              <span className="text-amber-400 ml-2">(+25 XP)</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="这篇文章研究了什么问题？用了什么方法？得出了什么结论？有什么局限？"
              className="input-field min-h-[120px] resize-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              可复用观点 <span className="text-amber-400 ml-2">(+15 XP)</span>
            </label>
            <textarea
              value={reusablePoints}
              onChange={(e) => setReusablePoints(e.target.value)}
              placeholder="这篇文章有哪些观点/方法/思路可以借鉴到自己的研究中？"
              className="input-field min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={closeSummaryModal} className="btn-secondary">
            稍后再说
          </button>
          <button
            onClick={handleSave}
            disabled={!summary.trim() || saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? '保存中...' : '保存总结 (+40 XP)'}
          </button>
        </div>
      </div>
    </div>
  )
}