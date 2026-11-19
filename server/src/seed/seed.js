// Demo data. `npm run seed` loads it once; `npm run seed:reset` wipes and reloads.
import { connectDB, disconnectDB, query, one, pool } from '../db/index.js';
import { hashPassword } from '../utils/password.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import logger from '../utils/logger.js';
import * as seed from './data.js';

const isoDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().split('T')[0];
const month = (back = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Smallest valid PDF / PNG so the demo documents open in a viewer.
const demoPdf = (text) =>
  Buffer.from(
    `%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
      `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n` +
      `4 0 obj<</Length ${text.length + 38}>>stream\nBT /F1 14 Tf 20 60 Td (${text}) Tj ET\nendstream endobj\n` +
      `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R/Size 6>>\n%%EOF`
  );
const DEMO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const TABLES = [
  'audit_logs', 'notification_logs', 'notification_prefs', 'notifications', 'food_ratings', 'meal_opt_outs',
  'food_menu_items', 'complaints', 'enquiries', 'documents', 'invoices', 'expenses', 'tenants', 'beds', 'rooms',
  'workspace_settings', 'managers', 'platform_admins', 'pg_accounts',
];

async function seedAll() {
  const reset = process.argv.includes('--reset');
  const exists = await one('SELECT 1 AS x FROM pg_accounts WHERE pg_username = $1', [seed.owner.pgUsername]);
  if (exists && !reset) return logger.info('Seed data already present. Use `npm run seed:reset` to re-seed.');
  if (reset) {
    await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
    logger.info('Cleared all tables');
  }

  const hash = await hashPassword(seed.DEMO_PASSWORD);

  const makePg = async (o, settings) => {
    const pg = await one(
      `INSERT INTO pg_accounts (pg_name, pg_username, description, address, area, city, state, pin_code, latitude, longitude, pg_type, owner_name, owner_email, owner_mobile, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [o.pgName, o.pgUsername, o.description, o.address, o.area, o.city, o.state, o.pinCode, o.latitude, o.longitude, o.pgType, o.ownerName, o.ownerEmail, o.ownerMobile, hash]
    );
    await query(
      `INSERT INTO workspace_settings (pg_id, name, address, city, contact_email, contact_phone, owner_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [pg.id, settings.name, settings.address, settings.city, settings.contactEmail, settings.contactPhone, settings.ownerName]
    );
    return pg.id;
  };

  const pgId = await makePg(seed.owner, seed.settings);
  const pg2 = await makePg(seed.secondOwner, {
    name: seed.secondOwner.pgName, address: seed.secondOwner.address, city: seed.secondOwner.city,
    contactEmail: seed.secondOwner.ownerEmail, contactPhone: seed.secondOwner.ownerMobile, ownerName: seed.secondOwner.ownerName,
  });

  await query('INSERT INTO managers (pg_id, full_name, email, mobile, password_hash, permissions) VALUES ($1,$2,$3,$4,$5,$6)', [
    pgId, seed.manager.fullName, seed.manager.email, seed.manager.mobile, hash,
    JSON.stringify({ tenants: true, rooms: false, food: true, expenses: true, billing: false, documents: true, complaints: true, exports: false }),
  ]);
  await query('INSERT INTO platform_admins (name, email, password_hash) VALUES ($1,$2,$3)', ['Platform Admin', 'admin@aapkapg.in', hash]);

  // ---------- Rooms + beds ----------
  const roomIds = new Map();
  const bedIds = new Map(); // "101-1" -> bed id
  for (const r of seed.rooms) {
    const room = await one(
      'INSERT INTO rooms (pg_id, room_number, floor, sharing_type, attached_bathroom) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [pgId, r.roomNumber, r.floor, r.sharingType, r.attachedBathroom]
    );
    roomIds.set(r.roomNumber, room.id);
    for (let n = 1; n <= r.beds; n++) {
      const bed = await one('INSERT INTO beds (pg_id, room_id, bed_number, rent, vacant_since) VALUES ($1,$2,$3,$4,$5) RETURNING id', [
        pgId, room.id, n, r.rent, isoDay(-20),
      ]);
      bedIds.set(`${r.roomNumber}-${n}`, bed.id);
    }
  }
  const r2 = await one('INSERT INTO rooms (pg_id, room_number, floor, sharing_type) VALUES ($1,$2,$3,$4) RETURNING id', [pg2, 'A1', 0, 2]);
  for (const n of [1, 2]) await query('INSERT INTO beds (pg_id, room_id, bed_number, rent) VALUES ($1,$2,$3,$4)', [pg2, r2.id, n, 8000]);

  // ---------- Tenants (owner-created accounts: mobile + password) ----------
  const tenantIds = new Map();
  for (const t of seed.tenants) {
    const bedId = bedIds.get(`${t.room}-${t.bedNumber}`);
    const row = await one(
      `INSERT INTO tenants (pg_id, bed_id, full_name, mobile, email, emergency_contact, password_hash, created_by,
         monthly_rent, security_deposit, joining_date, police_verification, status, notice_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        pgId, bedId, t.fullName, t.mobile, t.email, t.emergencyContact, hash, pgId, t.monthlyRent, t.securityDeposit,
        isoDay(-t.joiningDaysAgo), t.policeVerification, t.status, t.status === 'Notice Period' ? isoDay(-6) : null,
      ]
    );
    tenantIds.set(t.fullName, row.id);
    await query('UPDATE beds SET vacant_since = NULL WHERE id = $1', [bedId]);
    await query('INSERT INTO notification_prefs (tenant_id, pg_id) VALUES ($1,$2)', [row.id, pgId]);
  }

  // ---------- Documents ----------
  const addDoc = (tenantName, type, title, fileName, mimeType, data) =>
    query(
      `INSERT INTO documents (pg_id, tenant_id, type, title, file_name, mime_type, size, uploaded_by_id, uploaded_by_role, uploaded_by_name, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'owner',$9,$10)`,
      [pgId, tenantIds.get(tenantName), type, title, fileName, mimeType, data.length, pgId, seed.owner.ownerName, data]
    );
  await addDoc('Amit Kumar', 'ID Proof', 'Aadhaar card', 'aadhaar-amit.pdf', 'application/pdf', demoPdf('Aadhaar - Amit Kumar (demo)'));
  await addDoc('Amit Kumar', 'Rental Agreement', 'Rental agreement 2026', 'agreement-amit.pdf', 'application/pdf', demoPdf('Rental agreement - Amit Kumar (demo)'));
  await addDoc('Amit Kumar', 'Photograph', 'Passport photo', 'amit.png', 'image/png', DEMO_PNG);
  await addDoc('Sneha Patil', 'ID Proof', 'PAN card', 'pan-sneha.pdf', 'application/pdf', demoPdf('PAN - Sneha Patil (demo)'));

  // ---------- Expenses ----------
  const expense = (title, category, amount, daysAgo, status, extra = {}) =>
    query(
      `INSERT INTO expenses (pg_id, title, description, amount, expense_date, category, status, visible_to_tenants, proof_required, created_by_id, created_by_role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'owner')`,
      [pgId, title, extra.description ?? '', amount, isoDay(-daysAgo), category, status, extra.visible ?? true, extra.proof ?? false, pgId]
    );
  await expense('Water tank cleaning', 'Maintenance', 3500, 3, 'Pending', { description: 'Quarterly cleaning of the rooftop tank.', proof: true });
  await expense('Common-area electricity bill', 'Utilities', 18400, 6, 'Settled', { description: 'Corridors, lift and lighting.' });
  await expense('Kitchen groceries', 'Groceries', 26250, 9, 'Settled');
  await expense('Wi-Fi router replacement', 'Repairs', 4800, 12, 'Pending', { description: 'Floor 2 router replaced.', proof: true });
  await expense('Staff salaries (internal)', 'Salaries', 42000, 15, 'Settled', { visible: false });

  // ---------- Invoices (records only) ----------
  const period = month(0);
  let n = 0;
  for (const t of seed.tenants.slice(0, 6)) {
    n += 1;
    const status = n <= 2 ? 'Paid' : n === 6 ? 'Draft' : 'Issued';
    await query(
      `INSERT INTO invoices (pg_id, tenant_id, number, billing_period, description, amount, due_date, status, paid_on, payment_note, created_by_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        pgId, tenantIds.get(t.fullName), `INV-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`, period, `Rent for ${period}`,
        t.monthlyRent, isoDay(n === 4 ? -6 : 5), status, status === 'Paid' ? isoDay(-2) : null, status === 'Paid' ? 'Received in cash' : '', pgId,
      ]
    );
  }

  // ---------- Enquiries from Find PG ----------
  await query(
    `INSERT INTO enquiries (pg_id, name, mobile, email, message) VALUES ($1,'Rahul Sharma','9123450001','rahul@example.com','Is a double-sharing bed free from next week?'), ($1,'Manish Tiwari','9123450002','','Looking for a single room near Baner.')`,
    [pgId]
  );

  // ---------- Complaints ----------
  for (const c of seed.complaints) {
    const submitted = c.hoursAgo ? new Date(Date.now() - c.hoursAgo * 3600000) : new Date(Date.now() - c.daysAgo * 86400000);
    await query(
      `INSERT INTO complaints (pg_id, tenant_id, category, description, room_number, status, remarks, submitted_at, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [pgId, tenantIds.get(c.tenant), c.category, c.description, c.roomNumber, c.status, c.remarks ?? '', submitted, c.status === 'Resolved' ? new Date(submitted.getTime() + 86400000) : null]
    );
  }

  // ---------- Food ----------
  for (const [day, meals] of Object.entries(seed.menuData)) {
    for (const mealType of ['Breakfast', 'Lunch', 'Dinner']) {
      await query('INSERT INTO food_menu_items (pg_id, day, meal_type, items, timing) VALUES ($1,$2,$3,$4,$5)', [
        pgId, day, mealType, meals[mealType.toLowerCase()], seed.mealTimings[mealType],
      ]);
    }
  }
  const rating = (name, daysAgo, mealType, stars, review = '') =>
    query('INSERT INTO food_ratings (pg_id, tenant_id, date, meal_type, rating, review) VALUES ($1,$2,$3,$4,$5,$6)', [pgId, tenantIds.get(name), isoDay(-daysAgo), mealType, stars, review]);
  await rating('Amit Kumar', 1, 'Lunch', 4, 'Rajma was great.');
  await rating('Rohan Verma', 2, 'Dinner', 5);
  await rating('Priya Nair', 1, 'Breakfast', 3);
  await query('INSERT INTO meal_opt_outs (pg_id, tenant_id, date, meal_type) VALUES ($1,$2,$3,$4), ($1,$5,$3,$6)', [
    pgId, tenantIds.get('Amit Kumar'), isoDay(0), 'Dinner', tenantIds.get('Rohan Verma'), 'Lunch',
  ]);

  await runNotificationEngine(pgId);

  logger.info('Seed complete! Demo credentials (password: demo1234):');
  logger.info(`  Owner   : username ${seed.owner.pgUsername}  (or ${seed.owner.ownerEmail})`);
  logger.info(`  Manager : ${seed.manager.email}`);
  logger.info(`  Tenant  : mobile ${seed.tenants[0].mobile} (Amit Kumar)`);
  logger.info('  Admin   : admin@aapkapg.in');
}

connectDB()
  .then(seedAll)
  .then(() => disconnectDB())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error(err.stack || err.message);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
