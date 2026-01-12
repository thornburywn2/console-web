/**
 * Cloudflare Tunnels Integration Routes
 * Manages published application routes via Cloudflare Tunnel API
 */

import { Router } from 'express';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

import os from 'os';
const execAsync = promisify(exec);
const PROJECTS_DIR = process.env.PROJECTS_DIR || `${os.homedir()}/Projects`;

/**
 * Update vite.config.js to add hostname to allowedHosts
 * @param {string} projectPath - Path to the project directory
 * @param {string} hostname - Hostname to add (e.g., "myapp.example.com")
 * @returns {object} Result with success status and message
 */
async function updateViteAllowedHosts(projectPath, hostname) {
  const viteConfigPath = path.join(projectPath, 'vite.config.js');
  const viteConfigTsPath = path.join(projectPath, 'vite.config.ts');

  // Check which config file exists
  let configPath = null;
  if (fs.existsSync(viteConfigPath)) {
    configPath = viteConfigPath;
  } else if (fs.existsSync(viteConfigTsPath)) {
    configPath = viteConfigTsPath;
  }

  if (!configPath) {
    return { success: false, message: 'No vite.config.js or vite.config.ts found' };
  }

  try {
    let content = fs.readFileSync(configPath, 'utf-8');

    // Check if allowedHosts already contains the hostname
    if (content.includes(`'${hostname}'`) || content.includes(`"${hostname}"`)) {
      return { success: true, message: 'Hostname already in allowedHosts', alreadyExists: true };
    }

    // Pattern 1: allowedHosts: ['host1', 'host2']
    const arrayPattern = /allowedHosts:\s*\[([^\]]*)\]/;
    const arrayMatch = content.match(arrayPattern);

    if (arrayMatch) {
      const existingHosts = arrayMatch[1].trim();
      let newHosts;
      if (existingHosts) {
        // Add to existing array
        newHosts = `${existingHosts}, '${hostname}'`;
      } else {
        // Empty array
        newHosts = `'${hostname}'`;
      }
      content = content.replace(arrayPattern, `allowedHosts: [${newHosts}]`);
      fs.writeFileSync(configPath, content, 'utf-8');
      console.log(`[Vite] Added ${hostname} to allowedHosts in ${configPath}`);
      return { success: true, message: `Added ${hostname} to allowedHosts` };
    }

    // Pattern 2: server: { ... } exists but no allowedHosts
    const serverPattern = /server:\s*\{([^}]*)\}/s;
    const serverMatch = content.match(serverPattern);

    if (serverMatch) {
      const serverContent = serverMatch[1];
      // Add allowedHosts to server config
      const newServerContent = serverContent.trimEnd() + `,\n    allowedHosts: ['${hostname}']`;
      content = content.replace(serverPattern, `server: {${newServerContent}}`);
      fs.writeFileSync(configPath, content, 'utf-8');
      console.log(`[Vite] Created allowedHosts with ${hostname} in ${configPath}`);
      return { success: true, message: `Created allowedHosts with ${hostname}` };
    }

    // Pattern 3: No server config at all - need to add it
    // Look for defineConfig({ or export default {
    const configPattern = /(defineConfig\(\{|export default \{)/;
    const configMatch = content.match(configPattern);

    if (configMatch) {
      const insertPoint = content.indexOf(configMatch[0]) + configMatch[0].length;
      const beforeInsert = content.slice(0, insertPoint);
      const afterInsert = content.slice(insertPoint);
      content = beforeInsert + `\n  server: {\n    allowedHosts: ['${hostname}'],\n  },` + afterInsert;
      fs.writeFileSync(configPath, content, 'utf-8');
      console.log(`[Vite] Created server.allowedHosts with ${hostname} in ${configPath}`);
      return { success: true, message: `Created server.allowedHosts with ${hostname}` };
    }

    return { success: false, message: 'Could not find appropriate location to add allowedHosts' };
  } catch (error) {
    console.error(`[Vite] Error updating ${configPath}:`, error);
    return { success: false, message: error.message };
  }
}

export function createCloudflareRouter(prisma) {
  const router = Router();
  const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

  // ==================== HELPERS ====================

  /**
   * Get Cloudflare settings from database
   */
  async function getSettings() {
    const settings = await prisma.cloudflareSettings.findUnique({
      where: { id: 'default' }
    });
    if (!settings?.configured) {
      throw new Error('Cloudflare not configured');
    }
    return settings;
  }

  /**
   * Make authenticated Cloudflare API request
   */
  async function cfFetch(endpoint, options = {}) {
    const settings = await getSettings();

    const url = endpoint.startsWith('http') ? endpoint : `${CF_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMsg = data.errors?.[0]?.message || `API error: ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  }

  /**
   * Get current tunnel configuration
   */
  async function getTunnelConfig() {
    const settings = await getSettings();
    const data = await cfFetch(
      `/accounts/${settings.accountId}/cfd_tunnel/${settings.tunnelId}/configurations`
    );
    return data.result?.config || { ingress: [{ service: 'http_status:404' }] };
  }

  /**
   * Update tunnel configuration
   */
  async function updateTunnelConfig(config) {
    const settings = await getSettings();
    return await cfFetch(
      `/accounts/${settings.accountId}/cfd_tunnel/${settings.tunnelId}/configurations`,
      {
        method: 'PUT',
        body: JSON.stringify({ config })
      }
    );
  }

  /**
   * Create DNS CNAME record
   */
  async function createDnsRecord(hostname) {
    const settings = await getSettings();
    return await cfFetch(
      `/zones/${settings.zoneId}/dns_records`,
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'CNAME',
          proxied: true,
          name: hostname,
          content: `${settings.tunnelId}.cfargotunnel.com`
        })
      }
    );
  }

  /**
   * Delete DNS CNAME record
   */
  async function deleteDnsRecord(recordId) {
    const settings = await getSettings();
    return await cfFetch(
      `/zones/${settings.zoneId}/dns_records/${recordId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Find DNS record by hostname
   */
  async function findDnsRecord(hostname) {
    const settings = await getSettings();
    const data = await cfFetch(
      `/zones/${settings.zoneId}/dns_records?name=${encodeURIComponent(hostname)}`
    );
    return data.result?.[0] || null;
  }

  /**
   * Restart cloudflared service
   */
  async function restartCloudflared() {
    try {
      // Try systemctl first (most common on Linux servers)
      await execAsync('sudo systemctl restart cloudflared');
      return { method: 'systemctl', success: true };
    } catch (e1) {
      try {
        // Try service command
        await execAsync('sudo service cloudflared restart');
        return { method: 'service', success: true };
      } catch (e2) {
        // Manual restart instruction
        return {
          method: 'manual',
          success: false,
          message: 'Please restart cloudflared manually: sudo systemctl restart cloudflared'
        };
      }
    }
  }

  /**
   * Extract port number from a project's CLAUDE.md file
   * Looks for **Port:** <number> pattern in the file
   */
  function getProjectPort(projectPath) {
    try {
      const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
      if (!fs.existsSync(claudeMdPath)) {
        return null;
      }
      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      // Match **Port:** followed by a number (handles various formats)
      const portMatch = content.match(/\*\*Port:\*\*\s*(\d+)/);
      if (portMatch) {
        return parseInt(portMatch[1], 10);
      }
      // Also try Port: without bold
      const simpleMatch = content.match(/^Port:\s*(\d+)/m);
      if (simpleMatch) {
        return parseInt(simpleMatch[1], 10);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get all projects with their configured ports from CLAUDE.md
   * Returns a map of port -> project info
   */
  async function getProjectPortMap() {
    const portToProject = new Map();
    const projectToPort = new Map();

    try {
      // Get projects from database
      const dbProjects = await prisma.project.findMany();

      // Also scan filesystem for projects not in DB
      const entries = fs.readdirSync(PROJECTS_DIR);
      const allProjects = new Set(dbProjects.map(p => p.name));

      for (const name of entries) {
        const fullPath = path.join(PROJECTS_DIR, name);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory() && !name.startsWith('.')) {
            allProjects.add(name);
          }
        } catch {}
      }

      // Extract port from each project's CLAUDE.md
      for (const projectName of allProjects) {
        const projectPath = path.join(PROJECTS_DIR, projectName);
        const port = getProjectPort(projectPath);

        if (port) {
          const dbProject = dbProjects.find(p => p.name === projectName);
          const projectInfo = {
            name: projectName,
            path: projectPath,
            id: dbProject?.id || null,
            port
          };

          portToProject.set(port, projectInfo);
          projectToPort.set(projectName, port);
        }
      }
    } catch (err) {
      console.error('[Cloudflare] Error building project port map:', err);
    }

    return { portToProject, projectToPort };
  }

  // ==================== AUTHENTIK HELPERS ====================

  /**
   * Get Authentik settings from database
   */
  async function getAuthentikSettings() {
    const settings = await prisma.authentikSettings.findUnique({
      where: { id: 'default' }
    });
    if (!settings?.configured) {
      throw new Error('Authentik not configured');
    }
    return settings;
  }

  /**
   * Make authenticated Authentik API request
   */
  async function authentikFetch(endpoint, options = {}) {
    const settings = await getAuthentikSettings();

    const url = `${settings.apiUrl}/api/v3${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentik API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create Authentik Proxy Provider for a hostname
   */
  async function createAuthentikProvider(hostname, internalUrl) {
    const settings = await getAuthentikSettings();

    const providerData = {
      name: `Proxy - ${hostname}`,
      external_host: `https://${hostname}`,
      internal_host: internalUrl,
      internal_host_ssl_validation: false,
      mode: 'forward_single',
      authorization_flow: null, // Use default
      access_token_validity: 'hours=24'
    };

    const provider = await authentikFetch('/providers/proxy/', {
      method: 'POST',
      body: JSON.stringify(providerData)
    });

    return provider;
  }

  /**
   * Create Authentik Application linked to a provider
   */
  async function createAuthentikApp(hostname, providerId) {
    const slug = hostname.replace(/\./g, '-').toLowerCase();

    const appData = {
      name: hostname,
      slug: slug,
      provider: providerId,
      meta_launch_url: `https://${hostname}`,
      meta_description: `Auto-created by Console.web for ${hostname}`,
      policy_engine_mode: 'any'
    };

    const app = await authentikFetch('/core/applications/', {
      method: 'POST',
      body: JSON.stringify(appData)
    });

    return app;
  }

  /**
   * Bind application to outpost
   */
  async function bindAppToOutpost(appSlug) {
    const settings = await getAuthentikSettings();
    if (!settings.outpostId) return null;

    // Get current outpost
    const outpost = await authentikFetch(`/outposts/instances/${settings.outpostId}/`);

    // Add app to providers list if not already there
    const currentProviders = outpost.providers || [];
    const updatedProviders = [...new Set([...currentProviders, appSlug])];

    // Update outpost
    await authentikFetch(`/outposts/instances/${settings.outpostId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        providers: updatedProviders
      })
    });

    return true;
  }

  /**
   * Delete Authentik Application and Provider
   */
  async function deleteAuthentikApp(appId, providerId) {
    // Delete application first
    if (appId) {
      try {
        await authentikFetch(`/core/applications/${appId}/`, { method: 'DELETE' });
      } catch (e) {
        console.warn(`Failed to delete Authentik app ${appId}:`, e.message);
      }
    }

    // Then delete provider
    if (providerId) {
      try {
        await authentikFetch(`/providers/proxy/${providerId}/`, { method: 'DELETE' });
      } catch (e) {
        console.warn(`Failed to delete Authentik provider ${providerId}:`, e.message);
      }
    }
  }

  /**
   * Full Authentik protection setup for a route
   */
  async function setupAuthentikProtection(hostname, internalUrl) {
    try {
      const authSettings = await prisma.authentikSettings.findUnique({
        where: { id: 'default' }
      });

      if (!authSettings?.configured || !authSettings?.enabled) {
        return { enabled: false };
      }

      // Create provider
      const provider = await createAuthentikProvider(hostname, internalUrl);
      console.log(`[Authentik] Created provider ${provider.pk} for ${hostname}`);

      // Create application
      const app = await createAuthentikApp(hostname, provider.pk);
      console.log(`[Authentik] Created application ${app.pk} (${app.slug}) for ${hostname}`);

      // Bind to outpost
      await bindAppToOutpost(app.slug);
      console.log(`[Authentik] Bound ${app.slug} to outpost`);

      return {
        enabled: true,
        appId: app.pk,
        appSlug: app.slug,
        providerId: provider.pk
      };
    } catch (error) {
      console.error(`[Authentik] Failed to setup protection for ${hostname}:`, error);
      return { enabled: false, error: error.message };
    }
  }

  /**
   * Remove Authentik protection for a route
   */
  async function removeAuthentikProtection(route) {
    if (!route.authentikEnabled) return;

    try {
      await deleteAuthentikApp(route.authentikAppId, route.authentikProviderId);
      console.log(`[Authentik] Removed protection for ${route.hostname}`);
    } catch (error) {
      console.error(`[Authentik] Failed to remove protection for ${route.hostname}:`, error);
    }
  }

  // ==================== SETTINGS ENDPOINTS ====================

  /**
   * GET /api/cloudflare/settings - Get Cloudflare configuration
   */
  router.get('/settings', async (req, res) => {
    try {
      const settings = await prisma.cloudflareSettings.findUnique({
        where: { id: 'default' }
      });

      if (!settings) {
        return res.json({ configured: false });
      }

      // Don't send the full API token for security
      res.json({
        configured: settings.configured,
        accountId: settings.accountId,
        tunnelId: settings.tunnelId,
        tunnelName: settings.tunnelName,
        zoneId: settings.zoneId,
        zoneName: settings.zoneName,
        defaultSubdomain: settings.defaultSubdomain,
        lastValidated: settings.lastValidated,
        hasApiToken: !!settings.apiToken
      });
    } catch (error) {
      console.error('Error getting Cloudflare settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cloudflare/settings - Save Cloudflare configuration
   */
  router.post('/settings', async (req, res) => {
    try {
      const { apiToken, accountId, tunnelId, zoneId, zoneName, defaultSubdomain } = req.body;

      if (!apiToken || !accountId || !tunnelId || !zoneId) {
        return res.status(400).json({
          error: 'API token, account ID, tunnel ID, and zone ID are required'
        });
      }

      // Validate the configuration by fetching tunnel info
      const tunnelResponse = await fetch(
        `${CF_API_BASE}/accounts/${accountId}/cfd_tunnel/${tunnelId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const tunnelData = await tunnelResponse.json();

      if (!tunnelData.success) {
        return res.status(400).json({
          error: 'Invalid configuration: ' + (tunnelData.errors?.[0]?.message || 'Could not validate tunnel')
        });
      }

      // Validate zone access
      const zoneResponse = await fetch(
        `${CF_API_BASE}/zones/${zoneId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const zoneData = await zoneResponse.json();

      if (!zoneData.success) {
        return res.status(400).json({
          error: 'Invalid zone: ' + (zoneData.errors?.[0]?.message || 'Could not validate zone')
        });
      }

      // Save settings
      const settings = await prisma.cloudflareSettings.upsert({
        where: { id: 'default' },
        update: {
          apiToken,
          accountId,
          tunnelId,
          tunnelName: tunnelData.result?.name || null,
          zoneId,
          zoneName: zoneName || zoneData.result?.name || null,
          defaultSubdomain,
          configured: true,
          lastValidated: new Date()
        },
        create: {
          id: 'default',
          apiToken,
          accountId,
          tunnelId,
          tunnelName: tunnelData.result?.name || null,
          zoneId,
          zoneName: zoneName || zoneData.result?.name || null,
          defaultSubdomain,
          configured: true,
          lastValidated: new Date()
        }
      });

      res.json({
        success: true,
        configured: true,
        tunnelName: settings.tunnelName,
        zoneName: settings.zoneName
      });
    } catch (error) {
      console.error('Error saving Cloudflare settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/cloudflare/settings - Remove Cloudflare configuration
   */
  router.delete('/settings', async (req, res) => {
    try {
      await prisma.cloudflareSettings.update({
        where: { id: 'default' },
        data: {
          apiToken: null,
          accountId: null,
          tunnelId: null,
          tunnelName: null,
          zoneId: null,
          zoneName: null,
          configured: false,
          lastValidated: null
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing Cloudflare settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== TUNNEL CONFIG ENDPOINTS ====================

  /**
   * GET /api/cloudflare/tunnel/config - Get current tunnel configuration
   */
  router.get('/tunnel/config', async (req, res) => {
    try {
      const config = await getTunnelConfig();
      res.json({ success: true, config });
    } catch (error) {
      console.error('Error getting tunnel config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/cloudflare/tunnel/info - Get tunnel information
   */
  router.get('/tunnel/info', async (req, res) => {
    try {
      const settings = await getSettings();
      const data = await cfFetch(
        `/accounts/${settings.accountId}/cfd_tunnel/${settings.tunnelId}`
      );
      res.json({ success: true, tunnel: data.result });
    } catch (error) {
      console.error('Error getting tunnel info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ROUTES MANAGEMENT ====================

  /**
   * GET /api/cloudflare/routes - List all published routes
   */
  router.get('/routes', async (req, res) => {
    try {
      const routes = await prisma.publishedRoute.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json({ routes });
    } catch (error) {
      console.error('Error listing routes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/cloudflare/routes/:projectId - Get routes for a specific project
   * Matches by projectId OR by port from project's CLAUDE.md
   * Note: Skip reserved route names (mapped, orphaned) - those are handled by separate endpoints
   */
  router.get('/routes/:projectId', async (req, res, next) => {
    const { projectId } = req.params;
    // Skip reserved route names - let them be handled by their specific endpoints
    if (['mapped', 'orphaned'].includes(projectId.toLowerCase())) {
      return next();
    }
    try {
      // First, check if this project has a port configured in CLAUDE.md
      const projectPath = path.join(PROJECTS_DIR, projectId);
      const projectPort = getProjectPort(projectPath);

      // Query routes by either projectId OR by matching port
      let routes;
      if (projectPort) {
        routes = await prisma.publishedRoute.findMany({
          where: {
            OR: [
              { projectId },
              { localPort: projectPort }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        routes = await prisma.publishedRoute.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' }
        });
      }

      res.json({ routes, projectPort });
    } catch (error) {
      console.error('Error getting project routes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cloudflare/publish - Publish a new route
   */
  router.post('/publish', async (req, res) => {
    try {
      const { subdomain, localPort, localHost = 'localhost', projectId, description, enableAuthentik = true, websocket = false } = req.body;

      if (!subdomain || !localPort) {
        return res.status(400).json({ error: 'Subdomain and local port are required' });
      }

      const settings = await getSettings();
      const hostname = `${subdomain}.${settings.zoneName}`;
      const service = `http://${localHost}:${localPort}`;

      // Check if hostname already exists
      const existing = await prisma.publishedRoute.findUnique({
        where: { hostname }
      });
      if (existing) {
        return res.status(400).json({ error: `Hostname ${hostname} is already published` });
      }

      // Step 1: Get current tunnel config
      console.log(`[Cloudflare] Publishing ${hostname} -> ${service} (websocket: ${websocket})`);
      const config = await getTunnelConfig();
      const ingress = config.ingress || [];

      // Step 2: Add new route (before catch-all)
      const catchAll = ingress.pop(); // Remove catch-all (must be last)

      // Build originRequest with websocket support if enabled
      const originRequest = {};
      if (websocket) {
        originRequest.websocket = true;
      }

      ingress.push({
        hostname: hostname,
        service: service,
        originRequest
      });
      ingress.push(catchAll); // Re-add catch-all

      // Step 3: Update tunnel configuration
      await updateTunnelConfig({ ingress });
      console.log(`[Cloudflare] Updated tunnel config with ${hostname}`);

      // Step 4: Create DNS record
      let dnsRecordId = null;
      try {
        const dnsResult = await createDnsRecord(hostname);
        dnsRecordId = dnsResult.result?.id;
        console.log(`[Cloudflare] Created DNS record for ${hostname}: ${dnsRecordId}`);
      } catch (dnsError) {
        // DNS record might already exist
        console.warn(`[Cloudflare] DNS record creation warning:`, dnsError.message);
        const existingDns = await findDnsRecord(hostname);
        if (existingDns) {
          dnsRecordId = existingDns.id;
        }
      }

      // Step 5: Setup Authentik protection (if enabled)
      let authentikResult = { enabled: false };
      if (enableAuthentik) {
        authentikResult = await setupAuthentikProtection(hostname, service);
      }

      // Step 6: Save to database
      const route = await prisma.publishedRoute.create({
        data: {
          projectId,
          hostname,
          subdomain,
          localPort,
          localHost,
          service,
          dnsRecordId,
          websocketEnabled: Boolean(websocket),
          status: 'PENDING',
          description,
          authentikEnabled: authentikResult.enabled,
          authentikAppId: authentikResult.appId || null,
          authentikAppSlug: authentikResult.appSlug || null,
          authentikProviderId: authentikResult.providerId || null
        }
      });

      // Step 7: Restart cloudflared
      const restartResult = await restartCloudflared();
      console.log(`[Cloudflare] Restart result:`, restartResult);

      // Update status based on restart
      if (restartResult.success) {
        await prisma.publishedRoute.update({
          where: { id: route.id },
          data: { status: 'ACTIVE', lastCheckedAt: new Date() }
        });
      }

      // Step 8: Update vite.config.js with allowedHosts (if project exists)
      let viteResult = { success: false, message: 'No project specified' };
      if (projectId) {
        const projectPath = path.join(PROJECTS_DIR, projectId);
        if (fs.existsSync(projectPath)) {
          viteResult = await updateViteAllowedHosts(projectPath, hostname);
        } else {
          viteResult = { success: false, message: `Project path not found: ${projectPath}` };
        }
      }

      res.json({
        success: true,
        route: {
          ...route,
          status: restartResult.success ? 'ACTIVE' : 'PENDING'
        },
        url: `https://${hostname}`,
        restartResult,
        authentik: authentikResult,
        viteConfig: viteResult
      });
    } catch (error) {
      console.error('Error publishing route:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/cloudflare/publish/:hostname - Unpublish a route
   */
  router.delete('/publish/:hostname', async (req, res) => {
    try {
      const hostname = decodeURIComponent(req.params.hostname);

      // Get route from database
      const route = await prisma.publishedRoute.findUnique({
        where: { hostname }
      });

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      console.log(`[Cloudflare] Unpublishing ${hostname}`);

      // Step 1: Get current tunnel config
      const config = await getTunnelConfig();
      const ingress = config.ingress || [];

      // Step 2: Remove the hostname from ingress
      const updatedIngress = ingress.filter(rule => rule.hostname !== hostname);

      // Step 3: Update tunnel configuration
      await updateTunnelConfig({ ingress: updatedIngress });
      console.log(`[Cloudflare] Removed ${hostname} from tunnel config`);

      // Step 4: Delete DNS record
      if (route.dnsRecordId) {
        try {
          await deleteDnsRecord(route.dnsRecordId);
          console.log(`[Cloudflare] Deleted DNS record ${route.dnsRecordId}`);
        } catch (dnsError) {
          console.warn(`[Cloudflare] DNS deletion warning:`, dnsError.message);
        }
      }

      // Step 5: Remove Authentik protection
      if (route.authentikEnabled) {
        await removeAuthentikProtection(route);
      }

      // Step 6: Delete from database
      await prisma.publishedRoute.delete({
        where: { hostname }
      });

      // Step 7: Restart cloudflared
      const restartResult = await restartCloudflared();
      console.log(`[Cloudflare] Restart result:`, restartResult);

      res.json({
        success: true,
        hostname,
        restartResult,
        authentikRemoved: route.authentikEnabled
      });
    } catch (error) {
      console.error('Error unpublishing route:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/cloudflare/routes/:hostname/port - Update the local port for a route
   * Updates tunnel config, database, and optionally restarts cloudflared
   */
  router.put('/routes/:hostname/port', async (req, res) => {
    try {
      const hostname = decodeURIComponent(req.params.hostname);
      const { localPort } = req.body;

      if (!localPort || isNaN(parseInt(localPort, 10))) {
        return res.status(400).json({ error: 'Valid localPort is required' });
      }

      const portNum = parseInt(localPort, 10);
      if (portNum < 1 || portNum > 65535) {
        return res.status(400).json({ error: 'Port must be between 1 and 65535' });
      }

      // Get route from database
      const route = await prisma.publishedRoute.findUnique({
        where: { hostname }
      });

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      console.log(`[Cloudflare] Updating port for ${hostname}: ${route.localPort} -> ${portNum}`);

      // Get current tunnel config
      const config = await getTunnelConfig();
      const ingress = config.ingress || [];

      // Find and update the route in ingress
      const newService = `http://${route.localHost}:${portNum}`;
      let updated = false;

      for (let i = 0; i < ingress.length; i++) {
        if (ingress[i].hostname === hostname) {
          ingress[i].service = newService;
          updated = true;
          break;
        }
      }

      if (!updated) {
        return res.status(404).json({ error: 'Route not found in tunnel config' });
      }

      // Update tunnel configuration
      await updateTunnelConfig({ ingress });
      console.log(`[Cloudflare] Updated tunnel config with new port for ${hostname}`);

      // Update database
      await prisma.publishedRoute.update({
        where: { hostname },
        data: {
          localPort: portNum,
          service: newService,
          updatedAt: new Date()
        }
      });

      // Restart cloudflared
      const restartResult = await restartCloudflared();
      console.log(`[Cloudflare] Restart result:`, restartResult);

      // Update vite.config.js with allowedHosts (if project exists)
      let viteResult = { success: false, message: 'No project linked' };
      if (route.projectId) {
        const projectPath = path.join(PROJECTS_DIR, route.projectId);
        if (fs.existsSync(projectPath)) {
          viteResult = await updateViteAllowedHosts(projectPath, hostname);
        }
      }

      res.json({
        success: true,
        hostname,
        oldPort: route.localPort,
        newPort: portNum,
        service: newService,
        restartResult,
        viteConfig: viteResult
      });
    } catch (error) {
      console.error('Error updating route port:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/cloudflare/routes/:hostname/websocket - Toggle WebSocket support for a route
   * Updates tunnel config with originRequest.websocket setting
   */
  router.put('/routes/:hostname/websocket', async (req, res) => {
    try {
      const hostname = decodeURIComponent(req.params.hostname);
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled (boolean) is required' });
      }

      // Get route from database
      const route = await prisma.publishedRoute.findUnique({
        where: { hostname }
      });

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      console.log(`[Cloudflare] ${enabled ? 'Enabling' : 'Disabling'} WebSocket for ${hostname}`);

      // Get current tunnel config
      const config = await getTunnelConfig();
      const ingress = config.ingress || [];

      // Find and update the route in ingress
      let updated = false;
      for (let i = 0; i < ingress.length; i++) {
        if (ingress[i].hostname === hostname) {
          // Ensure originRequest exists
          if (!ingress[i].originRequest) {
            ingress[i].originRequest = {};
          }

          if (enabled) {
            ingress[i].originRequest.websocket = true;
          } else {
            delete ingress[i].originRequest.websocket;
          }
          updated = true;
          break;
        }
      }

      if (!updated) {
        return res.status(404).json({ error: 'Route not found in tunnel config' });
      }

      // Update tunnel configuration
      await updateTunnelConfig({ ingress });
      console.log(`[Cloudflare] Updated tunnel config with WebSocket ${enabled ? 'enabled' : 'disabled'} for ${hostname}`);

      // Update database
      await prisma.publishedRoute.update({
        where: { hostname },
        data: {
          websocketEnabled: enabled,
          updatedAt: new Date()
        }
      });

      // Restart cloudflared
      const restartResult = await restartCloudflared();
      console.log(`[Cloudflare] Restart result:`, restartResult);

      res.json({
        success: true,
        hostname,
        websocketEnabled: enabled,
        restartResult
      });
    } catch (error) {
      console.error('Error updating route WebSocket setting:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cloudflare/restart - Manually restart cloudflared
   */
  router.post('/restart', async (req, res) => {
    try {
      const result = await restartCloudflared();
      res.json(result);
    } catch (error) {
      console.error('Error restarting cloudflared:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cloudflare/check-route/:hostname - Check if a route is working
   */
  router.post('/check-route/:hostname', async (req, res) => {
    try {
      const hostname = decodeURIComponent(req.params.hostname);

      // Try to fetch the route
      const response = await fetch(`https://${hostname}`, {
        method: 'HEAD',
        redirect: 'manual'
      });

      const isHealthy = response.status >= 200 && response.status < 500;

      // Update route status
      await prisma.publishedRoute.update({
        where: { hostname },
        data: {
          status: isHealthy ? 'ACTIVE' : 'ERROR',
          lastCheckedAt: new Date(),
          errorMessage: isHealthy ? null : `HTTP ${response.status}`
        }
      });

      res.json({
        hostname,
        healthy: isHealthy,
        status: response.status
      });
    } catch (error) {
      console.error('Error checking route:', error);

      // Update route status to error
      try {
        await prisma.publishedRoute.update({
          where: { hostname: decodeURIComponent(req.params.hostname) },
          data: {
            status: 'ERROR',
            lastCheckedAt: new Date(),
            errorMessage: error.message
          }
        });
      } catch (e) {}

      res.json({
        hostname: decodeURIComponent(req.params.hostname),
        healthy: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/cloudflare/validate - Validate current configuration
   */
  router.get('/validate', async (req, res) => {
    try {
      const settings = await getSettings();
      let tunnelInfo = null;
      let zoneInfo = null;
      let tunnelError = null;
      let zoneError = null;

      // Test tunnel access (required)
      try {
        tunnelInfo = await cfFetch(
          `/accounts/${settings.accountId}/cfd_tunnel/${settings.tunnelId}`
        );
      } catch (e) {
        tunnelError = e.message;
      }

      // Test zone access (optional - some tokens don't have zone permissions)
      try {
        zoneInfo = await cfFetch(`/zones/${settings.zoneId}`);
      } catch (e) {
        zoneError = e.message;
        console.log('[Cloudflare] Zone access not available (token may lack Zone permissions):', e.message);
      }

      // Validation succeeds if tunnel access works
      const valid = tunnelInfo?.result?.id ? true : false;

      if (valid) {
        // Update last validated
        await prisma.cloudflareSettings.update({
          where: { id: 'default' },
          data: { lastValidated: new Date() }
        });
      }

      res.json({
        valid,
        tunnel: tunnelInfo?.result ? {
          id: tunnelInfo.result.id,
          name: tunnelInfo.result.name,
          status: tunnelInfo.result.status
        } : null,
        tunnelError,
        zone: zoneInfo?.result ? {
          id: zoneInfo.result.id,
          name: zoneInfo.result.name,
          status: zoneInfo.result.status
        } : null,
        zoneError,
        warnings: zoneError ? ['Zone access limited - DNS records may need manual creation'] : []
      });
    } catch (error) {
      console.error('Error validating Cloudflare config:', error);
      res.status(500).json({ valid: false, error: error.message });
    }
  });

  /**
   * POST /api/cloudflare/sync - Sync routes from Cloudflare tunnel config to database
   * Imports existing routes that were created outside of Console.web
   * Automatically links routes to projects based on port matching from CLAUDE.md
   */
  router.post('/sync', async (req, res) => {
    try {
      const settings = await getSettings();
      const config = await getTunnelConfig();
      const ingress = config.ingress || [];

      // Get project port mappings from CLAUDE.md files
      const { portToProject } = await getProjectPortMap();
      console.log(`[Cloudflare] Syncing ${ingress.length} ingress rules from tunnel`);
      console.log(`[Cloudflare] Found ${portToProject.size} projects with configured ports`);

      const synced = [];
      const skipped = [];
      const errors = [];

      for (const rule of ingress) {
        // Skip catch-all rule (no hostname)
        if (!rule.hostname) {
          skipped.push({ service: rule.service, reason: 'catch-all rule' });
          continue;
        }

        try {
          // Parse service URL to extract port
          let localPort = 80;
          let localHost = 'localhost';

          if (rule.service) {
            const match = rule.service.match(/https?:\/\/([^:]+):?(\d+)?/);
            if (match) {
              localHost = match[1] || 'localhost';
              localPort = parseInt(match[2], 10) || (rule.service.startsWith('https') ? 443 : 80);
            }
          }

          // Match route to project by port
          const matchedProject = portToProject.get(localPort);
          const projectId = matchedProject?.name || null;

          // Check if route already exists in database
          const existing = await prisma.publishedRoute.findUnique({
            where: { hostname: rule.hostname }
          });

          // Detect websocket setting from originRequest
          const websocketEnabled = Boolean(rule.originRequest?.websocket);

          if (existing) {
            // Update existing route with project mapping
            await prisma.publishedRoute.update({
              where: { hostname: rule.hostname },
              data: {
                service: rule.service,
                localPort,
                localHost,
                projectId,
                websocketEnabled,
                status: 'ACTIVE',
                lastCheckedAt: new Date()
              }
            });
            synced.push({
              hostname: rule.hostname,
              action: 'updated',
              websocketEnabled,
              projectId,
              projectName: matchedProject?.name || null
            });
          } else {
            // Extract subdomain from hostname
            const subdomain = rule.hostname.replace(`.${settings.zoneName}`, '');

            // Try to find DNS record
            let dnsRecordId = null;
            try {
              const dnsRecord = await findDnsRecord(rule.hostname);
              dnsRecordId = dnsRecord?.id || null;
            } catch (e) {
              console.warn(`[Cloudflare] Could not find DNS record for ${rule.hostname}`);
            }

            // Create new route in database with project mapping
            await prisma.publishedRoute.create({
              data: {
                hostname: rule.hostname,
                subdomain,
                localPort,
                localHost,
                service: rule.service,
                dnsRecordId,
                projectId,
                websocketEnabled,
                status: 'ACTIVE',
                description: matchedProject
                  ? `Linked to ${matchedProject.name} (port ${localPort})`
                  : `Imported from Cloudflare tunnel`,
                lastCheckedAt: new Date()
              }
            });
            synced.push({
              hostname: rule.hostname,
              action: 'created',
              subdomain,
              localPort,
              websocketEnabled,
              projectId,
              projectName: matchedProject?.name || null
            });
          }
        } catch (ruleError) {
          errors.push({ hostname: rule.hostname, error: ruleError.message });
        }
      }

      // Also check for routes in database that are no longer in Cloudflare
      const dbRoutes = await prisma.publishedRoute.findMany();
      const cfHostnames = new Set(ingress.map(r => r.hostname).filter(Boolean));

      for (const dbRoute of dbRoutes) {
        if (!cfHostnames.has(dbRoute.hostname)) {
          // Route exists in DB but not in Cloudflare - mark as disabled
          await prisma.publishedRoute.update({
            where: { id: dbRoute.id },
            data: { status: 'DISABLED', errorMessage: 'Not found in Cloudflare tunnel config' }
          });
          synced.push({ hostname: dbRoute.hostname, action: 'disabled' });
        }
      }

      res.json({
        success: true,
        synced: synced.length,
        skipped: skipped.length,
        errors: errors.length,
        details: { synced, skipped, errors }
      });
    } catch (error) {
      console.error('Error syncing Cloudflare routes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/cloudflare/routes/mapped - Get all routes with project cross-referencing
   * Routes are mapped to projects primarily by matching local port to CLAUDE.md port config
   */
  router.get('/routes/mapped', async (req, res) => {
    try {
      console.log('[Cloudflare] Getting mapped routes...');

      // Get all routes from database
      const routes = await prisma.publishedRoute.findMany({
        orderBy: { createdAt: 'desc' }
      });
      console.log(`[Cloudflare] Found ${routes.length} routes in database`);

      // Get project port mappings from CLAUDE.md (source of truth)
      const { portToProject } = await getProjectPortMap();
      console.log(`[Cloudflare] Found ${portToProject.size} projects with configured ports`);

      // Get all projects from database for fallback matching
      const projects = await prisma.project.findMany();

      // Build a map of projectId -> project for quick lookup
      const projectsByName = new Map();
      const projectsByPath = new Map();

      projects.forEach(p => {
        projectsByName.set(p.name.toLowerCase(), p);
        projectsByPath.set(p.path, p);
      });

      // Also scan the filesystem for projects not in DB
      try {
        const entries = fs.readdirSync(PROJECTS_DIR);
        for (const name of entries) {
          const fullPath = path.join(PROJECTS_DIR, name);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !name.startsWith('.')) {
              if (!projectsByName.has(name.toLowerCase())) {
                const fsProject = { id: name, name, path: fullPath, source: 'filesystem' };
                projectsByName.set(name.toLowerCase(), fsProject);
                projectsByPath.set(fullPath, fsProject);
              }
            }
          } catch {}
        }
      } catch {}

      // Get active ports (use ss to find what's listening)
      const portToProcess = new Map();
      try {
        const output = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null', {
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024,
        });

        const lines = output.split('\n');
        for (const line of lines) {
          const portMatch = line.match(/:(\d+)\s/);
          if (portMatch) {
            const port = parseInt(portMatch[1], 10);

            // Try to extract process info
            let processName = 'unknown';
            let pid = null;

            // ss format: users:(("node",pid=12345,fd=19))
            const ssMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
            if (ssMatch) {
              processName = ssMatch[1];
              pid = ssMatch[2];
            }

            // netstat format: 12345/node
            const netstatMatch = line.match(/(\d+)\/(\S+)/);
            if (netstatMatch) {
              pid = netstatMatch[1];
              processName = netstatMatch[2];
            }

            portToProcess.set(port, { process: processName, pid });
          }
        }
      } catch {}

      // Map routes to projects
      const mappedRoutes = routes.map(route => {
        let matchedProject = null;
        let matchMethod = null;
        let isOrphaned = true;

        // Method 1 (PRIORITY): Match by port from CLAUDE.md configuration
        // This is the most reliable method - the port in CLAUDE.md is the source of truth
        const portProject = portToProject.get(route.localPort);
        if (portProject) {
          matchedProject = {
            id: portProject.id,
            name: portProject.name,
            path: portProject.path,
            displayName: portProject.name
          };
          matchMethod = 'claude-md-port';
          isOrphaned = false;
        }

        // Method 2: Direct projectId match (if route was created with a project)
        if (!matchedProject && route.projectId && projectsByName.has(route.projectId.toLowerCase())) {
          matchedProject = projectsByName.get(route.projectId.toLowerCase());
          matchMethod = 'projectId';
          isOrphaned = false;
        }

        // Method 3: Try to match by subdomain to project name
        if (!matchedProject && route.subdomain) {
          const normalizedSubdomain = route.subdomain.toLowerCase().replace(/-/g, '');
          for (const [name, project] of projectsByName) {
            const normalizedName = name.replace(/-/g, '').replace(/_/g, '');
            if (normalizedSubdomain === normalizedName ||
                normalizedSubdomain.includes(normalizedName) ||
                normalizedName.includes(normalizedSubdomain)) {
              matchedProject = project;
              matchMethod = 'subdomain';
              isOrphaned = false;
              break;
            }
          }
        }

        // Get port activity info
        const portInfo = portToProcess.get(route.localPort);
        let portActive = !!portInfo;
        let portProcess = portInfo?.process || null;

        // Method 4: Check if port is actively being used by a project (fallback)
        if (!matchedProject && portInfo?.pid) {
          try {
            // Try to get the working directory of the process
            const cwdLink = execSync(`readlink /proc/${portInfo.pid}/cwd 2>/dev/null || echo ""`, {
              encoding: 'utf-8'
            }).trim();

            if (cwdLink && projectsByPath.has(cwdLink)) {
              matchedProject = projectsByPath.get(cwdLink);
              matchMethod = 'port-cwd';
              isOrphaned = false;
            } else if (cwdLink && cwdLink.startsWith(PROJECTS_DIR)) {
              // Extract project name from path
              const relativePath = cwdLink.replace(PROJECTS_DIR + '/', '');
              const projectName = relativePath.split('/')[0];
              if (projectsByName.has(projectName.toLowerCase())) {
                matchedProject = projectsByName.get(projectName.toLowerCase());
                matchMethod = 'port-path';
                isOrphaned = false;
              }
            }
          } catch {}
        }

        return {
          ...route,
          project: matchedProject ? {
            id: matchedProject.id,
            name: matchedProject.name,
            path: matchedProject.path,
            displayName: matchedProject.displayName || matchedProject.name
          } : null,
          matchMethod,
          isOrphaned,
          portActive,
          portProcess,
          configuredPort: portProject?.port || null
        };
      });

      // Summary statistics
      const orphanedCount = mappedRoutes.filter(r => r.isOrphaned).length;
      const linkedCount = mappedRoutes.filter(r => !r.isOrphaned).length;
      const activeCount = mappedRoutes.filter(r => r.portActive).length;

      console.log(`[Cloudflare] Returning ${mappedRoutes.length} mapped routes (${linkedCount} linked, ${orphanedCount} orphaned, ${activeCount} active)`);
      res.json({
        success: true,
        routes: mappedRoutes,
        summary: {
          total: mappedRoutes.length,
          linked: linkedCount,
          orphaned: orphanedCount,
          portsActive: activeCount
        }
      });
    } catch (error) {
      console.error('[Cloudflare] Error getting mapped routes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/cloudflare/routes/orphaned - Get only routes without a connected project
   */
  router.get('/routes/orphaned', async (req, res) => {
    try {
      // Use the mapped routes logic to find orphaned routes
      const mappedResponse = await new Promise((resolve, reject) => {
        const mockReq = { query: {} };
        const mockRes = {
          json: (data) => resolve(data),
          status: () => mockRes
        };
        router.handle({ ...mockReq, method: 'GET', url: '/routes/mapped' }, mockRes, reject);
      });

      // Filter to only orphaned routes
      const orphanedRoutes = mappedResponse.routes?.filter(r => r.isOrphaned) || [];

      res.json({
        success: true,
        routes: orphanedRoutes,
        count: orphanedRoutes.length
      });
    } catch (error) {
      console.error('Error getting orphaned routes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/cloudflare/routes/orphaned/:hostname - Delete an orphaned route
   * Removes from tunnel config, DNS, Authentik, and database
   */
  router.delete('/routes/orphaned/:hostname', async (req, res) => {
    try {
      const hostname = decodeURIComponent(req.params.hostname);

      // Get route from database
      const route = await prisma.publishedRoute.findUnique({
        where: { hostname }
      });

      if (!route) {
        return res.status(404).json({ error: 'Route not found in database' });
      }

      console.log(`[Cloudflare] Cleaning up orphaned route: ${hostname}`);

      // Step 1: Get current tunnel config
      const config = await getTunnelConfig();
      const ingress = config.ingress || [];

      // Step 2: Remove the hostname from ingress
      const updatedIngress = ingress.filter(rule => rule.hostname !== hostname);

      if (updatedIngress.length !== ingress.length) {
        // Step 3: Update tunnel configuration
        await updateTunnelConfig({ ingress: updatedIngress });
        console.log(`[Cloudflare] Removed ${hostname} from tunnel config`);
      }

      // Step 4: Delete DNS record
      if (route.dnsRecordId) {
        try {
          await deleteDnsRecord(route.dnsRecordId);
          console.log(`[Cloudflare] Deleted DNS record ${route.dnsRecordId}`);
        } catch (dnsError) {
          console.warn(`[Cloudflare] DNS deletion warning:`, dnsError.message);
        }
      } else {
        // Try to find and delete the DNS record by hostname
        try {
          const dnsRecord = await findDnsRecord(hostname);
          if (dnsRecord?.id) {
            await deleteDnsRecord(dnsRecord.id);
            console.log(`[Cloudflare] Deleted DNS record by hostname lookup`);
          }
        } catch {}
      }

      // Step 5: Remove Authentik protection
      if (route.authentikEnabled) {
        await removeAuthentikProtection(route);
      }

      // Step 6: Delete from database
      await prisma.publishedRoute.delete({
        where: { hostname }
      });

      // Step 7: Restart cloudflared
      const restartResult = await restartCloudflared();
      console.log(`[Cloudflare] Restart result:`, restartResult);

      res.json({
        success: true,
        hostname,
        message: `Orphaned route ${hostname} has been cleaned up`,
        restartResult
      });
    } catch (error) {
      console.error('Error cleaning up orphaned route:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/cloudflare/routes/orphaned - Bulk delete all orphaned routes
   */
  router.delete('/routes/orphaned', async (req, res) => {
    try {
      const { confirm } = req.body;

      if (confirm !== true) {
        return res.status(400).json({
          error: 'Confirmation required',
          message: 'Send { "confirm": true } to delete all orphaned routes'
        });
      }

      // Get all routes and determine which are orphaned
      const routes = await prisma.publishedRoute.findMany();
      const projects = await prisma.project.findMany();

      const projectsByName = new Map();
      projects.forEach(p => projectsByName.set(p.name.toLowerCase(), p));

      // Scan filesystem
      const fs = await import('fs');
      const path = await import('path');
      try {
        const entries = fs.readdirSync(PROJECTS_DIR);
        for (const name of entries) {
          const fullPath = path.join(PROJECTS_DIR, name);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !name.startsWith('.')) {
              if (!projectsByName.has(name.toLowerCase())) {
                projectsByName.set(name.toLowerCase(), { id: name, name, path: fullPath });
              }
            }
          } catch {}
        }
      } catch {}

      // Find orphaned routes
      const orphanedRoutes = routes.filter(route => {
        if (route.projectId && projectsByName.has(route.projectId.toLowerCase())) {
          return false;
        }
        if (route.subdomain) {
          const normalizedSubdomain = route.subdomain.toLowerCase().replace(/-/g, '');
          for (const [name] of projectsByName) {
            const normalizedName = name.replace(/-/g, '').replace(/_/g, '');
            if (normalizedSubdomain === normalizedName ||
                normalizedSubdomain.includes(normalizedName) ||
                normalizedName.includes(normalizedSubdomain)) {
              return false;
            }
          }
        }
        return true;
      });

      if (orphanedRoutes.length === 0) {
        return res.json({
          success: true,
          message: 'No orphaned routes found',
          deleted: 0
        });
      }

      console.log(`[Cloudflare] Bulk cleaning ${orphanedRoutes.length} orphaned routes`);

      // Get tunnel config once
      const config = await getTunnelConfig();
      let ingress = config.ingress || [];

      const deleted = [];
      const errors = [];

      for (const route of orphanedRoutes) {
        try {
          // Remove from ingress
          ingress = ingress.filter(rule => rule.hostname !== route.hostname);

          // Delete DNS record
          if (route.dnsRecordId) {
            try {
              await deleteDnsRecord(route.dnsRecordId);
            } catch {}
          }

          // Remove Authentik
          if (route.authentikEnabled) {
            await removeAuthentikProtection(route);
          }

          // Delete from DB
          await prisma.publishedRoute.delete({ where: { id: route.id } });

          deleted.push(route.hostname);
        } catch (err) {
          errors.push({ hostname: route.hostname, error: err.message });
        }
      }

      // Update tunnel config once with all changes
      await updateTunnelConfig({ ingress });

      // Restart cloudflared once
      const restartResult = await restartCloudflared();

      res.json({
        success: true,
        deleted: deleted.length,
        errors: errors.length,
        details: { deleted, errors },
        restartResult
      });
    } catch (error) {
      console.error('Error bulk cleaning orphaned routes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/cloudflare/tunnel/status - Get tunnel connection status
   */
  router.get('/tunnel/status', async (req, res) => {
    try {
      const settings = await getSettings();

      // Get tunnel connections
      const connectionsData = await cfFetch(
        `/accounts/${settings.accountId}/cfd_tunnel/${settings.tunnelId}/connections`
      );

      // Get tunnel config to count ingress rules
      let ingressCount = 0;
      try {
        const configData = await cfFetch(
          `/accounts/${settings.accountId}/cfd_tunnel/${settings.tunnelId}/configurations`
        );
        ingressCount = configData.result?.config?.ingress?.length || 0;
      } catch (e) {
        console.warn('Could not fetch tunnel config for ingress count');
      }

      const connections = connectionsData.result || [];
      const activeConnections = connections.length;
      const isHealthy = activeConnections > 0;

      res.json({
        success: true,
        status: isHealthy ? 'healthy' : 'disconnected',
        connections: activeConnections,
        ingressCount: ingressCount,
        connectedAt: connections[0]?.opened_at || null,
        clientVersion: connections[0]?.client_version || null,
        tunnelId: settings.tunnelId,
        tunnelName: settings.tunnelName
      });
    } catch (error) {
      console.error('Error getting tunnel status:', error);
      res.status(500).json({
        error: error.message,
        status: 'error',
        connections: 0,
        ingressCount: 0
      });
    }
  });

  /**
   * GET /api/cloudflare/dns - Get all DNS records for the zone
   */
  router.get('/dns', async (req, res) => {
    try {
      const settings = await getSettings();
      const data = await cfFetch(
        `/zones/${settings.zoneId}/dns_records?type=CNAME&per_page=100`
      );

      res.json({
        success: true,
        records: data.result || [],
        total: data.result_info?.total_count || 0
      });
    } catch (error) {
      console.error('Error getting DNS records:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/cloudflare/analytics - Get basic analytics for the zone
   */
  router.get('/analytics', async (req, res) => {
    try {
      const settings = await getSettings();
      const since = req.query.since || '-1440'; // Default last 24 hours in minutes

      const data = await cfFetch(
        `/zones/${settings.zoneId}/analytics/dashboard?since=${since}&continuous=true`
      );

      res.json({
        success: true,
        totals: data.result?.totals || {},
        timeseries: data.result?.timeseries || []
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== AUTHENTIK SETTINGS ENDPOINTS ====================

  /**
   * GET /api/cloudflare/authentik/settings - Get Authentik configuration
   */
  router.get('/authentik/settings', async (req, res) => {
    try {
      const settings = await prisma.authentikSettings.findUnique({
        where: { id: 'default' }
      });

      if (!settings) {
        return res.json({ configured: false, enabled: false });
      }

      res.json({
        configured: settings.configured,
        enabled: settings.enabled,
        apiUrl: settings.apiUrl,
        outpostId: settings.outpostId,
        defaultGroupId: settings.defaultGroupId,
        lastValidated: settings.lastValidated
        // Never return apiToken
      });
    } catch (error) {
      console.error('Error getting Authentik settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cloudflare/authentik/settings - Save Authentik configuration
   */
  router.post('/authentik/settings', async (req, res) => {
    try {
      const { apiUrl, apiToken, outpostId, defaultGroupId, enabled } = req.body;

      // Validate API connection if token provided
      let validated = false;
      if (apiToken && apiUrl) {
        try {
          const testUrl = `${apiUrl}/api/v3/core/users/me/`;
          const testResponse = await fetch(testUrl, {
            headers: { 'Authorization': `Bearer ${apiToken}` }
          });

          if (testResponse.ok) {
            validated = true;
          } else {
            const errorText = await testResponse.text();
            throw new Error(`API validation failed: ${testResponse.status} - ${errorText}`);
          }
        } catch (e) {
          return res.status(400).json({ error: `Failed to validate Authentik API: ${e.message}` });
        }
      }

      const settings = await prisma.authentikSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          apiUrl,
          apiToken,
          outpostId,
          defaultGroupId,
          enabled: enabled ?? true,
          configured: validated,
          lastValidated: validated ? new Date() : null
        },
        update: {
          apiUrl,
          ...(apiToken && { apiToken }),
          outpostId,
          defaultGroupId,
          enabled: enabled ?? true,
          configured: validated || (apiToken ? undefined : false),
          lastValidated: validated ? new Date() : undefined
        }
      });

      res.json({
        configured: settings.configured,
        enabled: settings.enabled,
        apiUrl: settings.apiUrl,
        outpostId: settings.outpostId,
        lastValidated: settings.lastValidated
      });
    } catch (error) {
      console.error('Error saving Authentik settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/cloudflare/authentik/settings - Clear Authentik configuration
   */
  router.delete('/authentik/settings', async (req, res) => {
    try {
      await prisma.authentikSettings.deleteMany({});
      res.json({ success: true, message: 'Authentik configuration cleared' });
    } catch (error) {
      console.error('Error clearing Authentik settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cloudflare/authentik/validate - Validate Authentik API connection
   */
  router.post('/authentik/validate', async (req, res) => {
    try {
      const settings = await prisma.authentikSettings.findUnique({
        where: { id: 'default' }
      });

      if (!settings?.apiToken || !settings?.apiUrl) {
        return res.status(400).json({ valid: false, error: 'Authentik not configured' });
      }

      const testUrl = `${settings.apiUrl}/api/v3/core/users/me/`;
      const testResponse = await fetch(testUrl, {
        headers: { 'Authorization': `Bearer ${settings.apiToken}` }
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        return res.json({ valid: false, error: `API error: ${testResponse.status}` });
      }

      const user = await testResponse.json();

      // Update validation timestamp
      await prisma.authentikSettings.update({
        where: { id: 'default' },
        data: { lastValidated: new Date(), configured: true }
      });

      res.json({
        valid: true,
        user: user.username,
        email: user.email
      });
    } catch (error) {
      console.error('Error validating Authentik:', error);
      res.status(500).json({ valid: false, error: error.message });
    }
  });

  /**
   * GET /api/cloudflare/authentik/outposts - List available outposts
   */
  router.get('/authentik/outposts', async (req, res) => {
    try {
      const outposts = await authentikFetch('/outposts/instances/');

      res.json({
        success: true,
        outposts: outposts.results || []
      });
    } catch (error) {
      console.error('Error fetching Authentik outposts:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cloudflare/routes/:id/authentik - Enable/disable Authentik protection for a route
   */
  router.post('/routes/:id/authentik', async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const route = await prisma.publishedRoute.findUnique({
        where: { id }
      });

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      if (enabled && !route.authentikEnabled) {
        // Enable Authentik protection
        const authentikResult = await setupAuthentikProtection(route.hostname, route.service);

        await prisma.publishedRoute.update({
          where: { id },
          data: {
            authentikEnabled: authentikResult.enabled,
            authentikAppId: authentikResult.appId || null,
            authentikAppSlug: authentikResult.appSlug || null,
            authentikProviderId: authentikResult.providerId || null
          }
        });

        res.json({
          success: true,
          enabled: authentikResult.enabled,
          authentik: authentikResult
        });
      } else if (!enabled && route.authentikEnabled) {
        // Disable Authentik protection
        await removeAuthentikProtection(route);

        await prisma.publishedRoute.update({
          where: { id },
          data: {
            authentikEnabled: false,
            authentikAppId: null,
            authentikAppSlug: null,
            authentikProviderId: null
          }
        });

        res.json({
          success: true,
          enabled: false
        });
      } else {
        res.json({
          success: true,
          enabled: route.authentikEnabled,
          message: 'No change needed'
        });
      }
    } catch (error) {
      console.error('Error updating route Authentik protection:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
