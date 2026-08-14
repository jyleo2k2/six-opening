import { cookies } from "next/headers";
import { ConnectedPrototype } from "../features/f0-home/ConnectedPrototype";
import { loadDevelopmentEnvironment } from "./api/dev-env";
import { findProfileById, SESSION_COOKIE } from "./api/supabase";
import { LoginGate } from "./LoginGate";

async function currentProfile() {
  loadDevelopmentEnvironment();
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value ?? process.env.DEMO_USER_ID;
  const id = raw ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    return await findProfileById(id);
  } catch (error) {
    console.error(JSON.stringify({ event: "page_session", result: "error", message: String(error) }));
    return null;
  }
}

export default async function Page() {
  const profile = await currentProfile();
  if (!profile) return <LoginGate />;
  return <ConnectedPrototype />;
}
