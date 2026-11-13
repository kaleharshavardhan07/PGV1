// Centralized mock data for the Aapka PG demo.
// All dates are generated relative to "today" so the demo never goes stale.

import type {
  Tenant,
  Room,
  Bed,
  MeterReading,
  Payment,
  Complaint,
  FoodMenuItem,
  FoodRating,
  MealOptOut,
  Notification,
  NotificationCategory,
  NotificationLogEntry,
  NotificationPrefs,
  PGSettings,
  ReminderSchedule,
  Subscription,
  PGAccount,
  TenantUser,
  AdmissionRequest,
  Membership,
  AuditLogEntry,
  PlatformData,
  PGWorkspace,
} from '../types';
import { getPlan } from './plans';

// ---------- date helpers ----------
const pad = (n: number) => String(n).padStart(2, '0');

const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const currentMonthKey = () => monthKey(new Date());

export const previousMonthKey = (back = 1) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  return monthKey(d);
};

const dayInMonth = (monthKeyStr: string, day: number) => `${monthKeyStr}-${pad(day)}`;

const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const daysAheadDateISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const hoursAgoISO = (n: number) => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
};

// ---------- settings ----------
export const initialSettings: PGSettings = {
  name: 'Shree Ganesh PG',
  address: 'Plot 14, Baner Road',
  city: 'Pune',
  contactEmail: 'owner@shreeganeshpg.in',
  contactPhone: '+91 98220 11223',
  electricityRate: 9,
  foodCharge: 1000,
  ownerName: 'Rajesh Sharma',
  timezone: 'Asia/Kolkata',
  channels: {
    whatsapp: true,
    sms: true,
    email: true,
  },
};

// ---------- configurable notification schedule (defaults) ----------
export const initialReminderSchedule: ReminderSchedule = {
  rentDaysBefore: [5, 1],
  rentOverdueDays: [1, 3, 7],
  electricityDueDaysBefore: [5, 1],
  electricityOverdueDays: [1, 3, 7],
  electricityDueInDays: 5,
  complaintUnresolvedHours: 48,
  gracePeriodDays: 7,
  retryAttempts: 3,
};

// ---------- rooms ----------
export const initialRooms: Room[] = [
  { id: 'r-101', roomNumber: '101', floor: 1, totalBeds: 2, sharingType: 2, attachedBathroom: true },
  { id: 'r-102', roomNumber: '102', floor: 1, totalBeds: 3, sharingType: 3, attachedBathroom: true },
  { id: 'r-103', roomNumber: '103', floor: 1, totalBeds: 2, sharingType: 1, attachedBathroom: true },
  { id: 'r-104', roomNumber: '104', floor: 1, totalBeds: 4, sharingType: 4, attachedBathroom: false },
  { id: 'r-201', roomNumber: '201', floor: 2, totalBeds: 2, sharingType: 2, attachedBathroom: true },
  { id: 'r-202', roomNumber: '202', floor: 2, totalBeds: 3, sharingType: 3, attachedBathroom: true },
  { id: 'r-203', roomNumber: '203', floor: 2, totalBeds: 2, sharingType: 2, attachedBathroom: false },
  { id: 'r-204', roomNumber: '204', floor: 2, totalBeds: 4, sharingType: 4, attachedBathroom: false },
  { id: 'r-301', roomNumber: '301', floor: 3, totalBeds: 4, sharingType: 4, attachedBathroom: true },
  { id: 'r-302', roomNumber: '302', floor: 3, totalBeds: 6, sharingType: 6, attachedBathroom: false },
];

