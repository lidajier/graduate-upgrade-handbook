import { useState, useEffect, useMemo, useCallback } from 'react'
import { useStore } from '../store'
import { GitGraph, Plus, ChevronRight, ChevronDown, GitBranch } from 'lucide-react'
import type { TechTreeNode } from '../types'

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const DEFAULT_CATEGORIES = [
  '计算机视觉',
  '自然语言处理',
  '机器学习理论',
  '数据分析',
  '系统设计',
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  '计算机视觉':   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30',   bar: 'from-blue-500 to-cyan-400' },
  '自然语言处理': { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/30',  bar: 'from-green-500 to-emerald-400' },
  '机器学习理论': { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30',  bar: 'from-amber-500 to-yellow-400' },
  '数据分析':     { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', bar: 'from-purple-500 to-pink-400' },
  '系统设计':     { bg: 'bg-rose-500/10',   text: 'text-rose-400',   border: 'border-rose-500/30',   bar: 'from-rose-500 to-orange-400' },
}

const FALLBACK_COLOR = { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', bar: 'from-gray-500 to-gray-400' }

/* ────────────────────────────────────────────
   Default root nodes (shown when tree is empty)
   ──────────────────────────────────────────── */

const DEFAULT_ROOT_NODES: TechTreeNode[] = [
  { id: -1, parent_id: null, name: '计算机视觉',      category: '计算机视觉',   level: 1, progress: 0, description: '图像识别、目标检测、语义分割等方向' },
  { id: -2, parent_id: null, name: '自然语言处理',    category: '自然语言处理', level: 1, progress: 0, description: '文本分类、机器翻译、大语言模型等方向' },
  { id: -3, parent_id: null, name: '机器学习理论',    category: '机器学习理论', level: 1, progress: 0, description: '深度学习、强化学习、优化理论等方向' },
  { id: -4, parent_id: null, name: '数据分析',        category: '数据分析',     level: 1, progress: 0, description: '数据挖掘、统计分析、可视化等方向' },
  { id: -5, parent_id: null, name: '系统设计',        category: '系统设计',     level: 1, progress: 0, description: '分布式系统、数据库、架构设计等方向' },
]

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function buildTreeMap(nodes: TechTreeNode[]): Map<number | null, TechTreeNode[]> {
  const map = new Map<number | null, TechTreeNode[]>()
  for (const node of nodes) {
    const key = node.parent_id ?? null
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(node)
  }
  return map
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? FALLBACK_COLOR
}

/* ────────────────────────────────────────────
   Tree node component
   ──────────────────────────────────────────── */

function TreeNode({
  node,
  children,
  depth,
  paperCount,
}: {
  node: TechTreeNode
  children: TechTreeNode[]
  depth: number
  paperCount: number
}) {
  const [expanded, setExpanded] = useState(depth < 2) // auto-expand first 2 levels
  const color = getCategoryColor(node.category)
  const hasChildren = children.length > 0
  const isDefault = node.id < 0

  const childMap = useMemo(() => buildTreeMap(children), [children])
  const directChildren = childMap.get(node.id) ?? []

  return (
    <div className="select-none">
      {/* ── Node row ── */}
      <div
        className={`
          group flex items-center gap-3 py-2.5 px-3 -ml-1 rounded-xl cursor-pointer
          transition-all duration-200
          hover:bg-gray-800/40
          ${isDefault ? 'opacity-70' : ''}
        `}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/collapse toggle */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
            ) : (
              <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
            )
          ) : (
            <span className="w-1 h-1 rounded-full bg-gray-700" />
          )}
        </div>

        {/* Category badge */}
        <span
          className={`
            flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium
            ${color.bg} ${color.text} border ${color.border}
          `}
        >
          {node.category}
        </span>

        {/* Name */}
        <span className="flex-1 text-sm font-medium text-gray-200 truncate">
          {node.name}
        </span>

        {/* Level */}
        <span className="flex-shrink-0 text-[10px] text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">
          Lv.{node.level}
        </span>

        {/* Paper count */}
        <span className="flex-shrink-0 text-[10px] text-gray-500">
          {paperCount}篇
        </span>

        {/* Progress bar */}
        <div className="flex-shrink-0 w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${color.bar} transition-all duration-500`}
            style={{ width: `${Math.min(100, node.progress)}%` }}
          />
        </div>

        {/* Progress percentage */}
        <span className="flex-shrink-0 w-9 text-right text-[10px] text-gray-500">
          {Math.round(node.progress)}%
        </span>
      </div>

      {/* ── Children (recursive) ── */}
      {expanded && hasChildren && (
        <div className="relative">
          {/* Vertical connecting line */}
          <div
            className="absolute border-l border-dashed border-indigo-500/20"
            style={{
              left: `${depth * 24 + 20}px`,
              top: 0,
              bottom: 0,
            }}
          />
          {directChildren.map((child) => (
            <div key={child.id} className="relative">
              {/* Horizontal connecting line */}
              <div
                className="absolute border-t border-dashed border-indigo-500/20"
                style={{
                  left: `${depth * 24 + 20}px`,
                  top: '50%',
                  width: '12px',
                }}
              />
              <TreeNode
                node={child}
                children={children}
                depth={depth + 1}
                paperCount={paperCount}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────
   Add node form component
   ──────────────────────────────────────────── */

function AddNodeForm({
  nodes,
  onAdded,
}: {
  nodes: TechTreeNode[]
  onAdded: () => void
}) {
  const [parentId, setParentId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parentOptions = useMemo(() => {
    const opts: { id: number | null; name: string; level: number }[] = [{ id: null, name: '(无 - 作为根节点)', level: 0 }]
    for (const n of nodes) {
      opts.push({ id: n.id, name: n.name, level: n.level })
    }
    return opts
  }, [nodes])

  const selectedParent = useMemo(
    () => parentOptions.find((o) => o.id === parentId),
    [parentId, parentOptions],
  )

  useEffect(() => {
    if (selectedParent) {
      setLevel(selectedParent.level + 1)
    }
  }, [selectedParent])

  const handleSubmit = useCallback(async () => {
    setError('')
    if (!name.trim()) {
      setError('请输入节点名称')
      return
    }
    setSaving(true)
    try {
      await window.electronAPI.addTechTreeNode({
        parent_id: parentId,
        name: name.trim(),
        category,
        level,
        progress: 0,
        description: description.trim() || null,
      })
      setName('')
      setDescription('')
      setParentId(null)
      setCategory(DEFAULT_CATEGORIES[0])
      onAdded()
    } catch (e: any) {
      setError(e?.message ?? '添加失败')
    } finally {
      setSaving(false)
    }
  }, [parentId, name, category, level, description, onAdded])

  return (
    <div className="glass-card">
      <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
        <Plus size={16} className="text-indigo-400" />
        添加研究方向
      </h3>

      <div className="space-y-3">
        {/* Parent selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">父节点</label>
          <select
            className="input-field"
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
          >
            {parentOptions.map((opt) => (
              <option key={String(opt.id)} value={opt.id ?? ''}>
                {opt.name} {opt.id !== null ? `(Lv.${opt.level})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">节点名称</label>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：目标检测、Transformer架构..."
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {/* Category + Level row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">分类</label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">等级</label>
            <input
              className="input-field"
              type="number"
              min={1}
              max={99}
              value={level}
              onChange={(e) => setLevel(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">描述</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简要描述该研究方向..."
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* Submit */}
        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
        >
          <GitBranch size={15} />
          {saving ? '添加中...' : '添加节点'}
        </button>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Main page
   ──────────────────────────────────────────── */

export default function TechTree() {
  const { techTree, setTechTree, papers } = useStore()
  const [loading, setLoading] = useState(true)

  const loadTree = useCallback(async () => {
    try {
      const tree = await window.electronAPI.getTechTree()
      setTechTree(tree)
    } catch (e) {
      console.error('Failed to load tech tree:', e)
    } finally {
      setLoading(false)
    }
  }, [setTechTree])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  /* ── Data: use real nodes or fall back to defaults ── */
  const displayNodes = useMemo(() => {
    if (techTree.length > 0) return techTree
    return DEFAULT_ROOT_NODES
  }, [techTree])

  const treeMap = useMemo(() => buildTreeMap(displayNodes), [displayNodes])
  const rootNodes = useMemo(() => treeMap.get(null) ?? [], [treeMap])

  /* ── Derived: paper count per node (match by tags) ── */
  const paperCountByNode = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const node of displayNodes) {
      if (node.id < 0) continue // skip defaults
      const nameLower = node.name.toLowerCase()
      counts[node.id] = papers.filter((p) => {
        if (!p.tags) return false
        return p.tags.toLowerCase().includes(nameLower)
      }).length
    }
    return counts
  }, [displayNodes, papers])

  /* ── Stats ── */
  const stats = useMemo(() => {
    const realNodes = displayNodes.filter((n) => n.id >= 0)
    const totalPapers = Object.values(paperCountByNode).reduce((a, b) => a + b, 0)
    const avgProgress = realNodes.length > 0
      ? realNodes.reduce((s, n) => s + n.progress, 0) / realNodes.length
      : 0
    return { totalNodes: realNodes.length, totalPapers, avgProgress }
  }, [displayNodes, paperCountByNode])

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <GitGraph size={40} className="mx-auto text-indigo-400 animate-pulse" />
          <p className="text-gray-500 text-sm">加载科技树中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
            <GitGraph size={26} className="text-indigo-400" />
            研究科技树
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            将你的研究兴趣组织成树状结构，追踪每个方向的进展。点击节点展开/折叠子方向。
          </p>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-3">
          <div className="glass-card !p-3 !rounded-xl text-center min-w-[80px]">
            <div className="text-lg font-bold text-indigo-400">{stats.totalNodes}</div>
            <div className="text-[10px] text-gray-500">研究方向</div>
          </div>
          <div className="glass-card !p-3 !rounded-xl text-center min-w-[80px]">
            <div className="text-lg font-bold text-blue-400">{stats.totalPapers}</div>
            <div className="text-[10px] text-gray-500">关联论文</div>
          </div>
          <div className="glass-card !p-3 !rounded-xl text-center min-w-[80px]">
            <div className="text-lg font-bold text-amber-400">{Math.round(stats.avgProgress)}%</div>
            <div className="text-[10px] text-gray-500">平均进度</div>
          </div>
        </div>
      </div>

      {/* ── Body: Tree + Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree visualization */}
        <div className="lg:col-span-2 glass-card !p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <GitBranch size={15} className="text-indigo-400" />
            研究方向层级
            {techTree.length === 0 && (
              <span className="text-[10px] text-gray-600 ml-2">
                (展示默认根节点，添加数据后自动替换)
              </span>
            )}
          </h2>

          {rootNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <GitGraph size={48} className="mb-3 opacity-30" />
              <p className="text-sm">暂无研究方向</p>
              <p className="text-xs mt-1">使用右侧表单添加第一个根节点</p>
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[600px] overflow-y-auto pr-1">
              {rootNodes.map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  children={displayNodes}
                  depth={0}
                  paperCount={paperCountByNode[root.id] ?? 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add node form */}
        <div className="space-y-4">
          <AddNodeForm nodes={techTree} onAdded={loadTree} />

          {/* Legend */}
          <div className="glass-card">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">分类图例</h3>
            <div className="space-y-2">
              {DEFAULT_CATEGORIES.map((cat) => {
                const color = getCategoryColor(cat)
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded ${color.bg} border ${color.border}`} />
                    <span className={`text-xs ${color.text}`}>{cat}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}