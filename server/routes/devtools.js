/**
 * Developer Tools Routes
 * Port management, env files, database browser, proxy
 */

import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Port Management Router
export function createPortsRouter() {
  const router = Router();

  // Common ports to monitor
  const COMMON_PORTS = [
    { port: 3000, service: 'Node.js/React Dev' },
    { port: 3001, service: 'Backend API' },
    { port: 4000, service: 'GraphQL' },
    { port: 5000, service: 'Flask/Python' },
    { port: 5173, service: 'Vite Dev' },
    { port: 5174, service: 'Vite Dev Alt' },
    { port: 5275, service: 'Console.web' },
    { port: 5432, service: 'PostgreSQL' },
    { port: 6379, service: 'Redis' },
    { port: 8000, service: 'Django/FastAPI' },
    { port: 8080, service: 'HTTP Proxy/Tomcat' },
    { port: 9000, service: 'PHP-FPM/Portainer' },
    { port: 27017, service: 'MongoDB' },
  ];

  // Check port status
  async function checkPort(port) {
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -P -n | grep LISTEN`);
      const lines = stdout.trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const parts = lines[0].split(/\s+/);
        return {
          inUse: true,
          process: {
            name: parts[0],
            pid: parseInt(parts[1])
          }
        };
      }
      return { inUse: false };
    } catch {
      return { inUse: false };
    }
  }

  // Get status of common ports
  router.get('/status', async (req, res) => {
    try {
      const ports = await Promise.all(
        COMMON_PORTS.map(async (p) => {
          const status = await checkPort(p.port);
          return {
            ...p,
            status: status.inUse ? 'in_use' : 'available',
            process: status.process
          };
        })
      );
      res.json({ ports });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check specific port
  router.get('/check/:port', async (req, res) => {
    try {
      const port = parseInt(req.params.port);
      const status = await checkPort(port);
      res.json({
        port,
        available: !status.inUse,
        process: status.process
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Scan port range
  router.get('/scan', async (req, res) => {
    try {
      const start = parseInt(req.query.start) || 3000;
      const end = parseInt(req.query.end) || 9000;
      const openPorts = [];

      // Use ss for faster scanning
      const { stdout } = await execAsync(`ss -tlnp | grep -E ':(${Array.from({ length: end - start + 1 }, (_, i) => start + i).join('|')})\\s'`);
      const lines = stdout.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const match = line.match(/:(\d+)\s/);
        if (match) {
          const port = parseInt(match[1]);
          if (port >= start && port <= end) {
            openPorts.push(port);
          }
        }
      }

      res.json({ start, end, openPorts: [...new Set(openPorts)].sort((a, b) => a - b) });
    } catch (error) {
      res.json({ start: req.query.start, end: req.query.end, openPorts: [] });
    }
  });

  // Suggest available ports
  router.get('/suggest', async (req, res) => {
    try {
      const base = parseInt(req.query.base) || 3000;
      const suggestions = [];

      for (let i = 1; suggestions.length < 5 && i <= 100; i++) {
        const port = base + i;
        const status = await checkPort(port);
        if (!status.inUse) {
          suggestions.push(port);
        }
      }

      res.json({ base, suggestions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Kill process using port
  router.post('/kill/:pid', async (req, res) => {
    try {
      const pid = parseInt(req.params.pid);
      await execAsync(`kill -9 ${pid}`);
      res.json({ success: true, pid });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Environment Files Router
export function createEnvRouter() {
  const router = Router();

  // List .env files in project
  router.get('/files/:projectPath(*)', async (req, res) => {
    try {
      const projectPath = req.params.projectPath
        ? decodeURIComponent(req.params.projectPath)
        : process.env.PROJECTS_DIR || path.join(process.env.HOME, 'Projects');

      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      const envFiles = [];

      for (const entry of entries) {
        if (entry.isFile() && (entry.name.startsWith('.env') || entry.name === '.env')) {
          const filePath = path.join(projectPath, entry.name);
          const stat = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

          envFiles.push({
            name: entry.name,
            path: filePath,
            size: `${stat.size} B`,
            variableCount: lines.length,
            modified: stat.mtime
          });
        }
      }

      res.json({ files: envFiles });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get variables from env file
  router.get('/variables/:projectPath(*)/:filename', async (req, res) => {
    try {
      let projectPath = decodeURIComponent(req.params.projectPath);
      // Handle __self__ as the console-web server directory
      if (projectPath === '__self__') {
        projectPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
      }
      const filename = req.params.filename;
      const filePath = path.join(projectPath, filename);

      const content = await fs.readFile(filePath, 'utf-8');
      const variables = [];

      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          variables.push({
            key: match[1].trim(),
            value: match[2].trim().replace(/^['"]|['"]$/g, '')
          });
        }
      }

      res.json({ variables });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save env file
  router.post('/save/:projectPath(*)/:filename', async (req, res) => {
    try {
      let projectPath = decodeURIComponent(req.params.projectPath);
      // Handle __self__ as the console-web server directory
      if (projectPath === '__self__') {
        projectPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
      }
      const filename = req.params.filename;
      const filePath = path.join(projectPath, filename);
      const { variables } = req.body;

      const content = variables.map(v => `${v.key}=${v.value}`).join('\n') + '\n';
      await fs.writeFile(filePath, content);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Compare two env files
  router.get('/compare/:projectPath(*)', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);
      const { source, target } = req.query;

      const sourceContent = await fs.readFile(path.join(projectPath, source), 'utf-8');
      const targetContent = await fs.readFile(path.join(projectPath, target), 'utf-8');

      const parseVars = (content) => {
        const vars = {};
        for (const line of content.split('\n')) {
          const match = line.trim().match(/^([^=]+)=(.*)$/);
          if (match) vars[match[1].trim()] = match[2].trim();
        }
        return vars;
      };

      const sourceVars = parseVars(sourceContent);
      const targetVars = parseVars(targetContent);

      const added = Object.keys(sourceVars).filter(k => !(k in targetVars));
      const removed = Object.keys(targetVars).filter(k => !(k in sourceVars));
      const changed = Object.keys(sourceVars).filter(k => k in targetVars && sourceVars[k] !== targetVars[k]);

      res.json({ added, removed, changed });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync env files
  router.post('/sync/:projectPath(*)', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);
      const { source, target } = req.body;

      const sourceContent = await fs.readFile(path.join(projectPath, source), 'utf-8');
      await fs.writeFile(path.join(projectPath, target), sourceContent);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate .env.example from .env
  router.post('/generate-example/:projectPath(*)', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);
      const { source } = req.body;

      const sourceContent = await fs.readFile(path.join(projectPath, source), 'utf-8');
      const exampleContent = sourceContent.split('\n').map(line => {
        const match = line.trim().match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          // Mask sensitive values
          if (/secret|password|key|token/i.test(key)) {
            return `${key}=your_${key.toLowerCase()}_here`;
          }
          return line;
        }
        return line;
      }).join('\n');

      await fs.writeFile(path.join(projectPath, '.env.example'), exampleContent);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Database Browser Router
export function createDbBrowserRouter(prisma) {
  const router = Router();

  // List all tables
  router.get('/tables', async (req, res) => {
    try {
      // Get table names from Prisma schema
      const modelNames = Object.keys(prisma).filter(
        key => !key.startsWith('_') && !key.startsWith('$') && typeof prisma[key] === 'object'
      );

      const tables = await Promise.all(
        modelNames.map(async (name) => {
          try {
            const count = await prisma[name].count();
            return { name, rowCount: count };
          } catch {
            return { name, rowCount: 0 };
          }
        })
      );

      res.json({ tables: tables.filter(t => t.rowCount >= 0) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get table data
  router.get('/tables/:table/data', async (req, res) => {
    try {
      const { table } = req.params;
      const { page = '1', pageSize = '25', sortColumn, sortDirection = 'asc', filter } = req.query;

      const model = prisma[table];
      if (!model) {
        return res.status(404).json({ error: 'Table not found' });
      }

      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const take = parseInt(pageSize);

      const orderBy = sortColumn ? { [sortColumn]: sortDirection } : undefined;

      const [rows, totalRows] = await Promise.all([
        model.findMany({
          skip,
          take,
          orderBy
        }),
        model.count()
      ]);

      // Infer column types from first row
      const columns = rows.length > 0
        ? Object.keys(rows[0]).map(key => ({
            name: key,
            type: inferType(rows[0][key])
          }))
        : [];

      res.json({ columns, rows, totalRows });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update record
  router.put('/tables/:table/update', async (req, res) => {
    try {
      const { table } = req.params;
      const record = req.body;

      const model = prisma[table];
      if (!model) {
        return res.status(404).json({ error: 'Table not found' });
      }

      // Assume 'id' is the primary key
      const { id, ...data } = record;
      await model.update({
        where: { id },
        data
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete record
  router.delete('/tables/:table/delete', async (req, res) => {
    try {
      const { table } = req.params;
      const { id } = req.body;

      const model = prisma[table];
      if (!model) {
        return res.status(404).json({ error: 'Table not found' });
      }

      await model.delete({ where: { id } });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute raw query (read-only)
  router.post('/query', async (req, res) => {
    try {
      const { query } = req.body;

      // Safety check - only allow SELECT queries
      if (!query.trim().toUpperCase().startsWith('SELECT')) {
        return res.status(400).json({ error: 'Only SELECT queries are allowed' });
      }

      const startTime = Date.now();
      const result = await prisma.$queryRawUnsafe(query);
      const executionTime = Date.now() - startTime;

      const columns = result.length > 0
        ? Object.keys(result[0]).map(key => ({
            name: key,
            type: inferType(result[0][key])
          }))
        : [];

      res.json({
        columns,
        rows: result,
        executionTime
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

// Proxy Router for API testing
export function createProxyRouter() {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const { url, method = 'GET', headers = {}, body } = req.body;

      const fetchOptions = {
        method,
        headers
      };

      if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      res.json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody
      });
    } catch (error) {
      res.status(500).json({
        status: 0,
        statusText: 'Error',
        error: error.message
      });
    }
  });

  return router;
}

// Helper to infer data type
function inferType(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') return 'json';
  return 'string';
}
