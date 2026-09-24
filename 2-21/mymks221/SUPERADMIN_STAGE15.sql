-- KSP Manager Stage 15 — Superadmin operations
-- Run after Stage 14 foundation. Review first; this does not touch auth.users.

-- Delete is exclusive to superadmin.
drop policy if exists "superadmin delete nasabah" on public.nasabah;
create policy "superadmin delete nasabah" on public.nasabah for delete to authenticated using (public.ksp_current_role()='superadmin');

drop policy if exists "superadmin delete pengajuan_kredit" on public.pengajuan_kredit;
create policy "superadmin delete pengajuan_kredit" on public.pengajuan_kredit for delete to authenticated using (public.ksp_current_role()='superadmin');

drop policy if exists "superadmin delete pinjaman" on public.pinjaman;
create policy "superadmin delete pinjaman" on public.pinjaman for delete to authenticated using (public.ksp_current_role()='superadmin');

drop policy if exists "superadmin delete angsuran" on public.angsuran;
create policy "superadmin delete angsuran" on public.angsuran for delete to authenticated using (public.ksp_current_role()='superadmin');

drop policy if exists "superadmin delete ledger_harian" on public.ledger_harian;
create policy "superadmin delete ledger_harian" on public.ledger_harian for delete to authenticated using (public.ksp_current_role()='superadmin');

create table if not exists public.ksp_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.ksp_audit_log enable row level security;
drop policy if exists "superadmin audit select" on public.ksp_audit_log;
create policy "superadmin audit select" on public.ksp_audit_log for select to authenticated using (public.ksp_current_role()='superadmin');

create or replace function public.ksp_write_audit(p_action text,p_target_table text default null,p_target_id text default null,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if public.ksp_current_role() <> 'superadmin' then raise exception 'Superadmin only'; end if;
  insert into public.ksp_audit_log(actor_user_id,action,target_table,target_id,metadata)
  values(auth.uid(),p_action,p_target_table,p_target_id,coalesce(p_metadata,'{}'::jsonb)) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.ksp_write_audit(text,text,text,jsonb) from public;
grant execute on function public.ksp_write_audit(text,text,text,jsonb) to authenticated;

create or replace function public.ksp_reset_demo()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  c_ledger int; c_angsuran int; c_pinjaman int; c_pengajuan int; c_nasabah int;
begin
  if public.ksp_current_role() <> 'superadmin' then raise exception 'Superadmin only'; end if;
  delete from public.ledger_harian; get diagnostics c_ledger=row_count;
  delete from public.angsuran; get diagnostics c_angsuran=row_count;
  delete from public.pinjaman; get diagnostics c_pinjaman=row_count;
  delete from public.pengajuan_kredit; get diagnostics c_pengajuan=row_count;
  delete from public.nasabah; get diagnostics c_nasabah=row_count;
  insert into public.ksp_audit_log(actor_user_id,action,target_table,target_id,metadata)
  values(auth.uid(),'RESET_DEMO','system',null,jsonb_build_object('ledger',c_ledger,'angsuran',c_angsuran,'pinjaman',c_pinjaman,'pengajuan_kredit',c_pengajuan,'nasabah',c_nasabah));
  return jsonb_build_object('ledger_harian',c_ledger,'angsuran',c_angsuran,'pinjaman',c_pinjaman,'pengajuan_kredit',c_pengajuan,'nasabah',c_nasabah);
end; $$;
revoke all on function public.ksp_reset_demo() from public;
grant execute on function public.ksp_reset_demo() to authenticated;
