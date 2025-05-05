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

### Profile Directory
- Removed: `app/(platform)/profile/` (entire directory)
- Reason: Profile functionality was deprecated and removed
- Note: Some components were moved to `components/old` for reference

### Settings Directory
- Removed: `app/(platform)/settings/` (entire directory)
- Reason: Settings functionality was deprecated and removed
- Note: All components were moved to `components/old` for reference

### Screenings Directory
- Removed: `app/(platform)/screenings/` (entire directory)
- Reason: Screenings functionality was deprecated and removed
- Note: Some components were moved to `components/old` for reference

## Moved Files

### Components Moved to `components/old`
- Moved: `app/(platform)/(dashboard)/scheduling-dialog.tsx` → `components/old/scheduling-dialog.tsx`
- Moved: `app/(platform)/(dashboard)/session-schedule.tsx` → `components/old/session-schedule.tsx`
- Reason: These components were still in use but moved to a deprecated location

### Profile Components Moved to `components/old`
- Moved: `app/(platform)/profile/school-report/session/*` → `components/old/profile/school-report/session/`
- Moved: `app/(platform)/profile/refund/refund-form.tsx` → `components/old/profile/refund/`
- Moved: `app/(platform)/profile/edit-profile/components/*` → `components/old/profile/edit-profile/`
- Reason: These components were still in use by other parts of the application

### Settings Components Moved to `components/old`
- Moved: `app/(platform)/settings/` → `components/old/settings/`
- Reason: Settings functionality was deprecated but preserved for reference

### Screenings Components Moved to `components/old`
- Moved: `app/(platform)/screenings/[caseId]/components/treatment-plan.tsx` → `components/old/screenings/[caseId]/components/`
- Moved: `app/(platform)/screenings/components/cases-referred-to-me.tsx` → `components/old/screenings/components/`
- Moved: `app/(platform)/screenings/screen.d.ts` → `components/old/screenings/`
- Reason: These components and types were still in use by other parts of the application

### Utility Functions Relocated
- Moved: `readFileContent` from `app/(platform)/screenings/[caseId]/components/treatment-plan.tsx` → `utils/file-utils.ts`
- Reason: This is a core utility function used across multiple components
- Impact: Updated imports in `file-uploader.tsx` and `file-uploader-with-datatable.tsx`

## Impact
- The dashboard functionality has been completely removed
- The fellows management system has been completely removed
- The fellow attendance dot component has been replaced with a simpler implementation in the schools page
- The profile functionality has been completely removed, with some components preserved for reference
- The settings functionality has been completely removed, with all components preserved for reference
- The screenings functionality has been completely removed, with some components preserved for reference
- The `readFileContent` utility function has been moved to a more appropriate location
- No external dependencies were affected by these changes

## Migration Notes
- If you need to reference the old dashboard, fellows, profile, settings, or screenings functionality, check the git history
- The moved components in `components/old` should not be used in new code
- The schools page has been updated to use a simpler attendance display
- Profile-related functionality should be implemented using the new profile management system
- Settings-related functionality should be implemented using the new settings management system
- Screenings-related functionality should be implemented using the new clinical case management system
- File handling utilities should be imported from `utils/file-utils.ts` 