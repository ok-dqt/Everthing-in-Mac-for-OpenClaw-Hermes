import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawn } from 'child_process'
import fs from 'fs'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

function which(cmd) {
  try {
    return execSync(`which ${cmd}`, { encoding: 'utf8' }).trim()
  } catch { return null }
}

function isProcessAlive(pid) {
  try { process.kill(pid, 0); return true }
  catch { return false }
}

function discoverHermes() {
  const bin = which('hermes')
  if (!bin) return { installed: false, running: false, port: 9119 }

  const home = process.env.HERMES_HOME || path.join(os.homedir(), '.hermes')
  const statePath = path.join(home, 'gateway_state.json')

  let running = false
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
    if (state.gateway_state === 'running' && state.pid) {
      running = isProcessAlive(state.pid)
    }
  } catch {}

  return { installed: true, running, port: 9119 }
}

function discoverOpenClaw() {
  const bin = which('openclaw')
  if (!bin) return { installed: false, running: false, port: 18789 }

  const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json')
  let token = null
  let port = 18789

  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    if (cfg.gateway?.auth?.token) token = cfg.gateway.auth.token
    if (cfg.gateway?.port) port = cfg.gateway.port
  } catch {}

  const envPort = process.env.OPENCLAW_GATEWAY_PORT
  if (envPort) port = parseInt(envPort, 10)

  let running = false
  try {
    const uid = process.getuid()
    const tmpDir = path.join(os.tmpdir(), `openclaw-${uid}`)
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('gateway.') && f.endsWith('.lock'))
      for (const f of files) {
        const lock = JSON.parse(fs.readFileSync(path.join(tmpDir, f), 'utf8'))
        if (lock.pid && isProcessAlive(lock.pid)) { running = true; break }
      }
    }
  } catch {}

  if (!running) {
    try {
      const ocHome = path.join(os.homedir(), '.openclaw')
      const tmpDir2 = path.join(ocHome, 'tmp', `openclaw-${process.getuid()}`)
      if (fs.existsSync(tmpDir2)) {
        const files = fs.readdirSync(tmpDir2).filter(f => f.startsWith('gateway.') && f.endsWith('.lock'))
        for (const f of files) {
          const lock = JSON.parse(fs.readFileSync(path.join(tmpDir2, f), 'utf8'))
          if (lock.pid && isProcessAlive(lock.pid)) { running = true; break }
        }
      }
    } catch {}
  }

  return { installed: true, running, port, token }
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: true, stdio: 'pipe' })
    let stdout = '', stderr = ''
    child.stdout?.on('data', d => { stdout += d })
    child.stderr?.on('data', d => { stderr += d })
    child.on('close', code => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(stderr || `exit code ${code}`))
    })
    child.on('error', reject)
  })
}

async function waitForAgent(discoverFn, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const info = discoverFn()
    if (info.running) return true
    await new Promise(r => setTimeout(r, 1000))
  }
  return false
}

ipcMain.handle('agent:discover', async () => {
  return { hermes: discoverHermes(), openclaw: discoverOpenClaw() }
})

ipcMain.handle('agent:start', async (_, agentId) => {
  try {
    if (agentId === 'hermes') {
      await runCommand('hermes', ['gateway', 'start'])
      const ok = await waitForAgent(discoverHermes)
      return { ok, error: ok ? undefined : 'Timeout waiting for Hermes to start' }
    } else if (agentId === 'openclaw') {
      await runCommand('openclaw', ['gateway', 'start'])
      const ok = await waitForAgent(discoverOpenClaw)
      return { ok, error: ok ? undefined : 'Timeout waiting for OpenClaw to start' }
    }
    return { ok: false, error: 'Unknown agent' }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('agent:stop', async (_, agentId) => {
  try {
    if (agentId === 'hermes') {
      await runCommand('hermes', ['gateway', 'stop'])
    } else if (agentId === 'openclaw') {
      await runCommand('openclaw', ['gateway', 'stop'])
    } else {
      return { ok: false, error: 'Unknown agent' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    win.loadURL('http://127.0.0.1:1422')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
