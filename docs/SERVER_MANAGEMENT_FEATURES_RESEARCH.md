# Server Management Features Research

**Research Date:** 2026-01-12
**Researcher:** Claude (Researcher Agent)
**Purpose:** Identify web-based server management features for Console.web

---

## Executive Summary

This research analyzes features commonly found in web-based admin panels like Webmin, Cockpit, cPanel/WHM, and similar tools to identify valuable additions for Console.web's developer-focused server management dashboard on Ubuntu/Linux.

The analysis covers 10 feature categories, prioritizing practical single-server development/production environments with considerations for sudo requirements and security implications.

---

## Research Sources

### Primary References
- [Webmin](https://webmin.com/) - Open-source web-based system administration tool
- [Cockpit Project](https://cockpit-project.org/) - Red Hat's web console for Linux servers
- [cPanel & WHM](https://www.softwareadvice.com/server-management/cpanel-whm-profile/) - Commercial hosting control panel
- [Linux Admin Tools Overview](https://cybersecuritynews.com/linux-admin-tools/)

### Category-Specific Research
- User Management: [Linux User Management Guide](https://www.geeksforgeeks.org/linux-unix/user-management-in-linux/)
- Storage: [LVM Management Guide](https://opensource.com/business/16/9/linux-users-guide-lvm)
- Firewall: [UFW Essentials](https://www.digitalocean.com/community/tutorials/ufw-essentials-common-firewall-rules-and-commands)
- Scheduling: [Systemd Timers vs Cron](https://opensource.com/article/20/7/systemd-timers)
- Logs: [journald Log Viewer](https://logdy.dev/blog/post/journalctl-logs-web-viewer-with-logdy)
- Security: [Fail2Ban Guide](https://runcloud.io/blog/what-is-fail2ban)
- Backups: [rsnapshot Documentation](https://rsnapshot.org/)
- Process Management: [htop Guide](https://www.geeksforgeeks.org/linux-unix/using-htop-to-monitor-system-processes-on-linux/)

---

## 1. Package Management

### Features Overview
Package management is a core feature in all surveyed admin panels, providing GUI/web interfaces for apt/dpkg operations.

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| List installed packages | `dpkg -l` or `apt list --installed` | Essential | No |
| Check for updates | `apt update` | Essential | Yes |
| View available upgrades | `apt list --upgradable` | Essential | No (after update) |
| Upgrade packages (all) | `apt upgrade -y` | Essential | Yes |
| Install package | `apt install <package>` | Essential | Yes |
| Remove package | `apt remove <package>` | Essential | Yes |
| Purge package + config | `apt purge <package>` | Nice-to-have | Yes |
| Search packages | `apt search <term>` | Nice-to-have | No |
| View package details | `apt show <package>` | Nice-to-have | No |
| Clean package cache | `apt clean && apt autoclean` | Nice-to-have | Yes |
| Autoremove unused deps | `apt autoremove` | Nice-to-have | Yes |
| Fix broken packages | `apt --fix-broken install` | Advanced | Yes |
| Hold package version | `apt-mark hold <package>` | Advanced | Yes |
| Unhold package | `apt-mark unhold <package>` | Advanced | Yes |

### Implementation Considerations

**Cockpit Approach:**
- Uses PackageKit as platform-independent abstraction layer over apt
- Provides unified API across different distros
- Real-time update notifications

**UI Components Needed:**
- Package list with search/filter
- Update notification badge
- Bulk selection for upgrades
- Package details modal (version, size, dependencies)
- Update history log

**Security Considerations:**
- ⚠️ **CRITICAL**: Package operations modify system state - require confirmation
- Should show which packages will be upgraded before applying
- Log all package operations with user attribution
- Consider "unattended-upgrades" for security updates only
- Warn before removing critical packages (systemd, openssh-server, etc.)

**Priority Assessment:** ⭐ ESSENTIAL
- Developers frequently need to install tools and libraries
- Checking for security updates is critical
- Current Console.web lacks this entirely

---

## 2. User Management

### Features Overview
User and group management with sudo access control is fundamental for multi-user systems and privilege separation.

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| List all users | `cat /etc/passwd` or `getent passwd` | Essential | No |
| List all groups | `cat /etc/group` or `getent group` | Essential | No |
| View user details | `id <username>` | Essential | No |
| Create user | `useradd -m -s /bin/bash <user>` | Essential | Yes |
| Delete user | `userdel -r <user>` | Essential | Yes |
| Modify user | `usermod [options] <user>` | Essential | Yes |
| Set password | `passwd <user>` | Essential | Yes |
| Create group | `groupadd <group>` | Nice-to-have | Yes |
| Delete group | `groupdel <group>` | Nice-to-have | Yes |
| Add user to group | `usermod -aG <group> <user>` | Essential | Yes |
| Remove user from group | `gpasswd -d <user> <group>` | Essential | Yes |
| List user's groups | `groups <username>` | Nice-to-have | No |
| Add sudo access | `usermod -aG sudo <user>` | Essential | Yes |
| Edit sudoers | `visudo` | Advanced | Yes |
| Lock user account | `usermod -L <user>` | Nice-to-have | Yes |
| Unlock user account | `usermod -U <user>` | Nice-to-have | Yes |
| Set account expiry | `chage -E <date> <user>` | Advanced | Yes |
| View sudo permissions | `sudo -l -U <user>` | Nice-to-have | Yes |

### Implementation Considerations

**Key Files to Parse/Monitor:**
- `/etc/passwd` - User account information
- `/etc/shadow` - Encrypted passwords (sudo required to read)
- `/etc/group` - Group information
- `/etc/sudoers` - Sudo configuration (use `visudo` to edit)
- `/etc/sudoers.d/` - Additional sudo configs

**UI Components Needed:**
- User list with online/offline status (via `w` command)
- User creation wizard (username, full name, shell, home dir, groups)
- Group membership matrix view
- Sudo access toggle with confirmation
- Password strength meter

**Security Considerations:**
- ⚠️ **CRITICAL**: Never edit `/etc/sudoers` directly - use `visudo` or `sudo EDITOR=cat sudoers -f /etc/sudoers.d/<file>`
- Require re-authentication for sensitive operations (delete user, grant sudo)
- Log all user/group modifications
- Warn before deleting users with running processes
- Prevent deletion of system users (UID < 1000)
- Validate username format (alphanumeric, no special chars except dash/underscore)
- Enforce password policies (minimum length, complexity)

**Priority Assessment:** ⭐⭐ NICE-TO-HAVE
- Useful for multi-user development servers
- Less critical for single-user setups (most developers)
- Could be added as admin-only feature

---

## 3. Service Management (Extended)

### Current State
Console.web already has basic systemd service management in AdminDashboard.

### Additional Features to Consider

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| List all services | `systemctl list-units --type=service` | ✅ Implemented | No |
| Start/stop service | `systemctl start/stop <service>` | ✅ Implemented | Yes |
| Enable/disable service | `systemctl enable/disable <service>` | ✅ Implemented | Yes |
| Restart service | `systemctl restart <service>` | ✅ Implemented | Yes |
| View service status | `systemctl status <service>` | ✅ Implemented | No |
| View service logs | `journalctl -u <service>` | Nice-to-have | No |
| Edit service unit | `systemctl edit <service>` | Advanced | Yes |
| Mask/unmask service | `systemctl mask/unmask <service>` | Advanced | Yes |
| List failed services | `systemctl --failed` | Nice-to-have | No |
| Show dependencies | `systemctl list-dependencies <service>` | Advanced | No |
| View service config | `systemctl cat <service>` | Nice-to-have | No |
| Reload systemd config | `systemctl daemon-reload` | Nice-to-have | Yes |

### Enhancements to Existing Feature

**Missing Capabilities:**
- Service log viewer (integrate journalctl)
- Dependency graph visualization
- Service configuration editor
- Quick filtering for failed services only
- Service groups/categories

**Priority Assessment:** ⭐ ENHANCEMENT
- Core functionality exists
- Add log viewer integration (high value)
- Other features are lower priority

---

## 4. Storage & Disk Management

### Features Overview
Disk, partition, and LVM management for monitoring and configuring storage.

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| Disk usage summary | `df -h` | Essential | No |
| Directory space usage | `du -sh <path>` | Essential | No |
| List block devices | `lsblk` | Essential | No |
| Disk I/O stats | `iostat -x 1 10` | Nice-to-have | No |
| S.M.A.R.T. status | `smartctl -a /dev/sda` | Nice-to-have | Yes |
| List partitions | `fdisk -l` or `parted -l` | Nice-to-have | Yes |
| List mount points | `mount` or `cat /proc/mounts` | Essential | No |
| LVM physical volumes | `pvdisplay` | Advanced | Yes |
| LVM volume groups | `vgdisplay` | Advanced | Yes |
| LVM logical volumes | `lvdisplay` | Advanced | Yes |
| Create partition | `fdisk /dev/sdX` or `parted` | Advanced | Yes |
| Format partition | `mkfs.ext4 /dev/sdX1` | Advanced | Yes |
| Mount partition | `mount /dev/sdX1 /mnt/point` | Advanced | Yes |
| Unmount partition | `umount /mnt/point` | Advanced | Yes |
| Edit fstab | Edit `/etc/fstab` | Advanced | Yes |
| Create LVM LV | `lvcreate -L 10G -n lv_name vg_name` | Advanced | Yes |
| Extend LVM LV | `lvextend -L +10G /dev/vg/lv` | Advanced | Yes |
| Resize filesystem | `resize2fs /dev/vg/lv` | Advanced | Yes |

### Implementation Considerations

**Read-Only/Monitoring Features (Safe):**
- Disk usage visualization (pie charts per partition)
- Directory size analyzer (TreeMap visualization)
- I/O statistics over time
- S.M.A.R.T. health monitoring with alerts
- Mount point browser

**Read-Write Features (Dangerous):**
- ⚠️ Partition creation/deletion
- ⚠️ Formatting operations
- ⚠️ LVM operations
- ⚠️ fstab editing

**UI Components Needed:**
- Disk usage dashboard with visual charts
- Directory space analyzer (drill-down tree)
- Mount point list with usage bars
- S.M.A.R.T. health status badges
- (Optional) Partition editor with confirmation dialogs

**Security Considerations:**
- ⚠️ **CRITICAL**: Disk operations can destroy data - require double confirmation
- Validate mount points before unmount (check for running processes)
- Warn before formatting any partition
- Prevent operations on mounted system partitions (/, /boot, /home)
- Consider making write operations admin-only
- Log all disk operations

**Priority Assessment:** ⭐⭐ NICE-TO-HAVE (read-only), ⭐⭐⭐ ADVANCED (write operations)
- Disk usage monitoring is valuable for developers
- Partition/LVM management is risky - defer or make admin-only
- Focus on read-only visualization first

---

## 5. Network Management

### Features Overview
Network interface configuration, firewall rules (ufw/iptables), DNS, and hosts file management.

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| List network interfaces | `ip link show` or `nmcli device` | Essential | No |
| Interface IP addresses | `ip addr show` | Essential | No |
| Interface statistics | `ip -s link` | Nice-to-have | No |
| Active connections | `ss -tuln` or `netstat -tuln` | Essential | No |
| Routing table | `ip route show` | Nice-to-have | No |
| DNS servers | `cat /etc/resolv.conf` | Nice-to-have | No |
| Ping test | `ping -c 4 <host>` | Essential | No |
| Traceroute | `traceroute <host>` | Nice-to-have | No |
| DNS lookup | `nslookup <host>` or `dig <host>` | Nice-to-have | No |
| View hosts file | `cat /etc/hosts` | Nice-to-have | No |
| Edit hosts file | Edit `/etc/hosts` | Nice-to-have | Yes |
| UFW status | `ufw status verbose` | Essential | Yes |
| UFW enable/disable | `ufw enable/disable` | Essential | Yes |
| UFW allow port | `ufw allow <port>/<proto>` | Essential | Yes |
| UFW deny port | `ufw deny <port>/<proto>` | Essential | Yes |
| UFW delete rule | `ufw delete <rule>` | Essential | Yes |
| UFW allow from IP | `ufw allow from <ip>` | Nice-to-have | Yes |
| UFW reset | `ufw reset` | Advanced | Yes |
| View iptables rules | `iptables -L -n -v` | Advanced | Yes |
| NetworkManager status | `nmcli connection show` | Nice-to-have | No |
| Enable interface | `ip link set <iface> up` | Advanced | Yes |
| Disable interface | `ip link set <iface> down` | Advanced | Yes |

### Implementation Considerations

**Current Console.web Features:**
- ✅ Network statistics in RightSidebar (interfaces, throughput)
- ❌ Firewall management (missing)
- ❌ Hosts file editor (missing)
- ❌ DNS configuration (missing)
- ❌ Connection tester (missing)

**Firewall Management UI:**
- Rule list with port, protocol, source, action
- Quick toggles for common services (SSH, HTTP, HTTPS)
- Add rule wizard (port range selector, IP whitelist)
- Rule reordering (priority)
- UFW enable/disable master toggle
- Default policy selector (allow/deny incoming)

**Hosts File Editor:**
- Table view with IP, hostname, aliases
- Add/edit/delete entries
- Validation for IP format and hostname
- Comment preservation

**Network Diagnostics:**
- Ping/traceroute tool with results display
- DNS lookup tool
- Port connectivity checker
- Bandwidth speed test (to specific host)

**Security Considerations:**
- ⚠️ **CRITICAL**: Firewall misconfig can lock you out of SSH
- Always ensure SSH (port 22) remains allowed
- Warn before disabling UFW entirely
- Log all firewall rule changes
- Provide "safe mode" that auto-reverts after N minutes if not confirmed
- Validate IP addresses and CIDR notation
- Prevent duplicate rules

**Priority Assessment:** ⭐⭐ NICE-TO-HAVE
- Firewall management is valuable but risky
- Network diagnostics (ping, DNS lookup) are safe and useful
- Hosts file editor is low priority (rarely used)

---

## 6. Process Management (Extended)

### Current State
Console.web has basic process viewing but limited management.

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| List all processes | `ps aux` | Essential | No |
| Process tree | `pstree -p` | Nice-to-have | No |
| Process details | `ps -p <pid> -o args,user,%cpu,%mem,start` | Nice-to-have | No |
| Kill process | `kill <pid>` | Essential | No (own), Yes (others) |
| Force kill process | `kill -9 <pid>` | Essential | No (own), Yes (others) |
| Process priority | `renice -n <nice> -p <pid>` | Nice-to-have | No (decrease), Yes (increase) |
| Process affinity | `taskset -cp <cpus> <pid>` | Advanced | No (own), Yes (others) |
| Resource limits | `ulimit -a` (current shell) | Nice-to-have | No |
| Set resource limits | Edit `/etc/security/limits.conf` | Advanced | Yes |
| cgroups info | `systemd-cgls` | Advanced | No |
| cgroups limits | `systemctl set-property <unit> <property>=<value>` | Advanced | Yes |
| Open files by process | `lsof -p <pid>` | Nice-to-have | No (own), Yes (others) |
| Process threads | `ps -T -p <pid>` | Advanced | No |
| Process memory map | `pmap <pid>` | Advanced | No |
| Strace process | `strace -p <pid>` | Advanced | No (own), Yes (others) |

### Implementation Considerations

**Current Console.web Features:**
- ✅ System stats (CPU, memory) in RightSidebar
- ✅ Basic Docker container management
- ❌ Process list/management (missing)
- ❌ Resource limit configuration (missing)

**Process Manager UI (htop-style):**
- Sortable process table (PID, user, CPU%, mem%, command)
- Real-time updates (via Socket.IO)
- Color-coded CPU/memory usage bars
- Search/filter by name, user, or PID
- Multi-select for bulk operations
- Kill process with signal selector (TERM, KILL, HUP)
- Process detail modal:
  - Full command line
  - Environment variables
  - Open files (lsof)
  - Resource usage graph over time
  - Parent/child process tree

**Resource Limit Configuration:**
- Per-user limits editor (`/etc/security/limits.conf`)
- cgroups/systemd slice management
- ulimit presets (development, production)

**Security Considerations:**
- ⚠️ **CRITICAL**: Killing system processes can crash server
- Warn before killing processes owned by root or system users
- Require confirmation for force kill (SIGKILL)
- Show process owner and warn if killing another user's process
- Prevent killing critical services (sshd, systemd, docker)
- Log all process kills with user attribution

**Priority Assessment:** ⭐⭐ NICE-TO-HAVE
- Developers often need to identify and kill runaway processes
- Complements existing Docker container management
- UI similar to htop would be familiar and useful

---

## 7. Scheduled Tasks (Cron & Systemd Timers)

### Features Overview
Management of cron jobs and systemd timers for automated task execution.

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| List user cron jobs | `crontab -l` | Essential | No (own), Yes (others) |
| Edit user crontab | `crontab -e` | Essential | No (own), Yes (others) |
| List all cron jobs | `for user in $(cut -f1 -d: /etc/passwd); do crontab -u $user -l; done` | Nice-to-have | Yes |
| View system cron | `cat /etc/crontab` | Nice-to-have | No |
| View cron.d jobs | `ls /etc/cron.d/` | Nice-to-have | No |
| List systemd timers | `systemctl list-timers --all` | Essential | No |
| View timer details | `systemctl status <timer>` | Nice-to-have | No |
| Start/stop timer | `systemctl start/stop <timer>` | Essential | Yes |
| Enable/disable timer | `systemctl enable/disable <timer>` | Essential | Yes |
| View timer unit file | `systemctl cat <timer>` | Nice-to-have | No |
| Edit timer unit | `systemctl edit <timer>` | Advanced | Yes |
| Create new timer | Create `.timer` and `.service` files | Advanced | Yes |
| View timer logs | `journalctl -u <timer>` | Nice-to-have | No |
| Trigger timer now | `systemctl start <service>` | Nice-to-have | Yes |

### Implementation Considerations

**Cron Job Manager UI:**
- List view of all cron jobs with schedule preview
- Visual cron editor (dropdown selectors for min/hour/day/month/dow)
- Plain text editor for advanced users
- Schedule preview (next 5 run times)
- Validation of cron syntax
- Enable/disable jobs without deleting
- Import/export cron jobs
- Predefined templates (daily backup, weekly cleanup, etc.)

**Systemd Timer Manager UI:**
- List of all timers with next/last run times
- Timer status (active, inactive, failed)
- Integrated with existing service manager
- Create timer wizard:
  1. Select or create service unit
  2. Define schedule (OnCalendar, OnBootSec, OnUnitActiveSec)
  3. Set persistence (Persistent=true)
- View associated service logs

**Cockpit Integration Pattern:**
- Cockpit provides clickable timer list with enable/disable toggles
- Shows next trigger time and last trigger time
- Links to service logs

**Security Considerations:**
- ⚠️ Cron jobs run arbitrary commands - validate input carefully
- Prevent shell injection in cron commands
- Warn when creating jobs with root privileges
- Log all cron/timer modifications
- Show environment variables (PATH, SHELL) for cron context
- Validate timer calendar syntax before saving

**Priority Assessment:** ⭐⭐ NICE-TO-HAVE
- Useful for automated backups, deployments, maintenance
- Systemd timers are modern replacement for cron
- Visual schedule editor adds significant value over CLI

---

## 8. Logs & Journald Viewer

### Features Overview
System log aggregation and viewing, primarily through systemd journal (journalctl).

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| View all logs | `journalctl` | Essential | No (user logs), Yes (system) |
| Follow logs | `journalctl -f` | Essential | No (user logs), Yes (system) |
| Logs since boot | `journalctl -b` | Essential | No |
| Logs for service | `journalctl -u <service>` | Essential | No |
| Logs for priority | `journalctl -p err` (error and above) | Nice-to-have | No |
| Logs by date range | `journalctl --since "2026-01-01" --until "2026-01-12"` | Essential | No |
| Logs by PID | `journalctl _PID=<pid>` | Nice-to-have | No |
| Reverse order (newest first) | `journalctl -r` | Nice-to-have | No |
| Show kernel messages | `journalctl -k` or `dmesg` | Nice-to-have | No (dmesg may need sudo) |
| Disk usage by logs | `journalctl --disk-usage` | Nice-to-have | No |
| Vacuum old logs | `journalctl --vacuum-time=30d` or `--vacuum-size=1G` | Nice-to-have | Yes |
| Verify log integrity | `journalctl --verify` | Advanced | No |
| Export logs | `journalctl -o json > logs.json` | Nice-to-have | No |

### Implementation Considerations

**Log Viewer UI (journald-focused):**
- Live streaming view (journalctl -f)
- Priority color coding (emergency=red, error=orange, warning=yellow, info=white)
- Filter panel:
  - Service selector (dropdown)
  - Priority level (checkboxes)
  - Date range picker
  - Full-text search
  - PID filter
- Pagination for large log sets
- Export options (JSON, text, CSV)
- Log entry expansion (show all fields: _SYSTEMD_UNIT, _PID, _UID, etc.)
- Bookmarking/pinning important entries

**Integration with Existing Features:**
- Link from service manager → service logs
- Link from Docker container list → container logs
- Link from process manager → process logs

**Web UI Inspiration:**
- **Grafito**: Live streaming, filters, clean web UI for journald
- **Cockpit**: Embedded journalctl viewer with service integration
- **Logdy**: Advanced filtering and search

**Legacy Log Files:**
- Some services still write to `/var/log/` files:
  - `/var/log/syslog` (if syslog forwarding enabled)
  - `/var/log/auth.log` (SSH attempts)
  - `/var/log/nginx/`, `/var/log/apache2/` (web server logs)
  - `/var/log/mysql/` (database logs)
- File browser integration: tail, search, download

**Security Considerations:**
- Many system logs contain sensitive info (IP addresses, usernames)
- Filter out sensitive data before display (password reset tokens, API keys)
- Require authentication for log access
- Limit user log access to their own services/processes
- Admin users can view all logs

**Priority Assessment:** ⭐ ESSENTIAL
- Log viewing is critical for debugging and monitoring
- journalctl is powerful but intimidating for new users
- Web UI makes logs accessible and searchable
- High value feature that complements existing terminal access

---

## 9. Security Features

### Features Overview
Security monitoring and management: SSH, fail2ban, SSL certificates, and security auditing.

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| SSH login attempts | `grep "Failed password" /var/log/auth.log` | Essential | Yes |
| Active SSH sessions | `who` or `w` | Essential | No |
| List SSH keys | `ls -la ~/.ssh/` | Nice-to-have | No (own), Yes (others) |
| View authorized_keys | `cat ~/.ssh/authorized_keys` | Nice-to-have | No (own), Yes (others) |
| Add SSH key | Append to `~/.ssh/authorized_keys` | Nice-to-have | No (own), Yes (others) |
| Generate SSH key | `ssh-keygen -t ed25519 -C "comment"` | Nice-to-have | No |
| Fail2ban status | `fail2ban-client status` | Essential | Yes |
| Fail2ban jail status | `fail2ban-client status <jail>` | Essential | Yes |
| Fail2ban banned IPs | `fail2ban-client get <jail> banned` | Essential | Yes |
| Fail2ban unban IP | `fail2ban-client set <jail> unbanip <ip>` | Essential | Yes |
| SSL certificate info | `openssl x509 -in cert.pem -text -noout` | Nice-to-have | No |
| Check certificate expiry | `openssl x509 -in cert.pem -noout -enddate` | Nice-to-have | No |
| Let's Encrypt renewal | `certbot renew` | Nice-to-have | Yes |
| List certificates | `certbot certificates` | Nice-to-have | Yes |
| Security updates | `apt list --upgradable | grep security` | Essential | No |
| Check open ports | `ss -tuln` or `netstat -tuln` | Essential | No |
| Auditd logs | `ausearch -ts today -m USER_LOGIN` | Advanced | Yes |
| Failed sudo attempts | `grep "sudo.*FAILED" /var/log/auth.log` | Nice-to-have | Yes |
| Last logins | `last` or `lastlog` | Nice-to-have | No |

### Implementation Considerations

**SSH Security Dashboard:**
- Active SSH sessions list (who, from where, since when)
- Recent failed login attempts (last 24h, with IP geolocation)
- SSH key manager:
  - List authorized keys with fingerprints
  - Add new key (paste or upload)
  - Revoke/delete keys
  - Generate new key pair
- SSH configuration viewer (`/etc/ssh/sshd_config`):
  - PermitRootLogin status
  - PasswordAuthentication status
  - Port number

**Fail2ban Dashboard:**
- Jail status overview (enabled jails, banned count)
- Per-jail detail:
  - Current banned IPs with ban time remaining
  - Ban/unban actions
  - Failed attempt count
  - Max retries and ban duration config
- Ban history graph (bans per day)
- IP whitelist/blacklist management

**SSL Certificate Manager:**
- List all certificates on system with expiry dates
- Expiry warnings (< 30 days)
- Let's Encrypt renewal button
- Certificate detail viewer (issuer, subject, validity, SANs)
- Upload custom certificate

**Security Audit:**
- Security updates available count (badge)
- Open ports summary with service identification
- Last successful/failed login summary
- Sudo audit log (recent sudo commands)
- File integrity monitoring (AIDE)

**Integration with Console.web:**
- Security badge in header (number of issues)
- Alert rules for:
  - Certificate expiring soon
  - Multiple failed SSH attempts
  - New banned IP in fail2ban
  - Security updates available

**Security Considerations:**
- ⚠️ **CRITICAL**: SSH key management is high-risk - validate key format before adding
- Never display private keys in UI
- Fail2ban unban requires justification/logging
- Certificate private keys should never be downloadable
- Log all security configuration changes
- Implement 2FA for security-related operations

**Priority Assessment:** ⭐ ESSENTIAL (SSH monitoring, fail2ban), ⭐⭐ NICE-TO-HAVE (certificates)
- SSH security is critical for internet-facing servers
- Fail2ban monitoring helps identify attack patterns
- Certificate expiry monitoring prevents outages

---

## 10. Backup & Restore

### Features Overview
System backup management using tools like rsync, rsnapshot, and snapshot-based solutions.

### Specific Operations

| Operation | Command | Priority | Sudo Required |
|-----------|---------|----------|---------------|
| rsync backup | `rsync -avz --progress /source/ /dest/` | Essential | Depends on dest |
| rsnapshot backup | `rsnapshot daily` | Essential | Yes (if system-wide) |
| List snapshots | `ls /backup/.snapshots/` | Essential | Depends on dest |
| Restore file | `rsync /backup/file /original/location` | Essential | Depends on dest |
| Database backup | `pg_dump dbname > backup.sql` | Essential | No (DB user) |
| Database restore | `psql dbname < backup.sql` | Essential | No (DB user) |
| Compressed backup | `tar -czf backup.tar.gz /path/` | Essential | Depends on source |
| Encrypted backup | `tar -czf - /path/ | openssl enc -aes-256-cbc > backup.tar.gz.enc` | Advanced | Depends |
| S3 sync | `aws s3 sync /local/ s3://bucket/path/` | Nice-to-have | No (with creds) |
| Rclone sync | `rclone sync /local/ remote:path/` | Nice-to-have | No (with creds) |
| Verify backup | `rsync -anv /source/ /dest/` | Nice-to-have | No |
| Backup rotation | Delete old backups per policy | Essential | Depends |
| System image | `dd if=/dev/sda of=backup.img bs=4M` | Advanced | Yes |
| LVM snapshot | `lvcreate -L 1G -s -n snap /dev/vg/lv` | Advanced | Yes |

### Implementation Considerations

**Backup Manager UI:**
- Backup job list with last run time, status, size
- Create backup job wizard:
  - Source path selector
  - Destination (local path, S3, Rclone remote)
  - Schedule (on-demand, cron, systemd timer)
  - Retention policy (keep last N backups, delete older than X days)
  - Compression (none, gzip, bzip2, xz)
  - Encryption (none, GPG, OpenSSL)
  - Exclude patterns
- Backup now button (manual trigger)
- View backup contents (file browser into backup snapshots)
- Restore wizard:
  - Select backup snapshot
  - Select files/directories to restore
  - Restore location
  - Conflict resolution (overwrite, skip, rename)
- Backup verification (dry-run rsync to check differences)
- Backup size trends graph

**Backup Destinations:**
- Local disk/directory
- Network share (NFS, SMB via mount)
- S3-compatible storage (AWS, MinIO, Wasabi)
- Rclone remotes (Google Drive, Dropbox, B2, etc.)
- SFTP/SSH remote

**Integration with Console.web:**
- Database backup shortcuts (PostgreSQL, MySQL)
- Docker volume backup
- Git repository backup (clone with --mirror)
- Project directory backup presets

**Rsnapshot Integration:**
- Rsnapshot config editor (`/etc/rsnapshot.conf`)
- Trigger snapshot levels (hourly, daily, weekly, monthly)
- Snapshot browser (time-machine style)

**Security Considerations:**
- ⚠️ Backup credentials (S3 keys, SSH keys) must be encrypted at rest
- Never display backup encryption passphrases in UI
- Warn before deleting backup snapshots
- Validate restore destination to prevent overwriting critical files
- Log all backup/restore operations
- Consider append-only backup destinations (prevent ransomware deletion)

**Priority Assessment:** ⭐⭐ NICE-TO-HAVE
- Backups are critical but often handled outside the app
- Developers may use Git for code, cloud storage for files
- Database backup shortcuts are high value
- Full backup/restore UI is advanced feature

---

## Feature Priority Matrix

### Essential (Implement First)

| Feature | Value | Risk | Effort | Score |
|---------|-------|------|--------|-------|
| Package Management | High | Medium | Medium | 🔥🔥🔥 |
| Log Viewer (journald) | High | Low | Medium | 🔥🔥🔥 |
| SSH Security Monitoring | High | Low | Low | 🔥🔥🔥 |
| Process Management | Medium | Medium | Medium | 🔥🔥 |
| Network Diagnostics (ping, DNS) | Medium | Low | Low | 🔥🔥 |
| Cron/Timer Management | Medium | Medium | Medium | 🔥🔥 |

### Nice-to-Have (Implement Later)

| Feature | Value | Risk | Effort | Score |
|---------|-------|------|--------|-------|
| User Management | Medium | High | Medium | 🔥 |
| Disk Usage Monitoring | Medium | Low | Low | 🔥🔥 |
| Firewall Management (UFW) | Medium | High | Medium | 🔥 |
| Fail2ban Monitoring | Medium | Low | Low | 🔥🔥 |
| SSL Certificate Monitoring | Low | Low | Low | 🔥 |
| Backup Scheduler | Low | Medium | High | 🔥 |

### Advanced (Optional/Future)

| Feature | Value | Risk | Effort | Score |
|---------|-------|------|--------|-------|
| Partition/LVM Management | Low | Very High | High | ⚠️ |
| Sudoers Editor | Low | Very High | Medium | ⚠️ |
| cgroups Configuration | Low | High | High | ⚠️ |
| Auditd Integration | Low | Low | Medium | 🔥 |

---

## Implementation Recommendations

### Phase 1: High-Value, Low-Risk Features (2-3 weeks)

1. **Package Management** (Week 1)
   - Package list with search/filter
   - Update checker with notification badge
   - Install/remove/upgrade actions
   - Update history log

2. **Log Viewer** (Week 1)
   - journalctl integration with live streaming
   - Priority filtering and color coding
   - Service log linking from existing service manager
   - Export functionality

3. **Network Diagnostics** (Week 2)
   - Ping tool with results display
   - DNS lookup tool
   - Port connectivity checker
   - Integrate with existing network stats

4. **SSH Security Dashboard** (Week 2-3)
   - Active session list
   - Failed login attempts with IP geolocation
   - SSH key viewer (read-only to start)
   - Alert integration

5. **Process Management** (Week 3)
   - htop-style process table with real-time updates
   - Process search and filtering
   - Kill process with signal selection
   - Process detail modal

### Phase 2: Medium-Value Features (3-4 weeks)

6. **Cron/Systemd Timer Manager** (Week 4)
   - Timer list with next/last run times
   - Visual cron schedule editor
   - Timer enable/disable toggles
   - Log integration

7. **Disk Usage Monitoring** (Week 5)
   - Enhanced disk usage visualization
   - Directory size analyzer (TreeMap)
   - S.M.A.R.T. health monitoring
   - Mount point browser

8. **Fail2ban Dashboard** (Week 5)
   - Jail status overview
   - Banned IP list with unban action
   - Ban history visualization
   - Alert integration

9. **Firewall Management (UFW)** (Week 6-7)
   - Rule list viewer
   - Add/remove rules with validation
   - Common service quick toggles
   - SSH lockout prevention

### Phase 3: Advanced Features (Future)

10. **User Management**
    - User/group CRUD operations
    - Sudo access management
    - Password policies

11. **SSL Certificate Manager**
    - Certificate list with expiry dates
    - Let's Encrypt renewal
    - Expiry alerts

12. **Backup Scheduler**
    - Rsync-based backup jobs
    - Schedule management
    - Restore wizard

---

## Security Best Practices

### General Principles

1. **Least Privilege**: Only request sudo when necessary
2. **Double Confirmation**: Destructive operations require two confirmations
3. **Audit Logging**: Log all system modifications with user attribution
4. **Input Validation**: Sanitize all user inputs to prevent command injection
5. **Read-Only First**: Implement monitoring features before write operations
6. **Fail-Safe Defaults**: Disable dangerous features by default (require opt-in)

### Dangerous Operations to Restrict

| Operation | Risk | Mitigation |
|-----------|------|------------|
| Package remove | High | Prevent removing critical packages (openssh-server, systemd) |
| User deletion | High | Warn if user has running processes or open files |
| Sudo grant | High | Require admin re-authentication |
| Firewall disable | High | Auto-revert after timeout unless confirmed |
| Partition format | Critical | Require typing "DELETE ALL DATA" to confirm |
| Process kill (root) | High | Warn and require justification |
| Service disable (SSH) | High | Prevent disabling remote access services |
| Cron job (root) | High | Validate for shell injection patterns |

### Command Injection Prevention

```javascript
// BAD: Never do this
exec(`rm -rf ${userInput}`)

// GOOD: Use parameterized commands
const { spawn } = require('child_process')
spawn('rm', ['-rf', sanitizedPath])

// BETTER: Use libraries when possible
fs.rmSync(sanitizedPath, { recursive: true })
```

### Sudo Access Patterns

```bash
# Option 1: Passwordless sudo for specific commands (sudoers.d)
# File: /etc/sudoers.d/command-portal
username ALL=(ALL) NOPASSWD: /usr/bin/apt update, /usr/bin/apt upgrade -y
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl start *, /usr/bin/systemctl stop *

# Option 2: Time-limited sudo session (user enters password once)
# UI prompts for sudo password, then subsequent commands use cached credentials

# Option 3: Sudo wrapper with confirmation
# UI displays command to run, user must confirm before execution
```

---

## Competitive Analysis Summary

### Webmin
**Strengths:**
- Comprehensive (1000+ modules)
- Mature and stable
- Extensive documentation

**Weaknesses:**
- Dated UI/UX
- Perl-based (maintenance concerns)
- Complex configuration

**Lessons for Console.web:**
- Focus on modern, clean UI
- Prioritize developer-relevant features
- Avoid feature bloat

### Cockpit
**Strengths:**
- Modern React-based UI
- Tight systemd integration
- Low resource usage (socket activation)
- Multi-server management

**Weaknesses:**
- Limited to Red Hat ecosystem initially
- Fewer third-party plugins

**Lessons for Console.web:**
- Emphasize real-time updates (WebSocket)
- Integrate deeply with systemd
- Keep UI responsive and fast

### cPanel/WHM
**Strengths:**
- Industry standard for web hosting
- Excellent automation
- Comprehensive billing integration

**Weaknesses:**
- Expensive licensing
- Hosting-focused (not dev-focused)
- Proprietary

**Lessons for Console.web:**
- Focus on developer workflows (not hosting)
- Open-source and free
- Git and deployment pipeline integration

---

## Conclusion

This research identifies **10 feature categories** with **150+ specific operations** commonly found in web-based server admin panels.

### Top Recommendations for Console.web:

1. **Package Management** - Essential for developers, currently missing
2. **Log Viewer (journald)** - High value, complements existing terminal
3. **SSH Security Monitoring** - Critical for internet-facing servers
4. **Process Management** - Natural extension of existing system stats
5. **Network Diagnostics** - Low effort, high utility

### Features to Defer or Avoid:

- **Partition/LVM Management** - Very high risk, low demand
- **Sudoers Editor** - Extremely dangerous, use visudo instead
- **User Management** - Lower priority for single-user dev servers

### Implementation Philosophy:

- **Read-Only First**: Implement monitoring before write operations
- **Safety Nets**: Confirmations, validation, and undo capabilities
- **Progressive Enhancement**: Start with safe features, add risky ones later
- **Developer Focus**: Prioritize dev workflows over traditional sysadmin tasks

---

## Sources

- [Webmin Official Site](https://webmin.com/)
- [Cockpit Project](https://cockpit-project.org/)
- [cPanel & WHM Profile](https://www.softwareadvice.com/server-management/cpanel-whm-profile/)
- [Linux User Management](https://www.geeksforgeeks.org/linux-unix/user-management-in-linux/)
- [LVM Guide](https://opensource.com/business/16/9/linux-users-guide-lvm)
- [UFW Essentials](https://www.digitalocean.com/community/tutorials/ufw-essentials-common-firewall-rules-and-commands)
- [Systemd Timers](https://opensource.com/article/20/7/systemd-timers)
- [Grafito - journald Web Viewer](https://linuxiac.com/grafito-systemd-journal-log-viewer-with-a-beautiful-web-ui/)
- [Fail2Ban Guide](https://runcloud.io/blog/what-is-fail2ban)
- [rsnapshot Documentation](https://rsnapshot.org/)
- [htop Process Monitoring](https://www.geeksforgeeks.org/linux-unix/using-htop-to-monitor-system-processes-on-linux/)

---

**Research Completed:** 2026-01-12 21:18 UTC
**Total Sources Consulted:** 40+
**Report Author:** Claude (Researcher Agent)
**Report Version:** 1.0