// ---------- tenants ----------
export const initialTenants: Tenant[] = [
  {
    id: 't-001',
    fullName: 'Amit Kumar',
    mobile: '9876500011',
    email: 'amit.kumar@example.com',
    emergencyContact: '9876511111',
    roomId: 'r-101',
    bedNumber: 1,
    monthlyRent: 7500,
    securityDeposit: 15000,
    joiningDate: dayInMonth(previousMonthKey(4), 5),
    idProofUrl: 'aadhaar-amit.pdf',
    photographUrl: 'photo-amit.jpg',
    agreementUrl: 'agreement-amit.pdf',
    policeVerification: 'Verified',
    status: 'Active',
  },
  {
    id: 't-002',
    fullName: 'Rohan Verma',
    mobile: '9876500012',
    email: 'rohan.verma@example.com',
    emergencyContact: '9876522222',
    roomId: 'r-101',
    bedNumber: 2,
    monthlyRent: 7500,
    securityDeposit: 15000,
    joiningDate: dayInMonth(previousMonthKey(3), 12),
    idProofUrl: 'aadhaar-rohan.pdf',
    photographUrl: 'photo-rohan.jpg',
    agreementUrl: 'agreement-rohan.pdf',
    policeVerification: 'Verified',
    status: 'Active',
  },
  {
    id: 't-003',
    fullName: 'Sneha Patil',
    mobile: '9876500013',
    email: 'sneha.patil@example.com',
    emergencyContact: '9876533333',
    roomId: 'r-102',
    bedNumber: 1,
    monthlyRent: 6500,
    securityDeposit: 13000,
    joiningDate: dayInMonth(previousMonthKey(5), 1),
    idProofUrl: 'aadhaar-sneha.pdf',
    policeVerification: 'Verified',
    status: 'Active',
  },
  {
    id: 't-004',
    fullName: 'Priya Nair',
    mobile: '9876500014',
    email: 'priya.nair@example.com',
    emergencyContact: '9876544444',
    roomId: 'r-103',
    bedNumber: 1,
    monthlyRent: 9500,
    securityDeposit: 19000,
    joiningDate: dayInMonth(previousMonthKey(2), 20),
    idProofUrl: 'aadhaar-priya.pdf',
    photographUrl: 'photo-priya.jpg',
    agreementUrl: 'agreement-priya.pdf',
    policeVerification: 'Verified',
    status: 'Active',
  },
  {
    id: 't-005',
    fullName: 'Vikram Singh',
    mobile: '9876500015',
    email: 'vikram.singh@example.com',
    emergencyContact: '9876555555',
    roomId: 'r-104',
    bedNumber: 1,
    monthlyRent: 5500,
    securityDeposit: 11000,
    joiningDate: dayInMonth(previousMonthKey(1), 8),
    policeVerification: 'Pending',
    status: 'Active',
  },
  {
    id: 't-006',
    fullName: 'Anjali Gupta',
    mobile: '9876500016',
    email: 'anjali.gupta@example.com',
    emergencyContact: '9876566666',
    roomId: 'r-104',
    bedNumber: 2,
    monthlyRent: 5500,
    securityDeposit: 11000,
    joiningDate: dayInMonth(previousMonthKey(6), 15),
    idProofUrl: 'aadhaar-anjali.pdf',
    agreementUrl: 'agreement-anjali.pdf',
    policeVerification: 'Verified',
    status: 'Active',
  },
  {
    id: 't-007',
    fullName: 'Neha Joshi',
    mobile: '9876500017',
    email: 'neha.joshi@example.com',
    emergencyContact: '9876577777',
    roomId: 'r-201',
    bedNumber: 1,
    monthlyRent: 7500,
    securityDeposit: 15000,
    joiningDate: dayInMonth(previousMonthKey(7), 3),
    idProofUrl: 'aadhaar-neha.pdf',
    photographUrl: 'photo-neha.jpg',
    agreementUrl: 'agreement-neha.pdf',
    policeVerification: 'Verified',
    status: 'Notice Period',
    noticeDate: daysAgoISO(6).split('T')[0],
  },
  {
    id: 't-008',
    fullName: 'Karan Mehta',
    mobile: '9876500018',
    email: 'karan.mehta@example.com',
    emergencyContact: '9876588888',
    roomId: 'r-202',
    bedNumber: 1,
    monthlyRent: 6500,
    securityDeposit: 13000,
    joiningDate: dayInMonth(previousMonthKey(2), 28),
    idProofUrl: 'aadhaar-karan.pdf',
    policeVerification: 'Verified',
    status: 'Active',
  },
  {
    id: 't-009',
    fullName: 'Divya Reddy',
    mobile: '9876500019',
    email: 'divya.reddy@example.com',
    emergencyContact: '9876599999',
    roomId: 'r-301',
    bedNumber: 1,
    monthlyRent: 5500,
    securityDeposit: 11000,
    joiningDate: dayInMonth(previousMonthKey(1), 18),
    policeVerification: 'Pending',
    status: 'Active',
  },
];

// ---------- beds ----------
const occupiedMap: Record<string, Record<number, string>> = {
  'r-101': { 1: 't-001', 2: 't-002' },
  'r-102': { 1: 't-003' },
  'r-103': { 1: 't-004' },
  'r-104': { 1: 't-005', 2: 't-006' },
  'r-201': { 1: 't-007' },
  'r-202': { 1: 't-008' },
  'r-301': { 1: 't-009' },
};

export const initialBeds: Bed[] = initialRooms.flatMap((room) =>
  Array.from({ length: room.totalBeds }, (_, i) => {
    const bedNumber = i + 1;
    const tenantId = occupiedMap[room.id]?.[bedNumber];
    const isNotice = tenantId === 't-007';
    return {
      id: `${room.id}-bed-${bedNumber}`,
      roomId: room.id,
      bedNumber,
      status: (tenantId ? (isNotice ? 'notice' : 'occupied') : 'vacant') as Bed['status'],
      tenantId,
      vacantSince: tenantId ? undefined : daysAgoISO(3 + ((bedNumber * 7 + room.floor * 3) % 35)),
    };
  })
);

// ---------- meter readings ----------
// Last month is fully published; current month is saved as draft (manager publishes).
const readingSpecs: Array<{ roomId: string; lastPrev: number; lastUnits: number; curUnits: number }> = [
  { roomId: 'r-101', lastPrev: 4186, lastUnits: 214, curUnits: 232 },
  { roomId: 'r-102', lastPrev: 3021, lastUnits: 168, curUnits: 190 },
  { roomId: 'r-103', lastPrev: 2210, lastUnits: 141, curUnits: 128 },
  { roomId: 'r-104', lastPrev: 5544, lastUnits: 305, curUnits: 274 },
  { roomId: 'r-201', lastPrev: 1875, lastUnits: 122, curUnits: 118 },
  { roomId: 'r-202', lastPrev: 2688, lastUnits: 176, curUnits: 201 },
  { roomId: 'r-301', lastPrev: 4102, lastUnits: 251, curUnits: 238 },
];

const rate = initialSettings.electricityRate;

