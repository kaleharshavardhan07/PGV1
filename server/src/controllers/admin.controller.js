import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as accounts from '../repositories/accounts.js';
import { signToken } from '../services/tokenService.js';
import { verifyPassword } from '../utils/password.js';
import { mailEnabled } from '../services/mailService.js';
import { FEATURES } from '../constants/index.js';
import { recordAudit } from '../services/auditService.js';

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await accounts.findAdminForLogin(email);
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) throw ApiError.unauthorized('Incorrect email or password');
  res.json({
    success: true,
    token: signToken({ sub: admin.id, role: 'admin' }),
    user: { id: admin.id, fullName: admin.name, email: admin.email, role: 'admin', pgId: null },
  });
});

export const overview = asyncHandler(async (_req, res) => {
  res.json({ success: true, overview: await accounts.adminOverview(), features: FEATURES, emailConfigured: mailEnabled() });
});

const shapePg = (p) => ({
  ...p,
  featuresAllowed: accounts.featureState(p).allowed,
  featuresEnabled: accounts.featureState(p).enabled,
  effectiveFeatures: accounts.featureState(p).effective,
});

export const listPgs = asyncHandler(async (req, res) => {
  const pgs = await accounts.adminListPgs({ search: req.query.search });
  res.json({ success: true, pgs: pgs.map(shapePg) });
});

export const updatePg = asyncHandler(async (req, res) => {
  const pg = await accounts.adminUpdatePg(req.params.id, req.body);
  if (!pg) throw ApiError.notFound('PG not found');
  recordAudit(pg.id, req.user.id, 'admin.pg_updated', 'PgAccount', pg.id, JSON.stringify(req.body));
  res.json({ success: true, pg: { ...pg, ...accounts.featureState(pg) } });
});
