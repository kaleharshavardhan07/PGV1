import bcrypt from 'bcryptjs';
import mongoose, { connectDB } from '../config/db.js';
import {
  PgAccount,
  Workspace,
  Manager,
  TenantUser,
  Room,
  Bed,
  Tenant,
  Membership,
  Payment,
  MeterReading,
  Complaint,
  FoodMenuItem,
  FoodRating,
  MealOptOut,
  Notification,
  NotificationLog,
  NotificationPref,
  AdmissionRequest,
  PendingRegistration,
} from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import logger from '../utils/logger.js';
import * as seed from './data.js';

const todayISO = () => new Date().toISOString().split('T')[0];
const daysAgoISO = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysAheadISO = (n) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];
const daysAgoDate = (n) => daysAgoISO(n).split('T')[0];

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const previousMonth = (back = 1) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const dayInMonth = (yyyyMm, day) => `${yyyyMm}-${String(day).padStart(2, '0')}`;

const ALL_MODELS = [
  PgAccount, Workspace, Manager, TenantUser, Room, Bed, Tenant, Membership, Payment,
  MeterReading, Complaint, FoodMenuItem, FoodRating, MealOptOut, Notification,
  NotificationLog, NotificationPref, AdmissionRequest, PendingRegistration,
];

const reset = async () => {
  for (const model of ALL_MODELS) await model.deleteMany({});
  logger.info('Cleared all collections');
};