const occupantsForRoom = (roomId: string) =>
  initialTenants.filter((t) => t.roomId === roomId && t.status !== 'Left').length;

const buildReading = (
  roomId: string,
  month: string,
  previousReading: number,
  units: number,
  recordedAt: string,
  published: boolean
): MeterReading => {
  const occupants = occupantsForRoom(roomId);
  const totalAmount = units * rate;
  return {
    id: `mr-${roomId}-${month}`,
    roomId,
    month,
    previousReading,
    currentReading: previousReading + units,
    units,
    ratePerUnit: rate,
    totalAmount,
    occupants,
    perTenantAmount: Math.round(totalAmount / Math.max(1, occupants)),
    recordedAt,
    published,
  };
};

const lastM = previousMonthKey(1);
const curM = currentMonthKey();

export const initialMeterReadings: MeterReading[] = readingSpecs.flatMap((spec) => {
  const last = buildReading(spec.roomId, lastM, spec.lastPrev, spec.lastUnits, dayInMonth(lastM, 28) + 'T10:00:00', true);
  const cur = buildReading(spec.roomId, curM, last.currentReading, spec.curUnits, daysAgoISO(2), false);
  return [last, cur];
});

// ---------- payments ----------
const rentRef = (n: number) => `UPI/${4100 + n}/${210 + n}`;

// Rent due dates & statuses chosen so the demo shows the full notification
// lifecycle: upcoming reminder, due tomorrow, overdue (d1/d3) and paid.
const rentDueDay = [5, 5, 20, 5, 5, 20, 20, 15, 12];
const rentStatus: Payment['status'][] = [
  'Paid',
  'Pending',
  'Pending',
  'Paid',
  'Overdue',
  'Pending',
  'Pending',
  'Pending',
  'Pending',
];

const rentPayments: Payment[] = initialTenants.flatMap((t, idx) => {
  const total = t.monthlyRent + initialSettings.foodCharge;
  const status = rentStatus[idx] ?? 'Pending';
  const current: Payment = {
    id: `p-rent-${t.id}-cur`,
    tenantId: t.id,
    type: 'Rent',
    month: curM,
    amount: total,
    method: 'UPI',
    status,
    paidAt: status === 'Paid' ? daysAgoISO(2 + (idx % 3)) : undefined,
    dueDate: dayInMonth(curM, rentDueDay[idx] ?? 5),
    reference: status === 'Paid' ? rentRef(idx) : undefined,
  };
  const previous: Payment = {
    id: `p-rent-${t.id}-prev`,
    tenantId: t.id,
    type: 'Rent',
    month: lastM,
    amount: total,
    method: idx % 3 === 0 ? 'Card' : 'UPI',
    status: 'Paid',
    paidAt: dayInMonth(lastM, 4) + 'T11:30:00',
    dueDate: dayInMonth(lastM, 5),
    reference: rentRef(idx + 50),
  };
  return [previous, current];
});

const electricityPayments: Payment[] = initialMeterReadings
  .filter((m) => m.month === lastM)
  .flatMap((m) =>
    initialTenants
      .filter((t) => t.roomId === m.roomId && t.status !== 'Left')
      // Sneha's last-month electricity bill is left unpaid so the demo shows
      // the full overdue escalation (tenant → manager → owner).
      .filter((t) => t.id !== 't-003')
      .map((t, i) => ({
        id: `p-elec-${t.id}-${lastM}`,
        tenantId: t.id,
        type: 'Electricity' as const,
        month: m.month,
        amount: m.perTenantAmount,
        method: 'UPI' as const,
        status: 'Paid' as const,
        paidAt: dayInMonth(lastM, 29) + 'T12:00:00',
        dueDate: dayInMonth(lastM, 28),
        reference: rentRef(80 + i),
      }))
  );

// Sneha's overdue electricity bill (last month, published, unpaid)
const snehaReading = initialMeterReadings.find((m) => m.roomId === 'r-102' && m.month === lastM);
const overdueElectricityPayments: Payment[] = snehaReading
  ? [
      {
        id: `p-elec-t-003-${lastM}`,
        tenantId: 't-003',
        type: 'Electricity' as const,
        month: lastM,
        amount: snehaReading.perTenantAmount,
        method: 'UPI' as const,
        status: 'Overdue' as const,
        dueDate: dayInMonth(lastM, 28),
      },
    ]
  : [];

const depositPayments: Payment[] = initialTenants.map((t, idx) => ({
  id: `p-dep-${t.id}`,
  tenantId: t.id,
  type: 'Deposit' as const,
  month: t.joiningDate.slice(0, 7),
  amount: t.securityDeposit,
  method: 'UPI' as const,
  status: 'Paid' as const,
  paidAt: t.joiningDate + 'T10:00:00',
  dueDate: t.joiningDate,
  reference: rentRef(120 + idx),
}));

export const initialPayments: Payment[] = [
  ...rentPayments,
  ...electricityPayments,
  ...overdueElectricityPayments,
  ...depositPayments,
];

