create extension if not exists pgcrypto;

create type public.pipeline_status as enum (
  'NOVO', 'CONTATO_REALIZADO', 'INTERESSADO', 'AGUARDANDO_FATURA', 'ANALISE', 'PROPOSTA', 'FECHADO', 'PERDIDO'
);
create type public.customer_type as enum ('RESIDENCIAL', 'COMERCIAL', 'RURAL', 'INDUSTRIAL', 'OUTRO');
create type public.eligibility_status as enum ('POTENCIALMENTE_ELEGIVEL', 'FORA_DOS_CRITERIOS', 'NECESSITA_VALIDACAO');
create type public.task_type as enum ('LIGACAO', 'WHATSAPP', 'SOLICITAR_FATURA', 'ENVIAR_PROPOSTA', 'FOLLOW_UP', 'OUTRO');
create type public.activity_type as enum (
  'LEAD_CRIADO', 'STATUS_ALTERADO', 'WHATSAPP_ABERTO', 'LIGACAO_INICIADA', 'EMAIL_ABERTO',
  'SITE_ABERTO', 'MAPA_ABERTO', 'FATURA_ADICIONADA', 'SIMULACAO_REALIZADA'
);
create type public.organization_role as enum ('OWNER');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  city text not null default '',
  state text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'OWNER',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create function public.current_organization_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select organization_id from public.organization_members where user_id = auth.uid()
$$;

create function public.is_organization_owner(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id and user_id = auth.uid() and role = 'OWNER'
  )
$$;

revoke all on function public.current_organization_ids() from public;
revoke all on function public.is_organization_owner(uuid) from public;
grant execute on function public.current_organization_ids() to authenticated;
grant execute on function public.is_organization_owner(uuid) to authenticated;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_place_id text,
  fingerprint text not null,
  name text not null default 'Novo lead',
  category text not null default 'Outros',
  phone text,
  email text,
  website text,
  address text,
  city text not null default '',
  state text not null default '',
  open_hours numeric(4,1) check (open_hours is null or (open_hours >= 0 and open_hours <= 24)),
  score smallint not null default 0 check (score between 0 and 100),
  pipeline_status public.pipeline_status not null default 'NOVO',
  source text not null default 'GOOGLE_PLACES',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index leads_external_place_unique on public.leads (organization_id, external_place_id) where external_place_id is not null;
create unique index leads_fingerprint_unique on public.leads (organization_id, fingerprint);
create unique index leads_id_organization_unique on public.leads (id, organization_id);
create index leads_organization_status_idx on public.leads (organization_id, pipeline_status);
create index leads_organization_name_idx on public.leads (organization_id, name);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  content text not null check (length(trim(content)) between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (lead_id, organization_id) references public.leads(id, organization_id) on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  type public.task_type not null,
  description text not null check (length(trim(description)) between 1 and 500),
  due_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (lead_id, organization_id) references public.leads(id, organization_id) on delete cascade
);
create index tasks_org_due_idx on public.tasks (organization_id, due_at) where completed_at is null;

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  type public.activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (lead_id, organization_id) references public.leads(id, organization_id) on delete cascade
);
create index activities_lead_created_idx on public.lead_activities (lead_id, created_at desc);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  provider text not null,
  state text not null check (length(state) = 2),
  customer_type public.customer_type not null,
  amount numeric(12,2) not null check (amount >= 0),
  consumption_kwh numeric(12,2) not null check (consumption_kwh >= 0),
  reference_date date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (lead_id, organization_id) references public.leads(id, organization_id) on delete cascade
);
create index invoices_lead_created_idx on public.invoices (lead_id, created_at desc);

