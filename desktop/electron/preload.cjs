const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  discoverAgents: () => ipcRenderer.invoke('agent:discover'),
  startAgent: (id) => ipcRenderer.invoke('agent:start', id),
  stopAgent: (id) => ipcRenderer.invoke('agent:stop', id)
})