// ---------- complaints ----------
export const initialComplaints: Complaint[] = [
  {
    id: 'c-001',
    tenantId: 't-001',
    category: 'AC',
    description: 'AC not cooling properly since last night. It only blows normal air even at 18 degrees.',
    roomNumber: '101',
    status: 'Resolved',
    submittedAt: daysAgoISO(6),
    resolvedAt: daysAgoISO(5),
    remarks: 'Technician visited, gas refilled and filter cleaned. Cooling is normal now.',
  },
  {
    id: 'c-002',
    tenantId: 't-002',
    category: 'WiFi',
    description: 'WiFi keeps disconnecting every few minutes in the evenings.',
    roomNumber: '101',
    status: 'Seen',
    submittedAt: daysAgoISO(2),
  },
  {
    id: 'c-003',
    tenantId: 't-003',
    category: 'Water',
    description: 'Very low water pressure in the bathroom since morning.',
    roomNumber: '102',
    status: 'In Progress',
    submittedAt: daysAgoISO(1),
    remarks: 'Plumber has been scheduled for tomorrow morning.',
  },
  {
    id: 'c-004',
    tenantId: 't-005',
    category: 'Cleaning',
    description: 'The corridor on the first floor has not been cleaned this week.',
    roomNumber: '104',
    status: 'Submitted',
    submittedAt: hoursAgoISO(5),
  },
  {
    id: 'c-005',
    tenantId: 't-004',
    category: 'Electrical',
    description: 'Tube light in the study table area is flickering continuously.',
    roomNumber: '103',
    status: 'Submitted',
    submittedAt: hoursAgoISO(1),
  },
];

// ---------- food menu ----------
type Day = FoodMenuItem['day'];
const days: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const menuData: Record<Day, { breakfast: string[]; lunch: string[]; dinner: string[] }> = {
  Monday: {
    breakfast: ['Poha', 'Boiled Eggs', 'Tea / Coffee'],
    lunch: ['Dal Tadka', 'Aloo Sabzi', 'Roti', 'Rice', 'Salad'],
    dinner: ['Paneer Bhurji', 'Roti', 'Dal', 'Rice'],
  },
  Tuesday: {
    breakfast: ['Idli', 'Sambar', 'Coconut Chutney', 'Tea / Coffee'],
    lunch: ['Rajma', 'Jeera Rice', 'Roti', 'Curd', 'Salad'],
    dinner: ['Veg Pulao', 'Raita', 'Papad'],
  },
  Wednesday: {
    breakfast: ['Upma', 'Fruit Bowl', 'Tea / Coffee'],
    lunch: ['Chole', 'Rice', 'Roti', 'Boondi Raita'],
    dinner: ['Mixed Veg Curry', 'Dal Fry', 'Roti', 'Rice'],
  },
  Thursday: {
    breakfast: ['Masala Dosa', 'Sambar', 'Chutney', 'Tea / Coffee'],
    lunch: ['Kadhi Pakora', 'Aloo Gobi', 'Roti', 'Rice'],
    dinner: ['Egg Curry / Veg Kofta', 'Roti', 'Dal', 'Rice'],
  },
  Friday: {
    breakfast: ['Bread Butter', 'Banana', 'Tea / Coffee'],
    lunch: ['Sambar', 'Cabbage Sabzi', 'Roti', 'Rice', 'Papad'],
    dinner: ['Chole Bhature', 'Salad', 'Raita'],
  },
  Saturday: {
    breakfast: ['Aloo Paratha', 'Curd', 'Pickle', 'Tea / Coffee'],
    lunch: ['Veg Biryani', 'Raita', 'Papad'],
    dinner: ['Dal Makhani', 'Jeera Rice', 'Roti', 'Salad'],
  },
  Sunday: {
    breakfast: ['Puri Bhaji', 'Jalebi', 'Tea / Coffee'],
    lunch: ['Special Thali (Paneer, Dal, Rice, Roti, Sweet)'],
    dinner: ['Fried Rice', 'Manchurian', 'Soup'],
  },
};

const mealTimings = {
  Breakfast: '7:30 AM – 9:30 AM',
  Lunch: '12:30 PM – 2:30 PM',
  Dinner: '8:00 PM – 10:00 PM',
} as const;

