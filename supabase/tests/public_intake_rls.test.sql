begin;
select plan(8);

select has_table('public', 'public_intake_links', 'organization intake links are persisted');
select has_table('public', 'public_intake_submissions', 'public intake submissions are persisted');
select ok(to_regprocedure('public.public_link_details(text)') is not null, 'public link lookup is narrowly defined');
select ok(to_regprocedure('public.begin_public_intake(text,text,text,text,text,boolean,text,text,text,text,bigint,uuid)') is not null, 'intake creation has an explicit typed contract');
select ok(to_regprocedure('public.finish_public_intake(uuid,text)') is not null, 'upload completion has an explicit typed contract');
select ok(to_regprocedure('public.manage_public_intake_link(uuid,text)') is not null, 'organization owners have a transactional link management contract');
select ok(not has_function_privilege('anon', 'public.manage_public_intake_link(uuid,text)', 'EXECUTE'), 'anonymous visitors cannot manage organization links');
select ok(not has_table_privilege('authenticated', 'public.public_intake_links', 'INSERT') and not has_table_privilege('authenticated', 'public.public_intake_links', 'UPDATE'), 'link writes are available only through the owner-checked RPC');

select * from finish();
rollback;
