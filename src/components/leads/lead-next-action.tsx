'use client'

import { useState, useTransition } from 'react'
import { CalendarClock, Check, Clock3, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { completeTask } from '@/app/(app)/leads/actions'
import { TaskForm } from '@/components/leads/task-form'
import { Button } from '@/components/ui/button'

export type LeadTask = {
  id: string
  type: string
  description: string
  due_at: string
  completed_at: string | null
  created_at: string
}

const taskTypes: Record<string, string> = {
  LIGACAO: 'Ligação',
  WHATSAPP: 'WhatsApp',
  SOLICITAR_FATURA: 'Solicitar fatura',
  ENVIAR_PROPOSTA: 'Enviar proposta',
  FOLLOW_UP: 'Follow-up',
  OUTRO: 'Outro',
}

export function LeadNextAction({ leadId, tasks }: { leadId: string; tasks: LeadTask[] }) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const openTasks = tasks.filter((task) => !task.completed_at)
  const nextTask = openTasks[0]
  const otherTasks = openTasks.slice(1)
  const isOverdue = nextTask ? new Date(nextTask.due_at).getTime() < Date.now() : false

  function markComplete(task: LeadTask) {
    setCompletingTaskId(task.id)
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await completeTask(task.id, leadId)
        if ('error' in result) {
          setFeedback({ message: result.error ?? 'Não foi possível concluir a tarefa.', isError: true })
          return
        }
        setFeedback({ message: 'Tarefa concluída.', isError: false })
        router.refresh()
      } catch {
        setFeedback({ message: 'Não foi possível concluir a tarefa.', isError: true })
      } finally {
        setCompletingTaskId(null)
      }
    })
  }

  return <section className="card next-action-card" aria-labelledby="next-action-title">
    <div className="card-head next-action-head"><div><span className="label">Foco agora</span><h2 className="card-title" id="next-action-title">Próxima ação</h2><p className="card-copy">O próximo passo para avançar este lead.</p></div><span className="next-action-icon"><CalendarClock size={17} /></span></div>
    <div className="next-action-content">
      {nextTask ? <>
        <div className={`next-action-status ${isOverdue ? 'is-overdue' : 'is-on-track'}`}><span aria-hidden="true" />{isOverdue ? 'Ação vencida' : 'Ação no prazo'}</div>
        <h3 className="next-action-description">{nextTask.description}</h3>
        <p className="next-action-meta"><Clock3 size={14} aria-hidden="true" />{taskTypes[nextTask.type] ?? nextTask.type} · {new Date(nextTask.due_at).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <Button className="next-action-complete" variant="primary" type="button" onClick={() => markComplete(nextTask)} disabled={isPending}>{isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}{isPending ? 'Concluindo…' : 'Marcar concluída'}</Button>
      </> : <>
        <p className="next-action-prompt">Este lead ainda não tem uma tarefa em aberto. Defina o próximo passo para manter o acompanhamento em dia.</p>
        <TaskForm leadId={leadId} />
      </>}
      {otherTasks.length > 0 && <details className="next-action-other-tasks"><summary>Ver outras ações em aberto · {otherTasks.length}</summary><div className="other-task-list">{otherTasks.map((task) => {
        const taskIsOverdue = new Date(task.due_at).getTime() < Date.now()
        return <div className="other-task-row" key={task.id}><div className="other-task-copy"><div className="other-task-title">{task.description}</div><div className="other-task-meta">{taskTypes[task.type] ?? task.type} · {new Date(task.due_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {taskIsOverdue ? 'Vencida' : 'No prazo'}</div></div><Button variant="secondary" type="button" onClick={() => markComplete(task)} disabled={isPending} aria-label={`Marcar ${task.description} como concluída`}>{isPending && completingTaskId === task.id ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}{isPending && completingTaskId === task.id ? 'Concluindo…' : 'Concluir'}</Button></div>
      })}</div></details>}
      {nextTask && <details className="next-action-schedule"><summary>Agendar outra ação</summary><div className="next-action-schedule-content"><TaskForm leadId={leadId} /></div></details>}
      {feedback && <p className={feedback.isError ? 'alert next-action-feedback' : 'notice next-action-feedback'} role={feedback.isError ? 'alert' : 'status'}>{feedback.message}</p>}
    </div>
  </section>
}