create table public.eligibility_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  state text not null check (length(state) = 2),
  customer_type public.customer_type not null,
  minimum_amount numeric(12,2) check (minimum_amount is null or minimum_amount >= 0),
  maximum_amount numeric(12,2) check (maximum_amount is null or maximum_amount >= 0),
  discount_percentage numeric(5,2) not null check (discount_percentage > 0 and discount_percentage <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_amount is null or maximum_amount is null or minimum_amount <= maximum_amount)
);
create unique index eligibility_rules_unique_scope on public.eligibility_rules (
  organization_id, lower(provider), state, customer_type, coalesce(minimum_amount, -1), coalesce(maximum_amount, -1)
);
create unique index eligibility_rules_id_organization_unique on public.eligibility_rules (id, organization_id);

create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  invoice_id uuid not null,
  rule_id uuid references public.eligibility_rules(id) on delete set null,
  current_amount numeric(12,2) not null,
  discount_percentage numeric(5,2),
  estimated_monthly_savings numeric(12,2),
  estimated_annual_savings numeric(12,2),
  estimated_new_amount numeric(12,2),
  eligibility_status public.eligibility_status not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (lead_id, organization_id) references public.leads(id, organization_id) on delete cascade,
  foreign key (invoice_id, organization_id) references public.invoices(id, organization_id) on delete cascade,
  foreign key (rule_id, organization_id) references public.eligibility_rules(id, organization_id) on delete set null (rule_id)
);
create index simulations_lead_created_idx on public.simulations (lead_id, created_at desc);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_key text not null check (template_key in ('PRIMEIRO_CONTATO', 'FOLLOW_UP', 'SOLICITAR_FATURA', 'ENVIAR_SIMULACAO', 'ENVIAR_PROPOSTA')),
  title text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  unique (organization_id, template_key)
);

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  new_organization_id uuid;
  profile_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, full_name, phone, city, state)
  values (new.id, profile_name, coalesce(new.raw_user_meta_data ->> 'phone', ''), coalesce(new.raw_user_meta_data ->> 'city', ''), upper(coalesce(new.raw_user_meta_data ->> 'state', '')));

  insert into public.organizations (name, owner_id)
  values ('Workspace de ' || profile_name, new.id)
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, new.id, 'OWNER');

  insert into public.eligibility_rules (organization_id, provider, state, customer_type, discount_percentage)
  values (new_organization_id, 'CPFL', 'SP', 'COMERCIAL', 12);

  insert into public.message_templates (organization_id, template_key, title, content)
  values
    (new_organization_id, 'PRIMEIRO_CONTATO', 'Primeiro contato', 'Olá, {{nome_empresa}}! Sou {{nome_licenciado}}, de {{cidade}}. Posso apresentar uma forma de reduzir os custos com energia da sua empresa?'),
    (new_organization_id, 'FOLLOW_UP', 'Follow-up', 'Olá, {{nome_empresa}}! Passando para saber se conseguiu avaliar minha mensagem sobre economia na conta de energia.'),
    (new_organization_id, 'SOLICITAR_FATURA', 'Solicitar fatura', 'Para preparar uma estimativa de economia para {{nome_empresa}}, você poderia me enviar uma fatura recente de energia?'),
    (new_organization_id, 'ENVIAR_SIMULACAO', 'Enviar simulação', 'Olá, {{nome_empresa}}! Preparei uma estimativa de economia para sua empresa. Posso compartilhar os detalhes?'),
    (new_organization_id, 'ENVIAR_PROPOSTA', 'Enviar proposta', 'Olá, {{nome_empresa}}! A proposta com as condições analisadas está pronta. Quando seria um bom horário para conversarmos?');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger rules_set_updated_at before update on public.eligibility_rules for each row execute function public.set_updated_at();
create trigger templates_set_updated_at before update on public.message_templates for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.tasks enable row level security;
alter table public.lead_activities enable row level security;
alter table public.invoices enable row level security;
alter table public.eligibility_rules enable row level security;
alter table public.simulations enable row level security;
alter table public.message_templates enable row level security;

