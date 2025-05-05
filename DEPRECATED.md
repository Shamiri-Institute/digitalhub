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

### Schools Components Moved to `components/old`
- Moved: `app/(platform)/schools/page.tsx` → `components/old/schools/`
- Moved: `app/(platform)/schools/school-card.tsx` → `components/old/schools/`
- Moved: `app/(platform)/schools/session-link.tsx` → `components/old/schools/`
- Moved: `app/(platform)/schools/[visibleId]/` → `components/old/schools/[visibleId]/`
- Moved: `app/(platform)/schools/session-report/` → `components/old/schools/session-report/`
- Reason: The schools route has been deprecated in favor of the new HC schools implementation
- Note: The new implementation is in `app/(platform)/hc/schools/`

### Utility Functions Relocated
- Moved: `readFileContent` from `app/(platform)/screenings/[caseId]/components/treatment-plan.tsx` → `utils/file-utils.ts`
- Reason: This is a core utility function used across multiple components
- Impact: Updated imports in `file-uploader.tsx` and `file-uploader-with-datatable.tsx`

### Profile Components Reorganization
- Moved: `app/(platform)/new-edit-profile/components/ProfileFormWrapper.tsx` → `components/common/profile/profile-form-wrapper.tsx`
- Moved: `app/(platform)/new-edit-profile/components/genericProfile.tsx` → `components/common/profile/generic-profile.tsx`
- Removed: `app/(platform)/new-edit-profile/` (entire directory)
- Reason: Profile components were reorganized to follow kebab-case naming convention and moved to a more appropriate location in the common components directory
- Impact: Updated imports in:
  - `app/(platform)/hc/@profileModal/(.)profile/page.tsx`
  - `app/(platform)/sc/@profileModal/(.)profile/page.tsx`
  - `app/(platform)/fel/@profileModal/(.)profile/page.tsx`
- Note: The functionality remains unchanged, only the location and naming conventions were updated

### Common Components Reorganization
- Moved: `app/(platform)/clinical-feature-card.tsx` → `components/common/clinical-feature-card.tsx`
- Moved: `app/(platform)/common.tsx` → `components/common/common.tsx`
- Reason: These components were moved to the common components directory to better organize shared components and improve code maintainability
- Impact: No import updates were needed as these components were not being imported elsewhere
- Note: The functionality remains unchanged, only the location was updated to better reflect their role as common/shared components

### Unused Components Removal
- Removed: `components/common/clinical-feature-card.tsx`
- Removed: `components/common/common.tsx`
- Reason: These components were not being imported or used anywhere in the codebase
- Impact: No import updates were needed as these components were not referenced elsewhere
- Note: 
  - `clinical-feature-card.tsx` was a component for displaying clinical case statistics using a donut chart
  - `common.tsx` contained a Header component that was previously extracted from the homepage but is no longer in use
  - Both components were removed to maintain a clean codebase and remove unused code

### App Components Reorganization
- Moved: `app/dev-personnel-switcher.tsx` → `components/common/dev-personnel-switcher.tsx`
- Reason: This component was moved to the common components directory as it's a reusable development tool used across multiple components
- Impact: Updated imports in:
  - `lib/actions/fetch-personnel.ts`
  - `components/navigation.tsx`
  - `components/layout.tsx`
- Note: The following files were kept in the app directory as they are Next.js framework-specific files:
  - `app/global-error.tsx`
  - `app/error.tsx`
  - `app/layout.tsx`

## Impact
- The dashboard functionality has been completely removed
- The fellows management system has been completely removed
- The fellow attendance dot component has been replaced with a simpler implementation in the schools page
- The profile functionality has been completely removed, with some components preserved for reference
- The settings functionality has been completely removed, with all components preserved for reference
- The screenings functionality has been completely removed, with some components preserved for reference
- The schools route has been deprecated in favor of the new HC schools implementation
- The `readFileContent` utility function has been moved to a more appropriate location
- No external dependencies were affected by these changes

## Migration Notes
- If you need to reference the old dashboard, fellows, profile, settings, or screenings functionality, check the git history
- The moved components in `components/old` should not be used in new code
- The schools page has been updated to use a simpler attendance display
- Profile-related functionality should be implemented using the new profile management system
- Settings-related functionality should be implemented using the new settings management system
- Screenings-related functionality should be implemented using the new clinical case management system
- Schools-related functionality should be implemented using the new HC schools implementation
- File handling utilities should be imported from `utils/file-utils.ts` 