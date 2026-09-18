const fs = require("fs");
const edits = [];
function replaceOnce(file, from, to) {
  const text = fs.readFileSync(file, "utf8");
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`${file}: expected 1 match, found ${n} for:\n${from.slice(0, 120)}`);
  fs.writeFileSync(file, text.replace(from, to)); edits.push(file);
}
function replaceAll(file, from, to, expected) {
  const text = fs.readFileSync(file, "utf8");
  const n = text.split(from).length - 1;
  if (n !== expected) throw new Error(`${file}: expected ${expected} matches, found ${n} for ${from}`);
  fs.writeFileSync(file, text.split(from).join(to)); edits.push(file);
}
// Wrap the body of the effect introduced by `// effect: <comment>` in a useEffectEvent named <name>.
function wrapEffect(file, comment, name) {
  const text = fs.readFileSync(file, "utf8");
  const re = new RegExp(`  // effect: ${comment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n  useEffect\\(\\(\\) => \\{\\n([\\s\\S]*?)\\n  \\}, (\\[[^\\]]*\\])\\);`);
  const m = text.match(re);
  if (!m) throw new Error(`${file}: effect with comment not found: ${comment}`);
  const [whole, body, deps] = m;
  const out = `  const ${name} = useEffectEvent(() => {\n${body}\n  });\n\n  // effect: ${comment}\n  useEffect(() => {\n    ${name}();\n  }, ${deps});`;
  fs.writeFileSync(file, text.replace(whole, out)); edits.push(file);
}
function addImport(file, name = "useEffectEvent") {
  const text = fs.readFileSync(file, "utf8");
  const re = /import \{([^}]*\buseEffect\b[^}]*)\} from "react";/;
  const m = text.match(re);
  if (!m) throw new Error(`${file}: value import of useEffect from react not found`);
  fs.writeFileSync(file, text.replace(m[0], `import {${m[1].replace(/\buseEffect\b/, `useEffect, ${name}`)}} from "react";`)); edits.push(file);
}

// --- Group A: `form` is stable, add it ---
replaceOnce("app/(platform)/hc/schools/components/weekly-hub-report-button-and-form.tsx", "  }, [open]);", "  }, [open, form]);");
replaceOnce("app/(platform)/hc/supervisors/components/add-new-supervisor.tsx", "  }, [countyWatcher]);", "  }, [countyWatcher, form]);");
replaceOnce("app/(platform)/hc/supervisors/components/add-new-supervisor.tsx", "  }, [isOpen]);", "  }, [isOpen, form]);");
replaceOnce("app/(platform)/hc/supervisors/components/dropout-supervisor-form.tsx", "  }, [supervisorId, dropoutDialog]);", "  }, [supervisorId, dropoutDialog, form]);");
replaceOnce("app/(platform)/hc/supervisors/components/submit-complaint.tsx", "  }, [supervisorId, isOpen]);", "  }, [supervisorId, isOpen, form]);");
for (const f of ["add-expense", "delete-expense-request", "edit-expense"]) replaceOnce(`components/common/expenses/supervisor-expenses/${f}.tsx`, "  }, [open]);", "  }, [open, form]);");
replaceOnce("components/common/group/create-group.tsx", "  }, [open]);", "  }, [open, form]);");
replaceOnce("components/common/mark-attendance.tsx", "  }, [statusWatcher]);", "  }, [statusWatcher, form]);");
replaceOnce("components/common/session/schedule-new-session-form.tsx", "  }, [hubSessionTypes, sessionIdWatcher]);", "  }, [hubSessionTypes, sessionIdWatcher, form]);");
replaceOnce("components/common/student/student-dropout-form.tsx", "  }, [student, isOpen]);", "  }, [student, isOpen, form]);");
replaceOnce("components/common/student/student-move-school-form.tsx", "  }, [isOpen, student.id, student.schoolId]);", "  }, [isOpen, student.id, student.schoolId, form]);");
replaceAll("app/(platform)/sc/reporting/recordings/components/edit-recording-dialog.tsx", "form.setValue]);", "form]);", 2);
replaceOnce("app/(platform)/sc/clinical/components/case-notes-form.tsx",
  '  // effect: prefills the form from the loaded notes when the watched session changes or the notes arrive\n  useEffect(() => {\n    const sessionId = form.watch("sessionId");',
  '  const sessionIdWatcher = form.watch("sessionId");\n\n  // effect: prefills the form from the loaded notes when the watched session changes or the notes arrive\n  useEffect(() => {\n    const sessionId = sessionIdWatcher;');
