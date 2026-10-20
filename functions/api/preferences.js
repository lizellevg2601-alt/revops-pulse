import { error, handleError, json, methodNotAllowed, readJson, requireSameOrigin } from "../lib/http.mjs";
import { validPreferences } from "../lib/validation.mjs";

export async function onRequest(context) {
  const { request, env, data } = context;
  if (!data.user) return error("unauthorized", "Authentication required", 401);
  try {
    if (request.method === "GET") {
      const row = await env.REVOPS_DB.prepare("SELECT profile_json FROM preferences WHERE user_id = ?1").bind(data.user.id).first();
      let stored = null;
      try { stored = row ? JSON.parse(row.profile_json) : null; } catch { stored = null; }
      return json({ preferences: validPreferences(stored) ? stored : null });
    }
    if (request.method === "PUT") {
      requireSameOrigin(request, env);
      const body = await readJson(request, 16_384);
      if (!validPreferences(body.preferences)) return error("invalid_preferences", "Preferences are invalid", 400);
      await env.REVOPS_DB.prepare(`
        INSERT INTO preferences (user_id, profile_json) VALUES (?1, ?2)
        ON CONFLICT(user_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = unixepoch()
      `).bind(data.user.id, JSON.stringify(body.preferences)).run();
      return json({ preferences: body.preferences });
    }
    return methodNotAllowed(["GET", "PUT"]);
  } catch (caught) {
    return handleError(caught, "/api/preferences");
  }
}
