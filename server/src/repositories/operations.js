import { query, one } from '../db/index.js';

// ---------- Complaints ----------
const COMPLAINT_SELECT = `
  SELECT c.id, c.pg_id, c.tenant_id, t.full_name AS tenant_name, c.category, c.description, c.room_number,
         c.status, c.remarks, c.submitted_at, c.resolved_at
    FROM complaints c JOIN tenants t ON t.id = c.tenant_id`;

export const listComplaints = ({ pgId, tenantId, status, category }) => {
  const params = [pgId];
  let where = 'WHERE c.pg_id = $1';
  if (tenantId) { params.push(tenantId); where += ` AND c.tenant_id = $${params.length}`; }
  if (status) { params.push(status); where += ` AND c.status = $${params.length}`; }
  if (category) { params.push(category); where += ` AND c.category = $${params.length}`; }
  return query(`${COMPLAINT_SELECT} ${where} ORDER BY c.submitted_at DESC`, params);
};

export const getComplaint = (pgId, id) => one(`${COMPLAINT_SELECT} WHERE c.id = $1 AND c.pg_id = $2`, [id, pgId]);

export const createComplaint = async ({ pgId, tenantId, category, description, roomNumber }) => {
  const row = await one(
    'INSERT INTO complaints (pg_id, tenant_id, category, description, room_number) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [pgId, tenantId, category, description, roomNumber]
  );
  return getComplaint(pgId, row.id);
};

export const updateComplaint = async (pgId, id, { status, remarks }) => {
  const row = await one(
    `UPDATE complaints SET status = $3, remarks = COALESCE($4, remarks),
            resolved_at = CASE WHEN $3 = 'Resolved' THEN now() ELSE NULL END
      WHERE id = $1 AND pg_id = $2 RETURNING id`,
    [id, pgId, status, remarks ?? null]
  );
  return row ? getComplaint(pgId, id) : null;
};

// ---------- Food ----------
export const listMenu = ({ pgId, day, mealType }) => {
  const params = [pgId];
  let where = 'WHERE pg_id = $1';
  if (day) { params.push(day); where += ` AND day = $${params.length}`; }
  if (mealType) { params.push(mealType); where += ` AND meal_type = $${params.length}`; }
  return query(`SELECT id, day, meal_type, items, timing FROM food_menu_items ${where}`, params);
};

export const upsertMenu = (pgId, { day, mealType, items, timing }) =>
  one(
    `INSERT INTO food_menu_items (pg_id, day, meal_type, items, timing) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (pg_id, day, meal_type) DO UPDATE SET items = EXCLUDED.items, timing = EXCLUDED.timing
     RETURNING id, day, meal_type, items, timing`,
    [pgId, day, mealType, items, timing ?? '']
  );

export const deleteMenu = (pgId, id) => one('DELETE FROM food_menu_items WHERE id = $1 AND pg_id = $2 RETURNING id, day, meal_type', [id, pgId]);

export const listOptOuts = (pgId, tenantId) =>
  query('SELECT id, tenant_id, date, meal_type FROM meal_opt_outs WHERE pg_id = $1 AND tenant_id = $2 ORDER BY date DESC', [pgId, tenantId]);

export const addOptOut = (pgId, tenantId, date, mealType) =>
  one(
    `INSERT INTO meal_opt_outs (pg_id, tenant_id, date, meal_type) VALUES ($1,$2,$3,$4)
     ON CONFLICT (tenant_id, date, meal_type) DO UPDATE SET date = EXCLUDED.date
     RETURNING id, tenant_id, date, meal_type`,
    [pgId, tenantId, date, mealType]
  );

export const removeOptOut = (pgId, tenantId, id) =>
  one('DELETE FROM meal_opt_outs WHERE id = $1 AND pg_id = $2 AND tenant_id = $3 RETURNING id', [id, pgId, tenantId]);

export const listRatings = ({ pgId, mealType }) => {
  const params = [pgId];
  let where = 'WHERE r.pg_id = $1';
  if (mealType) { params.push(mealType); where += ` AND r.meal_type = $${params.length}`; }
  return query(
    `SELECT r.id, r.tenant_id, t.full_name AS tenant_name, r.date, r.meal_type, r.rating, r.review
       FROM food_ratings r JOIN tenants t ON t.id = r.tenant_id ${where} ORDER BY r.date DESC`,
    params
  );
};

export const rateMeal = (pgId, tenantId, { date, mealType, rating, review }) =>
  one(
    `INSERT INTO food_ratings (pg_id, tenant_id, date, meal_type, rating, review) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (tenant_id, date, meal_type) DO UPDATE SET rating = EXCLUDED.rating, review = EXCLUDED.review
     RETURNING id, tenant_id, date, meal_type, rating, review`,
    [pgId, tenantId, date, mealType, rating, review ?? '']
  );

