/**
 * Port Management Routes
 * Centralized port allocation and range management
 */

import { Router } from 'express';
import { z } from 'zod';
import { sendSafeError } from '../utils/errorResponse.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function createPortManagementRouter(prisma) {
  const router = Router();

// Validation schemas
const portAllocationSchema = z.object({
  port: z.number().int().min(1024).max(65535),
  projectId: z.string().optional(),
  purpose: z.string().max(100).optional(),
  service: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  isReserved: z.boolean().optional(),
});

const portRangeSchema = z.object({
  projectId: z.string(),
  startPort: z.number().int().min(1024).max(65535),
  endPort: z.number().int().min(1024).max(65535),
  description: z.string().max(500).optional(),
});

const bulkAllocateSchema = z.object({
  projectId: z.string(),
  ports: z.array(z.object({
    port: z.number().int().min(1024).max(65535),
    purpose: z.string().max(100).optional(),
    service: z.string().max(100).optional(),
  })),
});

// ============================================
// Port Allocation CRUD
// ============================================

/**
 * GET /api/ports
 * List all port allocations with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { projectId, isActive, isReserved } = req.query;

    const where = {};
    if (projectId) where.projectId = projectId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isReserved !== undefined) where.isReserved = isReserved === 'true';

    const ports = await prisma.portAllocation.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, displayName: true },
        },
      },
      orderBy: { port: 'asc' },
    });

    res.json(ports);
  } catch (error) {
    sendSafeError(res, error, 'Failed to fetch port allocations');
  }
});

/**
 * GET /api/ports/summary
 * Get port usage summary with statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const [totalAllocated, activeCount, reservedCount, byProject] = await Promise.all([
      prisma.portAllocation.count(),
      prisma.portAllocation.count({ where: { isActive: true } }),
      prisma.portAllocation.count({ where: { isReserved: true } }),
      prisma.portAllocation.groupBy({
        by: ['projectId'],
        _count: { port: true },
        where: { projectId: { not: null } },
      }),
    ]);

    // Get port ranges
    const ranges = await prisma.portRange.findMany({
      include: {
        project: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    res.json({
      totalAllocated,
      activeCount,
      reservedCount,
      availableInRanges: ranges.reduce((sum, r) => sum + (r.endPort - r.startPort + 1), 0),
      projectCount: byProject.length,
      byProject,
      ranges,
    });
  } catch (error) {
    sendSafeError(res, error, 'Failed to fetch port summary');
  }
});

/**
 * GET /api/ports/available
 * Find available ports within optional range
 */
router.get('/available', async (req, res) => {
  try {
    const { start = 5000, end = 9999, count = 10, projectId } = req.query;
    const startPort = parseInt(start);
    const endPort = parseInt(end);
    const portCount = parseInt(count);

    // Get all allocated ports in range
    const allocated = await prisma.portAllocation.findMany({
      where: {
        port: { gte: startPort, lte: endPort },
      },
      select: { port: true },
    });

    const allocatedSet = new Set(allocated.map(p => p.port));

    // Check active ports on system
    let activePorts = new Set();
    try {
      const { stdout } = await execAsync("ss -tlnH | awk '{print $4}' | grep -oE '[0-9]+$' | sort -u");
      activePorts = new Set(stdout.trim().split('\n').filter(Boolean).map(Number));
    } catch {
      // Ignore errors from ss command
    }

    // Find available ports
    const available = [];
    for (let port = startPort; port <= endPort && available.length < portCount; port++) {
      if (!allocatedSet.has(port) && !activePorts.has(port)) {
        available.push(port);
      }
    }

    // If projectId provided, also check if within their range
    let withinRange = true;
    if (projectId) {
      const range = await prisma.portRange.findUnique({
        where: { projectId },
      });
      if (range) {
        const filteredAvailable = available.filter(p => p >= range.startPort && p <= range.endPort);
        return res.json({
          available: filteredAvailable,
          withinRange: true,
          range: { start: range.startPort, end: range.endPort },
        });
      }
      withinRange = false;
    }

    res.json({ available, withinRange });
  } catch (error) {
    sendSafeError(res, error, 'Failed to find available ports');
  }
});

/**
 * POST /api/ports
 * Allocate a single port
 */
