# PROJECT RULES — BLUEWRITE

**Official Project Title:**  
BLUEWRITE: AN AI-ASSISTED REAL-TIME POLICE INCIDENT REPORT GENERATION SYSTEM

**Product Name:**  
BLUEWRITE

**AI Assistant Name:**  
BLUEWRITE AI Assistant

**AI Assistant Subtitle:**  
Your Intelligent Police Report Writing Assistant

---

This file is the **master rulebook** for all future AI coding agents and developers working on this project. Always read this file before modifying the project.

---

## 1. Master Rules

1. Always read PROJECT_RULES.md before modifying the project.
2. Read the relevant documentation in `/docs` before implementing a feature.
3. Follow the approved architecture.
4. Do not introduce unnecessary technologies.
5. Do not create features that were not requested.
6. Do not modify unrelated files.
7. Work in small phases.
8. Complete and test the current phase before moving to the next phase.
9. Stop and wait for approval after each requested phase.
10. Never invent requirements.
11. Never add an approval workflow.
12. Reports have only **Draft** and **Submitted** statuses.
13. Officers can only access their own reports.
14. Submitted reports cannot be edited by officers.
15. Officers are disabled rather than deleted.
16. Never store plaintext passwords.
17. Never expose secrets.
18. The frontend must never communicate directly with Google AI Studio or expose the Google AI Studio API key.
19. BLUEWRITE AI is an assistant, not an autonomous decision-maker.
20. AI must not invent facts.
21. AI must not determine guilt or make legal decisions.
22. AI-generated narratives must remain editable by the officer.
23. AI must never automatically submit reports.
24. Keep the UI consistent with the BLUEWRITE design system.
25. Use reusable components rather than duplicating UI code.
26. Use parameterized SQL queries.
27. Validate input on both frontend and backend.
28. Keep documentation synchronized with implementation.
29. Do not mark unfinished features as complete.
30. Before finishing a task, verify the changes and report exactly what was created or modified.

---

## 2. Architecture Rules

### Backend Architecture

```
Route
  ↓
Controller
  ↓
Service
  ↓
Model
  ↓
MySQL
```

### AI Architecture

```
Route
  ↓
Controller
  ↓
AI Service
  ↓
Official Google Gen AI Node.js SDK
  ↓
Gemini Developer API
```

### Frontend Architecture

```
Page
  ↓
Component
  ↓
Service
  ↓
REST API
```

---

## 3. Database Rules

### Core Tables

- `users`
- `incident_reports`
- `activity_logs`
- `ai_logs`

### User Roles

- `admin`
- `officer`

### User Status

- `active`
- `disabled`

### Report Status

- `draft`
- `submitted`

**No approval status exists.**

---

## 4. Design Rules

### Product

- Product: BLUEWRITE
- Official Title: BLUEWRITE: AN AI-ASSISTED REAL-TIME POLICE INCIDENT REPORT GENERATION SYSTEM
- AI: BLUEWRITE AI Assistant
- AI Subtitle: Your Intelligent Police Report Writing Assistant

### Design Direction

- Professional
- Government / Public Safety
- Enterprise
- Modern
- Clean
- Responsive

### Color Direction

- Navy
- Police Blue
- White
- Gray

---

## 5. Current Project Status

The project is **under development**. The initial structure and documentation have been created. No application features have been implemented yet.

Phases will be implemented one at a time, with approval required between phases. See `docs/DevelopmentPhases.md` for the full phase plan.