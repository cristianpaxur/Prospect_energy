create function public.create_lead_with_activity(p_organization_id uuid, p_lead jsonb)
returns table(out_lead_id uuid, was_created boolean)
language plpgsql security definer set search_path = public
as $$
declare inserted_id uuid;
begin
  if p_organization_id not in (select public.current_organization_ids()) then
    raise exception 'Workspace não encontrado ou sem permissão.' using errcode = '42501';
  end if;

  insert into public.leads (
    organization_id, external_place_id, fingerprint, name, category, phone, email, website, address,
    city, state, open_hours, score, pipeline_status, source, created_by
  ) values (
    p_organization_id, nullif(p_lead ->> 'external_place_id', ''), p_lead ->> 'fingerprint', p_lead ->> 'name',
    coalesce(p_lead ->> 'category', 'Outros'), nullif(p_lead ->> 'phone', ''), nullif(p_lead ->> 'email', ''), nullif(p_lead ->> 'website', ''),
    nullif(p_lead ->> 'address', ''), coalesce(p_lead ->> 'city', ''), upper(coalesce(p_lead ->> 'state', '')),
    nullif(p_lead ->> 'open_hours', '')::numeric,
    least(greatest(coalesce((p_lead ->> 'score')::integer, 0), 0), 100), 'NOVO', 'GOOGLE_PLACES', auth.uid()
  ) on conflict do nothing returning id into inserted_id;

  if inserted_id is null then
    return query select null::uuid, false;
    return;
  end if;

  insert into public.lead_activities (organization_id, lead_id, user_id, type, metadata)
  values (p_organization_id, inserted_id, auth.uid(), 'LEAD_CRIADO', jsonb_build_object('source', 'GOOGLE_PLACES'));

  return query select inserted_id, true;
end;
$$;

revoke all on function public.create_lead_with_activity(uuid, jsonb) from public;
grant execute on function public.create_lead_with_activity(uuid, jsonb) to authenticated;