replaceOnce("app/(platform)/sc/clinical/components/case-notes-form.tsx", '  }, [form.watch("sessionId"), notes]);', "  }, [sessionIdWatcher, notes, form]);");

// --- Group B: read-latest bodies move into useEffectEvent; triggers stay as deps ---
const B = [
  ["app/(platform)/hc/fellows/components/assign-fellow-supervisor-select.tsx", "runs the assignment server action when the controlled select value changes", "assignSelectedSupervisor"],
  ["app/(platform)/hc/supervisors/components/monthly-supervisor-evaluation.tsx", "isOpen is set by the parent from a row menu; initialises or clears the form when it changes", "syncOpenState"],
  ["components/common/mark-attendance.tsx", "resets the form when the parent changes sessions, attendances or open state, or the watched session changes", "resetForOpenState"],
  ["components/common/mark-attendance.tsx", "resets the form when the parent preselects a session", "resetForSelectedSession"],
  ["components/common/fellow/fellow-details-form.tsx", "loads the selected fellow into the form when the parent opens the dialog", "loadFellowIntoForm"],
  ["components/common/fellow/weekly-fellow-evaluation.tsx", "open is set by the parent from a row menu; selects the latest evaluation on open", "syncOpenState"],
  ["components/common/student/student-details-form.tsx", "loads the selected student into the form when the parent opens the dialog or changes the student", "resetFormForStudent"],
  ["components/common/student/triage-event-modal.tsx", "loads the hub's supervisors when the parent opens the modal", "loadSupervisorsOnOpen"],
  ["components/common/session/session-ratings.tsx", "open is set by the parent from a row menu; selects the rating on open", "syncRating"],
  ["components/common/group/student-group-evaluation.tsx", "open is set by the parent from a row menu; selects the evaluation for the chosen session on open", "syncOpenState"],
  ["components/common/project-switcher.tsx", "loads the admin project list once admin status is known", "loadProjectsForAdmin"],
  ["components/common/session/sessions-provider.tsx", "fetches sessions whenever the filters change; server-side loading is a separate change", "fetchForFilters"],
  ["components/common/session/schedule-calendar.tsx", "resyncs filter state when the hub session types arrive from the server", "syncFiltersFromProps"],
  ["components/common/session/schedule-calendar.tsx", "mirrors the react-aria calendar visible range into the shared filters", "syncDateRange"],
  ["components/common/session/schedule-calendar.tsx", "carries the previous view's visible range over when switching to list mode", "syncListMode"],
  ["components/common/session/schedule-calendar.tsx", "derives the active-filter flag and resets local toggles when filters return to defaults", "syncActiveFilter"],
];
// schedule-calendar: the complex dependency expression becomes a plain key first
replaceOnce("components/common/session/schedule-calendar.tsx",
  "  // effect: mirrors the react-aria calendar visible range into the shared filters\n  useEffect(() => {",
  "  const visibleStartKey = visibleStart?.toString();\n  // effect: mirrors the react-aria calendar visible range into the shared filters\n  useEffect(() => {");
replaceOnce("components/common/session/schedule-calendar.tsx", "  }, [visibleStart?.toString(), rangeType, mode]);", "  }, [visibleStartKey, rangeType, mode]);");
for (const [file, comment, name] of B) wrapEffect(file, comment, name);
for (const file of [...new Set(B.map((b) => b[0]))]) addImport(file);

// --- performance-profiler: read the ref once inside the effect ---
replaceOnce("components/performance-profiler.tsx",
  "  React.useEffect(() => {\n    return () => {\n      if (statsRef.current.timeoutId) {\n        clearTimeout(statsRef.current.timeoutId);\n      }\n    };\n  }, []);",
  "  React.useEffect(() => {\n    const stats = statsRef.current;\n    return () => {\n      if (stats.timeoutId) {\n        clearTimeout(stats.timeoutId);\n      }\n    };\n  }, []);");
console.log("edited files:", new Set(edits).size);
