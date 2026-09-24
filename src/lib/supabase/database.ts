export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type TableShape = { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }

export type Database = {
  public: {
    Tables: Record<string, TableShape>
    Views: Record<string, never>
    Functions: {
      current_organization_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
      is_organization_owner: { Args: { p_organization_id: string }; Returns: boolean }
      create_lead_with_activity: { Args: { p_organization_id: string; p_lead: Json }; Returns: { out_lead_id: string | null; was_created: boolean }[] }
      move_lead: { Args: { p_lead_id: string; p_to_status: Database['public']['Enums']['pipeline_status'] }; Returns: Record<string, unknown> }
      public_link_details: { Args: { p_code: string }; Returns: { organization_name: string }[] }
      begin_public_intake: {
        Args: {
          p_code: string
          p_company_name: string
          p_phone: string
          p_city: string
          p_email: string
          p_consent: boolean
          p_consent_version: string
          p_consent_text: string
          p_file_name: string
          p_mime_type: string
          p_file_size: number
          p_idempotency_key: string
        }
        Returns: { out_submission_id: string; out_upload_path: string; out_upload_expires_at: string }[]
      }
      finish_public_intake: { Args: { p_submission_id: string; p_upload_path: string }; Returns: string }
      reconcile_public_intake_upload: { Args: { p_submission_id: string }; Returns: string }
      review_public_intake: { Args: { p_submission_id: string }; Returns: boolean }
      register_public_intake_invoice: {
        Args: {
          p_submission_id: string
          p_provider: string
          p_state: string
          p_customer_type: Database['public']['Enums']['customer_type']
          p_amount: number
          p_consumption_kwh: number
          p_reference_date: string
        }
        Returns: string
      }
      manage_public_intake_link: {
        Args: { p_organization_id: string; p_operation: string }
        Returns: { out_code: string | null; out_active: boolean }[]
      }
    }
    Enums: {
      pipeline_status: 'NOVO' | 'CONTATO_REALIZADO' | 'INTERESSADO' | 'AGUARDANDO_FATURA' | 'ANALISE' | 'PROPOSTA' | 'FECHADO' | 'PERDIDO'
      customer_type: 'RESIDENCIAL' | 'COMERCIAL' | 'RURAL' | 'INDUSTRIAL' | 'OUTRO'
      eligibility_status: 'POTENCIALMENTE_ELEGIVEL' | 'FORA_DOS_CRITERIOS' | 'NECESSITA_VALIDACAO'
      task_type: 'LIGACAO' | 'WHATSAPP' | 'SOLICITAR_FATURA' | 'ENVIAR_PROPOSTA' | 'FOLLOW_UP' | 'OUTRO'
      activity_type: 'LEAD_CRIADO' | 'STATUS_ALTERADO' | 'WHATSAPP_ABERTO' | 'LIGACAO_INICIADA' | 'EMAIL_ABERTO' | 'SITE_ABERTO' | 'MAPA_ABERTO' | 'FATURA_ADICIONADA' | 'SIMULACAO_REALIZADA'
      organization_role: 'OWNER'
    }
    CompositeTypes: Record<string, never>
  }
}

export type PipelineStatus = Database['public']['Enums']['pipeline_status']
export type CustomerType = Database['public']['Enums']['customer_type']
export type EligibilityStatus = Database['public']['Enums']['eligibility_status']
