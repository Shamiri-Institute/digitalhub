# Deprecated and Removed Files

This document tracks files that have been removed or moved to the `components/old` directory.

## Removed Files

### Dashboard Directory
- Removed: `app/(platform)/(dashboard)/page.tsx`
- Removed: `app/(platform)/(dashboard)/scheduling-dialog.tsx`
- Removed: `app/(platform)/(dashboard)/session-schedule.tsx`
- Reason: Dashboard functionality was deprecated and removed

### Fellows Directory
- Removed: `app/(platform)/fellows/page.tsx`
- Removed: `app/(platform)/fellows/sessions/attendance-pie-chart.tsx`
- Removed: `app/(platform)/fellows/sessions/fellow-attendance-table.tsx`
- Removed: `app/(platform)/fellows/sessions/fellow-switcher.tsx`
- Removed: `app/(platform)/fellows/sessions/page.tsx`
- Removed: `app/(platform)/fellows/sessions/session-history.tsx`
- Removed: `app/(platform)/fellows/sessions/weekly-sessions-attended-chart.tsx`
- Reason: Fellows functionality was deprecated and removed

### Schools Directory
- Removed: `app/(platform)/schools/[visibleId]/fellow-attendance-dot.tsx`
- Removed: `tests/unit/fellow-attendance.test.tsx`
- Reason: Fellow attendance dot component was deprecated and replaced with a simpler implementation

## Moved Files

### Components Moved to `components/old`
- Moved: `app/(platform)/(dashboard)/scheduling-dialog.tsx` → `components/old/scheduling-dialog.tsx`
- Moved: `app/(platform)/(dashboard)/session-schedule.tsx` → `components/old/session-schedule.tsx`
- Reason: These components were still in use but moved to a deprecated location

## Impact
- The dashboard functionality has been completely removed
- The fellows management system has been completely removed
- The fellow attendance dot component has been replaced with a simpler implementation in the schools page
- No external dependencies were affected by these changes

## Migration Notes
- If you need to reference the old dashboard or fellows functionality, check the git history
- The moved components in `components/old` should not be used in new code
- The schools page has been updated to use a simpler attendance display 