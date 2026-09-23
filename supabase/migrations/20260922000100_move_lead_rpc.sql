create function public.move_lead(p_lead_id uuid, p_to_status public.pipeline_status)
returns public.leads
language plpgsql security definer set search_path = public
as $$
declare
  previous_lead public.leads;
  updated_lead public.leads;
begin
  select l.* into previous_lead
  from public.leads l
  where l.id = p_lead_id and l.organization_id in (select public.current_organization_ids())
  for update;

  if previous_lead.id is null then
    raise exception 'Lead não encontrado ou sem permissão.' using errcode = '42501';
  end if;

  update public.leads
  set pipeline_status = p_to_status
  where id = p_lead_id
  returning * into updated_lead;

  insert into public.lead_activities (organization_id, lead_id, user_id, type, metadata)
  values (
    updated_lead.organization_id, updated_lead.id, auth.uid(), 'STATUS_ALTERADO',
    jsonb_build_object('from', previous_lead.pipeline_status, 'to', updated_lead.pipeline_status)
  );

  return updated_lead;
end;
$$;

revoke all on function public.move_lead(uuid, public.pipeline_status) from public;
grant execute on function public.move_lead(uuid, public.pipeline_status) to authenticated;
