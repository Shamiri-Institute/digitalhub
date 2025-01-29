import { loadHubSchoolFeedback } from "#/app/(platform)/hc/reporting/school-reports/school-feedback/action";
import SchoolFeedbackDataTable from "#/components/common/school-reports/school-feedback/school-feedback-table";

export default async function SessionFeedbackPage() {
  const feedbackData = await loadHubSchoolFeedback();

  return <SchoolFeedbackDataTable feedback={feedbackData} />;
}
