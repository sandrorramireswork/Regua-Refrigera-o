import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  status: "active" | "confirmed" | "pending" | "blocked";
  createdAt: string;
  lastSignInAt: string | null;
}

function displayName(metadata: Record<string, unknown>, email: string): string {
  const candidates = [metadata["full_name"], metadata["name"], metadata["display_name"]];
  const name = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  if (typeof name === "string") return name.trim();
  return email.split("@")[0]?.replace(/[._-]+/g, " ") || "Colaborador";
}

export const getCollaborators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Collaborator[]> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      throw new Error("Acesso restrito ao administrador.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error("Não foi possível carregar os colaboradores.");

    const now = Date.now();
    return data.users
      .map((user) => {
        const email = user.email ?? "E-mail não informado";
        const bannedUntil = user.banned_until ? Date.parse(user.banned_until) : 0;
        const confirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
        const status: Collaborator["status"] =
          bannedUntil > now
            ? "blocked"
            : !confirmed
              ? "pending"
              : user.last_sign_in_at
                ? "active"
                : "confirmed";

        return {
          id: user.id,
          name: displayName(user.user_metadata ?? {}, email),
          email,
          status,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
        };
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });