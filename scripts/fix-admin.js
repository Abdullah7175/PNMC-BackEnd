require('dotenv').config({ path: '.env' });
const { Client } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
  await c.connect();
  const r = await c.query(
    "SELECT id, email, is_active, is_mobile_user, password_hash FROM users WHERE email = $1",
    ['admin@pnmc.gov.pk'],
  );
  console.log('rows:', r.rows.length);
  if (r.rows[0]) {
    const u = r.rows[0];
    console.log({
      email: u.email,
      is_active: u.is_active,
      is_mobile_user: u.is_mobile_user,
      hash_prefix: u.password_hash?.slice(0, 25),
    });
    const ok = await bcrypt.compare('Admin@123', u.password_hash);
    console.log('password matches Admin@123:', ok);
    if (!ok) {
      const hash = await bcrypt.hash('Admin@123', 10);
      await c.query(
        'UPDATE users SET password_hash = $1, is_active = true, is_mobile_user = false WHERE email = $2',
        [hash, 'admin@pnmc.gov.pk'],
      );
      console.log('password reset to Admin@123');
    } else {
      // still ensure active + not mobile
      await c.query(
        'UPDATE users SET is_active = true, is_mobile_user = false WHERE email = $1',
        ['admin@pnmc.gov.pk'],
      );
      console.log('admin flags ensured (active, not mobile)');
    }
  } else {
    console.log('ADMIN USER MISSING — creating');
    const hash = await bcrypt.hash('Admin@123', 10);
    const role = await c.query("SELECT id FROM roles WHERE code = 'admin' LIMIT 1");
    if (!role.rows[0]) throw new Error('admin role missing — run npm run seed');
    const inserted = await c.query(
      `INSERT INTO users (id, email, password_hash, full_name, employee_id, is_active, is_mobile_user, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, false, NOW(), NOW())
       RETURNING id`,
      ['admin@pnmc.gov.pk', hash, 'System Administrator', 'ADM-2026-0001'],
    );
    await c.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [inserted.rows[0].id, role.rows[0].id],
    );
    console.log('admin created');
  }
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
