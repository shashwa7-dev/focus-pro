import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const HOSTS_FILE = '/etc/hosts'
const BACKUP_FILE = path.join(process.cwd(), 'hosts_backup')

export const backupHosts = async () => {
  if (!fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(HOSTS_FILE, BACKUP_FILE)
    console.log('✅ Backup created.')
  }
}

export const restoreHosts = async () => {
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, HOSTS_FILE)
    await execAsync('sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder')
    console.log('✅ Websites unblocked.')
  } else {
    console.log('⚠️ No backup found.')
  }
}

export const blockWebsites = async (sites: string[]) => {
  if (!sites.length) return

  await backupHosts()

  let hostsContent = fs.readFileSync(HOSTS_FILE, 'utf8')

  for (const site of sites) {
    if (!hostsContent.includes(site)) {
      hostsContent += `\n127.0.0.1 ${site}\n127.0.0.1 www.${site}`
    }
  }

  fs.writeFileSync(HOSTS_FILE, hostsContent, 'utf8')
  await execAsync('sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder')

  console.log('🚫 Websites blocked.')
}
