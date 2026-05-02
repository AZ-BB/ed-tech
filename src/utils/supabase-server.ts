"use server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "@/database.types"

export async function createSupabaseServerClient() {
  // Create server client that can access cookies
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // This is ignored as the middleware will refresh the user sessions in case not logged in.
          }
        },
      },
    }
  )
}


export async function createSupabaseSecretClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // no-op for admin client
        },
      },
    }
  )
}