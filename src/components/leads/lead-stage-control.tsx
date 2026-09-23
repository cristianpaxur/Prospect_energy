'use client'

import { useEffect, useState, useTransition } from 'react'
import { ArrowRight, Check, ChevronDown, LoaderCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { moveLeadAction } from '@/app/(app)/pipeline/actions'
import { PIPELINE_ORDER } from '@/lib/pipeline'
import type { PipelineStatus } from '@/types/domain'

const stageLabels: Record<PipelineStatus, string> = {
  NOVO: 'Novo',
  CONTATO_REALIZADO: 'Contato realizado',
  INTERESSADO: 'Interessado',
  AGUARDANDO_FATURA: 'Aguardando fatura',
  ANALISE: 'Análise',
  PROPOSTA: 'Proposta',
  FECHADO: 'Fechado',
  PERDIDO: 'Perdido',
}

const stages = [...PIPELINE_ORDER, 'PERDIDO'] as PipelineStatus[]

const compactStageLabels: Record<PipelineStatus, string> = {
  NOVO: 'Novo',
  CONTATO_REALIZADO: 'Contato',
  INTERESSADO: 'Interesse',
  AGUARDANDO_FATURA: 'Fatura',
  ANALISE: 'Análise',
  PROPOSTA: 'Proposta',
  FECHADO: 'Fechado',
  PERDIDO: 'Perdido',
}

export function LeadStageControl({ leadId, status }: { leadId: string; status: PipelineStatus }) {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<PipelineStatus>(status)
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()
  const currentIndex = PIPELINE_ORDER.indexOf(status as Exclude<PipelineStatus, 'PERDIDO'>)
  const nextStatus = status === 'FECHADO' || status === 'PERDIDO' ? null : PIPELINE_ORDER[currentIndex + 1] ?? null

  useEffect(() => setSelectedStatus(status), [status])

  function changeStage(nextStatus: PipelineStatus) {
    if (nextStatus === status) return
    setSelectedStatus(nextStatus)
    setFeedback(null)
    startTransition(async () => {
      const result = await moveLeadAction(leadId, nextStatus)
      if ('error' in result) {
        setSelectedStatus(status)
        setFeedback({ message: result.error ?? 'Não foi possível atualizar a etapa.', isError: true })
        return
      }
      setFeedback({ message: `Etapa atualizada para ${stageLabels[nextStatus]}.`, isError: false })
      router.refresh()
    })
  }

  function advanceStage() {
    if (nextStatus) changeStage(nextStatus)
  }

  return <section className="card card-pad lead-stage-card lead-stage-stepper" aria-labelledby="lead-stage-title">
    <div className="lead-stage-heading">
      <h2 className="card-title" id="lead-stage-title">Etapa comercial</h2>
      <span className="lead-stage-indicator" data-stage={status}><span aria-hidden="true" />{stageLabels[status]}</span>
    </div>
    <ol className={`lead-stage-progress ${status === 'PERDIDO' ? 'is-lost' : ''}`} aria-label={`Etapas do pipeline. Etapa atual: ${stageLabels[status]}`}>
      {PIPELINE_ORDER.map((stage, index) => {
        const isCurrent = stage === status
        const isComplete = status !== 'PERDIDO' && currentIndex > index
        const stateLabel = isCurrent ? 'etapa atual' : isComplete ? 'concluída' : 'a seguir'
        return <li className={`lead-stage-progress-item ${isCurrent ? 'is-current' : ''} ${isComplete ? 'is-complete' : ''}`} key={stage} aria-current={isCurrent ? 'step' : undefined} aria-label={`${stageLabels[stage]}, ${stateLabel}`}>
          <span className="lead-stage-progress-dot" aria-hidden="true">{isComplete ? <Check size={11} /> : index + 1}</span>
          <span className="lead-stage-progress-label">{compactStageLabels[stage]}</span>
        </li>
      })}
      {status === 'PERDIDO' && <li className="lead-stage-progress-item is-current is-lost-current" aria-current="step" aria-label="Perdido, etapa atual"><span className="lead-stage-progress-dot" aria-hidden="true"><X size={11} /></span><span className="lead-stage-progress-label">Perdido</span></li>}
    </ol>
    <div className="lead-stage-controls lead-stage-control-footer">
      <label className="field lead-stage-select"><span className="label">Alterar etapa</span><span className="lead-stage-select-wrap"><select className="select" value={selectedStatus} onChange={(event) => changeStage(event.target.value as PipelineStatus)} disabled={isPending} aria-label="Selecionar etapa do lead">{stages.map((stage) => <option value={stage} key={stage}>{stageLabels[stage]}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></span></label>
      <div className="lead-stage-advance">
        <span className="small muted">{nextStatus ? `Próxima etapa: ${stageLabels[nextStatus]}` : 'Etapa final'}</span>
        <button className="btn btn-primary" type="button" onClick={advanceStage} disabled={!nextStatus || isPending}>{isPending ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowRight size={15} />}{isPending ? 'Atualizando…' : 'Avançar etapa'}</button>
      </div>
    </div>
    {feedback && <p className={feedback.isError ? 'alert lead-stage-feedback' : 'notice lead-stage-feedback'} role={feedback.isError ? 'alert' : 'status'}>{feedback.message}</p>}
  </section>
}
