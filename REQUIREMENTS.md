# Vesper Portal — Product Requirements

**Project:** Vesper Portal  - Visual Engine for Synthesized Platform Exchange and Response
**Stack:** React 18, Vite 5, Recharts  
**Last Updated:** April 2026

---

## 1. Overview

The Vesper Portal is a role-based internal web application for managing chaplaincy operations across corporate client accounts. It enables Executive Directors of Operations (EDOs), Vice Presidents, Executives, and Chaplains to track client health, log chaplain visits and activity reports, generate Employee Care Reports (ECRs), and collaborate through shared notes and prayer requests.

---

## 2. User Roles & Access

The portal supports distinct roles, each with scoped data access and a tailored navigation experience.

### 2.1 Role Definitions

| Role | Description | Data Scope |
|---|---|---|
| **Chaplain** | Field chaplain assigned to one or more client sites | Can add, edit, and submit Non-Company Reports, Assigned clients only |
| **EDO** (Executive Director of Operations) | Division account manager | Can add, edit, and submit Non-Company Reports, Their assigned client portfolio |
| **EVP** (Executive Vice President of Operations) | Regional Manager, Oversees multiple Divisions | Can add, edit, and submit Non-Company Reports, All clients and all chaplains across all divisions |
| **Executive** | Non-Operations Department Manager, C-Suite | **Need scope ** |
| **Administrative Support** | Regional Admins, Help Desk, Support staff | Can add, edit, and submit Non-Company Reports, Can view all clients and all chaplains within division or region selected |
| **Exec** (Chief Executive Officer) | Organization-wide oversight | All clients and all chaplains across all regions |

### 2.2 Authentication

- Sign-in is secured via **One Login/Microsoft Azure AD SSO**
- Language selection available at login (English, Español, Français)
- Role and region are derived from the authenticated user's profile
- Users can sign out via a profile menu accessible from the sidebar

---

## 3. Navigation & Layout

### 3.1 App Shell

The application uses a persistent **collapsible sidebar** layout with:

- Organization branding (Marketplace Ministries logo and portal name)
- Navigation grouped into three sections: **Workspace**, **Analytics**, and **Client Management**
- A **Team Hub** slide-in panel accessible from the sidebar (prayer requests & team notes)
- Language selector (English / Español / Français)
- User profile pop-up showing name, email, role, region, and supervisor

### 3.2 Navigation Pages

| Page | Roles | Description |
|---|---|---|
| Dashboard | All | Main landing page; varies by role |
| Company Activity Reports | All | Log and browse chaplain visit reports |
| Non-Company Reports | All | Log activity not tied to a specific client |
| Shared Notes & Prayers | All | Chaplain team noticeboard |
| My Metrics | Chaplain only | Personal performance dashboard |
| Tasks | EDO, VP, Exec | Task management |
| ECR Builder | EDO, VP, Exec | Employee Care Report composer |
| Chaplains | EDO, VP, Exec | Chaplain performance overview |
| Customers | EDO, VP, Exec | CRM account management |

---

## 4. Dashboard

### 4.1 EDO / VP / Exec Dashboard

- Personalized greeting with client count, region, and CRM sync status
- **7-tile KPI strip**: Assigned Clients · Active Chaplains · Avg Engagement · Assigned vs Actual Hours · Avg CDs/Service Hour · Avg Engagements/Service Hour · Avg CLI/Site Visit
- Chaplain hours and performance metrics derived from `buildChaplainData()`
- **Client cards** grid view with search and health-status filter (All / On Track / Due Soon / Overdue)
- **Company cards** — 4-stat grid (Employees · Chaplains · Locations · Engagement), contact line, Headcount Due month, ECR Due month
- Clicking a client opens a **Client Drawer** with full details and action buttons
- **Filters**: All Accounts · Highest Parent Accounts · Service Locations + Affiliation dropdown (C12 Affiliate, CEO Forums, CEO Institute, Convene, Dallas Real Estate Ministry, FCCI, SGI, YPO)
- Search by client name or contact


### 4.2 Chaplain Dashboard

- Simplified view scoped to assigned clients
- Quick-access button to file a new report
- Summary of assigned sites and recent activity

---

## 5. Client Drawer

Accessed by clicking any client card on the dashboard. Contains:

