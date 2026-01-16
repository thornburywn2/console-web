/**
 * Users & Firewall Management Routes
 * Provides API endpoints for:
 * - Authentik user management (via Authentik Admin API)
 * - Server/Linux user management
 * - Firewall (UFW) management
 */

import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { createLogger } from '../services/logger.js';

const log = createLogger('users-firewall');
const execAsync = promisify(exec);

// Default Authentik URL from env (can be overridden in settings)
const DEFAULT_AUTHENTIK_URL = process.env.AUTHENTIK_URL || 'http://localhost:9000';

export function createUsersFirewallRouter(prisma) {
  const router = Router();

  // Get Authentik settings from database
  async function getAuthentikSettings() {
    let settings = await prisma.authentikSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.authentikSettings.create({
        data: {
          id: 'default',
          apiUrl: DEFAULT_AUTHENTIK_URL,
          enabled: false,
          configured: false
        }
      });
    }
    return settings;
  }

  // Helper to make Authentik API requests
  async function authentikAPI(endpoint, options = {}) {
    const settings = await getAuthentikSettings();

    if (!settings.apiToken) {
      throw new Error('Authentik API token not configured');
    }

    const url = `${settings.apiUrl || DEFAULT_AUTHENTIK_URL}/api/v3${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authentik API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============================================
  // AUTHENTIK CONFIGURATION
  // ============================================

  /**
   * GET /api/admin-users/authentik/settings - Get Authentik configuration
   */
  router.get('/authentik/settings', async (req, res) => {
    try {
      const settings = await getAuthentikSettings();
      res.json({
        apiUrl: settings.apiUrl || DEFAULT_AUTHENTIK_URL,
        hasToken: !!settings.apiToken,
        tokenPreview: settings.apiToken ? `${settings.apiToken.substring(0, 8)}...${settings.apiToken.slice(-4)}` : null,
        enabled: settings.enabled,
        configured: settings.configured,
        lastValidated: settings.lastValidated
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/admin-users/authentik/settings - Update Authentik configuration
   */
  router.put('/authentik/settings', async (req, res) => {
    try {
      const { apiUrl, apiToken } = req.body;

      const updateData = {};
      if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
      if (apiToken !== undefined) updateData.apiToken = apiToken;

      // Test the token if provided
      if (apiToken) {
        try {
          const testUrl = `${apiUrl || DEFAULT_AUTHENTIK_URL}/api/v3/core/users/me/`;
          const testResponse = await fetch(testUrl, {
            headers: { 'Authorization': `Bearer ${apiToken}` }
          });
          if (!testResponse.ok) {
            return res.status(400).json({ error: 'Invalid API token - authentication failed' });
          }
          updateData.configured = true;
          updateData.enabled = true;
          updateData.lastValidated = new Date();
        } catch (e) {
          return res.status(400).json({ error: `Cannot connect to Authentik: ${e.message}` });
        }
      }

      const settings = await prisma.authentikSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', ...updateData },
        update: updateData
      });

      res.json({
        success: true,
        apiUrl: settings.apiUrl,
        hasToken: !!settings.apiToken,
        configured: settings.configured,
        enabled: settings.enabled
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AUTHENTIK USER MANAGEMENT
  // ============================================

  /**
   * GET /api/admin-users/authentik/status - Check Authentik API status
   */
  router.get('/authentik/status', async (req, res) => {
    try {
      const settings = await getAuthentikSettings();

      if (!settings.apiToken) {
        return res.json({
          configured: false,
          connected: false,
          message: 'Authentik API token not configured',
          url: settings.apiUrl || DEFAULT_AUTHENTIK_URL
        });
      }

      // Try to fetch current user to verify token
      const data = await authentikAPI('/core/users/me/');
      res.json({
        configured: true,
        connected: true,
        url: settings.apiUrl || DEFAULT_AUTHENTIK_URL,
        user: data.username || 'Unknown'
      });
    } catch (error) {
      const settings = await getAuthentikSettings();
      res.json({
        configured: !!settings?.apiToken,
        connected: false,
        url: settings?.apiUrl || DEFAULT_AUTHENTIK_URL,
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin-users/authentik/users - List all Authentik users
   */
  router.get('/authentik/users', async (req, res) => {
    try {
      const { search, page = 1, pageSize = 50, ordering = '-last_login' } = req.query;

      let endpoint = `/core/users/?page=${page}&page_size=${pageSize}&ordering=${ordering}`;
      if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }

      const data = await authentikAPI(endpoint);

      res.json({
        users: data.results.map(user => ({
          pk: user.pk,
          username: user.username,
          name: user.name,
          email: user.email,
          isActive: user.is_active,
          isSuperuser: user.is_superuser,
          lastLogin: user.last_login,
          dateJoined: user.date_joined,
          groups: user.groups_obj?.map(g => g.name) || [],
          avatar: user.avatar,
          uid: user.uid,
          path: user.path
        })),
        pagination: {
          count: data.count,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(data.count / pageSize)
        }
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to list authentik users');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin-users/authentik/users/:id - Get single user details
   */
  router.get('/authentik/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const user = await authentikAPI(`/core/users/${id}/`);

      res.json({
        pk: user.pk,
        username: user.username,
        name: user.name,
        email: user.email,
        isActive: user.is_active,
        isSuperuser: user.is_superuser,
        lastLogin: user.last_login,
        dateJoined: user.date_joined,
        groups: user.groups_obj?.map(g => ({ pk: g.pk, name: g.name })) || [],
        avatar: user.avatar,
        uid: user.uid,
        path: user.path,
        attributes: user.attributes || {}
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get authentik user');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin-users/authentik/users - Create new Authentik user
   */
  router.post('/authentik/users', async (req, res) => {
    try {
      const { username, name, email, password, isActive = true, groups = [] } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const userData = {
        username,
        name: name || username,
        email: email || '',
        is_active: isActive,
        groups,
        path: 'users'
      };

      const user = await authentikAPI('/core/users/', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      // Set password if provided
      if (password) {
        await authentikAPI(`/core/users/${user.pk}/set_password/`, {
          method: 'POST',
          body: JSON.stringify({ password })
        });
      }

      res.json({
        success: true,
        user: {
          pk: user.pk,
          username: user.username,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to create authentik user');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/admin-users/authentik/users/:id - Update Authentik user
   */
  router.put('/authentik/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, name, email, isActive, groups } = req.body;

      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (isActive !== undefined) updateData.is_active = isActive;
      if (groups !== undefined) updateData.groups = groups;

      const user = await authentikAPI(`/core/users/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      res.json({
        success: true,
        user: {
          pk: user.pk,
          username: user.username,
          name: user.name,
          email: user.email,
          isActive: user.is_active
        }
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to update authentik user');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin-users/authentik/users/:id/set-password - Set user password
   */
  router.post('/authentik/users/:id/set-password', async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      await authentikAPI(`/core/users/${id}/set_password/`, {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      res.json({ success: true });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to set password');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin-users/authentik/users/:id/toggle-active - Toggle user active status
   */
  router.post('/authentik/users/:id/toggle-active', async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      await authentikAPI(`/core/users/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive })
      });

      res.json({ success: true, isActive });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to toggle user status');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/admin-users/authentik/users/:id - Delete Authentik user
   */
  router.delete('/authentik/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await authentikAPI(`/core/users/${id}/`, {
        method: 'DELETE'
      });

      res.json({ success: true });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to delete authentik user');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin-users/authentik/groups - List all Authentik groups
   */
  router.get('/authentik/groups', async (req, res) => {
    try {
      const data = await authentikAPI('/core/groups/?page_size=100');

      res.json({
        groups: data.results.map(group => ({
          pk: group.pk,
          name: group.name,
          isSuperuserGroup: group.is_superuser_group,
          parent: group.parent,
          numPk: group.num_pk,
          users: group.users?.length || 0
        }))
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to list authentik groups');
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SERVER/LINUX USER MANAGEMENT
  // ============================================

  /**
   * GET /api/admin-users/server/users - List server users
   */
  router.get('/server/users', async (req, res) => {
    try {
      const { showSystem = false } = req.query;

      const { stdout } = await execAsync('getent passwd');

      const users = stdout.trim().split('\n')
        .map(line => {
          const [username, , uid, gid, gecos, home, shell] = line.split(':');
          return {
            username,
            uid: parseInt(uid),
            gid: parseInt(gid),
            fullName: gecos?.split(',')[0] || '',
            home,
            shell,
            isSystem: parseInt(uid) < 1000 || parseInt(uid) === 65534
          };
        })
        .filter(user => showSystem === 'true' || !user.isSystem)
        .sort((a, b) => a.username.localeCompare(b.username));

      // Get groups for each user
      for (const user of users) {
        try {
          const { stdout: groupsOut } = await execAsync(`groups ${user.username}`);
          user.groups = groupsOut.split(':')[1]?.trim().split(' ').filter(Boolean) || [];
        } catch {
          user.groups = [];
        }
      }

      // Get last login info
      try {
        const { stdout: lastOut } = await execAsync('lastlog -t 365 2>/dev/null || true');
        const lastLogins = {};
        lastOut.split('\n').slice(1).forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4 && parts[1] !== '**Never') {
            lastLogins[parts[0]] = parts.slice(1).join(' ');
          }
        });

        users.forEach(user => {
          user.lastLogin = lastLogins[user.username] || 'Never';
        });
      } catch {
        users.forEach(user => user.lastLogin = 'Unknown');
      }

      res.json({ users, count: users.length });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to list server users');
      res.status(500).json({ error: 'Failed to list users' });
    }
  });

  /**
   * POST /api/admin-users/server/users - Create new server user
   */
  router.post('/server/users', async (req, res) => {
    try {
      const { username, fullName, shell = '/bin/bash', createHome = true, groups = [] } = req.body;

      if (!username || !/^[a-z_][a-z0-9_-]*[$]?$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username. Must start with lowercase letter or underscore.' });
      }

      // Check if user exists
      try {
        await execAsync(`id ${username}`);
        return res.status(400).json({ error: 'User already exists' });
      } catch {
        // User doesn't exist, continue
      }

      // Build useradd command
      let cmd = 'sudo useradd';
      if (createHome) cmd += ' -m';
      if (fullName) cmd += ` -c "${fullName}"`;
      if (shell) cmd += ` -s ${shell}`;
      if (groups.length > 0) cmd += ` -G ${groups.join(',')}`;
      cmd += ` ${username}`;

      await execAsync(cmd);

      res.json({
        success: true,
        user: { username, fullName, shell, groups }
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to create server user');
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  /**
   * PUT /api/admin-users/server/users/:username - Update server user
   */
  router.put('/server/users/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const { fullName, shell, groups, locked } = req.body;

      // Validate username exists
      try {
        await execAsync(`id ${username}`);
      } catch {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent modifying critical users
      const criticalUsers = ['root', 'nobody', 'systemd-network'];
      if (criticalUsers.includes(username)) {
        return res.status(400).json({ error: 'Cannot modify critical system user' });
      }

      const commands = [];

      if (fullName !== undefined) {
        commands.push(`sudo usermod -c "${fullName}" ${username}`);
      }

      if (shell !== undefined) {
        commands.push(`sudo usermod -s ${shell} ${username}`);
      }

      if (groups !== undefined) {
        commands.push(`sudo usermod -G ${groups.join(',')} ${username}`);
      }

      if (locked !== undefined) {
        const lockCmd = locked ? 'usermod -L' : 'usermod -U';
        commands.push(`sudo ${lockCmd} ${username}`);
      }

      for (const cmd of commands) {
        await execAsync(cmd);
      }

      res.json({ success: true, username });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to update server user');
      res.status(500).json({ error: error.message || 'Failed to update user' });
    }
  });

  /**
   * POST /api/admin-users/server/users/:username/set-password - Set user password
   */
  router.post('/server/users/:username/set-password', async (req, res) => {
    try {
      const { username } = req.params;
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Use chpasswd to set password
      await execAsync(`echo "${username}:${password}" | sudo chpasswd`);

      res.json({ success: true });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to set password');
      res.status(500).json({ error: error.message || 'Failed to set password' });
    }
  });

  /**
   * DELETE /api/admin-users/server/users/:username - Delete server user
   */
  router.delete('/server/users/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const { removeHome = false } = req.query;

      // Prevent deleting critical users
      const criticalUsers = ['root', 'nobody', process.env.USER || 'thornburywn'];
      if (criticalUsers.includes(username)) {
        return res.status(400).json({ error: 'Cannot delete critical system user or current user' });
      }

      const cmd = removeHome === 'true'
        ? `sudo userdel -r ${username}`
        : `sudo userdel ${username}`;

      await execAsync(cmd);

      res.json({ success: true, username, homeRemoved: removeHome === 'true' });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to delete server user');
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  });

  /**
   * GET /api/admin-users/server/groups - List server groups
   */
  router.get('/server/groups', async (req, res) => {
    try {
      const { showSystem = false } = req.query;

      const { stdout } = await execAsync('getent group');

      const groups = stdout.trim().split('\n')
        .map(line => {
          const [name, , gid, members] = line.split(':');
          return {
            name,
            gid: parseInt(gid),
            members: members ? members.split(',').filter(Boolean) : [],
            isSystem: parseInt(gid) < 1000 || parseInt(gid) === 65534
          };
        })
        .filter(group => showSystem === 'true' || !group.isSystem)
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({ groups, count: groups.length });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to list server groups');
      res.status(500).json({ error: 'Failed to list groups' });
    }
  });

  /**
   * GET /api/admin-users/server/shells - List available shells
   */
  router.get('/server/shells', async (req, res) => {
    try {
      const content = readFileSync('/etc/shells', 'utf-8');
      const shells = content.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(shell => shell.trim());

      res.json({ shells });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to list shells');
      res.json({ shells: ['/bin/bash', '/bin/sh', '/usr/bin/zsh', '/bin/false', '/usr/sbin/nologin'] });
    }
  });

  // ============================================
  // FIREWALL (UFW) MANAGEMENT
  // ============================================

  // Helper to run ufw commands with proper sudo handling
  async function runUfwCommand(cmd) {
    try {
      // Try with sudo first (passwordless sudo required)
      const { stdout, stderr } = await execAsync(`sudo ${cmd}`, { timeout: 10000 });
      return { success: true, stdout, stderr };
    } catch (error) {
      // Check if it's a sudo password error
      if (error.message?.includes('password') || error.message?.includes('terminal')) {
        return {
          success: false,
          needsSudo: true,
          error: 'Passwordless sudo required for UFW. Run: echo "$USER ALL=(ALL) NOPASSWD: /usr/sbin/ufw" | sudo tee /etc/sudoers.d/ufw-nopasswd'
        };
      }
      throw error;
    }
  }

  /**
   * GET /api/admin-users/firewall/status - Get UFW status
   */
  router.get('/firewall/status', async (req, res) => {
    try {
      // Check if UFW is installed
      try {
        await execAsync('which ufw');
      } catch {
        return res.json({
          installed: false,
          message: 'UFW is not installed. Install with: sudo apt install ufw'
        });
      }

      const result = await runUfwCommand('ufw status verbose');
      if (!result.success) {
        return res.json({
          installed: true,
          active: false,
          needsSudo: true,
          sudoSetup: result.error
        });
      }

      const lines = result.stdout.trim().split('\n');
      const statusLine = lines.find(l => l.startsWith('Status:'));
      const isActive = statusLine?.includes('active') || false;

      // Parse default policies
      const defaultIncoming = lines.find(l => l.includes('Default:'))?.match(/incoming\s*\((\w+)\)/)?.[1] || 'deny';
      const defaultOutgoing = lines.find(l => l.includes('Default:'))?.match(/outgoing\s*\((\w+)\)/)?.[1] || 'allow';

      // Parse logging level
      const loggingLine = lines.find(l => l.startsWith('Logging:'));
      const logging = loggingLine?.split(':')[1]?.trim() || 'off';

      res.json({
        installed: true,
        active: isActive,
        defaultIncoming,
        defaultOutgoing,
        logging,
        raw: result.stdout
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get firewall status');
      res.status(500).json({ error: 'Failed to get firewall status', details: error.message });
    }
  });

  /**
   * GET /api/admin-users/firewall/rules - List UFW rules
   */
  router.get('/firewall/rules', async (req, res) => {
    try {
      const result = await runUfwCommand('ufw status numbered');
      if (!result.success) {
        return res.json({ rules: [], needsSudo: true, sudoSetup: result.error });
      }

      const lines = result.stdout.trim().split('\n');
      const rules = [];

      // Parse rules (format: [ 1] 22/tcp ALLOW IN Anywhere)
      for (const line of lines) {
        const match = line.match(/\[\s*(\d+)\]\s+(.+?)\s+(ALLOW|DENY|REJECT|LIMIT)\s+(IN|OUT)?\s*(.*)/);
        if (match) {
          rules.push({
            number: parseInt(match[1]),
            port: match[2].trim(),
            action: match[3],
            direction: match[4] || 'IN',
            from: match[5]?.trim() || 'Anywhere'
          });
        }
      }

      res.json({ rules, count: rules.length });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to list firewall rules');
      res.status(500).json({ error: 'Failed to list firewall rules' });
    }
  });

  /**
   * POST /api/admin-users/firewall/enable - Enable UFW
   */
  router.post('/firewall/enable', async (req, res) => {
    try {
      const result = await runUfwCommand('ufw --force enable');
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }
      res.json({ success: true, message: 'Firewall enabled' });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to enable firewall');
      res.status(500).json({ error: 'Failed to enable firewall' });
    }
  });

  /**
   * POST /api/admin-users/firewall/disable - Disable UFW
   */
  router.post('/firewall/disable', async (req, res) => {
    try {
      const result = await runUfwCommand('ufw disable');
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }
      res.json({ success: true, message: 'Firewall disabled' });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to disable firewall');
      res.status(500).json({ error: 'Failed to disable firewall' });
    }
  });

  /**
   * POST /api/admin-users/firewall/rules - Add firewall rule
   */
  router.post('/firewall/rules', async (req, res) => {
    try {
      const {
        action = 'allow',
        direction = 'in',
        port,
        protocol,
        from,
        to,
        comment
      } = req.body;

      // Validate action
      const validActions = ['allow', 'deny', 'reject', 'limit'];
      if (!validActions.includes(action.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid action. Must be: allow, deny, reject, or limit' });
      }

      // Build the UFW command
      let cmd = `ufw ${action}`;

      // Direction
      if (direction === 'out') {
        cmd += ' out';
      }

      // From source
      if (from && from !== 'any') {
        cmd += ` from ${from}`;
      }

      // To destination
      if (to && to !== 'any') {
        cmd += ` to ${to}`;
      }

      // Port/service
      if (port) {
        // Validate port
        if (!/^[\d\/\w,-]+$/.test(port)) {
          return res.status(400).json({ error: 'Invalid port specification' });
        }

        if (protocol) {
          cmd += ` ${port}/${protocol}`;
        } else {
          cmd += ` ${port}`;
        }
      }

      // Add comment if provided
      if (comment) {
        cmd += ` comment '${comment.replace(/'/g, "\\'")}'`;
      }

      const result = await runUfwCommand(cmd);
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }

      res.json({
        success: true,
        message: 'Rule added successfully',
        rule: { action, direction, port, protocol, from, to, comment }
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to add firewall rule');
      res.status(500).json({ error: error.message || 'Failed to add firewall rule' });
    }
  });

  /**
   * DELETE /api/admin-users/firewall/rules/:number - Delete firewall rule by number
   * SSH (port 22) rules are protected and cannot be deleted
   */
  router.delete('/firewall/rules/:number', async (req, res) => {
    try {
      const { number } = req.params;

      if (!/^\d+$/.test(number)) {
        return res.status(400).json({ error: 'Invalid rule number' });
      }

      // First, get the rule to check if it's SSH
      const rulesResult = await runUfwCommand('ufw status numbered');
      if (rulesResult.success) {
        const lines = rulesResult.stdout.trim().split('\n');
        for (const line of lines) {
          const match = line.match(/\[\s*(\d+)\]\s+(.+?)\s+(ALLOW|DENY|REJECT|LIMIT)/);
          if (match && match[1] === number) {
            const port = match[2].trim().toLowerCase();
            // Protect SSH rules (port 22 or ssh service)
            if (port.includes('22') || port.includes('ssh') || port === 'openssh') {
              return res.status(403).json({
                error: 'SSH rules cannot be deleted for security. SSH access is protected.',
                protected: true
              });
            }
          }
        }
      }

      const result = await runUfwCommand(`ufw --force delete ${number}`);
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }

      res.json({ success: true, message: `Rule ${number} deleted` });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to delete firewall rule');
      res.status(500).json({ error: error.message || 'Failed to delete rule' });
    }
  });

  /**
   * POST /api/admin-users/firewall/default - Set default policy
   */
  router.post('/firewall/default', async (req, res) => {
    try {
      const { direction, policy } = req.body;

      const validDirections = ['incoming', 'outgoing', 'routed'];
      const validPolicies = ['allow', 'deny', 'reject'];

      if (!validDirections.includes(direction)) {
        return res.status(400).json({ error: 'Invalid direction. Must be: incoming, outgoing, or routed' });
      }

      if (!validPolicies.includes(policy)) {
        return res.status(400).json({ error: 'Invalid policy. Must be: allow, deny, or reject' });
      }

      const result = await runUfwCommand(`ufw default ${policy} ${direction}`);
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }

      res.json({ success: true, direction, policy });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to set default policy');
      res.status(500).json({ error: 'Failed to set default policy' });
    }
  });

  /**
   * POST /api/admin-users/firewall/reset - Reset UFW to defaults
   */
  router.post('/firewall/reset', async (req, res) => {
    try {
      const result = await runUfwCommand('ufw --force reset');
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }
      res.json({ success: true, message: 'Firewall reset to defaults. Remember to re-enable and add essential rules!' });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to reset firewall');
      res.status(500).json({ error: 'Failed to reset firewall' });
    }
  });

  /**
   * POST /api/admin-users/firewall/logging - Set logging level
   */
  router.post('/firewall/logging', async (req, res) => {
    try {
      const { level } = req.body;

      const validLevels = ['off', 'low', 'medium', 'high', 'full'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: 'Invalid logging level. Must be: off, low, medium, high, or full' });
      }

      const result = await runUfwCommand(`ufw logging ${level}`);
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }

      res.json({ success: true, level });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to set logging level');
      res.status(500).json({ error: 'Failed to set logging level' });
    }
  });

  /**
   * GET /api/admin-users/firewall/app-list - List UFW application profiles
   */
  router.get('/firewall/app-list', async (req, res) => {
    try {
      const result = await runUfwCommand('ufw app list');
      if (!result.success) {
        return res.json({ apps: [], needsSudo: true });
      }

      const apps = result.stdout.split('\n')
        .filter(line => line.trim() && !line.includes('Available applications:'))
        .map(line => line.trim());

      res.json({ apps });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to list app profiles');
      res.status(500).json({ error: 'Failed to list application profiles' });
    }
  });

  /**
   * GET /api/admin-users/firewall/app/:name - Get app profile details
   */
  router.get('/firewall/app/:name', async (req, res) => {
    try {
      const { name } = req.params;

      if (!/^[\w.-]+$/.test(name)) {
        return res.status(400).json({ error: 'Invalid app name' });
      }

      const result = await runUfwCommand(`ufw app info '${name}'`);
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }

      res.json({
        name,
        info: result.stdout.trim()
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get app info');
      res.status(500).json({ error: 'Failed to get app info' });
    }
  });

  /**
   * GET /api/admin-users/firewall/logs - Get UFW firewall logs
   * Returns recent firewall activity from system logs
   */
  router.get('/firewall/logs', async (req, res) => {
    try {
      const { lines = 100, filter = '' } = req.query;
      const lineCount = Math.min(parseInt(lines) || 100, 500);

      // Try different log sources
      let logs = [];
      let logSource = '';

      // Try journalctl first (systemd systems)
      try {
        const journalResult = await execAsync(
          `journalctl -k --no-pager -n ${lineCount} 2>/dev/null | grep -i "\\[UFW\\]" || true`,
          { timeout: 10000 }
        );
        if (journalResult.stdout.trim()) {
          logs = journalResult.stdout.trim().split('\n');
          logSource = 'journalctl';
        }
      } catch (e) {
        // Fallback to kernel log
      }

      // If no journalctl results, try dmesg
      if (logs.length === 0) {
        try {
          const dmesgResult = await execAsync(
            `dmesg 2>/dev/null | grep -i "\\[UFW\\]" | tail -${lineCount} || true`,
            { timeout: 10000 }
          );
          if (dmesgResult.stdout.trim()) {
            logs = dmesgResult.stdout.trim().split('\n');
            logSource = 'dmesg';
          }
        } catch (e) {
          // Continue
        }
      }

      // If still no results, try /var/log/ufw.log
      if (logs.length === 0) {
        try {
          const fileResult = await execAsync(
            `tail -${lineCount} /var/log/ufw.log 2>/dev/null || true`,
            { timeout: 10000 }
          );
          if (fileResult.stdout.trim()) {
            logs = fileResult.stdout.trim().split('\n');
            logSource = '/var/log/ufw.log';
          }
        } catch (e) {
          // Continue
        }
      }

      // If still no results, try /var/log/kern.log
      if (logs.length === 0) {
        try {
          const kernResult = await execAsync(
            `grep -i "\\[UFW\\]" /var/log/kern.log 2>/dev/null | tail -${lineCount} || true`,
            { timeout: 10000 }
          );
          if (kernResult.stdout.trim()) {
            logs = kernResult.stdout.trim().split('\n');
            logSource = '/var/log/kern.log';
          }
        } catch (e) {
          // Continue
        }
      }

      // Parse log entries
      const parsedLogs = logs
        .filter(line => line.trim())
        .filter(line => !filter || line.toLowerCase().includes(filter.toLowerCase()))
        .map(line => {
          // Try to parse UFW log format
          const blockMatch = line.match(/\[UFW\s+(BLOCK|ALLOW|AUDIT)\]/i);
          const srcMatch = line.match(/SRC=(\S+)/);
          const dstMatch = line.match(/DST=(\S+)/);
          const protoMatch = line.match(/PROTO=(\S+)/);
          const sptMatch = line.match(/SPT=(\d+)/);
          const dptMatch = line.match(/DPT=(\d+)/);
          const inMatch = line.match(/IN=(\S*)/);
          const outMatch = line.match(/OUT=(\S*)/);
          const timestampMatch = line.match(/^(\w+\s+\d+\s+[\d:]+)|(\d{4}-\d{2}-\d{2}T[\d:.]+)/);

          return {
            raw: line,
            action: blockMatch?.[1] || 'UNKNOWN',
            src: srcMatch?.[1] || '',
            dst: dstMatch?.[1] || '',
            proto: protoMatch?.[1] || '',
            srcPort: sptMatch?.[1] || '',
            dstPort: dptMatch?.[1] || '',
            interface: inMatch?.[1] || outMatch?.[1] || '',
            timestamp: timestampMatch?.[0] || ''
          };
        })
        .reverse(); // Most recent first

      res.json({
        logs: parsedLogs,
        count: parsedLogs.length,
        source: logSource || 'none',
        message: logs.length === 0 ? 'No UFW logs found. Ensure UFW logging is enabled (ufw logging on).' : null
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch firewall logs');
      res.status(500).json({ error: 'Failed to fetch firewall logs' });
    }
  });

  /**
   * POST /api/admin-users/firewall/ensure-ssh - Ensure SSH rule exists
   * Creates SSH allow rule if it doesn't exist
   */
  router.post('/firewall/ensure-ssh', async (req, res) => {
    try {
      // Check if SSH rule exists
      const rulesResult = await runUfwCommand('ufw status');
      if (!rulesResult.success) {
        return res.status(403).json({ error: rulesResult.error });
      }

      const hasSSH = rulesResult.stdout.toLowerCase().includes('22') ||
                     rulesResult.stdout.toLowerCase().includes('ssh');

      if (!hasSSH) {
        // Add SSH rule
        const addResult = await runUfwCommand('ufw allow ssh');
        if (!addResult.success) {
          return res.status(403).json({ error: addResult.error });
        }
        res.json({ success: true, message: 'SSH rule added', created: true });
      } else {
        res.json({ success: true, message: 'SSH rule already exists', created: false });
      }
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to ensure SSH rule');
      res.status(500).json({ error: 'Failed to ensure SSH rule' });
    }
  });

  /**
   * POST /api/admin-users/firewall/sync-projects - Sync project ports to firewall
   * Imports all ports from running projects and published routes to UFW
   * SSH (port 22) is ALWAYS ensured to be enabled
   */
  router.post('/firewall/sync-projects', async (req, res) => {
    try {
      const results = {
        ssh: { status: 'unchanged', message: '' },
        added: [],
        skipped: [],
        errors: [],
        existingPorts: []
      };

      // Step 1: ALWAYS ensure SSH is enabled first
      const rulesResult = await runUfwCommand('ufw status');
      if (!rulesResult.success) {
        return res.status(403).json({ error: rulesResult.error });
      }

      const currentRules = rulesResult.stdout.toLowerCase();
      const hasSSH = currentRules.includes('22') || currentRules.includes('ssh');

      if (!hasSSH) {
        const sshResult = await runUfwCommand('ufw allow ssh');
        if (sshResult.success) {
          results.ssh = { status: 'added', message: 'SSH (port 22) rule added' };
        } else {
          results.ssh = { status: 'error', message: sshResult.error };
        }
      } else {
        results.ssh = { status: 'exists', message: 'SSH (port 22) already enabled' };
      }

      // Step 2: Collect all ports from published routes
      const publishedRoutes = await prisma.publishedRoute.findMany({
        select: { localPort: true, hostname: true, subdomain: true }
      });

      // Step 3: Also scan for listening ports on the system
      let listeningPorts = [];
      try {
        const ssResult = await execAsync('ss -tlnp 2>/dev/null | grep LISTEN || true', { timeout: 5000 });
        const lines = ssResult.stdout.trim().split('\n').filter(l => l.trim());
        for (const line of lines) {
          // Parse ss output: LISTEN    0    4096    *:3000    *:*    users:(("node",pid=1234,fd=23))
          const portMatch = line.match(/:(\d+)\s+/);
          if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            // Filter common development ports (1024-65535, excluding system ports)
            if (port >= 1024 && port <= 65535) {
              listeningPorts.push(port);
            }
          }
        }
      } catch (e) {
        // Continue without listening ports
        log.warn({ error: e.message }, 'could not scan listening ports');
      }

      // Step 4: Combine all ports (published routes + listening)
      const routePorts = publishedRoutes.map(r => r.localPort);
      const allPorts = [...new Set([...routePorts, ...listeningPorts])].sort((a, b) => a - b);

      // Step 5: Parse current UFW rules to find existing ports
      const numberedResult = await runUfwCommand('ufw status numbered');
      const existingPorts = new Set();

      if (numberedResult.success) {
        const lines = numberedResult.stdout.trim().split('\n');
        for (const line of lines) {
          // Match port numbers in rules
          const portMatches = line.match(/(\d+)(\/tcp|\/udp)?/g);
          if (portMatches) {
            for (const match of portMatches) {
              const port = parseInt(match.replace(/\/\w+/, ''), 10);
              if (port >= 1 && port <= 65535) {
                existingPorts.add(port);
              }
            }
          }
        }
      }

      results.existingPorts = Array.from(existingPorts).sort((a, b) => a - b);

      // Step 6: Add rules for missing ports
      for (const port of allPorts) {
        if (port === 22) {
          results.skipped.push({ port, reason: 'SSH handled separately' });
          continue;
        }

        if (existingPorts.has(port)) {
          // Find which project uses this port
          const route = publishedRoutes.find(r => r.localPort === port);
          results.skipped.push({
            port,
            reason: 'Already exists',
            hostname: route?.hostname || 'listening process'
          });
          continue;
        }

        // Add the rule
        const route = publishedRoutes.find(r => r.localPort === port);
        const comment = route ? `Project: ${route.subdomain || route.hostname}` : 'Auto-imported listening port';

        try {
          const addResult = await runUfwCommand(`ufw allow ${port}/tcp comment '${comment.replace(/'/g, "\\'")}'`);
          if (addResult.success) {
            results.added.push({
              port,
              hostname: route?.hostname || 'listening',
              comment
            });
          } else {
            results.errors.push({ port, error: addResult.error });
          }
        } catch (e) {
          results.errors.push({ port, error: e.message });
        }
      }

      // Summary
      res.json({
        success: true,
        summary: {
          sshStatus: results.ssh.status,
          portsAdded: results.added.length,
          portsSkipped: results.skipped.length,
          errors: results.errors.length,
          totalProjectPorts: routePorts.length,
          totalListeningPorts: listeningPorts.length
        },
        details: results
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to sync project ports to firewall');
      res.status(500).json({ error: error.message || 'Failed to sync project ports' });
    }
  });

  /**
   * GET /api/admin-users/firewall/project-ports - Get all project ports
   * Returns ports from published routes and listening processes
   */
  router.get('/firewall/project-ports', async (req, res) => {
    try {
      // Get published routes
      const publishedRoutes = await prisma.publishedRoute.findMany({
        select: { localPort: true, hostname: true, subdomain: true, status: true }
      });

      // Get listening ports
      let listeningPorts = [];
      try {
        const ssResult = await execAsync('ss -tlnp 2>/dev/null | grep LISTEN || true', { timeout: 5000 });
        const lines = ssResult.stdout.trim().split('\n').filter(l => l.trim());
        for (const line of lines) {
          const portMatch = line.match(/:(\d+)\s+/);
          const processMatch = line.match(/users:\(\("([^"]+)"/);
          if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            if (port >= 1024 && port <= 65535) {
              listeningPorts.push({
                port,
                process: processMatch?.[1] || 'unknown'
              });
            }
          }
        }
      } catch (e) {
        // Continue without listening ports
      }

      // Get current firewall rules
      const rulesResult = await runUfwCommand('ufw status');
      const currentRules = rulesResult.success ? rulesResult.stdout.toLowerCase() : '';

      // Check which ports are already in firewall
      const projectPorts = publishedRoutes.map(route => {
        const inFirewall = currentRules.includes(String(route.localPort));
        return {
          port: route.localPort,
          hostname: route.hostname,
          subdomain: route.subdomain,
          status: route.status,
          inFirewall,
          source: 'published_route'
        };
      });

      const processPorts = listeningPorts.map(lp => {
        const matchingRoute = publishedRoutes.find(r => r.localPort === lp.port);
        const inFirewall = currentRules.includes(String(lp.port));
        return {
          port: lp.port,
          process: lp.process,
          hostname: matchingRoute?.hostname || null,
          inFirewall,
          source: matchingRoute ? 'both' : 'listening'
        };
      });

      // Combine and deduplicate
      const allPortsMap = new Map();
      for (const p of projectPorts) {
        allPortsMap.set(p.port, p);
      }
      for (const p of processPorts) {
        if (!allPortsMap.has(p.port)) {
          allPortsMap.set(p.port, p);
        } else {
          // Merge info
          const existing = allPortsMap.get(p.port);
          existing.process = p.process;
          existing.source = 'both';
        }
      }

      const allPorts = Array.from(allPortsMap.values()).sort((a, b) => a.port - b.port);

      res.json({
        ports: allPorts,
        counts: {
          total: allPorts.length,
          inFirewall: allPorts.filter(p => p.inFirewall).length,
          notInFirewall: allPorts.filter(p => !p.inFirewall).length,
          fromRoutes: publishedRoutes.length,
          fromListening: listeningPorts.length
        }
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get project ports');
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
