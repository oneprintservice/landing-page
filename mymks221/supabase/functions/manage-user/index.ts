import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const jwt = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caller, error: callerError } = await adminClient
    .from("ksp_profiles")
    .select("role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (callerError || caller?.role !== "superadmin" || caller?.is_active !== true) {
    return json({ error: "Superadmin only" }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON tidak valid" }, 400); }
  const action = String(body?.action || "").toLowerCase();
  const targetId = String(body?.user_id || "").trim();

  if (["update", "disable", "delete"].includes(action) && !targetId) {
    return json({ error: "user_id wajib diisi" }, 400);
  }
  if (targetId === user.id) return json({ error: "Akun Superadmin yang sedang login tidak boleh dimodifikasi dari sini." }, 400);

  if (action === "ping") {
    return json({ ok: true, service: "manage-user", role: "superadmin" });
  }

  if (action === "create") {
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const role = String(body?.role || "").trim();
    const displayName = String(body?.display_name || "").trim();
    const isActive = body?.is_active !== false;
    if (!email || !password || !displayName || !["admin", "lapangan"].includes(role)) {
      return json({ error: "Email, password, nama, dan role admin/lapangan wajib diisi." }, 400);
    }
    if (password.length < 8) return json({ error: "Password minimal 8 karakter." }, 400);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (createError || !created.user) return json({ error: createError?.message || "Gagal membuat akun Auth" }, 400);

    const { error: profileError } = await adminClient.from("ksp_profiles").insert({
      user_id: created.user.id, role, display_name: displayName, is_active: isActive,
    });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: "Profil gagal dibuat: " + profileError.message }, 400);
    }

    await adminClient.from("ksp_audit_log").insert({
      actor_user_id: user.id, action: "CREATE_USER", target_table: "auth.users", target_id: created.user.id,
      metadata: { email, role, display_name: displayName, is_active: isActive },
    });
    return json({ ok: true, user_id: created.user.id });
  }

  if (action === "update" || action === "disable") {
    const role = String(body?.role || "").trim();
    const displayName = String(body?.display_name || "").trim();
    const isActive = action === "disable" ? false : body?.is_active === true;
    if (role && !["admin", "lapangan"].includes(role)) return json({ error: "Role hanya admin atau lapangan." }, 400);

    const patch: Record<string, unknown> = { is_active: isActive };
    if (role) patch.role = role;
    if (displayName) patch.display_name = displayName;
    const { error: profileError } = await adminClient.from("ksp_profiles").update(patch).eq("user_id", targetId);
    if (profileError) return json({ error: profileError.message }, 400);

    const { error: authError } = await adminClient.auth.admin.updateUserById(targetId, {
      ban_duration: isActive ? "none" : "876000h",
    });
    if (authError) return json({ error: "Profil berubah tetapi status Auth gagal diperbarui: " + authError.message }, 400);

    await adminClient.from("ksp_audit_log").insert({
      actor_user_id: user.id, action: action === "disable" ? "DISABLE_USER" : "UPDATE_USER",
      target_table: "ksp_profiles", target_id: targetId,
      metadata: { role: role || null, display_name: displayName || null, is_active: isActive },
    });
    return json({ ok: true });
  }

  if (action === "delete") {
    const { data: target, error: targetError } = await adminClient.from("ksp_profiles")
      .select("role,display_name,is_active").eq("user_id", targetId).maybeSingle();
    if (targetError || !target) return json({ error: "Profil target tidak ditemukan." }, 404);
    if (!["admin", "lapangan"].includes(target.role)) return json({ error: "Hanya akun Admin/Lapangan yang boleh dihapus." }, 400);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
    if (deleteError) return json({ error: deleteError.message }, 400);

    await adminClient.from("ksp_audit_log").insert({
      actor_user_id: user.id, action: "DELETE_USER", target_table: "auth.users", target_id: targetId,
      metadata: { role: target.role, display_name: target.display_name },
    });
    return json({ ok: true });
  }

  return json({ error: "Action tidak dikenal. Gunakan create, update, disable, atau delete." }, 400);
});