- Header tiles: Chaplains · Engagement · Locations (from `CUSTOMER_LOCATIONS`)
- Quick action: Build ECR Report only
- Primary contact name, title, and email
- **ECR Reporting Frequency** section: Headcount Due month + ECR Due month
- **Report Summary** 
- Chaplain Visit Trend sparkline

---

## 6. Company Activity Reports (Visit Log)

A full log of all chaplain visit reports scoped to the user's accessible clients.

- Multi-step form (4 steps): Details → Conversations → Narrative → Issues
- **Step 1 — Report Details**:
  - Client location, date, visit type, **visit setting** (Work-Site · Chaplain Home/Office · Client Employee Home · Funeral Home · Hospital · Detention Facility · Other — "Other" requires explanation)
  - Time entry (arrival/departure or direct hours) — activity hours and travel hours clamped to ≥ 0
  - Expenses with receipt upload (required for non-mileage)
  - Total employees engaged — clamped to ≥ 0
- **Step 2 — Conversations**: structured by 7 categories (Confidential · Engagements · JRI · Evangelism · Communication · Referrals · Crisis)
  - JRI and Crisis types: required detail + guidance fields per type when count > 0
  - Referrals "Other": required explanation when count > 0
- **Step 3 — Narrative**: Ministry Story + Flag an Incident
  - Flag an incident: description *"Flag something that happened to or involving an employee during pastoral care — not an operational issue with the visit itself."*
  - Flagging requires a description (blocks Continue)
- **Step 4 — Log an Issue**: records operational/logistical problems
  - Description: *"Record operational or logistical problems... All issues are automatically sent to your EDO for review."*
  - Category + Severity (Low/Medium/High) + Description + Steps Taken
  - No "flag for supervisor review" — all issues route to EDO automatically

### 6.1 List & Grid Views

- Summary KPI bar: visits shown, total conversations, on-time submission rate, flagged incidents

### 6.2 Filtering & Search

- Search by client name 
- Filter by location or date range

### 6.3 Visit Cards / Rows

Each visit entry displays:
- Client logo and name
- Visit date and visit type
- Total Hours, Total Activity Time, Total Travel Time
- Total Employees Engaged, overall Site well-being score, list of expenses
- Total conversations by type
- Visit Narrative including overview, recorded ministry story, recommendations, and personal reflection
- On-time / Late submission badge
- Flagged incident indicator (⚠️)

### 6.4 Visit Detail Modal

Clicking a visit opens a modal with four tabs:

- **Time & Expenses** - breakdown of Total Time, Activity Time, Travel Time, overall visit details, expenses, and follow-up required
- **Cnversations** — breakdown of all interaction types with counts
- **Narrative** — period overview, themes & pastoral concerns, recommendations & follow-up, referrals & collaboration, personal reflection
- **Issues** — any logged issues, categorized by severity with resolution notes

---

## 7. Report Submission Form (New Report)

A **multi-step drawer** for logging a new visit report. Available to Chaplains from the dashboard and to EDOs/VPs from the Visit Log. Contains 4 steps:

