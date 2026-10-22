import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INTERNAL_DOMAIN = "staff.yunying.local";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizeUsername(value: unknown) {
  return String(value || "").normalize("NFKC").trim().toLowerCase();
}

function base64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function usernameToEmail(username: string) {
  return `u_${base64Url(username)}@${INTERNAL_DOMAIN}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "只支持 POST 请求" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Edge Function 环境变量不完整" }, 500);
  }

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "缺少登录凭证" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  const { data: authData, error: authError } = await userClient.auth.getUser(accessToken);
  if (authError || !authData.user) return json({ error: "登录状态已失效" }, 401);

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,name,role,active,archived_at")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) return json({ error: profileError.message }, 500);
  if (!callerProfile || !["主管", "创作者"].includes(callerProfile.role) || !callerProfile.active || callerProfile.archived_at) {
    return json({ error: "当前账号没有管理账号的权限" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "请求内容不是有效 JSON" }, 400);
  }

  const action = String(body.action || "");

  if (action === "create") {
    if (callerProfile.role !== "创作者") return json({ error: "只有创作者可以创建账号" }, 403);
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const role = ["主管", "创作者"].includes(String(body.role)) ? String(body.role) : "组员";

    if (!name) return json({ error: "姓名不能为空" }, 400);
    if (!/^[\p{L}\p{N}._-]{2,32}$/u.test(username)) {
      return json({ error: "用户名只能使用 2-32 位文字、字母、数字、点、下划线或短横线" }, 400);
    }
    if (password.length < 8) return json({ error: "密码至少需要 8 位" }, 400);

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("login_name", username)
      .maybeSingle();
    if (existingProfile) return json({ error: "这个用户名已经存在" }, 409);

    const email = usernameToEmail(username);
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, username },
    });
    if (createError) return json({ error: createError.message }, 400);

    const { error: upsertError } = await adminClient.from("profiles").upsert({
      id: created.user.id,
      name,
      role,
      login_name: username,
      active: true,
    }, { onConflict: "id" });

    if (upsertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: `账号资料保存失败：${upsertError.message}` }, 500);
    }

    return json({
      ok: true,
      user: { id: created.user.id, name, username, role, active: true },
    });
  }

  if (action === "reset_password") {
    const userId = String(body.user_id || "").trim();
    const password = String(body.password || "");
    if (!userId) return json({ error: "缺少目标账号" }, 400);
    if (password.length < 8) return json({ error: "密码至少需要 8 位" }, 400);

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id,name,login_name,role,active,archived_at")
      .eq("id", userId)
      .maybeSingle();
    if (targetError) return json({ error: targetError.message }, 500);
    if (!targetProfile) return json({ error: "目标账号不存在" }, 404);
    if (callerProfile.role !== "创作者" && targetProfile.role !== "组员") {
      return json({ error: "主管只能重置组员的密码" }, 403);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (updateError) return json({ error: updateError.message }, 400);
    return json({ ok: true, user_id: userId, username: targetProfile.login_name });
  }

  if (action === "rename_username") {
    if (callerProfile.role !== "创作者") return json({ error: "只有创作者可以修改用户名" }, 403);
    const userId = String(body.user_id || "").trim();
    const username = normalizeUsername(body.username);
    if (!userId) return json({ error: "缺少目标账号" }, 400);
    if (!/^[\p{L}\p{N}._-]{2,32}$/u.test(username)) {
      return json({ error: "用户名只能使用 2-32 位文字、字母、数字、点、下划线或短横线" }, 400);
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles").select("id,name,login_name,role,archived_at").eq("id", userId).maybeSingle();
    if (targetError) return json({ error: targetError.message }, 500);
    if (!targetProfile || targetProfile.archived_at) return json({ error: "目标账号不存在或已归档" }, 404);

    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(userId);
    if (authUserError || !authUserData.user) return json({ error: authUserError?.message || "目标认证账号不存在" }, 404);
    const oldEmail = authUserData.user.email;
    const desiredEmail = usernameToEmail(username);
    if (targetProfile.login_name === username && oldEmail === desiredEmail) {
      return json({ ok: true, user_id: userId, username });
    }

    const { data: duplicate } = await adminClient
      .from("profiles").select("id").eq("login_name", username).neq("id", userId).maybeSingle();
    if (duplicate) return json({ error: "这个用户名已经存在" }, 409);
    const { error: emailError } = await adminClient.auth.admin.updateUserById(userId, {
      email: desiredEmail,
      email_confirm: true,
    });
    if (emailError) return json({ error: emailError.message }, 400);

    const { error: profileUpdateError } = await adminClient
      .from("profiles").update({ login_name: username }).eq("id", userId);
    if (profileUpdateError) {
      if (oldEmail) await adminClient.auth.admin.updateUserById(userId, { email: oldEmail, email_confirm: true });
      return json({ error: `用户名保存失败：${profileUpdateError.message}` }, 500);
    }
    return json({ ok: true, user_id: userId, username });
  }

  if (action === "archive_account") {
    if (callerProfile.role !== "创作者") return json({ error: "只有创作者可以归档账号" }, 403);
    const userId = String(body.user_id || "").trim();
    if (!userId) return json({ error: "缺少目标账号" }, 400);
    if (userId === callerProfile.id) return json({ error: "不能归档当前登录账号" }, 400);

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles").select("id,name,login_name,role,archived_at").eq("id", userId).maybeSingle();
    if (targetError) return json({ error: targetError.message }, 500);
    if (!targetProfile || targetProfile.archived_at) return json({ error: "目标账号不存在或已归档" }, 404);

    const archivedLogin = `archived_${Date.now()}_${targetProfile.login_name || "user"}`.slice(0, 64);
    const { error: archiveError } = await adminClient.from("profiles").update({
      active: false,
      archived_at: new Date().toISOString(),
      archived_by: callerProfile.id,
      login_name: archivedLogin,
    }).eq("id", userId);
    if (archiveError) return json({ error: archiveError.message }, 500);
    return json({ ok: true, user_id: userId, archived: true });
  }

  return json({ error: "未知操作" }, 400);
});