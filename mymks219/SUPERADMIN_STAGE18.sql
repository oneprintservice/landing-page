-- KSP Manager Stage 18 — Superadmin hardening
-- Run after SUPERADMIN_STAGE15.sql.
-- No auth.users rows are modified by this SQL.

create or replace function public.ksp_set_profile(
  p_user_id uuid,
  p_role text,
  p_display_name text,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_old public.ksp_profiles%rowtype; v_new public.ksp_profiles%rowtype;
begin
  if public.ksp_current_role() <> 'superadmin' then raise exception 'Superadmin only'; end if;
  if p_user_id = auth.uid() then raise exception 'Tidak boleh mengubah akun Superadmin yang sedang login'; end if;
  if p_role not in ('admin','lapangan') then raise exception 'Role harus admin atau lapangan'; end if;
  select * into v_old from public.ksp_profiles where user_id=p_user_id;
  if not found then raise exception 'Profil tidak ditemukan'; end if;
  update public.ksp_profiles set role=p_role, display_name=nullif(trim(p_display_name),''), is_active=p_is_active where user_id=p_user_id returning * into v_new;
  perform public.ksp_write_audit('UPDATE_PROFILE','ksp_profiles',p_user_id::text,jsonb_build_object('old_role',v_old.role,'new_role',v_new.role,'old_active',v_old.is_active,'new_active',v_new.is_active));
  return jsonb_build_object('user_id',v_new.user_id,'role',v_new.role,'display_name',v_new.display_name,'is_active',v_new.is_active);
end; $$;
revoke all on function public.ksp_set_profile(uuid,text,text,boolean) from public;
grant execute on function public.ksp_set_profile(uuid,text,text,boolean) to authenticated;

create or replace function public.ksp_restore_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r record; counts jsonb := '{}'::jsonb;
begin
  if public.ksp_current_role() <> 'superadmin' then raise exception 'Superadmin only'; end if;
  if coalesce(p_backup->>'version','') <> '1' then raise exception 'Format backup tidak dikenali'; end if;
  if jsonb_typeof(p_backup->'tables') <> 'object' then raise exception 'Bagian tables tidak valid'; end if;

  delete from public.ledger_harian;
  delete from public.angsuran;
  delete from public.pinjaman;
  delete from public.pengajuan_kredit;
  delete from public.nasabah;

  if jsonb_typeof(p_backup->'tables'->'nasabah')='array' then
    insert into public.nasabah select * from jsonb_populate_recordset(null::public.nasabah,p_backup->'tables'->'nasabah');
  end if;
  if jsonb_typeof(p_backup->'tables'->'pengajuan_kredit')='array' then
    insert into public.pengajuan_kredit select * from jsonb_populate_recordset(null::public.pengajuan_kredit,p_backup->'tables'->'pengajuan_kredit');
  end if;
  if jsonb_typeof(p_backup->'tables'->'pinjaman')='array' then
    insert into public.pinjaman select * from jsonb_populate_recordset(null::public.pinjaman,p_backup->'tables'->'pinjaman');
  end if;
  if jsonb_typeof(p_backup->'tables'->'angsuran')='array' then
    insert into public.angsuran select * from jsonb_populate_recordset(null::public.angsuran,p_backup->'tables'->'angsuran');
  end if;
  if jsonb_typeof(p_backup->'tables'->'ledger_harian')='array' then
    insert into public.ledger_harian select * from jsonb_populate_recordset(null::public.ledger_harian,p_backup->'tables'->'ledger_harian');
  end if;

  counts := jsonb_build_object(
    'nasabah',coalesce(jsonb_array_length(p_backup->'tables'->'nasabah'),0),
    'pengajuan_kredit',coalesce(jsonb_array_length(p_backup->'tables'->'pengajuan_kredit'),0),
    'pinjaman',coalesce(jsonb_array_length(p_backup->'tables'->'pinjaman'),0),
    'angsuran',coalesce(jsonb_array_length(p_backup->'tables'->'angsuran'),0),
    'ledger_harian',coalesce(jsonb_array_length(p_backup->'tables'->'ledger_harian'),0)
  );
  perform public.ksp_write_audit('RESTORE','system',null,counts);
  return counts;
end; $$;
revoke all on function public.ksp_restore_backup(jsonb) from public;
grant execute on function public.ksp_restore_backup(jsonb) to authenticated;
