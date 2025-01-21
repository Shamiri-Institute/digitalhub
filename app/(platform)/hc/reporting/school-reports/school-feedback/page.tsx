import { loadSchoolFeedback } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import SchoolFeedbackDataTable from "#/components/common/school-reports/school-feedback/school-feedback-table";

export default async function SessionFeedbackPage() {
  const feedbackData = await loadSchoolFeedback();

  return <SchoolFeedbackDataTable feedback={feedbackData} />;
}
