import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 论文
  getPapers: () => ipcRenderer.invoke('db:getPapers'),
  addPaper: (paper: any) => ipcRenderer.invoke('db:addPaper', paper),
  updatePaper: (id: number, paper: any) => ipcRenderer.invoke('db:updatePaper', id, paper),
  getPaper: (id: number) => ipcRenderer.invoke('db:getPaper', id),
  updatePaperReadTime: (id: number, seconds: number) => ipcRenderer.invoke('db:updatePaperReadTime', id, seconds),

  // 实验
  getExperiments: () => ipcRenderer.invoke('db:getExperiments'),
  addExperiment: (exp: any) => ipcRenderer.invoke('db:addExperiment', exp),

  // 记录
  addRecord: (record: any) => ipcRenderer.invoke('db:addRecord', record),
  getRecords: (type?: string) => ipcRenderer.invoke('db:getRecords', type),

  // 组会
  addMeeting: (meeting: any) => ipcRenderer.invoke('db:addMeeting', meeting),
  getMeetings: () => ipcRenderer.invoke('db:getMeetings'),

  // 用户状态
  getUserStats: () => ipcRenderer.invoke('db:getUserStats'),
  updateStreak: () => ipcRenderer.invoke('db:updateStreak'),
  logDailyActivity: () => ipcRenderer.invoke('db:logDailyActivity'),
  getDailyLogs: (days: number) => ipcRenderer.invoke('db:getDailyLogs', days),

  // 科技树
  getTechTree: () => ipcRenderer.invoke('db:getTechTree'),
  addTechTreeNode: (node: any) => ipcRenderer.invoke('db:addTechTreeNode', node),

  // 文件
  openPDFDialog: () => ipcRenderer.invoke('dialog:openPDF'),
  copyPDF: (sourcePath: string) => ipcRenderer.invoke('file:copyPDF', sourcePath),
  readPDF: (filePath: string) => ipcRenderer.invoke('file:readPDF', filePath),
  extractPDFMetadata: (filePath: string) => ipcRenderer.invoke('file:extractPDFMetadata', filePath),
  exportMarkdown: (content: string) => ipcRenderer.invoke('dialog:exportMarkdown', content),

  // 事件监听
  onXPGained: (callback: (data: any) => void) => {
    ipcRenderer.on('xp:gained', (_event, data) => callback(data))
  },
  removeXPGainedListener: () => {
    ipcRenderer.removeAllListeners('xp:gained')
  },

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
})