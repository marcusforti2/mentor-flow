import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const T = 'b0000000-0000-0000-0000-000000000002'
const r = (a:number,b:number) => Math.floor(Math.random()*(b-a+1))+a
const ago = (d:number) => { const x=new Date(); x.setDate(x.getDate()-d); return x.toISOString() }
const fut = (d:number,h:number) => { const x=new Date(); x.setDate(x.getDate()+d); x.setHours(h,0,0,0); return x.toISOString() }

async function getUser(a:any, email:string, name:string) {
  const {data,error} = await a.auth.admin.createUser({email,password:'Demo2026!',email_confirm:true,user_metadata:{full_name:name}})
  if (!error) return data.user.id
  const {data:{users}} = await a.auth.admin.listUsers()
  return users?.find((u:any)=>u.email===email)?.id
}

Deno.serve(async (req) => {
  if (req.method==='OPTIONS') return new Response('ok',{headers:H})
  try {
    const a = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{autoRefreshToken:false,persistSession:false}})
    
    // Clean
    const {data:old} = await a.from('memberships').select('id,user_id').eq('tenant_id',T)
    if (old?.length) {
      const ids=old.map(m=>m.id), uids=old.map(m=>m.user_id)
      await a.from('crm_prospections').delete().eq('tenant_id',T)
      await a.from('activity_logs').delete().eq('tenant_id',T)
      await a.from('meetings').delete().eq('tenant_id',T)
      await a.from('mentor_mentee_assignments').delete().eq('tenant_id',T)
      await a.from('mentee_profiles').delete().in('membership_id',ids)
      await a.from('mentor_profiles').delete().in('membership_id',ids)
      const {data:tr} = await a.from('trails').select('id').eq('tenant_id',T)
      if (tr?.length) {
        const tids=tr.map(t=>t.id)
        const {data:ms} = await a.from('trail_modules').select('id').in('trail_id',tids)
        if (ms?.length) await a.from('trail_lessons').delete().in('module_id',ms.map(m=>m.id))
        await a.from('trail_modules').delete().in('trail_id',tids)
        await a.from('trails').delete().eq('tenant_id',T)
      }
      await a.from('mentorados').delete().in('user_id',uids)
      await a.from('mentors').delete().in('user_id',uids)
      await a.from('memberships').delete().eq('tenant_id',T)
    }

    // Mentor
    const mu = await getUser(a,'mentor.demo@lbvpreview.com','Ricardo Mentor Demo')
    if(!mu) throw new Error('Cannot create mentor user')
    await a.from('profiles').upsert({user_id:mu,full_name:'Ricardo Mentor Demo',email:'mentor.demo@lbvpreview.com'},{onConflict:'user_id'})
    const {data:mm} = await a.from('memberships').insert({user_id:mu,tenant_id:T,role:'mentor',status:'active'}).select('id').single()
    await a.from('mentor_profiles').insert({membership_id:mm!.id,business_name:'Atlas Sales (Demo)',bio:'Mentor B2B',specialties:['Vendas','CRM']})
    const {data:lm} = await a.from('mentors').insert({user_id:mu,business_name:'Atlas Sales (Demo)'}).select('id').single()

    // Mentees
    const names = ['Ana Silva','Bruno Costa','Carla Mendes','Diego Ferreira','Elena Santos','Felipe Lima','Gabriela Rocha','Henrique Dias','Isabela Martins','João Oliveira']
    const bizs = ['Consultoria AS','BC Marketing','CM Design','DF Tech','ES Coaching','FL Vendas','GR Academy','HD Solutions','IM Consultoria','JO Services']
    let ct=0
    for (let i=0;i<10;i++) {
      const em=names[i].toLowerCase().replace(' ','.')+'.demo@lbvpreview.com'
      const uid = await getUser(a,em,names[i])
      if(!uid) continue
      await a.from('profiles').upsert({user_id:uid,full_name:names[i],email:em},{onConflict:'user_id'})
      const j=ago((i+1)*15)
      const {data:mem} = await a.from('memberships').insert({user_id:uid,tenant_id:T,role:'mentee',status:'active'}).select('id').single()
      if(!mem) continue
      await a.from('mentee_profiles').insert({membership_id:mem.id,business_name:bizs[i],onboarding_completed:true,joined_at:j})
      await a.from('mentor_mentee_assignments').insert({mentor_membership_id:mm!.id,mentee_membership_id:mem.id,tenant_id:T,status:'active',assigned_at:j,created_by_membership_id:mm!.id})
      const {data:lg} = await a.from('mentorados').insert({user_id:uid,mentor_id:lm!.id,status:'active',onboarding_completed:true,joined_at:j}).select('id').single()
      if(lg) await a.from('ranking_entries').insert({mentorado_id:lg.id,points:r(50,500),period_type:'monthly',period_start:new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0],period_end:new Date(new Date().getFullYear(),new Date().getMonth()+1,0).toISOString().split('T')[0]})
      // CRM
      const sts=['novo','contato_feito','proposta_enviada','negociacao','fechado_ganho']
      for(let k=0;k<r(3,6);k++) await a.from('crm_prospections').insert({membership_id:mem.id,tenant_id:T,contact_name:`Lead ${k+1} de ${names[i]}`,company:`Empresa ${String.fromCharCode(65+k)}`,status:sts[r(0,4)],temperature:['quente','morno','frio'][r(0,2)],points:r(5,25),created_at:ago(r(1,45))})
      // Activity
      const at=['trail_started','lesson_completed','prospection_added','crm_updated','ai_tool_used']
      for(let k=0;k<r(3,8);k++) await a.from('activity_logs').insert({membership_id:mem.id,tenant_id:T,action_type:at[r(0,4)],action_description:`${names[i]} atividade`,points_earned:r(1,10),created_at:ago(r(0,20))})
      ct++
    }

    // Trails
    const tData=[
      {title:'Fundamentos de Prospecção B2B',desc:'Técnicas essenciais de prospecção B2B.',img:'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',feat:true,mods:[{t:'Introdução',ls:['O que é prospecção?','Perfil do Cliente Ideal','Ferramentas de pesquisa']},{t:'Técnicas',ls:['Cold calling','Social selling','Email de prospecção']}]},
      {title:'Negociação e Fechamento',desc:'Negociação avançada e contorno de objeções.',img:'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80',feat:false,mods:[{t:'Psicologia',ls:['Gatilhos mentais','Rapport']},{t:'Objeções',ls:['7 objeções comuns','SPIN Selling','Fechamento']}]},
    ]
    for(let i=0;i<tData.length;i++){
      const td=tData[i]
      const {data:tr} = await a.from('trails').insert({mentor_id:lm!.id,tenant_id:T,creator_membership_id:mm!.id,title:td.title,description:td.desc,thumbnail_url:td.img,is_published:true,is_featured:td.feat,order_index:i}).select('id').single()
      if(!tr) continue
      for(let j=0;j<td.mods.length;j++){
        const {data:mo} = await a.from('trail_modules').insert({trail_id:tr.id,title:td.mods[j].t,order_index:j}).select('id').single()
        if(!mo) continue
        for(let k=0;k<td.mods[j].ls.length;k++) await a.from('trail_lessons').insert({module_id:mo.id,title:td.mods[j].ls[k],content_type:'video',content_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',duration_minutes:r(10,30),order_index:k})
      }
    }

    // Meetings
    const mt=[{t:'Mentoria em Grupo',d:2,h:10},{t:'Revisão Pipeline',d:4,h:14},{t:'Workshop LinkedIn',d:7,h:9},{t:'Encontro Semanal',d:9,h:15},{t:'Masterclass Fechamento',d:14,h:10},{t:'Hotset 1:1',d:16,h:11},{t:'Live Q&A',d:21,h:19},{t:'Sprint Prospecção',d:25,h:10},{t:'Kick-off (passado)',d:-15,h:10},{t:'Review (passado)',d:-7,h:14},{t:'Workshop (passado)',d:-3,h:9},{t:'Mentoria (passado)',d:-1,h:16}]
    for(const m of mt) await a.from('meetings').insert({mentor_id:lm!.id,tenant_id:T,title:m.t,scheduled_at:fut(m.d,m.h),duration_minutes:60,meeting_url:'https://meet.google.com/demo',status:m.d<0?'completed':'scheduled'})

    return new Response(JSON.stringify({success:true,mentees_created:ct,trails_created:2,meetings_created:mt.length,mentor_membership_id:mm!.id}),{headers:{...H,'Content-Type':'application/json'}})
  } catch(e:any) {
    console.error('[seed]',e)
    return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...H,'Content-Type':'application/json'}})
  }
})