export const initialFoodMenu: FoodMenuItem[] = days.flatMap((day) =>
  (['Breakfast', 'Lunch', 'Dinner'] as const).map((mealType) => ({
    id: `fm-${day.toLowerCase()}-${mealType.toLowerCase()}`,
    day,
    mealType,
    items: menuData[day][mealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner'],
    timing: mealTimings[mealType],
  }))
);

// ---------- food ratings & opt-outs ----------
export const initialFoodRatings: FoodRating[] = [
  { id: 'fr-001', tenantId: 't-001', date: daysAgoISO(1).split('T')[0], mealType: 'Lunch', rating: 4, review: 'Rajma was great.' },
  { id: 'fr-002', tenantId: 't-002', date: daysAgoISO(2).split('T')[0], mealType: 'Dinner', rating: 5 },
  { id: 'fr-003', tenantId: 't-004', date: daysAgoISO(1).split('T')[0], mealType: 'Breakfast', rating: 3 },
];

export const initialMealOptOuts: MealOptOut[] = [
  { id: 'mo-001', tenantId: 't-001', date: daysAgoISO(0).split('T')[0], mealType: 'Dinner' },
  { id: 'mo-002', tenantId: 't-002', date: daysAgoISO(0).split('T')[0], mealType: 'Lunch' },
];

// ---------- notifications ----------
export const initialNotifications: Notification[] = [
  {
    id: 'n-001',
    userId: 't-001',
    userRole: 'tenant',
    title: 'Complaint Resolved',
    message: 'Your AC complaint has been resolved. Technician refilled the gas.',
    type: 'success',
    read: true,
    createdAt: daysAgoISO(5),
    link: '/app/tenant/complaints',
    category: 'Complaint',
    dedupeKey: 'seed-n-001',
  },
  {
    id: 'n-002',
    userId: 't-001',
    userRole: 'tenant',
    title: 'Rent Reminder',
    message: 'Hi Amit, your rent for this month is due on the 5th. Please pay on time.',
    type: 'warning',
    read: false,
    createdAt: daysAgoISO(2),
    link: '/app/tenant/rent',
    category: 'Rent',
    dedupeKey: 'seed-n-002',
  },
  {
    id: 'n-003',
    userId: 'all',
    userRole: 'manager',
    title: 'New Complaint',
    message: 'Vikram Singh submitted a Cleaning complaint in Room 104.',
    type: 'info',
    read: false,
    createdAt: hoursAgoISO(5),
    link: '/app/manager/complaints',
    category: 'Complaint',
    dedupeKey: 'seed-n-003',
  },
  {
    id: 'n-004',
    userId: 'all',
    userRole: 'manager',
    title: 'New Complaint',
    message: 'Priya Nair submitted an Electrical complaint in Room 103.',
    type: 'info',
    read: false,
    createdAt: hoursAgoISO(1),
    link: '/app/manager/complaints',
    category: 'Complaint',
    dedupeKey: 'seed-n-004',
  },
  {
    id: 'n-005',
    userId: 'all',
    userRole: 'owner',
    title: 'Payment Received',
    message: 'Sneha Patil made a rent payment of ₹7,500.',
    type: 'success',
    read: false,
    createdAt: daysAgoISO(2),
    link: '/app/owner/finance',
    category: 'Rent',
    dedupeKey: 'seed-n-005',
  },
  {
    id: 'n-006',
    userId: 'all',
    userRole: 'owner',
    title: 'Notice Period Started',
    message: 'Neha Joshi (Room 201, Bed 1) has started her notice period.',
    type: 'warning',
    read: true,
    createdAt: daysAgoISO(6),
    link: '/app/owner/beds',
    category: 'Bed',
    dedupeKey: 'seed-n-006',
  },
];

// ---------- subscription (SaaS billing – separate from tenant payments) ----------
// Demo state: Growth plan on monthly billing, renews in exactly 7 days so the
// first reminder in the renewal schedule is visible immediately. Two paid sample invoices.
const periodEnd = new Date();
periodEnd.setDate(periodEnd.getDate() + 7);
const periodEndISO = periodEnd.toISOString().split('T')[0];

const periodStart = new Date(periodEnd);
periodStart.setMonth(periodStart.getMonth() - 1);
const periodStartISO = periodStart.toISOString().split('T')[0];

const periodBeforeStart = new Date(periodStart);
periodBeforeStart.setMonth(periodBeforeStart.getMonth() - 1);
const periodBeforeStartISO = periodBeforeStart.toISOString().split('T')[0];

const growthPlan = getPlan('growth');

export const initialSubscription: Subscription = {
  planId: 'growth',
  status: 'Active',
  cycle: 'monthly',
  startedAt: periodBeforeStartISO,
  currentPeriodEnd: periodEndISO,
  amountPaid: growthPlan.monthlyPrice * 2,
  autoRenew: true,
  invoices: [
    {
      id: 'inv-001',
      number: 'APG-2026-0001',
      date: periodBeforeStartISO,
      planId: 'growth',
      cycle: 'monthly',
      amount: growthPlan.monthlyPrice,
      status: 'Paid',
      method: 'UPI',
      paidAt: periodBeforeStartISO + 'T10:00:00',
      reference: 'SIM/UPI/8812',
    },
    {
      id: 'inv-002',
      number: 'APG-2026-0002',
      date: periodStartISO,
      planId: 'growth',
      cycle: 'monthly',
      amount: growthPlan.monthlyPrice,
      status: 'Paid',
      method: 'UPI',
      paidAt: periodStartISO + 'T10:00:00',
      reference: 'SIM/UPI/9054',
    },
  ],
};

// ---------- tenant communication preferences ----------
export const initialNotificationPrefs: NotificationPrefs[] = initialTenants.map((t) => ({
  tenantId: t.id,
  whatsapp: true,
  sms: true,
  email: true,
}));

// ---------- delivery log (history for the demo) ----------
const logEntry = (
  id: string,
  notificationId: string,
  category: NotificationCategory,
  title: string,
  recipient: string,
  recipientRole: NotificationLogEntry['recipientRole'],
  channel: NotificationLogEntry['channel'],
  status: NotificationLogEntry['status'],
  createdAt: string,
  note?: string
): NotificationLogEntry => ({
  id,
  notificationId,
  dedupeKey: notificationId,
  category,
  title,
  recipient,
  recipientRole,
  channel,
  status,
  attempts: status === 'Retried' ? 2 : 1,
  createdAt,
  note: note ?? (channel === 'In-App' ? undefined : 'Simulated delivery – no real provider connected'),
});

export const initialNotificationLog: NotificationLogEntry[] = [
  logEntry('nl-seed-1', 'seed-n-002', 'Rent', 'Rent Reminder', 't-001', 'tenant', 'In-App', 'Delivered', daysAgoISO(2)),
  logEntry('nl-seed-2', 'seed-n-002', 'Rent', 'Rent Reminder', 't-001', 'tenant', 'WhatsApp', 'Simulated', daysAgoISO(2)),
  logEntry('nl-seed-3', 'seed-n-003', 'Complaint', 'New Complaint', 'PG Manager', 'manager', 'In-App', 'Delivered', hoursAgoISO(5)),
  logEntry('nl-seed-4', 'seed-n-003', 'Complaint', 'New Complaint', 'PG Manager', 'manager', 'Email', 'Retried', hoursAgoISO(5), 'Email delivery failed once, retry succeeded (retry policy: 3 attempts)'),
  logEntry('nl-seed-5', 'seed-n-005', 'Rent', 'Payment Received', 'PG Owner', 'owner', 'In-App', 'Delivered', daysAgoISO(2)),
  logEntry('nl-seed-6', 'seed-n-005', 'Rent', 'Payment Received', 'PG Owner', 'owner', 'Email', 'Simulated', daysAgoISO(2)),
];

// ---------- platform registry (multi-PG SaaS) ----------
// Passwords below are PBKDF2-SHA256 hashes of the demo password "demo1234".
// Plain-text passwords are never stored anywhere.

const HASH_DEMO_PASSWORD_1 =
  'pbkdf2$100000$a1b2c3d4e5f60718293a4b5c6d7e8f90$c06bd42765a044f31e23bd11512584441d24471be5ab7e6f77cc54991b291d7c';
const HASH_DEMO_PASSWORD_2 =
  'pbkdf2$100000$f0e9d8c7b6a5958473625140f2e3d4c5$f7bbc4dde8406808f76c2b07bf1a700faee12680742da743ea3faf29a4b2ec81';

export const PG_ID_SHREE = 'pg-shree-ganesh';
export const PG_ID_ROYAL = 'pg-royal-stay';

export const initialPGs: PGAccount[] = [
  {
    id: PG_ID_SHREE,
    pgName: 'Shree Ganesh PG',
    pgUsername: 'shreeganesh_pg_4821',
    description:
      'Comfortable co-living PG with home-style food, high-speed WiFi and daily housekeeping. Walking distance from Baner IT park.',
    address: 'Plot 14, Baner Road',
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411045',
    pgType: 'Co-living',
    ownerName: 'Rajesh Sharma',
    ownerEmail: 'owner@shreeganeshpg.in',
    ownerMobile: '9822011223',
    passwordHash: HASH_DEMO_PASSWORD_1,
    isActive: true,
    isDiscoverable: true,
    showAvailableBeds: true,
    subscriptionPlanId: 'growth',
    createdAt: daysAgoISO(210),
    updatedAt: daysAgoISO(2),
  },
  {
    id: PG_ID_ROYAL,
    pgName: 'Royal Stay',
    pgUsername: 'royalstay_7291',
    description:
      'Boys PG with single and double sharing rooms, study desks, and Mess facility. Near Andheri metro station.',
    address: 'Lokhandwala, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400053',
    pgType: 'Boys',
    ownerName: 'Sunita Kapoor',
    ownerEmail: 'sunita@royalstay.in',
    ownerMobile: '9820044556',
    passwordHash: HASH_DEMO_PASSWORD_2,
    isActive: true,
    isDiscoverable: true,
    showAvailableBeds: true,
    subscriptionPlanId: 'starter',
    createdAt: daysAgoISO(95),
    updatedAt: daysAgoISO(10),
  },
];

// ---------- tenant users (platform identity accounts) ----------
const tenantUserOf = (t: Tenant): TenantUser => ({
  id: `tu-${t.id}`,
  fullName: t.fullName,
  mobile: t.mobile,
  email: t.email,
  createdAt: t.joiningDate + 'T09:00:00Z',
});

export const initialTenantUsers: TenantUser[] = [
  ...initialTenants.map(tenantUserOf),
  {
    id: 'tu-rahul',
    fullName: 'Rahul Sharma',
    mobile: '9123450001',
    email: 'rahul.sharma@example.com',
    createdAt: daysAgoISO(3),
  },
  {
    id: 'tu-manish',
    fullName: 'Manish Tiwari',
    mobile: '9123450002',
    email: 'manish.tiwari@example.com',
    createdAt: daysAgoISO(6),
  },
];

// ---------- memberships (active for all seeded tenants) ----------
export const initialMemberships: Membership[] = initialTenants.map((t) => {
  const room = initialRooms.find((r) => r.id === t.roomId)!;
  return {
    id: `m-${t.id}`,
    pgId: PG_ID_SHREE,
    tenantUserId: `tu-${t.id}`,
    tenantId: t.id,
    roomId: t.roomId,
    bedId: `${room.id}-bed-${t.bedNumber}`,
    status: 'Active' as const,
    joiningDate: t.joiningDate,
    monthlyRent: t.monthlyRent,
    securityDeposit: t.securityDeposit,
    approvedBy: 'Rajesh Sharma',
    approvedAt: t.joiningDate + 'T09:00:00Z',
    createdAt: t.joiningDate + 'T09:00:00Z',
  };
});

// ---------- admission requests ----------
export const initialAdmissionRequests: AdmissionRequest[] = [
  {
    id: 'ar-1',
    requestId: 'AR-2026-0001',
    pgId: PG_ID_SHREE,
    tenantUserId: 'tu-rahul',
    fullName: 'Rahul Sharma',
    mobile: '9123450001',
    email: 'rahul.sharma@example.com',
    emergencyContact: '9123450099',
    preferredJoiningDate: daysAheadDateISO(7),
    preferredRoomType: '2-sharing',
    occupants: 1,
    additionalMessage: 'I am a software engineer joining a company in Baner next week. Looking for a long-term stay.',
    documents: { idProof: 'aadhaar-rahul.pdf', photograph: 'rahul-photo.jpg' },
    status: 'Pending',
    createdAt: hoursAgoISO(20),
    updatedAt: hoursAgoISO(20),
  },
  {
    id: 'ar-2',
    requestId: 'AR-2026-0002',
    pgId: PG_ID_ROYAL,
    tenantUserId: 'tu-rahul',
    fullName: 'Rahul Sharma',
    mobile: '9123450001',
    email: 'rahul.sharma@example.com',
    emergencyContact: '9123450099',
    preferredJoiningDate: daysAheadDateISO(10),
    preferredRoomType: 'Any',
    occupants: 1,
    additionalMessage: 'Also exploring options in Andheri. Please let me know about availability.',
    documents: { idProof: 'aadhaar-rahul.pdf' },
    status: 'Pending',
    createdAt: daysAgoISO(2),
    updatedAt: daysAgoISO(2),
  },
  {
    id: 'ar-3',
    requestId: 'AR-2026-0003',
    pgId: PG_ID_SHREE,
    tenantUserId: 'tu-manish',
    fullName: 'Manish Tiwari',
    mobile: '9123450002',
    email: 'manish.tiwari@example.com',
    emergencyContact: '9123450088',
    preferredJoiningDate: daysAgoISO(1).split('T')[0],
    preferredRoomType: 'Single',
    occupants: 1,
    additionalMessage: 'Looking for a single occupancy room.',
    documents: {},
    status: 'Rejected',
    rejectionReason: 'No beds available',
    reviewedBy: 'Rajesh Sharma',
    reviewedAt: daysAgoISO(3),
    createdAt: daysAgoISO(5),
    updatedAt: daysAgoISO(3),
  },
];

// ---------- audit logs ----------
export const initialAuditLogs: AuditLogEntry[] = [
  {
    id: 'al-1',
    ts: daysAgoISO(210),
    actor: 'system',
    action: 'PG_REGISTERED',
    entity: 'PG',
    entityId: PG_ID_SHREE,
    details: 'Shree Ganesh PG registered with username shreeganesh_pg_4821 (Growth plan).',
  },
  {
    id: 'al-2',
    ts: daysAgoISO(95),
    actor: 'system',
    action: 'PG_REGISTERED',
    entity: 'PG',
    entityId: PG_ID_ROYAL,
    details: 'Royal Stay registered with username royalstay_7291 (Starter plan).',
  },
  {
    id: 'al-3',
    ts: daysAgoISO(3),
    actor: 'Rajesh Sharma',
    action: 'ADMISSION_REJECTED',
    entity: 'AdmissionRequest',
    entityId: 'AR-2026-0003',
    details: 'Rejected Manish Tiwari. Reason: No beds available.',
  },
  {
    id: 'al-4',
    ts: hoursAgoISO(20),
    actor: 'system',
    action: 'ADMISSION_SUBMITTED',
    entity: 'AdmissionRequest',
    entityId: 'AR-2026-0001',
    details: 'Rahul Sharma submitted an admission request to Shree Ganesh PG.',
  },
];

// ---------- Royal Stay workspace (second PG for isolation demos) ----------
const royalSettings: PGSettings = {
  name: 'Royal Stay',
  address: 'Lokhandwala, Andheri West',
  city: 'Mumbai',
  contactEmail: 'sunita@royalstay.in',
  contactPhone: '+91 98200 44556',
  electricityRate: 10,
  foodCharge: 1200,
  ownerName: 'Sunita Kapoor',
  timezone: 'Asia/Kolkata',
  channels: { whatsapp: false, sms: true, email: true },
};

const royalRooms: Room[] = [
  { id: 'rr-101', roomNumber: '101', floor: 1, totalBeds: 3, sharingType: 3, attachedBathroom: true },
  { id: 'rr-102', roomNumber: '102', floor: 1, totalBeds: 2, sharingType: 2, attachedBathroom: false },
];

const royalTenants: Tenant[] = [
  {
    id: 't-royal-1',
    fullName: 'Kunal Shah',
    mobile: '9820012345',
    email: 'kunal.shah@example.com',
    emergencyContact: '9820054321',
    roomId: 'rr-101',
    bedNumber: 1,
    monthlyRent: 9000,
    securityDeposit: 18000,
    joiningDate: dayInMonth(previousMonthKey(2), 10),
    idProofUrl: 'aadhaar-kunal.pdf',
    policeVerification: 'Verified',
    status: 'Active',
  },
];

const royalBeds: Bed[] = royalRooms.flatMap((room) =>
  Array.from({ length: room.totalBeds }, (_, i) => {
    const bedNumber = i + 1;
    const tenantId = room.id === 'rr-101' && bedNumber === 1 ? 't-royal-1' : undefined;
    return {
      id: `${room.id}-bed-${bedNumber}`,
      roomId: room.id,
      bedNumber,
      status: (tenantId ? 'occupied' : 'vacant') as Bed['status'],
      tenantId,
      vacantSince: tenantId ? undefined : daysAgoISO(20 + bedNumber * 5),
    };
  })
);

const royalRate = royalSettings.electricityRate;
const royalReading: MeterReading = {
  id: `mr-rr-101-${previousMonthKey(1)}`,
  roomId: 'rr-101',
  month: previousMonthKey(1),
  previousReading: 1200,
  currentReading: 1348,
  units: 148,
  ratePerUnit: royalRate,
  totalAmount: 148 * royalRate,
  occupants: 1,
  perTenantAmount: 148 * royalRate,
  recordedAt: dayInMonth(previousMonthKey(1), 27) + 'T10:00:00',
  published: true,
};

const royalPayments: Payment[] = [
  {
    id: 'p-royal-rent-cur',
    tenantId: 't-royal-1',
    type: 'Rent',
    month: currentMonthKey(),
    amount: 9000 + royalSettings.foodCharge,
    method: 'UPI',
    status: 'Pending',
    dueDate: dayInMonth(currentMonthKey(), 10),
  },
  {
    id: 'p-royal-rent-prev',
    tenantId: 't-royal-1',
    type: 'Rent',
    month: previousMonthKey(1),
    amount: 9000 + royalSettings.foodCharge,
    method: 'UPI',
    status: 'Paid',
    paidAt: dayInMonth(previousMonthKey(1), 9) + 'T11:00:00',
    dueDate: dayInMonth(previousMonthKey(1), 10),
    reference: 'UPI/7788/112',
  },
  {
    id: 'p-royal-dep',
    tenantId: 't-royal-1',
    type: 'Deposit',
    month: dayInMonth(previousMonthKey(2), 10).slice(0, 7),
    amount: 18000,
    method: 'UPI',
    status: 'Paid',
    paidAt: dayInMonth(previousMonthKey(2), 10) + 'T10:00:00',
    dueDate: dayInMonth(previousMonthKey(2), 10),
    reference: 'UPI/7700/100',
  },
];

const royalSubscription: Subscription = {
  planId: 'starter',
  status: 'Active',
  cycle: 'monthly',
  startedAt: daysAgoISO(95).split('T')[0],
  currentPeriodEnd: daysAheadDateISO(20),
  amountPaid: getPlan('starter').monthlyPrice * 3,
  autoRenew: true,
  invoices: [
    {
      id: 'inv-royal-1',
      number: 'APG-2026-0001',
      date: daysAgoISO(95).split('T')[0],
      planId: 'starter',
      cycle: 'monthly',
      amount: getPlan('starter').monthlyPrice,
      status: 'Paid',
      method: 'UPI',
      paidAt: daysAgoISO(95).split('T')[0] + 'T10:00:00',
      reference: 'SIM/UPI/4471',
    },
  ],
};

const royalNotifications: Notification[] = [
  {
    id: 'n-royal-1',
    userId: 'all',
    userRole: 'owner',
    title: 'New Tenant Admission Request',
    message: 'Rahul Sharma has requested admission to Royal Stay.',
    type: 'info',
    read: false,
    createdAt: daysAgoISO(2),
    link: '/app/owner/admissions',
    category: 'Admission',
    dedupeKey: 'admission-submitted-AR-2026-0002',
  },
];

export const royalStayWorkspace: PGWorkspace = {
  settings: royalSettings,
  tenants: royalTenants,
  rooms: royalRooms,
  beds: royalBeds,
  meterReadings: [royalReading],
  payments: royalPayments,
  complaints: [],
  foodMenu: initialFoodMenu,
  foodRatings: [],
  mealOptOuts: [],
  notifications: royalNotifications,
  notificationLog: [
    {
      id: 'nl-royal-1',
      notificationId: 'admission-submitted-AR-2026-0002',
      dedupeKey: 'admission-submitted-AR-2026-0002',
      category: 'Admission',
      title: 'New Tenant Admission Request',
      recipient: 'PG Owner',
      recipientRole: 'owner',
      channel: 'In-App',
      status: 'Delivered',
      attempts: 1,
      createdAt: daysAgoISO(2),
    },
  ],
  notificationPrefs: [{ tenantId: 't-royal-1', whatsapp: true, sms: true, email: true }],
  reminderSchedule: initialReminderSchedule,
  subscription: royalSubscription,
};

export const initialWorkspaces: Record<string, PGWorkspace> = {
  [PG_ID_SHREE]: {
    settings: initialSettings,
    tenants: initialTenants,
    rooms: initialRooms,
    beds: initialBeds,
    meterReadings: initialMeterReadings,
    payments: initialPayments,
    complaints: initialComplaints,
    foodMenu: initialFoodMenu,
    foodRatings: initialFoodRatings,
    mealOptOuts: initialMealOptOuts,
    notifications: initialNotifications,
    notificationLog: initialNotificationLog,
    notificationPrefs: initialNotificationPrefs,
    reminderSchedule: initialReminderSchedule,
    subscription: initialSubscription,
  },
  [PG_ID_ROYAL]: royalStayWorkspace,
};

export const initialPlatform: PlatformData = {
  pgs: initialPGs,
  tenantUsers: initialTenantUsers,
  admissionRequests: initialAdmissionRequests,
  memberships: initialMemberships,
  auditLogs: initialAuditLogs,
  pendingRegistrations: [],
};