create policy "Profiles are visible to their owner" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Profiles are editable by their owner" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can read their organization" on public.organizations for select to authenticated using (id in (select public.current_organization_ids()));
create policy "Owners can update their organization" on public.organizations for update to authenticated using (public.is_organization_owner(id)) with check (public.is_organization_owner(id));
create policy "Users can read their membership" on public.organization_members for select to authenticated using (user_id = auth.uid());

create policy "Members can read leads" on public.leads for select to authenticated using (organization_id in (select public.current_organization_ids()));
create policy "Members can create leads" on public.leads for insert to authenticated with check (organization_id in (select public.current_organization_ids()));
create policy "Members can update leads" on public.leads for update to authenticated using (organization_id in (select public.current_organization_ids())) with check (organization_id in (select public.current_organization_ids()));
create policy "Members can delete leads" on public.leads for delete to authenticated using (organization_id in (select public.current_organization_ids()));

create policy "Members can read notes" on public.lead_notes for select to authenticated using (organization_id in (select public.current_organization_ids()));
create policy "Members can add notes" on public.lead_notes for insert to authenticated with check (organization_id in (select public.current_organization_ids()) and user_id = auth.uid());
create policy "Members can read tasks" on public.tasks for select to authenticated using (organization_id in (select public.current_organization_ids()));
create policy "Members can add tasks" on public.tasks for insert to authenticated with check (organization_id in (select public.current_organization_ids()) and user_id = auth.uid());
create policy "Members can update tasks" on public.tasks for update to authenticated using (organization_id in (select public.current_organization_ids())) with check (organization_id in (select public.current_organization_ids()));
create policy "Members can read activities" on public.lead_activities for select to authenticated using (organization_id in (select public.current_organization_ids()));
create policy "Members can add activities" on public.lead_activities for insert to authenticated with check (organization_id in (select public.current_organization_ids()) and (user_id is null or user_id = auth.uid()));
create policy "Members can read invoices" on public.invoices for select to authenticated using (organization_id in (select public.current_organization_ids()));
create policy "Members can add invoices" on public.invoices for insert to authenticated with check (organization_id in (select public.current_organization_ids()) and created_by = auth.uid());
create policy "Members can read eligibility rules" on public.eligibility_rules for select to authenticated using (organization_id in (select public.current_organization_ids()));
create policy "Owners can add eligibility rules" on public.eligibility_rules for insert to authenticated with check (public.is_organization_owner(organization_id));
create policy "Owners can update eligibility rules" on public.eligibility_rules for update to authenticated using (public.is_organization_owner(organization_id)) with check (public.is_organization_owner(organization_id));
create policy "Owners can delete eligibility rules" on public.eligibility_rules for delete to authenticated using (public.is_organization_owner(organization_id));
create policy "Members can read simulations" on public.simulations for select to authenticated using (organization_id in (select public.current_organization_ids()));
create policy "Members can add simulations" on public.simulations for insert to authenticated with check (organization_id in (select public.current_organization_ids()) and created_by = auth.uid());
create policy "Members can read templates" on public.message_templates for select to authenticated using (organization_id in (select public.current_organization_ids()));
create policy "Owners can add templates" on public.message_templates for insert to authenticated with check (public.is_organization_owner(organization_id));
create policy "Owners can update templates" on public.message_templates for update to authenticated using (public.is_organization_owner(organization_id)) with check (public.is_organization_owner(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

create policy "Members can read organization invoice files" on storage.objects
for select to authenticated using (
  bucket_id = 'invoices' and (storage.foldername(name))[1] in (select organization_id::text from public.organization_members where user_id = auth.uid())
);
create policy "Members can upload organization invoice files" on storage.objects
for insert to authenticated with check (
  bucket_id = 'invoices' and (storage.foldername(name))[1] in (select organization_id::text from public.organization_members where user_id = auth.uid())
);
create policy "Members can remove organization invoice files" on storage.objects
for delete to authenticated using (
  bucket_id = 'invoices' and (storage.foldername(name))[1] in (select organization_id::text from public.organization_members where user_id = auth.uid())
);
