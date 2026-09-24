create table public.public_intake_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Za-z0-9_-]{32,}$'),
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (id, organization_id)
);
create unique index public_intake_one_active_link_per_org
  on public.public_intake_links (organization_id) where active;

create table public.public_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  link_id uuid not null,
  lead_id uuid not null unique,
  idempotency_key uuid not null,
  consent_at timestamptz not null default now(),
  consent_version text not null,
  consent_text text not null,
  upload_path text not null unique,
  upload_expires_at timestamptz not null,
  upload_state text not null default 'PENDENTE' check (upload_state in ('PENDENTE', 'RECEBIDO')),
  original_filename text not null check (length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint not null check (file_size between 1 and 10485760),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  invoice_id uuid,
  created_at timestamptz not null default now(),
  unique (link_id, idempotency_key),
  unique (id, organization_id),
  foreign key (link_id, organization_id) references public.public_intake_links(id, organization_id) on delete cascade,
  foreign key (lead_id, organization_id) references public.leads(id, organization_id) on delete cascade,
  foreign key (invoice_id, organization_id) references public.invoices(id, organization_id) on delete set null (invoice_id)
);
create index public_intake_submissions_org_created_idx
  on public.public_intake_submissions (organization_id, created_at desc);
create index public_intake_submissions_review_queue_idx
  on public.public_intake_submissions (organization_id, created_at desc)
  where reviewed_at is null;

alter table public.public_intake_links enable row level security;
alter table public.public_intake_submissions enable row level security;

revoke all on public.public_intake_links from anon, authenticated;
revoke all on public.public_intake_submissions from anon, authenticated;
grant select on public.public_intake_links to authenticated;
grant select on public.public_intake_submissions to authenticated;

create policy "Members can read their public intake links"
  on public.public_intake_links for select to authenticated
  using (organization_id in (select public.current_organization_ids()));
create policy "Members can read their public intake submissions"
  on public.public_intake_submissions for select to authenticated
  using (organization_id in (select public.current_organization_ids()));

