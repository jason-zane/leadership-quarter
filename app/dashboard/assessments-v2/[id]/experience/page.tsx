import { V2ExperienceForm } from '../_components/v2-experience-form'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AssessmentV2ExperiencePage({ params }: Props) {
  const { id } = await params
  return <V2ExperienceForm assessmentId={id} />
}
