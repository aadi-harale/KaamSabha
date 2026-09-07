import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');

const passwords = {
  customer: process.env.DEMO_CUSTOMER_PASSWORD,
  worker: process.env.DEMO_WORKER_PASSWORD,
  admin: process.env.DEMO_ADMIN_PASSWORD,
};
if (Object.values(passwords).some((value) => !value))
  throw new Error('Set all three DEMO_*_PASSWORD values.');

const accounts = [
  ['customer01', 'customer', null],
  ['meena01', 'worker', 'W01'], ['ravi01', 'worker', 'W02'],
  ['salim01', 'worker', 'W03'], ['sunita01', 'worker', 'W04'],
  ['anil01', 'worker', 'W05'], ['farida01', 'worker', 'W06'],
  ['suresh01', 'worker', 'W07'], ['priya01', 'worker', 'W08'],
  ['rahul01', 'worker', 'W09'], ['asha01', 'worker', 'W10'],
  ['imran01', 'worker', 'W11'], ['neha01', 'worker', 'W12'],
  ['admin01', 'admin', null],
];
const admin = createClient(url, key, { auth: { persistSession: false } });
const customerId = '26089000-0000-4000-8000-000000000402';
await admin.from('customers').upsert({ id: customerId, display_name: 'Aadi', default_locality: 'Kharadi' });

for (const [userid, role, memberNumber] of accounts) {
  const email = `${userid}@auth.kaamsabha.local`;
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  let user = listed.users.find((item) => item.email === email);
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password: passwords[role],
      email_confirm: true,
      user_metadata: { userid, app_role: role },
    });
    if (created.error || !created.data.user) throw created.error;
    user = created.data.user;
  }
  let workerId = null;
  if (memberNumber) {
    const result = await admin.from('workers').select('id').eq('member_number', memberNumber).single();
    if (result.error) throw result.error;
    workerId = result.data.id;
  }
  const result = await admin.from('profiles').upsert({
    id: user.id,
    userid,
    app_role: role,
    customer_id: role === 'customer' ? customerId : null,
    worker_id: workerId,
    locale: 'en',
    is_demo: true,
  });
  if (result.error) throw result.error;
  console.log(`Prepared ${userid}`);
}
