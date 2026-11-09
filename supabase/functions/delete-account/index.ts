import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "https://cubanfashioner-del.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const jsonResponse = (status: number, body: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== allowedOrigin) {
    return jsonResponse(403, { error: "Origin not allowed." });
  }

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const authorization = request.headers.get("Authorization");
  const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return jsonResponse(401, { error: "Authentication is required." });
  }

  let confirmation: unknown;
  try {
    ({ confirmation } = await request.json());
  } catch {
    return jsonResponse(400, { error: "A valid confirmation is required." });
  }

  if (confirmation !== "ELIMINAR") {
    return jsonResponse(400, { error: "Type ELIMINAR to confirm account deletion." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Account deletion function is missing Supabase server configuration.");
    return jsonResponse(500, { error: "Account deletion is not configured." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(tokenMatch[1]);
  if (userError || !userData.user) {
    return jsonResponse(401, { error: "The session is invalid or expired." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deletionError } = await adminClient.auth.admin.deleteUser(userData.user.id);
  if (deletionError) {
    console.error("Could not delete the authenticated account:", deletionError);
    return jsonResponse(500, { error: "The account could not be deleted." });
  }

  return jsonResponse(200, { message: "Account and associated profile data were deleted." });
});
