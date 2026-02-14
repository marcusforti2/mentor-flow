import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// IDs to KEEP
const KEEP_USERS = [
  '178685ca-85bb-49ed-b5d2-72a7ada8bedb', // Master Admin
  'b4bdb6af-f5df-4562-a1f6-f5c61832c76b', // Erika
  '2bec8564-fa2c-4a26-9d81-c0ec4b3eeeef', // Ricardo
]

const KEEP_MEMBERSHIPS = [
  '1c8fcb7b-7c05-43c4-9ff8-202adc6321fb', // Master Admin
  '26cfdc99-a0c9-4472-a8d6-2ddc05779f52', // Erika Mentor
  'ed987bad-5049-4182-b65e-f386d27cec82', // Ricardo Mentee
]

const KEEP_ASSIGNMENT = 'e945a06e-1d9e-4786-a1b9-ee653db9d01d'
const SANDBOX_TENANT = 'b0000000-0000-0000-0000-000000000002'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const log: string[] = []
    const L = (msg: string) => { console.log(msg); log.push(msg) }

    // ========== STEP 1: Deep dependent tables ==========
    L('--- STEP 1: Deep dependent tables ---')

    // ranking_entries (depends on mentorados)
    const { count: re } = await admin.from('ranking_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('*', { count: 'exact', head: true })
    L(`ranking_entries deleted: all`)

    // trail_lessons -> trail_modules -> trails
    const { data: allTrails } = await admin.from('trails').select('id')
    if (allTrails?.length) {
      const trailIds = allTrails.map(t => t.id)
      const { data: allMods } = await admin.from('trail_modules').select('id').in('trail_id', trailIds)
      if (allMods?.length) {
        const modIds = allMods.map(m => m.id)
        await admin.from('trail_lessons').delete().in('module_id', modIds)
        L(`trail_lessons deleted for ${modIds.length} modules`)
      }
      await admin.from('trail_modules').delete().in('trail_id', trailIds)
      L(`trail_modules deleted for ${trailIds.length} trails`)
    }

    // trail_progress
    await admin.from('trail_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('trail_progress deleted: all')

    // mentee_profiles (keep only Ricardo's)
    await admin.from('mentee_profiles').delete().not('membership_id', 'in', `(${KEEP_MEMBERSHIPS.join(',')})`)
    L('mentee_profiles cleaned (kept Ricardo)')

    // mentor_profiles (keep only Erika's)
    await admin.from('mentor_profiles').delete().not('membership_id', 'in', `(${KEEP_MEMBERSHIPS.join(',')})`)
    L('mentor_profiles cleaned (kept Erika)')

    // mentor_mentee_assignments (keep only the LBV one)
    await admin.from('mentor_mentee_assignments').delete().neq('id', KEEP_ASSIGNMENT)
    L('mentor_mentee_assignments cleaned (kept Erika->Ricardo)')

    // meeting_attendees + meeting_recordings
    await admin.from('meeting_attendees').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('meeting_attendees deleted: all')
    await admin.from('meeting_recordings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('meeting_recordings deleted: all')

    // ========== STEP 2: Data tables ==========
    L('--- STEP 2: Data tables ---')

    // CRM interactions first (depends on prospections)
    await admin.from('crm_interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('crm_interactions deleted: all')

    await admin.from('crm_prospections').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('crm_prospections deleted: all')

    await admin.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('activity_logs deleted: all')

    await admin.from('meetings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('meetings deleted: all')

    await admin.from('trails').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('trails deleted: all')

    // Legacy tables
    // behavioral data depends on mentorados
    await admin.from('behavioral_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('behavioral_responses deleted: all')
    await admin.from('behavioral_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('behavioral_reports deleted: all')

    // community data depends on mentorados
    await admin.from('community_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('community_comments deleted: all')
    await admin.from('community_likes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('community_likes deleted: all')
    await admin.from('community_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('community_messages deleted: all')
    await admin.from('community_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('community_posts deleted: all')

    // mentorado dependent tables
    await admin.from('mentorado_business_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('mentorado_business_profiles deleted: all')
    await admin.from('mentorado_files').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('mentorado_files deleted: all')
    await admin.from('mentorado_invites').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('mentorado_invites deleted: all')
    await admin.from('certificates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('certificates deleted: all')
    await admin.from('call_analyses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('call_analyses deleted: all')
    await admin.from('call_transcripts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('call_transcripts deleted: all')
    await admin.from('ai_tool_usage').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('ai_tool_usage deleted: all')

    // email data depends on mentors
    await admin.from('email_flow_executions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('email_flow_executions deleted: all')
    await admin.from('email_flow_triggers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('email_flow_triggers deleted: all')
    await admin.from('email_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('email_logs deleted: all')
    await admin.from('email_automations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('email_automations deleted: all')
    await admin.from('email_flows').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('email_flows deleted: all')
    await admin.from('email_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('email_templates deleted: all')

    // badges, calendar, crm_leads, mentor_library depend on mentors
    await admin.from('badges').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('badges deleted: all')
    await admin.from('calendar_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('calendar_events deleted: all')
    await admin.from('crm_leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('crm_leads deleted: all')
    await admin.from('mentor_library').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('mentor_library deleted: all')
    await admin.from('behavioral_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('behavioral_questions deleted: all')

    // Now safe to delete mentorados and mentors
    await admin.from('mentorados').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('mentorados (legacy) deleted: all')
    await admin.from('mentors').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('mentors (legacy) deleted: all')

    // Other cleanup tables
    await admin.from('otp_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('otp_codes deleted: all')
    await admin.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('audit_logs deleted: all')
    await admin.from('system_fingerprints').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('system_fingerprints deleted: all')

    // impersonation_logs, invites
    await admin.from('impersonation_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('impersonation_logs deleted: all')
    await admin.from('invites').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    L('invites deleted: all')

    // user_roles (legacy) - table dropped, skip

    // ========== STEP 3: Sandbox memberships ==========
    L('--- STEP 3: Sandbox memberships ---')
    await admin.from('memberships').delete().eq('tenant_id', SANDBOX_TENANT)
    L('sandbox memberships deleted')

    // Delete any other memberships not in keep list
    await admin.from('memberships').delete().not('id', 'in', `(${KEEP_MEMBERSHIPS.join(',')})`)
    L('extra memberships deleted')

    // ========== STEP 4: Profiles & Auth Users ==========
    L('--- STEP 4: Profiles & Auth Users ---')

    // Delete profiles not in keep list
    await admin.from('profiles').delete().not('user_id', 'in', `(${KEEP_USERS.join(',')})`)
    L('extra profiles deleted')

    // Delete auth users not in keep list
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const usersToDelete = authData?.users?.filter(u => !KEEP_USERS.includes(u.id)) || []
    L(`auth users to delete: ${usersToDelete.length}`)

    for (const user of usersToDelete) {
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) {
        L(`  WARN: could not delete auth user ${user.email}: ${error.message}`)
      } else {
        L(`  deleted auth user: ${user.email}`)
      }
    }

    // ========== STEP 5: Rename ==========
    L('--- STEP 5: Rename Ricardo ---')
    await admin.from('profiles').update({ full_name: 'Ricardo Mentor' }).eq('user_id', '2bec8564-fa2c-4a26-9d81-c0ec4b3eeeef')
    await admin.auth.admin.updateUserById('2bec8564-fa2c-4a26-9d81-c0ec4b3eeeef', {
      user_metadata: { full_name: 'Ricardo Mentor' }
    })
    L('Ricardo renamed OK')

    // ========== VERIFICATION ==========
    L('--- VERIFICATION ---')
    const { data: finalProfiles } = await admin.from('profiles').select('user_id, full_name, email')
    L(`Profiles remaining: ${finalProfiles?.length} → ${JSON.stringify(finalProfiles)}`)

    const { data: finalMemberships } = await admin.from('memberships').select('id, user_id, role, tenant_id')
    L(`Memberships remaining: ${finalMemberships?.length} → ${JSON.stringify(finalMemberships)}`)

    const { data: finalAssignments } = await admin.from('mentor_mentee_assignments').select('id, mentor_membership_id, mentee_membership_id')
    L(`Assignments remaining: ${finalAssignments?.length} → ${JSON.stringify(finalAssignments)}`)

    return new Response(JSON.stringify({
      success: true,
      profiles_remaining: finalProfiles?.length,
      memberships_remaining: finalMemberships?.length,
      assignments_remaining: finalAssignments?.length,
      auth_users_deleted: usersToDelete.length,
      log,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e: any) {
    console.error('[cleanup-system] ERROR:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
