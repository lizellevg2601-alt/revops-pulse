import { json, methodNotAllowed } from "../lib/http.mjs";

export function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  return json({ user: context.data.user });
}
