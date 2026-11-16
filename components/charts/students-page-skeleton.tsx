import ChartSkeleton from "#/components/charts/chart-skeleton";
import InfoCardSkeleton from "#/components/info-card-skeleton";

// The students pages' figures and charts as they lay out, titled, so the titles show with the first
// paint and nothing moves when the data arrives.
export default function StudentsPageSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
        <InfoCardSkeleton title="Total no. of students" />
        <InfoCardSkeleton title="Count of group sessions" />
        <InfoCardSkeleton title="No. of clinical cases" />
        <InfoCardSkeleton title="No. of clinical sessions" />
      </div>
      <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
        <ChartSkeleton title="Attendance" />
        <ChartSkeleton title="Drop-out reasons" />
        <ChartSkeleton title="Student information completion" />
        <ChartSkeleton title="Student group ratings" />
      </div>
      <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
        <ChartSkeleton title="Clinical cases by case status" />
        <ChartSkeleton title="Clinical sessions" />
        <ChartSkeleton title="Clinical cases by supervisor" />
        <ChartSkeleton title="Clinical cases by initial contact" />
      </div>
      <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-3">
        <ChartSkeleton title="Students grouped by form" />
        <ChartSkeleton title="Students grouped by age" />
        <ChartSkeleton title="Students grouped by gender" />
      </div>
    </>
  );
}