### Step 1 — Visit Details
- Date picker
- Start/end time (auto-calculates activity hours) or manual hour entry
- Travel hours
- Visit type selector
- Client selector (scoped to user's accessible clients)
- Chaplain(s) present (multi-select; auto-populated for Chaplain role)

### Step 2 — Interactions & Employees
- Total employees served
- Conversation type counters (increment/decrement) for:
  - Supportive listening, grief support, crisis intervention, spiritual care, stress/anxiety, family concerns, health concerns, follow-ups, and more
- Funeral/memorial services logging (with date and site fields)
- JRI (Job-Related Interaction) count

### Step 3 — Narrative & Reflection
- Period overview (free text, required)
- Themes & pastoral concerns
- Recommendations & follow-up
- Referrals & collaboration
- Personal reflection
- Site wellbeing rating (1–5 scale)
- Availability for next period
- Incidents to flag (yes/no toggle)
- Ministry story field with **voice recording support** (speech-to-text)
- Photo upload (optional, multiple images)

### Step 4 — Issues
- Issue category selector
- Severity selector (Low / Medium / High)
- Description (required)
- Steps taken
- Flag for supervisor review checkbox (routes to named supervisor)
- Multiple issues can be added before submission

**Submission** creates the report and any associated issues. A confirmation screen is shown on success.

---

## 8. Non-Company Reports

A separate report type for activity not tied to a specific client (e.g., internal meetings, training, community outreach). Uses a simplified version of the report form.

---

## 9. ECR Builder (Employee Care Report)

A drag-and-drop report composer for building formal quarterly care reports to share with corporate clients.

### 9.1 Block Library

Reports are composed of modular blocks:

| Block Type | Description |
|---|---|
| Cover Slide | Branded cover with client name and report period |
| KPI Summary Row | At-a-glance metrics (interactions, employees served, response time, crisis referrals) |
| Interaction Trends | Monthly bar chart of visits and follow-ups |
| Employee Sentiment | Pie chart of sentiment distribution |
| Dept. Breakdown | Horizontal bar chart of interactions by department |
| Crisis & Referrals | Crisis type counts and trends |
| Pulse Report | Multi-category site health summary |
| Narrative / Text | Free-text narrative block |
| Image / Logo | Image or logo insertion |

### 9.2 Drilldown Interactivity

All data blocks support click-through drilldowns:
- KPI cards drill into monthly trend charts with chaplain insight notes
- Interaction bar chart drills into weekly breakdown per month
- Sentiment pie drills into departmental breakdown per category
- Demographics bar drills into monthly trend per department
- Crisis types drill into trend charts and detailed case notes

### 9.3 Builder Interface

- Left panel: scrollable block library organized by category (Data / Content)
- Center canvas: ordered list of active blocks with drag-to-reorder
- Each block can be removed from the report
- Text blocks are editable inline
- Client context (name, logo, color) is applied globally to all blocks

---

## 10. Pulse Report

An embedded multi-site wellbeing assessment tool, available as a block within the ECR Builder and as a standalone view.

### 10.1 Categories Assessed

Seven wellness dimensions, each rated green / yellow / red:
1. Morale & Culture
2. Stress & Workload
3. Relationships
4. Grief & Loss
5. Crisis & Safety
6. Spiritual Care
7. Overall Engagement

### 10.2 Pulse Overview Tab

- 7-category grid with clickable status indicators
- 6-month health score trend (area chart)
- Chaplain field notes for the period
- Alert banners based on overall status (green / yellow / red)

### 10.3 Category Detail Tabs

Each category tab shows:
- Status badge and summary
- Chaplain stories (anonymized field observations)
- Chaplain insight narrative

### 10.4 Portfolio Pulse View (EDO/VP/Exec)

- Aggregate health score trend chart
- Stacked bar chart of status distribution by period
- Per-site health score ranking for the current period
- Clickable site rows to open individual site pulse detail

---

## 11. Chaplains Page

Available to EDOs, VPs, and Executives. Provides a performance overview of all chaplains within scope.

### 11.1 Summary KPIs

- Total chaplains, total visits, average on-time submission rate, total crisis referrals

### 11.2 Chaplain Table

Sortable by: visits, on-time %, performance score, or crisis count. Each row shows:
- Chaplain name and avatar
- Assigned client
- Visit count
- On-time submission percentage
- Crisis referral count
- Overall performance score
- Trend indicator (up / stable / down)

### 11.3 Chaplain Drill Panel

Clicking a row opens a detail panel with:
- Assigned clients and 6-month visit trend chart per client
- Follow-up count, specialized care count, average days to submit
- Timeliness bar (on-time vs. late breakdown)
- Performance metrics

---

## 12. Customers (CRM View)

Available to EDOs, VPs, and Executives. Synced with **Microsoft Dynamics 365 CRM**.
- **KPI tiles** (5): Total Accounts · Active Accounts · Highest Parent Accounts · Service Locations · Company Employees
- **Account table columns**: Account · Locations · Employees · SAG Factor · Req. Hours · Assigned Hours
  - SAG Factor: client-specific decimal (e.g. 0.16) stored per account
  - Required Hours: `sagFactor × employees`
  - Assigned Hours: `chaplains × 40h`, colour-coded vs required
- Filters: search + Sort (Name / Employees / Locations)
- **EDO view** shows two sections:
  - 📁 **Your Accounts** — accounts owned by this EDO
  - 📍 **Locations in Your Division** — cross-territory locations from other EDOs' accounts; columns: Account · Location · Owner EDO · Employees · Chaplains · SAG Factor · Req. Hours · Assigned Hrs
- **Account detail modal** (centered overlay, 620px): tabs for Overview · Locations · Contacts · Activity · Chaplains
  - Overview: 8-tile grid — Employees · Locations · Chaplains · Engagement · SAG Factor · Required Hours · Assigned Hours · Next Action
  - Locations tab: expandable rows, no health indicators; expanded shows Employees · Assigned Hours · Engagement Score · Last Chaplain Visit + Site Contact + Assigned Chaplains
  - Chaplains tab: grouped by location, no health indicators
- **Cross-division location drill modal** (centered, 500px): Employees · Engagement · SAG · Hours · Last Visit · Site Contact · Assigned Chaplains
- **📞 Record Contact Interactions** button — bulk interaction logger:
  - Lists all primary + site contacts across all accounts
  - Per-contact: include/exclude toggle, method picker (Call · Text · Email · In Person), notes field
  - Footer: live count of ready interactions, Log button, success confirmation screen


---

## 13. Shared Notes & Prayers (Noticeboard)

A collaborative noticeboard for the chaplain team, accessible to all roles.

### 13.1 Note Types

- **Prayer Requests** — personal or site-specific prayer needs
- **Team Notes** — operational updates and information
- **Urgent** — time-sensitive items surfaced prominently
- **Praise** — positive outcomes and encouragements
- **Info** — general information

### 13.2 Features

- Filter by type, location, and pinned status
- Search across note titles and body text
- Sort by: most recent, oldest first, urgent first, most responses
- Confidential notes blur their content until hovered (privacy protection)
- Pinned notes are visually highlighted
- Clicking a note opens a detail modal with full content and responses

### 13.3 Posting Notes

Any user can post a note. The compose form requires:
- Note type selection
- Title
- Body
- Optional: client/location association
- Optional: urgency flag

---

## 14. Team Hub (Slide-In Panel)

A lightweight persistent panel accessible from the sidebar across all pages. Scoped to the current user's client portfolio.

- Tabs: All / Prayer Requests / Team Notes
- Client filter dropdown
- Inline compose form (title, body, client association, type)
- Items display: author, role, timestamp, client tag, pin/delete controls (for authorized users)

---

## 15. My Metrics (Chaplain Role)

A personal performance dashboard available only to Chaplains.

### 15.1 KPI Cards

- Total visits, total conversations, total employees served, on-time submission rate, crisis referrals, average response time

### 15.2 Hours by Service Location

- Hours assigned vs. reported per client site
- Drilldown: clicking a client row expands a list of individual visits with:
  - Date, visit type, total hours, activity hours, travel hours
  - CD (Chaplain Discussions) and JRI counts
  - Expandable row with interaction breakdown and narrative sections

### 15.3 Charts

- Interaction trend over 6 months (area chart)
- Visit distribution by client (pie chart)
- Conversation type breakdown (horizontal bar chart)

---

## 16. Tasks

Available to EDOs, VPs, and Executives. A lightweight task management interface for managing account-related action items. (Details to be expanded in future requirements iteration.)

---

## 17. Localization

The portal supports three languages:

- **English** (default)
- **Español**
- **Français**

Language selection is available at the login screen and can be changed from the sidebar at any time. Translated strings cover navigation labels, sign-in prompts, role labels, and key UI text.

---

## 18. Non-Functional Requirements

### 18.1 Technology Stack

- **React 18** with functional components and hooks
- **Vite 5** for build tooling and local development (HMR)
- **Recharts** for all data visualizations
- **Vercel** for hosting and CDN delivery
- No backend required for the current prototype — all data is mock/demo

### 18.2 Data Integration (Future)

- CRM data is sourced from **Microsoft Dynamics 365**; sync status is displayed in-app
- Authentication is handled via **Microsoft Azure AD SSO**
- A live API layer will be introduced via environment variables when the application moves from prototype to production

### 18.3 Deployment

- Deployed to Vercel; auto-deploys on push to the `main` branch
- Optional custom domain: `portal.marketplaceministries.org`
- Optional password protection available via Vercel Pro

### 18.4 Accessibility & Responsiveness

- The application is designed primarily for desktop use
- Mobile-friendly layout considerations are in scope for future iterations

---

## 19. Data Privacy & Confidentiality

- Chaplain visit narratives and interaction logs are confidential
- Crisis referral data is anonymized — no employee names are stored in reports
- Pastoral care stories shared in the ECR Builder and Pulse Report use anonymized, non-identifying language
- Confidential noticeboard entries are visually obscured until explicitly revealed by hover
- Issue reports flagged for supervisor review are routed only to the named supervisor

---

*This document reflects the features implemented in the current prototype. Requirements will evolve as the product moves toward a live data integration and production deployment.*
