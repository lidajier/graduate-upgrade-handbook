import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import XPNotification from './components/XPNotification'
import SummaryModal from './components/SummaryModal'
import Dashboard from './pages/Dashboard'
import PaperReader from './pages/PaperReader'
import AddRecord from './pages/AddRecord'
import Experiments from './pages/Experiments'
import GrowthTree from './pages/GrowthTree'
import Meetings from './pages/Meetings'
import TechTree from './pages/TechTree'

export default function App() {
  const { setStats, setPapers, setExperiments, setRecords, setMeetings, setDailyLogs, setTechTree, showXPNotification } = useStore()

  useEffect(() => {
    async function loadData() {
      try {
        const [stats, papers, experiments, records, meetings, dailyLogs, techTree] = await Promise.all([
          window.electronAPI.getUserStats(),
          window.electronAPI.getPapers(),
          window.electronAPI.getExperiments(),
          window.electronAPI.getRecords(),
          window.electronAPI.getMeetings(),
          window.electronAPI.getDailyLogs(30),
          window.electronAPI.getTechTree(),
        ])
        setStats(stats)
        setPapers(papers)
        setExperiments(experiments)
        setRecords(records)
        setMeetings(meetings)
        setDailyLogs(dailyLogs)
        setTechTree(techTree)

        await window.electronAPI.updateStreak()
        await window.electronAPI.logDailyActivity()
      } catch (e) {
        console.error('Failed to load data:', e)
      }
    }
    loadData()

    window.electronAPI.onXPGained((data) => {
      showXPNotification(data)
      loadData()
    })

    return () => {
      window.electronAPI.removeXPGainedListener()
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/paper/:id" element={<PaperReader />} />
            <Route path="/add" element={<AddRecord />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/growth" element={<GrowthTree />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/techtree" element={<TechTree />} />
          </Routes>
        </main>
      </div>
      <XPNotification />
      <SummaryModal />
    </div>
  )
}