create function public.public_link_details(p_code text)
returns table(organization_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select organization.name
  from public.public_intake_links as intake_link
  join public.organizations as organization on organization.id = intake_link.organization_id
  where intake_link.code = p_code
    and intake_link.active
    and (intake_link.expires_at is null or intake_link.expires_at > now())
  limit 1
$$;

create function public.begin_public_intake(
  p_code text,
  p_company_name text,
  p_phone text,
  p_city text,
  p_email text,
  p_consent boolean,
  p_consent_version text,
  p_consent_text text,
  p_file_name text,
  p_mime_type text,
  p_file_size bigint,
  p_idempotency_key uuid
)
returns table(out_submission_id uuid, out_upload_path text, out_upload_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link public.public_intake_links%rowtype;
  existing_submission public.public_intake_submissions%rowtype;
  new_lead_id uuid := gen_random_uuid();
  new_submission_id uuid := gen_random_uuid();
  expected_consent_version constant text := 'growth-public-intake-v1';
  expected_consent_text constant text := 'Autorizo o licenciado desta página a entrar em contato comigo sobre energia e a usar esta fatura para preparar uma estimativa. Li a política de privacidade.';
  normalized_extension text;
  safe_filename text;
  new_path text;
  current_hour_count integer;
  current_day_count integer;
  owner_user_id uuid;
begin
  if auth.role() is distinct from 'anon' then
    raise exception 'Envio público indisponível.' using errcode = '42501';
  end if;
  if p_consent is distinct from true
    or p_consent_version is distinct from expected_consent_version
    or p_consent_text is distinct from expected_consent_text then
    raise exception 'Autorize o contato e o uso da fatura para continuar.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_company_name, ''))) not between 2 and 160
    or length(trim(coalesce(p_phone, ''))) not between 10 and 32
    or length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) < 10
    or trim(coalesce(p_phone, '')) !~ '^\+?[0-9[:space:]().-]+$'
    or length(trim(coalesce(p_city, ''))) not between 2 and 120
    or length(trim(coalesce(p_email, ''))) > 254
    or trim(coalesce(p_email, '')) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or p_idempotency_key is null then
    raise exception 'Confira os dados informados.' using errcode = '22023';
  end if;
  if p_file_size is null or p_file_size not between 1 and 10485760 then
    raise exception 'A fatura deve ter até 10 MB.' using errcode = '22023';
  end if;

  normalized_extension := lower(regexp_replace(trim(coalesce(p_file_name, '')), '^.*\.', ''));
  if length(trim(coalesce(p_file_name, ''))) not between 1 and 255
    or not (
      (normalized_extension = 'pdf' and p_mime_type = 'application/pdf')
      or (normalized_extension in ('jpg', 'jpeg') and p_mime_type = 'image/jpeg')
      or (normalized_extension = 'png' and p_mime_type = 'image/png')
    ) then
    raise exception 'Envie somente arquivos PDF, JPG ou PNG.' using errcode = '22023';
  end if;

  select * into intake_link
  from public.public_intake_links as candidate
  where candidate.code = p_code
  for update;
  if not found then
    raise exception 'Link de captação indisponível.' using errcode = '42501';
  end if;

  select * into existing_submission
  from public.public_intake_submissions as submission
  where submission.link_id = intake_link.id
    and submission.idempotency_key = p_idempotency_key
  for update;
  if found then
    return query select existing_submission.id, existing_submission.upload_path, existing_submission.upload_expires_at;
    return;
  end if;

  if not intake_link.active or (intake_link.expires_at is not null and intake_link.expires_at <= now()) then
    raise exception 'Link de captação indisponível.' using errcode = '42501';
  end if;

  select count(*)::integer into current_hour_count
  from public.public_intake_submissions as submission
  where submission.link_id = intake_link.id and submission.created_at >= now() - interval '1 hour';
  select count(*)::integer into current_day_count
  from public.public_intake_submissions as submission
  where submission.link_id = intake_link.id and submission.created_at >= date_trunc('day', now());
  if current_hour_count >= 20 or current_day_count >= 100 then
    raise exception 'Este link recebeu muitas solicitações. Tente novamente mais tarde.' using errcode = 'P0001';
  end if;

  select organization.owner_id into owner_user_id
  from public.organizations as organization
  where organization.id = intake_link.organization_id;
  if owner_user_id is null then
    raise exception 'Workspace indisponível.' using errcode = '42501';
  end if;

  safe_filename := regexp_replace(left(trim(p_file_name), 255), '[[:cntrl:]]', '', 'g');
  new_path := intake_link.organization_id::text || '/' || new_submission_id::text || '/' || encode(extensions.gen_random_bytes(24), 'hex') || '.' || normalized_extension;

  insert into public.leads (
    id, organization_id, fingerprint, name, category, phone, email, city, state,
    score, pipeline_status, source, created_by
  ) values (
    new_lead_id, intake_link.organization_id, 'public:' || new_submission_id::text,
    trim(p_company_name), 'Outros', trim(p_phone), lower(trim(p_email)), trim(p_city), '',
    0, 'NOVO', 'PUBLIC_LINK', null
  );

  insert into public.public_intake_submissions (
    id, organization_id, link_id, lead_id, idempotency_key, consent_at,
    consent_version, consent_text, upload_path, upload_expires_at, upload_state,
    original_filename, mime_type, file_size
  ) values (
    new_submission_id, intake_link.organization_id, intake_link.id, new_lead_id, p_idempotency_key,
    now(), expected_consent_version, expected_consent_text, new_path, now() + interval '30 minutes',
    'PENDENTE', safe_filename, p_mime_type, p_file_size
  );

  insert into public.lead_activities (organization_id, lead_id, user_id, type, metadata)
  values (intake_link.organization_id, new_lead_id, null, 'LEAD_CRIADO', jsonb_build_object('source', 'PUBLIC_LINK'));

  insert into public.tasks (organization_id, lead_id, user_id, type, description, due_at)
  values (
    intake_link.organization_id, new_lead_id, owner_user_id, 'FOLLOW_UP',
    'Revisar solicitação recebida pelo link público e realizar o primeiro contato.', now()
  );

  return query select new_submission_id, new_path, now() + interval '30 minutes';
end;
$$;

create function public.can_upload_public_intake_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.public_intake_submissions as submission
    where submission.upload_path = p_path
      and submission.upload_state = 'PENDENTE'
      and submission.upload_expires_at > now()
  )
$$;

