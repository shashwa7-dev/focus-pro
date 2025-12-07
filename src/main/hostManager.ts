import http from 'http'
import net from 'net'
import httpProxy from 'http-proxy'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let proxyServer: http.Server | null = null
let blockedSites: string[] = []
let activeSockets: Set<net.Socket> = new Set()
let proxyPort = 8080

/** ================================
 *  SYSTEM PROXY CONTROL (CROSS-PLATFORM)
 *  ================================ */
async function enableSystemProxy() {
  const platform = process.platform

  if (platform === 'darwin') {
    // macOS: get all active network services (Wi-Fi, Ethernet, etc.)
    try {
      const { stdout } = await execAsync('networksetup -listallnetworkservices')
      const services = stdout
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('*'))
      for (const s of services) {
        try {
          await execAsync(`networksetup -setwebproxy "${s}" 127.0.0.1 ${proxyPort}`)
          await execAsync(`networksetup -setsecurewebproxy "${s}" 127.0.0.1 ${proxyPort}`)
        } catch {}
      }
      console.log(`🌐 macOS proxy enabled on: ${services.join(', ')}`)
    } catch (err) {
      console.warn('⚠️ Failed to enable macOS proxy:', err)
    }
  } else if (platform === 'win32') {
    // Windows: registry + netsh for IE/Edge/Chrome
    try {
      await execAsync(
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`
      )
      await execAsync(
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "127.0.0.1:${proxyPort}" /f`
      )
      console.log('🌐 Windows proxy enabled.')
    } catch (err) {
      console.warn('⚠️ Failed to enable Windows proxy:', err)
    }
  } else if (platform === 'linux') {
    // Linux (GNOME / Ubuntu style)
    try {
      await execAsync(`gsettings set org.gnome.system.proxy mode 'manual'`)
      await execAsync(`gsettings set org.gnome.system.proxy.http host '127.0.0.1'`)
      await execAsync(`gsettings set org.gnome.system.proxy.http port ${proxyPort}`)
      await execAsync(`gsettings set org.gnome.system.proxy.https host '127.0.0.1'`)
      await execAsync(`gsettings set org.gnome.system.proxy.https port ${proxyPort}`)
      console.log('🌐 Linux proxy enabled.')
    } catch (err) {
      console.warn('⚠️ Failed to enable Linux proxy:', err)
    }
  }
}

export async function disableSystemProxy() {
  const platform = process.platform

  if (platform === 'darwin') {
    try {
      const { stdout } = await execAsync('networksetup -listallnetworkservices')
      const services = stdout
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('*'))
      for (const s of services) {
        try {
          await execAsync(`networksetup -setwebproxystate "${s}" off`)
          await execAsync(`networksetup -setsecurewebproxystate "${s}" off`)
        } catch {}
      }
      console.log(`🧹 macOS proxy disabled on: ${services.join(', ')}`)
    } catch (err) {
      console.warn('⚠️ Failed to disable macOS proxy:', err)
    }
  } else if (platform === 'win32') {
    try {
      await execAsync(
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`
      )
      console.log('🧹 Windows proxy disabled.')
    } catch (err) {
      console.warn('⚠️ Failed to disable Windows proxy:', err)
    }
  } else if (platform === 'linux') {
    try {
      await execAsync(`gsettings set org.gnome.system.proxy mode 'none'`)
      console.log('🧹 Linux proxy disabled.')
    } catch (err) {
      console.warn('⚠️ Failed to disable Linux proxy:', err)
    }
  }
}

/** ================================
 *  PROXY LOGIC (SAME CORE)
 *  ================================ */
export const blockWebsites = async (sites: string[]) => {
  if (!sites.length) return

  // graceful restart
  if (proxyServer) {
    console.log('♻️ Restarting proxy...')

    for (const socket of activeSockets) socket.destroy()
    activeSockets.clear()

    await new Promise<void>((resolve) => proxyServer?.close(() => resolve()))
    proxyServer = null
  }

  blockedSites = sites.map((s) => s.toLowerCase())
  const proxy = httpProxy.createProxyServer({ changeOrigin: true })

  proxy.on('error', (err, req, res) => {
    if (res.writeHead && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
    }
    res.end('Bad Gateway.')
  })

  proxyServer = http.createServer((req, res) => {
    try {
      const hostHeader = req.headers.host || ''
      const hostname = hostHeader.split(':')[0].toLowerCase()

      const isBlocked = blockedSites.some((site) => hostname.includes(site))
      if (isBlocked) {
        res.writeHead(403, { 'Content-Type': 'text/html' })
        res.end(`
          <html><body style="text-align:center; font-family:sans-serif; margin-top:20%">
            <h1>Access Blocked 🚫</h1>
            <p>${hostname} is blocked for your productivity.</p>
          </body></html>
        `)
        return
      }

      proxy.web(req, res, { target: `http://${hostHeader}` })
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Internal Proxy Error.')
    }
  })

  proxyServer.on('connection', (socket) => {
    activeSockets.add(socket)
    socket.on('close', () => activeSockets.delete(socket))
  })

  proxyServer.on('connect', (req, clientSocket, head) => {
    const [hostname, port] = req.url?.split(':') || []
    const lowerHost = hostname?.toLowerCase() || ''
    const isBlocked = blockedSites.some((site) => lowerHost.includes(site))

    if (isBlocked) {
      clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\nBlocked.\r\n')
      clientSocket.destroy()
      return
    }

    const serverSocket = net.connect(Number(port) || 443, hostname, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      serverSocket.write(head)
      serverSocket.pipe(clientSocket)
      clientSocket.pipe(serverSocket)
    })

    const safeClose = () => {
      serverSocket.destroy()
      clientSocket.destroy()
    }

    serverSocket.on('error', safeClose)
    clientSocket.on('error', safeClose)
  })

  proxyServer.on('clientError', (err: any, socket) => {
    if (err.code !== 'ECONNRESET') console.error('Client error:', err.message)
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
  })

  const startServer = (port = 8080) => {
    proxyPort = port
    proxyServer!
      .listen(port)
      .on('listening', async () => {
        console.log(`🚫 Blocking: ${blockedSites.join(', ')}`)
        console.log(`✅ Proxy running on port ${port}`)
        await enableSystemProxy()
      })
      .on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️ Port ${port} in use, retrying with another...`)
          startServer(port + 1)
        } else {
          console.error('Proxy failed:', err)
        }
      })
  }

  startServer(8080)
}

/** Stop blocking */
export const stopBlocking = async () => {
  if (proxyServer) {
    for (const socket of activeSockets) socket.destroy()
    activeSockets.clear()
    proxyServer.close()
    proxyServer = null
  }
  await disableSystemProxy()
  console.log('Proxy stopped and sites unblocked.')
}
