-- KSP Manager Stage 22 — Superadmin operational mode + protected corrections
-- Run once in Supabase SQL Editor after Stage 18.
-- Purpose:
-- 1) Allow only Superadmin to manually edit credit_score.
-- 2) Enforce delete protection at DB level for operational records.
-- 3) Provide an audited RPC for Superadmin credit-score corrections.
-- Admin/Lapangan workflow is otherwise unchanged.

-- ------------------------------------------------------------
-- Superadmin-only credit score correction
-- ------------------------------------------------------------
create or replace function public.ksp_set_credit_score(
  p_nasabah_id uuid,
  p_score integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_old integer;
  v_new integer;
begin
  if public.ksp_current_role() <> 'superadmin' then
    raise exception 'Superadmin only';
  end if;
  if p_score is null or p_score < 0 or p_score > 10 then
    raise exception 'Credit Score harus 0 sampai 10';
  end if;

  select credit_score into v_old
  from public.nasabah
  where id = p_nasabah_id;

  if not found then
    raise exception 'Nasabah tidak ditemukan';
  end if;

  update public.nasabah
  set credit_score = p_score
  where id = p_nasabah_id
  returning credit_score into v_new;

  perform public.ksp_write_audit(
    'UPDATE_CREDIT_SCORE',
    'nasabah',
    p_nasabah_id::text,
    jsonb_build_object('old_score',v_old,'new_score',v_new)
  );

  return jsonb_build_object(
    'nasabah_id',p_nasabah_id,
    'old_score',v_old,
    'new_score',v_new
  );
end;
$$;

revoke all on function public.ksp_set_credit_score(uuid,integer) from public;
grant execute on function public.ksp_set_credit_score(uuid,integer) to authenticated;

-- ------------------------------------------------------------
-- Database guard: manual credit_score changes are Superadmin-only.
-- This protects against bypassing the UI through the REST API.
-- ------------------------------------------------------------
create or replace function public.ksp_guard_credit_score_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.credit_score is distinct from old.credit_score
     and public.ksp_current_role() <> 'superadmin' then
    raise exception 'Perubahan Credit Score hanya boleh dilakukan Superadmin';
  end if;
  return new;
end;
$$;

revoke all on function public.ksp_guard_credit_score_change() from public;

drop trigger if exists trg_ksp_guard_credit_score on public.nasabah;
create trigger trg_ksp_guard_credit_score
before update on public.nasabah
for each row execute function public.ksp_guard_credit_score_change();

-- ------------------------------------------------------------
-- Database guard: DELETE on operational records is Superadmin-only.
-- This remains enforced even if an overly permissive legacy DELETE policy exists.
-- ------------------------------------------------------------
create or replace function public.ksp_guard_operational_delete()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if public.ksp_current_role() <> 'superadmin' then
    raise exception 'Penghapusan data operasional hanya boleh dilakukan Superadmin';
  end if;
  return old;
end;
$$;

revoke all on function public.ksp_guard_operational_delete() from public;

drop trigger if exists trg_ksp_delete_nasabah on public.nasabah;
create trigger trg_ksp_delete_nasabah
before delete on public.nasabah
for each row execute function public.ksp_guard_operational_delete();

drop trigger if exists trg_ksp_delete_pengajuan on public.pengajuan_kredit;
create trigger trg_ksp_delete_pengajuan
before delete on public.pengajuan_kredit
for each row execute function public.ksp_guard_operational_delete();

drop trigger if exists trg_ksp_delete_pinjaman on public.pinjaman;
create trigger trg_ksp_delete_pinjaman
before delete on public.pinjaman
for each row execute function public.ksp_guard_operational_delete();

drop trigger if exists trg_ksp_delete_angsuran on public.angsuran;
create trigger trg_ksp_delete_angsuran
before delete on public.angsuran
for each row execute function public.ksp_guard_operational_delete();

drop trigger if exists trg_ksp_delete_ledger on public.ledger_harian;
create trigger trg_ksp_delete_ledger
before delete on public.ledger_harian
for each row execute function public.ksp_guard_operational_delete();

-- Optional hardening: explicitly remove legacy DELETE policies that could
-- otherwise expose delete controls to anon/authenticated clients.
-- The trigger above is the primary enforcement layer.
drop policy if exists "ksp ledger delete" on public.ledger_harian;
drop policy if exists "ksp nasabah delete" on public.nasabah;
drop policy if exists "ksp pengajuan delete" on public.pengajuan_kredit;
drop policy if exists "ksp pinjaman delete" on public.pinjaman;
drop policy if exists "ksp angsuran delete" on public.angsuran;

-- Stage 15 Superadmin DELETE policies may remain; they are fine because the
-- trigger above still enforces the Superadmin-only rule at row level.