async function seedAll() {
  const resetArg = process.argv.includes('--reset');
  const exists = await PgAccount.exists({ pgUsername: seed.owner.pgUsername });

  if (exists && !resetArg) {
    logger.info('Seed data already present. Use `npm run seed:reset` to re-seed.');
    return;
  }
  if (resetArg) await reset();

  const hash = await bcrypt.hash(seed.DEMO_PASSWORD, 10);

  // ---------- Owner + PG account ----------
  const ownerAccount = await PgAccount.create({ ...seed.owner, passwordHash: hash, isActive: true, isDiscoverable: true, showAvailableBeds: true });
  const secondOwner = await PgAccount.create({ ...seed.secondOwner, passwordHash: hash, isActive: true, isDiscoverable: true, showAvailableBeds: true });

  // ---------- Workspaces (singletons: settings + reminder schedule + subscription) ----------
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 7);
  const periodEndISO = periodEnd.toISOString().split('T')[0];
  const startedAt = new Date(periodEnd);
  startedAt.setMonth(startedAt.getMonth() - 1);
  const startedAtISO = startedAt.toISOString().split('T')[0];

  await Workspace.create({
    pg: ownerAccount._id,
    settings: seed.settings,
    reminderSchedule: seed.reminderSchedule,
    subscription: {
      planId: 'growth',
      status: 'Active',
      cycle: 'monthly',
      startedAt: startedAtISO,
      currentPeriodEnd: periodEndISO,
      amountPaid: 1998,
      autoRenew: true,
      invoices: [
        { number: 'APG-2026-0001', date: startedAtISO, planId: 'growth', cycle: 'monthly', amount: 999, status: 'Paid', method: 'UPI', paidAt: `${startedAtISO}T10:00:00`, reference: 'SIM/UPI/8812' },
        { number: 'APG-2026-0002', date: todayISO(), planId: 'growth', cycle: 'monthly', amount: 999, status: 'Paid', method: 'UPI', paidAt: `${todayISO()}T10:00:00`, reference: 'SIM/UPI/9054' },
      ],
    },
  });

  await Workspace.create({
    pg: secondOwner._id,
    settings: { name: seed.secondOwner.pgName, city: seed.secondOwner.city, ownerName: seed.secondOwner.ownerName, electricityRate: 9, foodCharge: 1200, timezone: 'Asia/Kolkata', channels: { whatsapp: true, sms: true, email: true } },
    reminderSchedule: seed.reminderSchedule,
    subscription: { planId: 'starter', status: 'Active', cycle: 'monthly', startedAt: startedAtISO, currentPeriodEnd: periodEndISO, amountPaid: 499, autoRenew: true, invoices: [] },
  });

  // ---------- Manager ----------
  await Manager.create({ ...seed.manager, pg: ownerAccount._id, passwordHash: hash });

  // ---------- Rooms + beds ----------
  const roomDocs = [];
  for (const r of seed.rooms) {
    const room = await Room.create({ pg: ownerAccount._id, ...r });
    roomDocs.push(room);
    const beds = [];
    for (let i = 1; i <= r.totalBeds; i++) beds.push({ pg: ownerAccount._id, room: room._id, bedNumber: i, status: 'vacant' });
    await Bed.insertMany(beds);
  }
  const roomByNumber = new Map(roomDocs.map((r) => [r.roomNumber, r]));

  // ---------- Tenants + tenant users + memberships + prefs ----------
  const tenantByKey = new Map(); // key: roomNo-bedNumber -> Tenant
  const tenantByName = new Map();
  const curM = currentMonth();
  const lastM = previousMonth(1);
  const foodCharge = seed.settings.foodCharge;
  const rate = seed.settings.electricityRate;

  const tenantUsers = [];
  for (const t of seed.tenants) {
    const joiningDate = daysAgoDate(t.joiningDaysAgo);
    const room = roomByNumber.get(t.room);
    const tenant = await Tenant.create({
      pg: ownerAccount._id,
      fullName: t.fullName,
      mobile: t.mobile,
      email: t.email,
      emergencyContact: t.emergencyContact,
      room: room._id,
      bedNumber: t.bedNumber,
      monthlyRent: t.monthlyRent,
      securityDeposit: t.securityDeposit,
      joiningDate,
      policeVerification: t.policeVerification,
      status: t.status,
      noticeDate: t.status === 'Notice Period' ? daysAgoDate(6) : undefined,
    });

    const user = await TenantUser.create({ fullName: t.fullName, mobile: t.mobile, email: t.email, passwordHash: hash });

    const bed = await Bed.findOneAndUpdate(
      { room: room._id, bedNumber: t.bedNumber },
      { $set: { status: t.status === 'Notice Period' ? 'notice' : 'occupied', tenant: tenant._id } }
    );

    await Membership.create({
      pg: ownerAccount._id,
      tenantUser: user._id,
      tenant: tenant._id,
      room: room._id,
      bed: bed._id,
      status: 'Active',
      joiningDate,
      monthlyRent: t.monthlyRent,
      securityDeposit: t.securityDeposit,
      approvedBy: seed.owner.ownerName,
      approvedAt: `${joiningDate}T09:00:00`,
    });

    await NotificationPref.create({ pg: ownerAccount._id, tenant: tenant._id, whatsapp: true, sms: true, email: true });

    tenantByKey.set(`${t.room}-${t.bedNumber}`, tenant);
    tenantByName.set(t.fullName, tenant);
    tenantUsers.push(user);

    // ---------- Payments per tenant ----------
    const total = t.monthlyRent + foodCharge;
    await Payment.create([
      { pg: ownerAccount._id, tenant: tenant._id, type: 'Deposit', month: joiningDate.slice(0, 7), amount: t.securityDeposit, method: 'UPI', status: 'Paid', paidAt: `${joiningDate}T10:00:00`, dueDate: joiningDate },
      { pg: ownerAccount._id, tenant: tenant._id, type: 'Rent', month: lastM, amount: total, method: 'UPI', status: 'Paid', paidAt: `${dayInMonth(lastM, 4)}T11:30:00`, dueDate: dayInMonth(lastM, 5) },
      { pg: ownerAccount._id, tenant: tenant._id, type: 'Rent', month: curM, amount: total, method: 'UPI', status: 'Pending', dueDate: dayInMonth(curM, 5) },
    ]);
  }

  // Override a few current-month rent statuses to show the full lifecycle.
  const paidIdx = ['Amit Kumar', 'Priya Nair'];
  const overdueIdx = ['Vikram Singh'];
  for (const name of paidIdx) {
    await Payment.updateOne({ tenant: tenantByName.get(name)._id, month: curM, type: 'Rent' }, { $set: { status: 'Paid', paidAt: daysAgoISO(2) } });
  }
  for (const name of overdueIdx) {
    await Payment.updateOne({ tenant: tenantByName.get(name)._id, month: curM, type: 'Rent' }, { $set: { status: 'Overdue', dueDate: daysAgoDate(10) } });
  }

  // ---------- Meter readings (last month published, current month draft) ----------
  const readingSpecs = [
    { room: '101', lastPrev: 4186, lastUnits: 214, curUnits: 232 },
    { room: '102', lastPrev: 3021, lastUnits: 168, curUnits: 190 },
    { room: '103', lastPrev: 2210, lastUnits: 141, curUnits: 128 },
    { room: '104', lastPrev: 5544, lastUnits: 305, curUnits: 274 },
    { room: '201', lastPrev: 1875, lastUnits: 122, curUnits: 118 },
    { room: '202', lastPrev: 2688, lastUnits: 176, curUnits: 201 },
    { room: '301', lastPrev: 4102, lastUnits: 251, curUnits: 238 },
  ];

  const occupantsForRoom = (roomNumber) => seed.tenants.filter((t) => t.room === roomNumber).length;

  for (const spec of readingSpecs) {
    const room = roomByNumber.get(spec.room);
    const occupants = occupantsForRoom(spec.room);
    const lastTotal = spec.lastUnits * rate;
    const lastReading = {
      pg: ownerAccount._id,
      room: room._id,
      month: lastM,
      previousReading: spec.lastPrev,
      currentReading: spec.lastPrev + spec.lastUnits,
      units: spec.lastUnits,
      ratePerUnit: rate,
      totalAmount: lastTotal,
      occupants,
      perTenantAmount: Math.round(lastTotal / Math.max(1, occupants)),
      recordedAt: `${dayInMonth(lastM, 28)}T10:00:00`,
      published: true,
    };
    await MeterReading.create(lastReading);

    const curTotal = spec.curUnits * rate;
    await MeterReading.create({
      pg: ownerAccount._id,
      room: room._id,
      month: curM,
      previousReading: lastReading.currentReading,
      currentReading: lastReading.currentReading + spec.curUnits,
      units: spec.curUnits,
      ratePerUnit: rate,
      totalAmount: curTotal,
      occupants,
      perTenantAmount: Math.round(curTotal / Math.max(1, occupants)),
      recordedAt: daysAgoISO(2),
      published: false,
    });

    // Electricity payments for last month (published): paid for all but Sneha (t-003).
    for (const t of seed.tenants.filter((x) => x.room === spec.room)) {
      if (t.fullName === 'Sneha Patil') {
        await Payment.create({ pg: ownerAccount._id, tenant: tenantByName.get(t.fullName)._id, type: 'Electricity', month: lastM, amount: lastReading.perTenantAmount, method: 'UPI', status: 'Overdue', dueDate: dayInMonth(lastM, 28) });
      } else {
        await Payment.create({ pg: ownerAccount._id, tenant: tenantByName.get(t.fullName)._id, type: 'Electricity', month: lastM, amount: lastReading.perTenantAmount, method: 'UPI', status: 'Paid', paidAt: `${dayInMonth(lastM, 29)}T12:00:00`, dueDate: dayInMonth(lastM, 28) });
      }
    }
  }

  // ---------- Complaints ----------
  for (const c of seed.complaints) {
    const tenant = tenantByName.get(c.tenant);
    await Complaint.create({
      pg: ownerAccount._id,
      tenant: tenant._id,
      category: c.category,
      description: c.description,
      roomNumber: c.roomNumber,
      status: c.status,
      submittedAt: c.hoursAgo ? new Date(Date.now() - c.hoursAgo * 3600000).toISOString() : daysAgoISO(c.daysAgo),
      resolvedAt: c.status === 'Resolved' ? daysAgoISO(c.daysAgo - 1) : undefined,
      remarks: c.remarks,
    });
  }

  // ---------- Food menu ----------
  const days = Object.keys(seed.menuData);
  for (const day of days) {
    for (const mealType of ['Breakfast', 'Lunch', 'Dinner']) {
      await FoodMenuItem.create({
        pg: ownerAccount._id,
        day,
        mealType,
        items: seed.menuData[day][mealType.toLowerCase()],
        timing: seed.mealTimings[mealType],
      });
    }
  }

  // ---------- Food ratings & opt-outs ----------
  await FoodRating.create([
    { pg: ownerAccount._id, tenant: tenantByName.get('Amit Kumar')._id, date: daysAgoDate(1), mealType: 'Lunch', rating: 4, review: 'Rajma was great.' },
    { pg: ownerAccount._id, tenant: tenantByName.get('Rohan Verma')._id, date: daysAgoDate(2), mealType: 'Dinner', rating: 5 },
    { pg: ownerAccount._id, tenant: tenantByName.get('Priya Nair')._id, date: daysAgoDate(1), mealType: 'Breakfast', rating: 3 },
  ]);
  await MealOptOut.create([
    { pg: ownerAccount._id, tenant: tenantByName.get('Amit Kumar')._id, date: todayISO(), mealType: 'Dinner' },
    { pg: ownerAccount._id, tenant: tenantByName.get('Rohan Verma')._id, date: todayISO(), mealType: 'Lunch' },
  ]);

  // ---------- Admission requests (Rahul pending, Manish rejected) ----------
  const rahul = await TenantUser.create({ fullName: 'Rahul Sharma', mobile: '9123450001', email: 'rahul.sharma@example.com', passwordHash: hash });
  const manish = await TenantUser.create({ fullName: 'Manish Tiwari', mobile: '9123450002', email: 'manish.tiwari@example.com', passwordHash: hash });

  await AdmissionRequest.create({
    pg: ownerAccount._id,
    requestId: 'AR-2026-0001',
    tenantUser: rahul._id,
    fullName: 'Rahul Sharma',
    mobile: '9123450001',
    email: 'rahul.sharma@example.com',
    emergencyContact: '9123450099',
    preferredJoiningDate: daysAheadISO(7),
    preferredRoomType: '2-sharing',
    occupants: 1,
    additionalMessage: 'I am a software engineer joining a company in Baner next week. Looking for a long-term stay.',
    documents: { idProof: 'aadhaar-rahul.pdf', photograph: 'rahul-photo.jpg' },
    status: 'Pending',
  });
  await AdmissionRequest.create({
    pg: secondOwner._id,
    requestId: 'AR-2026-0002',
    tenantUser: rahul._id,
    fullName: 'Rahul Sharma',
    mobile: '9123450001',
    email: 'rahul.sharma@example.com',
    emergencyContact: '9123450099',
    preferredJoiningDate: daysAheadISO(10),
    preferredRoomType: 'Any',
    occupants: 1,
    additionalMessage: 'Also exploring options in Andheri. Please let me know about availability.',
    status: 'Pending',
  });
  await AdmissionRequest.create({
    pg: ownerAccount._id,
    requestId: 'AR-2026-0003',
    tenantUser: manish._id,
    fullName: 'Manish Tiwari',
    mobile: '9123450002',
    email: 'manish.tiwari@example.com',
    emergencyContact: '9123450088',
    preferredJoiningDate: daysAgoDate(1),
    preferredRoomType: 'Single',
    occupants: 1,
    additionalMessage: 'Looking for a single occupancy room.',
    status: 'Rejected',
    rejectionReason: 'No beds available',
    reviewedBy: seed.owner.ownerName,
    reviewedAt: daysAgoISO(3),
  });

  // ---------- Seed notifications + delivery log ----------
  const notifs = [
    { userId: String(tenantByName.get('Amit Kumar')._id), userRole: 'tenant', title: 'Complaint Resolved', message: 'Your AC complaint has been resolved. Technician refilled the gas.', type: 'success', read: true, createdAt: daysAgoISO(5), link: '/app/tenant/complaints', category: 'Complaint', dedupeKey: 'seed-n-001' },
    { userId: String(tenantByName.get('Amit Kumar')._id), userRole: 'tenant', title: 'Rent Reminder', message: 'Hi Amit, your rent for this month is due on the 5th. Please pay on time.', type: 'warning', read: false, createdAt: daysAgoISO(2), link: '/app/tenant/rent', category: 'Rent', dedupeKey: 'seed-n-002' },
    { userId: 'all', userRole: 'manager', title: 'New Complaint', message: 'Vikram Singh submitted a Cleaning complaint in Room 104.', type: 'info', read: false, createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), link: '/app/manager/complaints', category: 'Complaint', dedupeKey: 'seed-n-003' },
    { userId: 'all', userRole: 'manager', title: 'New Complaint', message: 'Priya Nair submitted an Electrical complaint in Room 103.', type: 'info', read: false, createdAt: new Date(Date.now() - 1 * 3600000).toISOString(), link: '/app/manager/complaints', category: 'Complaint', dedupeKey: 'seed-n-004' },
    { userId: 'all', userRole: 'owner', title: 'Payment Received', message: 'Sneha Patil made a rent payment of ₹7,500.', type: 'success', read: false, createdAt: daysAgoISO(2), link: '/app/owner/finance', category: 'Rent', dedupeKey: 'seed-n-005' },
    { userId: 'all', userRole: 'owner', title: 'Notice Period Started', message: 'Neha Joshi (Room 201, Bed 1) has started her notice period.', type: 'warning', read: true, createdAt: daysAgoISO(6), link: '/app/owner/beds', category: 'Bed', dedupeKey: 'seed-n-006' },
  ];
  for (const n of notifs) await Notification.create({ pg: ownerAccount._id, ...n });

  await NotificationLog.create([
    { pg: ownerAccount._id, dedupeKey: 'seed-n-002', notificationId: 'seed-n-002', category: 'Rent', title: 'Rent Reminder', recipient: 't-001', recipientRole: 'tenant', channel: 'In-App', status: 'Delivered', attempts: 1, createdAt: daysAgoISO(2) },
    { pg: ownerAccount._id, dedupeKey: 'seed-n-002', notificationId: 'seed-n-002', category: 'Rent', title: 'Rent Reminder', recipient: 't-001', recipientRole: 'tenant', channel: 'WhatsApp', status: 'Simulated', attempts: 1, createdAt: daysAgoISO(2), note: 'Simulated delivery – no real provider connected' },
    { pg: ownerAccount._id, dedupeKey: 'seed-n-005', notificationId: 'seed-n-005', category: 'Rent', title: 'Payment Received', recipient: 'PG Owner', recipientRole: 'owner', channel: 'Email', status: 'Simulated', attempts: 1, createdAt: daysAgoISO(2), note: 'Simulated delivery – no real provider connected' },
  ]);

  // ---------- Run the notification engine once (idempotent) ----------
  await runNotificationEngine(ownerAccount._id);

  logger.info('Seed complete!');
  logger.info('Demo credentials (password: demo1234, tenant OTP: 1234):');
  logger.info(`  Owner login : username ${seed.owner.pgUsername} / demo1234`);
  logger.info(`  Manager login: ${seed.manager.email} / demo1234`);
  logger.info(`  Tenant login: mobile ${seed.tenants[0].mobile} (Amit Kumar) / OTP 1234`);
}

connectDB()
  .then(seedAll)
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error(err.stack || err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
