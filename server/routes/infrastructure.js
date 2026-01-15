/**
 * Infrastructure Management Routes
 * Provides API endpoints for server/OS management:
 * - Package management (apt)
 * - Log viewing (journalctl)
 * - Process management
 * - Network diagnostics
 * - Security monitoring (SSH, fail2ban)
 * - Scheduled tasks (cron, systemd timers)
 */

import { Router } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';

const execAsync = promisify(exec);

export function createInfrastructureRouter() {
  const router = Router();

  // ============================================
  // PACKAGE MANAGEMENT
  // ============================================

  /**
   * GET /api/infra/packages - List installed packages
   */
  router.get('/packages', async (req, res) => {
    try {
      const { search, limit = 100, offset = 0 } = req.query;

      let cmd = 'dpkg-query -W -f=\'${Package}|${Version}|${Status}|${Installed-Size}|${Description}\\n\'';
      const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });

      let packages = stdout.trim().split('\n')
        .filter(line => line.includes('install ok installed'))
        .map(line => {
          const [name, version, status, size, description] = line.split('|');
          return {
            name,
            version,
            status: status?.includes('installed') ? 'installed' : status,
            size: parseInt(size) || 0, // Size in KB
            description: description?.substring(0, 100) || ''
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        packages = packages.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
        );
      }

      const total = packages.length;
      packages = packages.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      res.json({ packages, total });
    } catch (error) {
      console.error('Error listing packages:', error);
      res.status(500).json({ error: 'Failed to list packages' });
    }
  });

  /**
   * GET /api/infra/packages/updates - Check for available updates
   */
  router.get('/packages/updates', async (req, res) => {
    try {
      // First run apt update
      await execAsync('sudo apt update', { timeout: 60000 });

      // Then get upgradable packages
      const { stdout } = await execAsync('apt list --upgradable 2>/dev/null | tail -n +2');

      const updates = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Format: package/source version [upgradable from: old_version]
          const match = line.match(/^([^/]+)\/\S+\s+(\S+).*\[upgradable from: ([^\]]+)\]/);
          if (match) {
            return {
              name: match[1],
              newVersion: match[2],
              currentVersion: match[3]
            };
          }
          return null;
        })
        .filter(Boolean);

      res.json({
        updates,
        count: updates.length,
        lastChecked: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking updates:', error);
      res.status(500).json({ error: 'Failed to check for updates' });
    }
  });

  /**
   * POST /api/infra/packages/upgrade - Upgrade all packages
   */
  router.post('/packages/upgrade', async (req, res) => {
    try {
      const { stdout, stderr } = await execAsync('sudo apt upgrade -y 2>&1', {
        timeout: 600000, // 10 minutes
        maxBuffer: 10 * 1024 * 1024
      });

      res.json({
        success: true,
        output: stdout,
        errors: stderr,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error upgrading packages:', error);
      res.status(500).json({ error: error.message || 'Failed to upgrade packages' });
    }
  });

  /**
   * POST /api/infra/packages/install - Install a package
   */
  router.post('/packages/install', async (req, res) => {
    try {
      const { packageName } = req.body;

      if (!packageName || !/^[a-zA-Z0-9._+-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Invalid package name' });
      }

      const { stdout, stderr } = await execAsync(`sudo apt install -y ${packageName} 2>&1`, {
        timeout: 300000 // 5 minutes
      });

      res.json({
        success: true,
        package: packageName,
        output: stdout,
        errors: stderr
      });
    } catch (error) {
      console.error('Error installing package:', error);
      res.status(500).json({ error: error.message || 'Failed to install package' });
    }
  });

  /**
   * POST /api/infra/packages/remove - Remove a package
   */
  router.post('/packages/remove', async (req, res) => {
    try {
      const { packageName, purge = false } = req.body;

      if (!packageName || !/^[a-zA-Z0-9._+-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Invalid package name' });
      }

      // Prevent removing critical packages
      const criticalPackages = ['systemd', 'openssh-server', 'docker', 'docker.io', 'linux-image', 'grub'];
      if (criticalPackages.some(cp => packageName.startsWith(cp))) {
        return res.status(400).json({ error: 'Cannot remove critical system package' });
      }

      const cmd = purge ? `sudo apt purge -y ${packageName}` : `sudo apt remove -y ${packageName}`;
      const { stdout, stderr } = await execAsync(`${cmd} 2>&1`, { timeout: 300000 });

      res.json({
        success: true,
        package: packageName,
        purged: purge,
        output: stdout,
        errors: stderr
      });
    } catch (error) {
      console.error('Error removing package:', error);
      res.status(500).json({ error: error.message || 'Failed to remove package' });
    }
  });

  /**
   * GET /api/infra/packages/search - Search available packages
   */
  router.get('/packages/search', async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const { stdout } = await execAsync(`apt-cache search "${q}" | head -50`, { timeout: 30000 });

      const results = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [name, ...descParts] = line.split(' - ');
          return {
            name: name.trim(),
            description: descParts.join(' - ').trim()
          };
        });

      res.json({ results, query: q });
    } catch (error) {
      console.error('Error searching packages:', error);
      res.status(500).json({ error: 'Failed to search packages' });
    }
  });

  // ============================================
  // LOG VIEWER (journalctl)
  // ============================================

  /**
   * GET /api/infra/logs - Get system logs
   */
  router.get('/logs', async (req, res) => {
    try {
      const {
        unit,
        priority,
        since,
        until,
        lines = 100,
        search,
        boot = '0'
      } = req.query;

      let cmd = 'journalctl --no-pager -o json';

      if (unit) cmd += ` -u ${unit}`;
      if (priority) cmd += ` -p ${priority}`;
      if (since) cmd += ` --since "${since}"`;
      if (until) cmd += ` --until "${until}"`;
      if (boot) cmd += ` -b ${boot}`;
      if (search) cmd += ` -g "${search}"`;

      cmd += ` -n ${lines}`;

      const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });

      const logs = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const entry = JSON.parse(line);
            return {
              timestamp: entry.__REALTIME_TIMESTAMP
                ? new Date(parseInt(entry.__REALTIME_TIMESTAMP) / 1000).toISOString()
                : null,
              priority: entry.PRIORITY,
              unit: entry._SYSTEMD_UNIT || entry.SYSLOG_IDENTIFIER || 'system',
              message: entry.MESSAGE,
              pid: entry._PID,
              uid: entry._UID,
              hostname: entry._HOSTNAME
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reverse(); // Newest first

      res.json({ logs, count: logs.length });
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  /**
   * GET /api/infra/logs/units - List available log units
   */
  router.get('/logs/units', async (req, res) => {
    try {
      const { stdout } = await execAsync('journalctl -F _SYSTEMD_UNIT 2>/dev/null | sort | uniq');
      const units = stdout.trim().split('\n').filter(u => u.trim());
      res.json({ units });
    } catch (error) {
      console.error('Error listing log units:', error);
      res.status(500).json({ error: 'Failed to list log units' });
    }
  });

  /**
   * GET /api/infra/logs/disk-usage - Get journal disk usage
   */
  router.get('/logs/disk-usage', async (req, res) => {
    try {
      const { stdout } = await execAsync('journalctl --disk-usage 2>/dev/null');
      const match = stdout.match(/(\d+\.?\d*\s*[KMGT]?i?B)/i);
      res.json({
        usage: match ? match[1] : 'Unknown',
        raw: stdout.trim()
      });
    } catch (error) {
      console.error('Error getting log disk usage:', error);
      res.status(500).json({ error: 'Failed to get disk usage' });
    }
  });

  // ============================================
  // PROCESS MANAGEMENT
  // ============================================

  /**
   * GET /api/infra/processes - List running processes
   * Optimized to reduce CPU usage - uses ps -eo with specific fields
   */
  router.get('/processes', async (req, res) => {
    try {
      const { sort = 'cpu', limit = 50 } = req.query;
      const limitNum = Math.min(parseInt(limit) || 50, 100);

      // Map sort parameter to ps sort field
      const sortMap = {
        cpu: '-%cpu',
        memory: '-%mem',
        mem: '-%mem',
        pid: 'pid',
        name: 'comm'
      };
      const psSort = sortMap[sort] || '-%cpu';

      // Use ps -eo with specific fields only - much more efficient than ps aux
      // This avoids loading unnecessary data and lets the kernel do the sorting
      const { stdout } = await execAsync(
        `ps -eo user:15,pid,%cpu,%mem,vsz,rss,tty,stat,start,time,comm --sort=${psSort} --no-headers | head -${limitNum}`,
        { maxBuffer: 1024 * 1024, timeout: 5000 }
      );

      const processes = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            user: parts[0] || '',
            pid: parseInt(parts[1]) || 0,
            cpu: parseFloat(parts[2]) || 0,
            memory: parseFloat(parts[3]) || 0,
            vsz: parts[4] || '0',
            rss: parts[5] || '0',
            tty: parts[6] || '?',
            stat: parts[7] || '',
            start: parts[8] || '',
            time: parts[9] || '',
            command: parts.slice(10).join(' ') || ''
          };
        });

      res.json({ processes, count: processes.length });
    } catch (error) {
      console.error('Error listing processes:', error);
      res.status(500).json({ error: 'Failed to list processes' });
    }
  });

  /**
   * GET /api/infra/processes/:pid - Get process details
   */
  router.get('/processes/:pid', async (req, res) => {
    try {
      const { pid } = req.params;

      if (!/^\d+$/.test(pid)) {
        return res.status(400).json({ error: 'Invalid PID' });
      }

      // Get detailed process info
      const [psInfo, cmdline, environ, openFiles] = await Promise.all([
        execAsync(`ps -p ${pid} -o pid,ppid,user,uid,gid,%cpu,%mem,vsz,rss,stat,start,time,command --no-headers`).catch(() => ({ stdout: '' })),
        execAsync(`cat /proc/${pid}/cmdline 2>/dev/null | tr '\\0' ' '`).catch(() => ({ stdout: '' })),
        execAsync(`cat /proc/${pid}/environ 2>/dev/null | tr '\\0' '\\n' | head -50`).catch(() => ({ stdout: '' })),
        execAsync(`ls -la /proc/${pid}/fd 2>/dev/null | head -20`).catch(() => ({ stdout: '' }))
      ]);

      if (!psInfo.stdout.trim()) {
        return res.status(404).json({ error: 'Process not found' });
      }

      const parts = psInfo.stdout.trim().split(/\s+/);

      res.json({
        pid: parseInt(parts[0]),
        ppid: parseInt(parts[1]),
        user: parts[2],
        uid: parts[3],
        gid: parts[4],
        cpu: parseFloat(parts[5]),
        mem: parseFloat(parts[6]),
        vsz: parseInt(parts[7]),
        rss: parseInt(parts[8]),
        stat: parts[9],
        start: parts[10],
        time: parts[11],
        command: parts.slice(12).join(' '),
        cmdline: cmdline.stdout.trim(),
        environ: environ.stdout.trim().split('\n').filter(e => e.trim()),
        openFiles: openFiles.stdout.trim()
      });
    } catch (error) {
      console.error('Error getting process details:', error);
      res.status(500).json({ error: 'Failed to get process details' });
    }
  });

  /**
   * POST /api/infra/processes/:pid/kill - Kill a process
   */
  router.post('/processes/:pid/kill', async (req, res) => {
    try {
      const { pid } = req.params;
      const { signal = 'TERM' } = req.body;

      if (!/^\d+$/.test(pid)) {
        return res.status(400).json({ error: 'Invalid PID' });
      }

      // Prevent killing critical system processes
      const criticalPids = ['1']; // systemd
      if (criticalPids.includes(pid)) {
        return res.status(400).json({ error: 'Cannot kill critical system process' });
      }

      // Check process owner and name
      const { stdout: psOut } = await execAsync(`ps -p ${pid} -o user,comm --no-headers`).catch(() => ({ stdout: '' }));
      if (!psOut.trim()) {
        return res.status(404).json({ error: 'Process not found' });
      }

      const [owner, name] = psOut.trim().split(/\s+/);

      // Warn about critical processes
      const criticalNames = ['sshd', 'systemd', 'dockerd', 'containerd'];
      if (criticalNames.includes(name)) {
        return res.status(400).json({ error: `Cannot kill critical process: ${name}` });
      }

      const validSignals = ['TERM', 'KILL', 'HUP', 'INT', 'QUIT', 'USR1', 'USR2'];
      if (!validSignals.includes(signal.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid signal' });
      }

      // Use sudo if not our process
      const currentUser = process.env.USER || 'thornburywn';
      const cmd = owner !== currentUser
        ? `sudo kill -${signal.toUpperCase()} ${pid}`
        : `kill -${signal.toUpperCase()} ${pid}`;

      await execAsync(cmd);

      res.json({
        success: true,
        pid: parseInt(pid),
        signal: signal.toUpperCase(),
        owner,
        name
      });
    } catch (error) {
      console.error('Error killing process:', error);
      res.status(500).json({ error: error.message || 'Failed to kill process' });
    }
  });

  // ============================================
  // NETWORK DIAGNOSTICS
  // ============================================

  /**
   * GET /api/infra/network/interfaces - List network interfaces
   */
  router.get('/network/interfaces', async (req, res) => {
    try {
      const { stdout } = await execAsync('ip -j addr show');
      const interfaces = JSON.parse(stdout);

      res.json({
        interfaces: interfaces.map(iface => ({
          name: iface.ifname,
          state: iface.operstate,
          mac: iface.address,
          mtu: iface.mtu,
          addresses: iface.addr_info?.map(a => ({
            family: a.family,
            address: a.local,
            prefixlen: a.prefixlen,
            broadcast: a.broadcast
          })) || []
        }))
      });
    } catch (error) {
      console.error('Error listing interfaces:', error);
      res.status(500).json({ error: 'Failed to list network interfaces' });
    }
  });

  /**
   * GET /api/infra/network/connections - List active connections
   */
  router.get('/network/connections', async (req, res) => {
    try {
      const { stdout } = await execAsync('ss -tuln --no-header');

      const connections = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            protocol: parts[0],
            recvQ: parts[1],
            sendQ: parts[2],
            localAddress: parts[3],
            peerAddress: parts[4],
            state: parts[5] || 'LISTEN'
          };
        });

      res.json({ connections, count: connections.length });
    } catch (error) {
      console.error('Error listing connections:', error);
      res.status(500).json({ error: 'Failed to list connections' });
    }
  });

  /**
   * POST /api/infra/network/ping - Ping a host
   */
  router.post('/network/ping', async (req, res) => {
    try {
      const { host, count = 4 } = req.body;

      if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
        return res.status(400).json({ error: 'Invalid host' });
      }

      const pingCount = Math.min(Math.max(parseInt(count), 1), 10);
      const { stdout, stderr } = await execAsync(`ping -c ${pingCount} ${host} 2>&1`, { timeout: 30000 });

      // Parse ping statistics
      const statsMatch = stdout.match(/(\d+) packets transmitted, (\d+) received.*time (\d+)ms/);
      const rttMatch = stdout.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);

      res.json({
        host,
        success: !stderr && statsMatch && parseInt(statsMatch[2]) > 0,
        transmitted: statsMatch ? parseInt(statsMatch[1]) : 0,
        received: statsMatch ? parseInt(statsMatch[2]) : 0,
        time: statsMatch ? parseInt(statsMatch[3]) : 0,
        rtt: rttMatch ? {
          min: parseFloat(rttMatch[1]),
          avg: parseFloat(rttMatch[2]),
          max: parseFloat(rttMatch[3]),
          mdev: parseFloat(rttMatch[4])
        } : null,
        output: stdout
      });
    } catch (error) {
      res.json({
        host: req.body.host,
        success: false,
        error: 'Host unreachable',
        output: error.stdout || error.message
      });
    }
  });

  /**
   * POST /api/infra/network/dns - DNS lookup
   */
  router.post('/network/dns', async (req, res) => {
    try {
      const { host, type = 'A' } = req.body;

      if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
        return res.status(400).json({ error: 'Invalid host' });
      }

      const validTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];
      if (!validTypes.includes(type.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid record type' });
      }

      const { stdout } = await execAsync(`dig +short ${type.toUpperCase()} ${host}`, { timeout: 10000 });

      res.json({
        host,
        type: type.toUpperCase(),
        results: stdout.trim().split('\n').filter(r => r.trim())
      });
    } catch (error) {
      console.error('Error doing DNS lookup:', error);
      res.status(500).json({ error: 'DNS lookup failed' });
    }
  });

  /**
   * POST /api/infra/network/port-check - Check if port is open
   */
  router.post('/network/port-check', async (req, res) => {
    try {
      const { host, port } = req.body;

      if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
        return res.status(400).json({ error: 'Invalid host' });
      }

      if (!port || port < 1 || port > 65535) {
        return res.status(400).json({ error: 'Invalid port' });
      }

      const { stdout } = await execAsync(
        `timeout 5 bash -c "echo >/dev/tcp/${host}/${port}" 2>&1 && echo "open" || echo "closed"`,
        { timeout: 10000 }
      ).catch(() => ({ stdout: 'closed' }));

      res.json({
        host,
        port: parseInt(port),
        open: stdout.trim() === 'open'
      });
    } catch (error) {
      res.json({
        host: req.body.host,
        port: parseInt(req.body.port),
        open: false
      });
    }
  });

  /**
   * GET /api/infra/network/hosts - Get /etc/hosts contents
   */
  router.get('/network/hosts', async (req, res) => {
    try {
      const content = readFileSync('/etc/hosts', 'utf-8');
      const entries = content.split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            ip: parts[0],
            hostnames: parts.slice(1)
          };
        });

      res.json({ entries, raw: content });
    } catch (error) {
      console.error('Error reading hosts file:', error);
      res.status(500).json({ error: 'Failed to read hosts file' });
    }
  });

  // ============================================
  // SECURITY MONITORING
  // ============================================

  /**
   * GET /api/infra/security/ssh/sessions - Active SSH sessions
   */
  router.get('/security/ssh/sessions', async (req, res) => {
    try {
      const { stdout } = await execAsync('who');

      const sessions = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            user: parts[0],
            tty: parts[1],
            date: parts[2],
            time: parts[3],
            from: parts[4]?.replace(/[()]/g, '') || 'local'
          };
        });

      res.json({ sessions, count: sessions.length });
    } catch (error) {
      console.error('Error listing SSH sessions:', error);
      res.status(500).json({ error: 'Failed to list SSH sessions' });
    }
  });

  /**
   * GET /api/infra/security/ssh/failed - Failed SSH login attempts
   */
  router.get('/security/ssh/failed', async (req, res) => {
    try {
      const { limit = 50 } = req.query;

      const { stdout } = await execAsync(
        `sudo grep "Failed password" /var/log/auth.log 2>/dev/null | tail -${limit}`,
        { maxBuffer: 5 * 1024 * 1024 }
      ).catch(() => ({ stdout: '' }));

      const attempts = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Jan 12 21:30:45 hostname sshd[12345]: Failed password for invalid user admin from 192.168.1.100 port 22 ssh2
          const match = line.match(/(\w+\s+\d+\s+[\d:]+).*Failed password for (?:invalid user )?(\S+) from ([\d.]+) port (\d+)/);
          if (match) {
            return {
              timestamp: match[1],
              user: match[2],
              ip: match[3],
              port: match[4]
            };
          }
          return null;
        })
        .filter(Boolean)
        .reverse();

      res.json({ attempts, count: attempts.length });
    } catch (error) {
      console.error('Error fetching failed logins:', error);
      res.status(500).json({ error: 'Failed to fetch failed login attempts' });
    }
  });

  /**
   * GET /api/infra/security/ssh/keys - List authorized SSH keys
   */
  router.get('/security/ssh/keys', async (req, res) => {
    try {
      const authKeysPath = `${process.env.HOME}/.ssh/authorized_keys`;

      if (!existsSync(authKeysPath)) {
        return res.json({ keys: [] });
      }

      const content = readFileSync(authKeysPath, 'utf-8');
      const keys = content.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map((line, index) => {
          const parts = line.trim().split(/\s+/);
          const type = parts[0];
          const key = parts[1];
          const comment = parts.slice(2).join(' ') || `key-${index + 1}`;

          // Generate fingerprint
          let fingerprint = '';
          try {
            const { stdout } = require('child_process').execSync(
              `echo "${line}" | ssh-keygen -lf - 2>/dev/null`
            ).toString();
            fingerprint = stdout.split(/\s+/)[1] || '';
          } catch {}

          return {
            index,
            type,
            fingerprint,
            comment,
            keyPreview: key ? `${key.substring(0, 20)}...${key.slice(-20)}` : ''
          };
        });

      res.json({ keys, count: keys.length });
    } catch (error) {
      console.error('Error listing SSH keys:', error);
      res.status(500).json({ error: 'Failed to list SSH keys' });
    }
  });

  /**
   * GET /api/infra/security/fail2ban/status - Fail2ban status
   */
  router.get('/security/fail2ban/status', async (req, res) => {
    try {
      // Check if fail2ban is installed and running
      const { stdout: statusOut } = await execAsync('sudo fail2ban-client status 2>/dev/null').catch(() => ({ stdout: '' }));

      if (!statusOut) {
        return res.json({ installed: false, running: false, jails: [] });
      }

      // Parse jail list
      const jailMatch = statusOut.match(/Jail list:\s*(.+)/);
      const jailNames = jailMatch ? jailMatch[1].split(',').map(j => j.trim()).filter(Boolean) : [];

      // Get details for each jail
      const jails = await Promise.all(jailNames.map(async (jail) => {
        try {
          const { stdout } = await execAsync(`sudo fail2ban-client status ${jail}`);

          const currentlyBanned = stdout.match(/Currently banned:\s*(\d+)/);
          const totalBanned = stdout.match(/Total banned:\s*(\d+)/);
          const bannedIPs = stdout.match(/Banned IP list:\s*(.+)/);

          return {
            name: jail,
            currentlyBanned: currentlyBanned ? parseInt(currentlyBanned[1]) : 0,
            totalBanned: totalBanned ? parseInt(totalBanned[1]) : 0,
            bannedIPs: bannedIPs ? bannedIPs[1].trim().split(/\s+/).filter(Boolean) : []
          };
        } catch {
          return { name: jail, currentlyBanned: 0, totalBanned: 0, bannedIPs: [] };
        }
      }));

      res.json({
        installed: true,
        running: true,
        jails
      });
    } catch (error) {
      console.error('Error getting fail2ban status:', error);
      res.json({ installed: false, running: false, jails: [] });
    }
  });

  /**
   * POST /api/infra/security/fail2ban/unban - Unban an IP
   */
  router.post('/security/fail2ban/unban', async (req, res) => {
    try {
      const { jail, ip } = req.body;

      if (!jail || !ip) {
        return res.status(400).json({ error: 'Jail and IP are required' });
      }

      if (!/^[\d.]+$/.test(ip)) {
        return res.status(400).json({ error: 'Invalid IP address' });
      }

      await execAsync(`sudo fail2ban-client set ${jail} unbanip ${ip}`);

      res.json({ success: true, jail, ip });
    } catch (error) {
      console.error('Error unbanning IP:', error);
      res.status(500).json({ error: 'Failed to unban IP' });
    }
  });

  /**
   * GET /api/infra/security/ports - Open ports and services
   */
  router.get('/security/ports', async (req, res) => {
    try {
      const { stdout } = await execAsync('ss -tlnp 2>/dev/null');

      const ports = stdout.trim().split('\n').slice(1)
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          const localAddr = parts[3];
          const [ip, port] = localAddr.split(':').slice(-2);
          const processInfo = parts[5] || '';
          const processMatch = processInfo.match(/users:\(\("([^"]+)",pid=(\d+)/);

          return {
            port: parseInt(port),
            ip: ip === '*' ? '0.0.0.0' : ip,
            state: parts[0],
            process: processMatch ? processMatch[1] : 'unknown',
            pid: processMatch ? parseInt(processMatch[2]) : null
          };
        })
        .sort((a, b) => a.port - b.port);

      res.json({ ports, count: ports.length });
    } catch (error) {
      console.error('Error listing open ports:', error);
      res.status(500).json({ error: 'Failed to list open ports' });
    }
  });

  /**
   * GET /api/infra/security/last-logins - Recent login history
   */
  router.get('/security/last-logins', async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const { stdout } = await execAsync(`last -${limit} -F`);

      const logins = stdout.trim().split('\n')
        .filter(line => line.trim() && !line.startsWith('wtmp') && !line.startsWith('reboot'))
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            user: parts[0],
            tty: parts[1],
            from: parts[2] || 'local',
            loginTime: parts.slice(3, 7).join(' '),
            duration: parts.slice(-1)[0]
          };
        });

      res.json({ logins, count: logins.length });
    } catch (error) {
      console.error('Error fetching last logins:', error);
      res.status(500).json({ error: 'Failed to fetch login history' });
    }
  });

  // ============================================
  // SCHEDULED TASKS (Cron & Systemd Timers)
  // ============================================

  /**
   * GET /api/infra/scheduled/cron - List cron jobs
   */
  router.get('/scheduled/cron', async (req, res) => {
    try {
      // Get user crontab
      const { stdout: userCron } = await execAsync('crontab -l 2>/dev/null').catch(() => ({ stdout: '' }));

      const jobs = userCron.trim().split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map((line, index) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 6) {
            return {
              id: `user-${index}`,
              type: 'user',
              schedule: parts.slice(0, 5).join(' '),
              command: parts.slice(5).join(' '),
              minute: parts[0],
              hour: parts[1],
              dayOfMonth: parts[2],
              month: parts[3],
              dayOfWeek: parts[4]
            };
          }
          return null;
        })
        .filter(Boolean);

      // Also get system cron jobs if sudo available
      let systemJobs = [];
      try {
        const { stdout: systemCron } = await execAsync('sudo cat /etc/crontab 2>/dev/null');
        systemJobs = systemCron.trim().split('\n')
          .filter(line => line.trim() && !line.startsWith('#') && !line.includes('='))
          .map((line, index) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              return {
                id: `system-${index}`,
                type: 'system',
                schedule: parts.slice(0, 5).join(' '),
                user: parts[5],
                command: parts.slice(6).join(' '),
                minute: parts[0],
                hour: parts[1],
                dayOfMonth: parts[2],
                month: parts[3],
                dayOfWeek: parts[4]
              };
            }
            return null;
          })
          .filter(Boolean);
      } catch {}

      res.json({ jobs: [...jobs, ...systemJobs] });
    } catch (error) {
      console.error('Error listing cron jobs:', error);
      res.status(500).json({ error: 'Failed to list cron jobs' });
    }
  });

  /**
   * GET /api/infra/scheduled/timers - List systemd timers
   */
  router.get('/scheduled/timers', async (req, res) => {
    try {
      const { stdout } = await execAsync('systemctl list-timers --all --no-pager --output=json 2>/dev/null').catch(async () => {
        // Fallback if JSON output not supported
        const { stdout: fallback } = await execAsync('systemctl list-timers --all --no-pager');
        return { stdout: fallback, isText: true };
      });

      let timers = [];

      try {
        timers = JSON.parse(stdout);
      } catch {
        // Parse text output
        const lines = stdout.trim().split('\n').slice(1, -2); // Skip header and footer
        timers = lines.map(line => {
          const parts = line.trim().split(/\s{2,}/);
          return {
            next: parts[0],
            left: parts[1],
            last: parts[2],
            passed: parts[3],
            unit: parts[4],
            activates: parts[5]
          };
        }).filter(t => t.unit);
      }

      res.json({ timers, count: timers.length });
    } catch (error) {
      console.error('Error listing timers:', error);
      res.status(500).json({ error: 'Failed to list systemd timers' });
    }
  });

  /**
   * POST /api/infra/scheduled/timers/:name/toggle - Enable/disable timer
   */
  router.post('/scheduled/timers/:name/toggle', async (req, res) => {
    try {
      const { name } = req.params;
      const { enabled } = req.body;

      if (!/^[a-zA-Z0-9._@-]+$/.test(name)) {
        return res.status(400).json({ error: 'Invalid timer name' });
      }

      const action = enabled ? 'enable' : 'disable';
      await execAsync(`sudo systemctl ${action} ${name}`);

      // Also start/stop it
      const startStop = enabled ? 'start' : 'stop';
      await execAsync(`sudo systemctl ${startStop} ${name}`).catch(() => {});

      res.json({ success: true, timer: name, enabled });
    } catch (error) {
      console.error('Error toggling timer:', error);
      res.status(500).json({ error: 'Failed to toggle timer' });
    }
  });

  /**
   * POST /api/infra/scheduled/cron - Add cron job
   */
  router.post('/scheduled/cron', async (req, res) => {
    try {
      const { schedule, command } = req.body;

      if (!schedule || !command) {
        return res.status(400).json({ error: 'Schedule and command are required' });
      }

      // Validate cron schedule format (basic check)
      const cronParts = schedule.trim().split(/\s+/);
      if (cronParts.length !== 5) {
        return res.status(400).json({ error: 'Invalid cron schedule format. Expected: min hour dom month dow' });
      }

      // Get current crontab
      const { stdout: currentCron } = await execAsync('crontab -l 2>/dev/null').catch(() => ({ stdout: '' }));

      // Add new job
      const newCron = currentCron.trim() + '\n' + `${schedule} ${command}` + '\n';

      // Install new crontab
      await execAsync(`echo "${newCron}" | crontab -`);

      res.json({ success: true, schedule, command });
    } catch (error) {
      console.error('Error adding cron job:', error);
      res.status(500).json({ error: 'Failed to add cron job' });
    }
  });

  /**
   * DELETE /api/infra/scheduled/cron/:index - Remove cron job
   */
  router.delete('/scheduled/cron/:index', async (req, res) => {
    try {
      const { index } = req.params;
      const idx = parseInt(index);

      // Get current crontab
      const { stdout: currentCron } = await execAsync('crontab -l 2>/dev/null');

      const lines = currentCron.trim().split('\n');
      const jobLines = lines.filter(line => line.trim() && !line.startsWith('#'));

      if (idx < 0 || idx >= jobLines.length) {
        return res.status(404).json({ error: 'Cron job not found' });
      }

      // Remove the job
      let jobIndex = 0;
      const newLines = lines.filter(line => {
        if (line.trim() && !line.startsWith('#')) {
          if (jobIndex === idx) {
            jobIndex++;
            return false;
          }
          jobIndex++;
        }
        return true;
      });

      // Install new crontab
      await execAsync(`echo "${newLines.join('\n')}" | crontab -`);

      res.json({ success: true, index: idx });
    } catch (error) {
      console.error('Error removing cron job:', error);
      res.status(500).json({ error: 'Failed to remove cron job' });
    }
  });

  return router;
}
