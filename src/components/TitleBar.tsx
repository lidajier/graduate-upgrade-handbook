import { Minus, Square, X } from 'lucide-react'

export default function TitleBar() {
  return (
    <div className="drag-region h-9 flex items-center justify-between bg-gray-950 border-b border-gray-800 px-4">
      <div className="text-xs text-gray-600 font-medium">研究生升级宝典 v1.0</div>
      <div className="no-drag flex items-center gap-1">
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="p-1.5 rounded hover:bg-red-600/80 text-gray-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
