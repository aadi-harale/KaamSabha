import { createClient } from '@supabase/supabase-js';

const allowedRoles = new Set(['customer', 'worker', 'admin']);

export async function POST(request: Request) {
  if (process.env.DEMO_ROLE_ACCESS !== 'true')
    return Response.json({ error: 'Demo role access is disabled.' }, { status: 403 });
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return Response.json({ error: 'Connected demo access is not configured.' }, { status: 503 });
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Authenticated demo session required.' }, { status: 401 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user?.is_anonymous)
    return Response.json({ error: 'Anonymous demo session required.' }, { status: 401 });
  const body = await request.json() as { role?: string; entityId?: string };
  if (!body.role || !allowedRoles.has(body.role))
    return Response.json({ error: 'Unknown demo role.' }, { status: 400 });
  let workerId: string | null = null;
  let customerId: string | null = null;
  if (body.role === 'worker') {
    if (!/^W(?:0[1-9]|1[0-2])$/.test(body.entityId ?? ''))
      return Response.json({ error: 'Choose one seeded worker.' }, { status: 400 });
    const { data } = await admin.from('workers').select('id').eq('member_number', body.entityId!).single();
    if (!data) return Response.json({ error: 'Seeded worker was not found.' }, { status: 404 });
    workerId = data.id;
  }
  if (body.role === 'customer') {
    const { data, error } = await admin.from('customers').insert({ display_name: 'Demo customer', default_locality: 'Kharadi' }).select('id').single();
    if (error || !data) return Response.json({ error: 'Demo customer could not be created.' }, { status: 500 });
    customerId = data.id;
  }
  const { error } = await admin.from('profiles').upsert({
    id: userData.user.id, app_role: body.role, worker_id: workerId, customer_id: customerId,
    locale: 'en', is_demo: true, updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ error: 'Demo role could not be bound.' }, { status: 500 });
  return Response.json({ ok: true, role: body.role });
}
