#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

function readEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

async function listAllUsers(admin) {
  const users = []
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`listUsers failed on page ${page}: ${error.message}`)
    }
    const batch = data?.users ?? []
    users.push(...batch)
    if (batch.length < perPage) {
      break
    }
    page += 1
  }

  return users
}

async function main() {
  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')
  const ownerEmail = readEnv('OWNER_EMAIL').toLowerCase()
  const ownerPassword = readEnv('OWNER_PASSWORD')

  if (ownerPassword.length < 8) {
    throw new Error('OWNER_PASSWORD must be at least 8 characters.')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const existingUsers = await listAllUsers(admin)
  console.log(`Found ${existingUsers.length} existing auth users. Deleting all...`)

  for (const user of existingUsers) {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      throw new Error(`Failed deleting user ${user.email ?? user.id}: ${error.message}`)
    }
  }

  console.log('Creating owner user...')
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
  })
  if (createError || !created.user?.id) {
    throw new Error(`Failed creating owner user: ${createError?.message ?? 'Unknown error'}`)
  }

  const ownerUserId = created.user.id

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      user_id: ownerUserId,
      role: 'admin',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (profileError) {
    throw new Error(`Failed to upsert owner profile: ${profileError.message}`)
  }

  console.log(`Done. Owner admin is ${ownerEmail} (${ownerUserId}).`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
