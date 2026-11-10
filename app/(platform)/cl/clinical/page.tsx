import { Plus } from "lucide-react";
import {
  getClinicalCasesCreatedByClinicalLead,
  getClinicalCasesData,
  getClinicalCasesInHub,
  getSchoolsInClinicalLeadHub,
} from "#/app/(platform)/cl/clinical/actions";
import ClinicalLeadCases from "#/app/(platform)/cl/clinical/components/clinical-lead-cases";
import { getCasesReferredToMe, getCasesToReview } from "#/app/(platform)/sc/clinical/action";
import { CasesReferredToMe } from "#/components/common/clinical/cases-referred-to-me";
import { CasesToReview } from "#/components/common/clinical/cases-to-review";
import { AddNewClinicalCaseForm } from "#/components/common/clinical/add-new-clinical-case-form";
import CasesBreakdown from "#/components/common/clinical/cases-breakdown";
import AllHubClinicalCasesTable from "#/components/common/clinical/hub-clinical-cases-table";
import { Button } from "#/components/ui/button";
import PageHeading from "#/components/ui/page-heading";

export default async function ClinicalPage() {
  // The chart data alone runs 5 queries, a full pool.
  const casesData = await getClinicalCasesData();
  const [
    cases,
    allClinicalLeadCases,
    { schools, fellowsInProject, supervisorsInHub, currentClinicalLeadId, hubs },
    referredCases,
    casesToReview,
  ] = await Promise.all([
    getClinicalCasesInHub(),
    getClinicalCasesCreatedByClinicalLead(),
    getSchoolsInClinicalLeadHub(),
    getCasesReferredToMe(),
    getCasesToReview(),
  ]);

  if (!currentClinicalLeadId) {
    throw new Error("Clinical lead not found");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Clinical cases">
        <AddNewClinicalCaseForm
          schools={schools}
          fellowsInProject={fellowsInProject}
          supervisorsInHub={supervisorsInHub}
          hubs={hubs}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New case
            </Button>
          }
        />
      </PageHeading>
      <CasesReferredToMe cases={referredCases} />
      <CasesToReview reviews={casesToReview} />
      <CasesBreakdown
        casesByStatus={casesData.casesByStatus}
        casesByRiskStatus={casesData.casesByRiskStatus}
        casesBySession={casesData.casesBySession}
        casesBySupervisor={casesData.casesBySupervisor}
      />
      <AllHubClinicalCasesTable
        cases={cases}
        title="All Supervisor Cases In This Hub"
        emptyStateMessage="No clinical cases created by supervisors in this hub yet"
      />

      <ClinicalLeadCases clinicalLeadCases={allClinicalLeadCases} />
    </div>
  );
}
