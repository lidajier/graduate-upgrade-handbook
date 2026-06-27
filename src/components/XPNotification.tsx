import { useStore } from '../store'
import { Sparkles } from 'lucide-react'

export default function XPNotification() {
  const { xpNotification } = useStore()

  if (!xpNotification) return null

  return (
    <div className="fixed top-12 right-6 z-50 animate-xp-gain pointer-events-none">
      <div className="flex items-center gap-2 glass-card px-4 py-3 bg-gray-900/95 border-amber-500/30">
        <Sparkles size={18} className="text-amber-400" />
        <div>
          <div className="text-amber-400 font-bold text-sm">+{xpNotification.amount} XP</div>
          {xpNotification.newLevel > 1 && (
            <div className="text-gray-400 text-xs">
              Lv.{xpNotification.newLevel - 1} → Lv.{xpNotification.newLevel}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}