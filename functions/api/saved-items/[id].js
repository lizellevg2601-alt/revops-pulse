import { error, handleError, json, methodNotAllowed, requireSameOrigin } from "../../lib/http.mjs";
import { validSavedItemId } from "../../lib/validation.mjs";

export async function onRequest(context) {
  const { request, env, data, params } = context;
  if (!["POST", "DELETE"].includes(request.method)) return methodNotAllowed(["POST", "DELETE"]);
  if (!data.user) return error("unauthorized", "Authentication required", 401);
  try {
    requireSameOrigin(request, env);
    const itemId = params.id;
    if (!validSavedItemId(itemId)) return error("invalid_item_id", "Saved item ID is invalid", 400);
    if (request.method === "POST") {
      await env.REVOPS_DB.prepare("INSERT OR IGNORE INTO saved_items (user_id, item_id) VALUES (?1, ?2)").bind(data.user.id, itemId).run();
    } else {
      await env.REVOPS_DB.prepare("DELETE FROM saved_items WHERE user_id = ?1 AND item_id = ?2").bind(data.user.id, itemId).run();
    }
    return json({ saved: request.method === "POST", itemId });
  } catch (caught) {
    return handleError(caught, "/api/saved-items/:id");
  }
}
