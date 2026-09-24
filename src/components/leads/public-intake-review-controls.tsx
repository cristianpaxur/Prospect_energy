import Link from 'next/link'
import { reconcilePublicIntakeUpload, reviewPublicIntake } from '@/app/(app)/leads/actions'

export function PublicIntakeReviewControls({ submissionId, leadId, uploadState, reviewedAt }: { submissionId: string; leadId: string; uploadState: string; reviewedAt: string | null }) {
  return <div className="field-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
    {uploadState !== 'RECEBIDO' && <form action={reconcilePublicIntakeUpload}><input type="hidden" name="submissionId" value={submissionId} /><button type="submit" className="btn btn-secondary">Verificar recebimento da fatura</button></form>}
    {uploadState === 'RECEBIDO' && <Link className="btn btn-secondary" href={`/leads/${leadId}/fatura`}>Revisar dados da fatura</Link>}
    {!reviewedAt && <form action={reviewPublicIntake}><input type="hidden" name="submissionId" value={submissionId} /><button type="submit" className="btn btn-primary">Marcar solicitação como revisada</button></form>}
  </div>
}
