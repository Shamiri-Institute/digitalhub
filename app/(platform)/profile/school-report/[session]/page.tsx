import { IntroHeader } from "#/app/(platform)/profile/school-report/page";



export default function ReportDetails({ params }: { params: { session: string } }) {
    return <div>
        <IntroHeader />

        ReportDetails {params.session} </div>
}