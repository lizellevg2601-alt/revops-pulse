import { error, handleError, json, methodNotAllowed } from "../../lib/http.mjs";

export async function onRequest(context) {
  const { request, env, data } = context;
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  if (!data.user) return error("unauthorized", "Authentication required", 401);
  try {
    const result = await env.REVOPS_DB.prepare("SELECT item_id FROM saved_items WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 500").bind(data.user.id).all();
    return json({ savedIds: result.results.map((row) => row.item_id) });
  } catch (caught) {
    return handleError(caught, "/api/saved-items");
  }
}
