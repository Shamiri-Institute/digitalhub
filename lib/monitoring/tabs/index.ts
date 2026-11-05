import { checksTab } from "#/lib/monitoring/tabs/checks";
import { clinicalWorkTab } from "#/lib/monitoring/tabs/clinical-work";
import { fellowSdhUseTab } from "#/lib/monitoring/tabs/fellow-sdh-use";
import { fellowsTab } from "#/lib/monitoring/tabs/fellows";
import { hubSdhUseTab } from "#/lib/monitoring/tabs/hub-sdh-use";
import { schoolsTab } from "#/lib/monitoring/tabs/schools";
import { sessionsTab } from "#/lib/monitoring/tabs/sessions";
import { studentsTab } from "#/lib/monitoring/tabs/students";
import { supervisorSdhUseTab } from "#/lib/monitoring/tabs/supervisor-sdh-use";
import { supervisorsTab } from "#/lib/monitoring/tabs/supervisors";
import type { MonitoringTab } from "#/lib/monitoring/types";

export const monitoringTabs: MonitoringTab[] = [
  studentsTab,
  sessionsTab,
  schoolsTab,
  supervisorsTab,
  fellowsTab,
  clinicalWorkTab,
  hubSdhUseTab,
  supervisorSdhUseTab,
  fellowSdhUseTab,
  checksTab,
];
