# MISSION: ENTERPRISE "MISSION CONTROL" & MULTI-USER UPGRADE

## 1. CONTEXT & DISCOVERY
Act as a Principal Systems Architect and Product Manager. We are upgrading "console-web" to a secure, multi-user enterprise interface with "Mission Control" capabilities.

**Strictly adhere to the following sources of truth:**
1.  Read `~/CLAUDE.md` (Global Rules).
2.  Read `~/Projects/console-web/CLAUDE.md` (Project Rules).
3.  Read `README.md` and scan the entire codebase (especially `server/` and `frontend/`) to understand the current `shpool` session handling and authentication state.

## 2. KEY OBJECTIVES

### A. The "Mission Control" UI
- **Goal:** Visualize "Spawned Agents" (interactive CLI/AI processes) alongside the terminal.
- **Requirement:** A "Three-Pane" layout:
    1.  **Left:** Project/Session List (Filtered by permissions).
    2.  **Center:** Active Terminal (XTerm.js).
    3.  **Right:** Agent Observability Drawer (Tree/DAG visualization of spawned agent relationships).

### B. Multi-User & RBAC (Role-Based Access Control)
- **Goal:** Isolate user environments while providing oversight.
- **Rules:**
    - **Admins:** Can see and manage *ALL* active `shpool` sessions and projects across the system.
    - **Standard Users:** Can *ONLY* see and interact with their own specific projects/sessions.
    - **Authentication:** Identify where user identity is currently handled (or needs to be added).

### C. Enterprise Gap Analysis
- **Goal:** Compare the current codebase against "Enterprise-Grade" standards (Security, Observability, Scalability).

## 3. EXECUTION TASKS (Use Sub-Agents)

### Task 1: Architecture Audit
- Analyze how sessions are currently stored and retrieved.
- Identify the exact code path for injecting user-level filtering (e.g., `WHERE user_id = ...`).
- Determine the best method to capture "Agent Spawn" events from the backend to the frontend.

### Task 2: The Enterprise Gap Analysis
- Evaluate the system for missing enterprise features (e.g., SSO, Audit Logs, Resource Quotas, Persistent Storage, Secrets Management).
- Mark features as "Optional" but recommended for alignment.

### Task 3: The Prioritization Matrix
- Create a ranked table of all proposed features.
- **Columns:** Category, Feature, Business Value (1-10), Completion Status (%), Level of Effort (Low/Med/High).

## 4. FINAL OUTPUT DELIVERABLE
**DO NOT WRITE CODE YET.**
Instead, generate a single file named `ENTERPRISE_ROADMAP.md` containing:

1.  **Current State Summary:** A brief technical overview of the current auth and session logic.
2.  **The RBAC Plan:** A technical proposal for enforcing Admin vs. User views.
3.  **The Gap Analysis:** A list of missing enterprise capabilities.
4.  **The Master Prioritization Matrix:**
    * *Group functionality by:* Core Infrastructure, Security/RBAC, UI/UX (Mission Control), and Future Enterprise Features.
    * *Rank:* Prioritize by "Critical Path" for the MVP.

Wait for user approval of this `ENTERPRISE_ROADMAP.md` before generating implementation code.