create function public.public_intake_object_matches(p_path text, p_file_size bigint, p_mime_type text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from storage.objects as object
    where object.bucket_id = 'invoices'
      and object.name = p_path
      and object.metadata ->> 'mimetype' = p_mime_type
      and case
        when object.metadata ->> 'size' ~ '^[0-9]+$'
        then (object.metadata ->> 'size')::bigint = p_file_size
        else false
      end
  )
$$;

create function public.finish_public_intake(p_submission_id uuid, p_upload_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_submission public.public_intake_submissions%rowtype;
begin
  if auth.role() is distinct from 'anon' then
    raise exception 'Envio público indisponível.' using errcode = '42501';
  end if;

  select * into intake_submission
  from public.public_intake_submissions as submission
  where submission.id = p_submission_id and submission.upload_path = p_upload_path
  for update;
  if not found then
    raise exception 'Envio indisponível.' using errcode = '42501';
  end if;
  if intake_submission.upload_state = 'RECEBIDO' then
    return 'RECEBIDO';
  end if;
  if intake_submission.upload_expires_at <= now() then
    raise exception 'O prazo para enviar a fatura terminou.' using errcode = '22023';
  end if;
  if not public.public_intake_object_matches(intake_submission.upload_path, intake_submission.file_size, intake_submission.mime_type) then
    raise exception 'Não foi possível confirmar a fatura enviada.' using errcode = '22023';
  end if;

  update public.public_intake_submissions
  set upload_state = 'RECEBIDO'
  where id = intake_submission.id;
  return 'RECEBIDO';
end;
$$;

create function public.reconcile_public_intake_upload(p_submission_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_submission public.public_intake_submissions%rowtype;
begin
  select * into intake_submission
  from public.public_intake_submissions as submission
  where submission.id = p_submission_id
    and submission.organization_id in (select public.current_organization_ids())
  for update;
  if not found then
    raise exception 'Envio indisponível ou sem permissão.' using errcode = '42501';
  end if;
  if intake_submission.upload_state = 'RECEBIDO' then
    return 'RECEBIDO';
  end if;
  if public.public_intake_object_matches(intake_submission.upload_path, intake_submission.file_size, intake_submission.mime_type) then
    update public.public_intake_submissions
    set upload_state = 'RECEBIDO'
    where id = intake_submission.id;
    return 'RECEBIDO';
  end if;
  return 'PENDENTE';
end;
$$;

create function public.review_public_intake(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare updated_submission_id uuid;
begin
  update public.public_intake_submissions
  set reviewed_at = coalesce(reviewed_at, now()),
      reviewed_by = coalesce(reviewed_by, auth.uid())
  where id = p_submission_id
    and organization_id in (select public.current_organization_ids())
  returning id into updated_submission_id;
  if updated_submission_id is null then
    raise exception 'Envio indisponível ou sem permissão.' using errcode = '42501';
  end if;
  return true;
end;
$$;

create function public.register_public_intake_invoice(
  p_submission_id uuid,
  p_provider text,
  p_state text,
  p_customer_type public.customer_type,
  p_amount numeric,
  p_consumption_kwh numeric,
  p_reference_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_submission public.public_intake_submissions%rowtype;
  new_invoice_id uuid;
begin
  select * into intake_submission
  from public.public_intake_submissions as submission
  where submission.id = p_submission_id
    and submission.organization_id in (select public.current_organization_ids())
  for update;
  if not found then
    raise exception 'Envio indisponível ou sem permissão.' using errcode = '42501';
  end if;
  if intake_submission.invoice_id is not null then
    return intake_submission.invoice_id;
  end if;
  if intake_submission.upload_state <> 'RECEBIDO'
    or not public.public_intake_object_matches(intake_submission.upload_path, intake_submission.file_size, intake_submission.mime_type) then
    raise exception 'Confirme o recebimento da fatura antes de registrar os dados.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_provider, ''))) not between 2 and 100
    or length(trim(coalesce(p_state, ''))) <> 2
    or p_customer_type is null
    or p_amount is null or p_amount <= 0
    or p_consumption_kwh is null or p_consumption_kwh <= 0
    or p_reference_date is null then
    raise exception 'Confira os dados da fatura.' using errcode = '22023';
  end if;

  insert into public.invoices (
    organization_id, lead_id, storage_path, original_filename, mime_type,
    provider, state, customer_type, amount, consumption_kwh, reference_date, created_by
  ) values (
    intake_submission.organization_id, intake_submission.lead_id, intake_submission.upload_path,
    intake_submission.original_filename, intake_submission.mime_type, trim(p_provider), upper(trim(p_state)),
    p_customer_type, p_amount, p_consumption_kwh, p_reference_date, auth.uid()
  ) returning id into new_invoice_id;

  insert into public.lead_activities (organization_id, lead_id, user_id, type, metadata)
  values (
    intake_submission.organization_id, intake_submission.lead_id, auth.uid(), 'FATURA_ADICIONADA',
    jsonb_build_object('invoice_id', new_invoice_id, 'source', 'PUBLIC_LINK')
  );

  update public.public_intake_submissions
  set invoice_id = new_invoice_id
  where id = intake_submission.id;

  return new_invoice_id;
end;
$$;

create policy "Public intake can upload one authorized invoice file"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'invoices'
    and public.can_upload_public_intake_path(name)
  );

revoke all on function public.public_link_details(text) from public, authenticated;
revoke all on function public.begin_public_intake(text, text, text, text, text, boolean, text, text, text, text, bigint, uuid) from public, authenticated;
revoke all on function public.finish_public_intake(uuid, text) from public, authenticated;
revoke all on function public.can_upload_public_intake_path(text) from public, authenticated;
revoke all on function public.public_intake_object_matches(text, bigint, text) from public, anon, authenticated;
revoke all on function public.reconcile_public_intake_upload(uuid) from public, anon;
revoke all on function public.review_public_intake(uuid) from public, anon;
revoke all on function public.register_public_intake_invoice(uuid, text, text, public.customer_type, numeric, numeric, date) from public, anon;

grant execute on function public.public_link_details(text) to anon;
grant execute on function public.begin_public_intake(text, text, text, text, text, boolean, text, text, text, text, bigint, uuid) to anon;
grant execute on function public.finish_public_intake(uuid, text) to anon;
grant execute on function public.can_upload_public_intake_path(text) to anon;
grant execute on function public.reconcile_public_intake_upload(uuid) to authenticated;
grant execute on function public.review_public_intake(uuid) to authenticated;
grant execute on function public.register_public_intake_invoice(uuid, text, text, public.customer_type, numeric, numeric, date) to authenticated;

create function public.manage_public_intake_link(p_organization_id uuid, p_operation text)
returns table(out_code text, out_active boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_code text;
begin
  if auth.role() is distinct from 'authenticated'
    or auth.uid() is null
    or not public.is_organization_owner(p_organization_id) then
    raise exception 'Sem permissão para gerenciar o link.' using errcode = '42501';
  end if;
  if p_operation is null or p_operation not in ('enable', 'rotate', 'disable') then
    raise exception 'Operação inválida.' using errcode = '22023';
  end if;

  perform 1 from public.organizations as organization
  where organization.id = p_organization_id
  for update;
  if not found then
    raise exception 'Workspace indisponível.' using errcode = '42501';
  end if;

  if p_operation = 'disable' then
    update public.public_intake_links as intake_link
    set active = false, revoked_at = now()
    where intake_link.organization_id = p_organization_id and intake_link.active;
    select intake_link.code into link_code
    from public.public_intake_links as intake_link
    where intake_link.organization_id = p_organization_id
    order by intake_link.created_at desc limit 1;
    return query select link_code, false;
    return;
  end if;

  if p_operation = 'enable' then
    select intake_link.code into link_code
    from public.public_intake_links as intake_link
    where intake_link.organization_id = p_organization_id and intake_link.active
    for update;
    if found then
      return query select link_code, true;
      return;
    end if;
  end if;

  update public.public_intake_links as intake_link
  set active = false, revoked_at = now()
  where intake_link.organization_id = p_organization_id and intake_link.active;

  link_code := translate(rtrim(encode(extensions.gen_random_bytes(24), 'base64'), '='), '+/', '-_');
  insert into public.public_intake_links (organization_id, code, active, created_by)
  values (p_organization_id, link_code, true, auth.uid());
  return query select link_code, true;
end;
$$;

revoke all on function public.manage_public_intake_link(uuid, text) from public, anon;
grant execute on function public.manage_public_intake_link(uuid, text) to authenticated;