router.post('/', async (req, res) => {
  try {
    const data = portAllocationSchema.parse(req.body);

    // Check if port is already allocated
    const existing = await prisma.portAllocation.findUnique({
      where: { port: data.port },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Port already allocated',
        existingAllocation: existing,
      });
    }

    // If projectId provided, verify it's within their range (if they have one)
    if (data.projectId) {
      const range = await prisma.portRange.findUnique({
        where: { projectId: data.projectId },
      });
      if (range && (data.port < range.startPort || data.port > range.endPort)) {
        return res.status(400).json({
          error: 'Port outside project range',
          allowedRange: { start: range.startPort, end: range.endPort },
        });
      }
    }

    const allocation = await prisma.portAllocation.create({
      data,
      include: {
        project: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    res.status(201).json(allocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    sendSafeError(res, error, 'Failed to allocate port');
  }
});

/**
 * POST /api/ports/bulk
 * Allocate multiple ports for a project
 */
router.post('/bulk', async (req, res) => {
  try {
    const data = bulkAllocateSchema.parse(req.body);

    // Check for existing allocations
    const existingPorts = await prisma.portAllocation.findMany({
      where: { port: { in: data.ports.map(p => p.port) } },
      select: { port: true },
    });

    if (existingPorts.length > 0) {
      return res.status(409).json({
        error: 'Some ports already allocated',
        conflictingPorts: existingPorts.map(p => p.port),
      });
    }

    // Create all allocations
    const allocations = await prisma.$transaction(
      data.ports.map(p =>
        prisma.portAllocation.create({
          data: {
            port: p.port,
            projectId: data.projectId,
            purpose: p.purpose,
            service: p.service,
          },
        })
      )
    );

    res.status(201).json(allocations);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    sendSafeError(res, error, 'Failed to bulk allocate ports');
  }
});

/**
 * PUT /api/ports/:port
 * Update a port allocation
 */
router.put('/:port', async (req, res) => {
  try {
    const port = parseInt(req.params.port);
    const data = portAllocationSchema.partial().parse(req.body);

    const allocation = await prisma.portAllocation.update({
      where: { port },
      data,
      include: {
        project: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    res.json(allocation);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Port allocation not found' });
    }
    sendSafeError(res, error, 'Failed to update port allocation');
  }
});

/**
 * DELETE /api/ports/:port
 * Release a port allocation
 */
router.delete('/:port', async (req, res) => {
  try {
    const port = parseInt(req.params.port);

    await prisma.portAllocation.delete({
      where: { port },
    });

    res.json({ success: true, port });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Port allocation not found' });
    }
    sendSafeError(res, error, 'Failed to release port');
  }
});

// ============================================
// Port Range Management
// ============================================

/**
 * GET /api/ports/ranges
 * List all port ranges
 */
router.get('/ranges', async (req, res) => {
  try {
    const ranges = await prisma.portRange.findMany({
      include: {
        project: {
          select: { id: true, name: true, displayName: true },
        },
      },
      orderBy: { startPort: 'asc' },
    });

    // Add allocation count for each range
    const rangesWithCounts = await Promise.all(
      ranges.map(async (range) => {
        const allocatedCount = await prisma.portAllocation.count({
          where: {
            port: { gte: range.startPort, lte: range.endPort },
            projectId: range.projectId,
          },
        });
        return {
          ...range,
          totalPorts: range.endPort - range.startPort + 1,
          allocatedCount,
          availableCount: range.endPort - range.startPort + 1 - allocatedCount,
        };
      })
    );

    res.json(rangesWithCounts);
  } catch (error) {
    sendSafeError(res, error, 'Failed to fetch port ranges');
  }
});

/**
 * POST /api/ports/ranges
 * Create a port range for a project
 */
router.post('/ranges', async (req, res) => {
  try {
    const data = portRangeSchema.parse(req.body);

    // Validate range
    if (data.startPort >= data.endPort) {
      return res.status(400).json({ error: 'startPort must be less than endPort' });
    }

    // Check for overlapping ranges
    const overlapping = await prisma.portRange.findFirst({
      where: {
        OR: [
          { startPort: { lte: data.endPort }, endPort: { gte: data.startPort } },
        ],
      },
    });

    if (overlapping) {
      return res.status(409).json({
        error: 'Range overlaps with existing range',
        conflictingRange: overlapping,
      });
    }

    const range = await prisma.portRange.create({
      data,
      include: {
        project: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    res.status(201).json({
      ...range,
      totalPorts: range.endPort - range.startPort + 1,
      allocatedCount: 0,
      availableCount: range.endPort - range.startPort + 1,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Project already has a port range' });
    }
    sendSafeError(res, error, 'Failed to create port range');
  }
});

/**
 * PUT /api/ports/ranges/:projectId
 * Update a project's port range
 */
router.put('/ranges/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const data = portRangeSchema.partial().parse(req.body);

    // If changing range, check for overlaps
    if (data.startPort || data.endPort) {
      const existing = await prisma.portRange.findUnique({
        where: { projectId },
      });

      const newStart = data.startPort ?? existing?.startPort ?? 0;
      const newEnd = data.endPort ?? existing?.endPort ?? 0;

      const overlapping = await prisma.portRange.findFirst({
        where: {
          projectId: { not: projectId },
          OR: [
            { startPort: { lte: newEnd }, endPort: { gte: newStart } },
          ],
        },
      });

      if (overlapping) {
        return res.status(409).json({
          error: 'Range overlaps with existing range',
          conflictingRange: overlapping,
        });
      }
    }

    const range = await prisma.portRange.update({
      where: { projectId },
      data,
      include: {
        project: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    res.json(range);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Port range not found' });
    }
    sendSafeError(res, error, 'Failed to update port range');
  }
});

/**
 * DELETE /api/ports/ranges/:projectId
 * Delete a project's port range
 */
router.delete('/ranges/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    await prisma.portRange.delete({
      where: { projectId },
    });

    res.json({ success: true, projectId });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Port range not found' });
    }
    sendSafeError(res, error, 'Failed to delete port range');
  }
});

// ============================================
// Port Status / Scanning
// ============================================

/**
 * GET /api/ports/scan
 * Scan system for active ports
 */
router.get('/scan', async (req, res) => {
  try {
    const { start = 1024, end = 65535 } = req.query;

    // Get listening ports from system
    const { stdout } = await execAsync("ss -tlnH | awk '{print $4}' | grep -oE '[0-9]+$' | sort -nu");
    const activePorts = stdout.trim().split('\n').filter(Boolean).map(Number);

    // Filter to requested range
    const filteredPorts = activePorts.filter(p => p >= parseInt(start) && p <= parseInt(end));

    // Get our allocations
    const allocations = await prisma.portAllocation.findMany({
      where: { port: { in: filteredPorts } },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    const allocationMap = new Map(allocations.map(a => [a.port, a]));

    // Build response
    const portStatus = filteredPorts.map(port => ({
      port,
      isActive: true,
      allocation: allocationMap.get(port) || null,
      isAllocated: allocationMap.has(port),
    }));

    res.json({
      activePorts: portStatus,
      totalActive: filteredPorts.length,
      allocatedActive: allocations.length,
      unallocatedActive: filteredPorts.length - allocations.length,
    });
  } catch (error) {
    sendSafeError(res, error, 'Failed to scan ports');
  }
});

/**
 * POST /api/ports/sync
 * Sync port status with system (mark active/inactive)
 */
router.post('/sync', async (req, res) => {
  try {
    // Get listening ports from system
    const { stdout } = await execAsync("ss -tlnH | awk '{print $4}' | grep -oE '[0-9]+$' | sort -nu");
    const activePorts = new Set(stdout.trim().split('\n').filter(Boolean).map(Number));

    // Update all allocations
    const allocations = await prisma.portAllocation.findMany();

    let updatedCount = 0;
    for (const alloc of allocations) {
      const isActive = activePorts.has(alloc.port);
      if (alloc.isActive !== isActive) {
        await prisma.portAllocation.update({
          where: { port: alloc.port },
          data: { isActive },
        });
        updatedCount++;
      }
    }

    res.json({
      success: true,
      scannedPorts: activePorts.size,
      updatedAllocations: updatedCount,
    });
  } catch (error) {
    sendSafeError(res, error, 'Failed to sync port status');
  }
});

  return router;
}
