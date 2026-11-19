import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { normalizeUsername } from '../services/pgPlatform.js';
import * as rooms from '../repositories/rooms.js';
import * as pubs from '../repositories/publicPgs.js';
import { mail } from '../services/mailService.js';
import { insertNotification } from '../repositories/notifications.js';

// Public, unauthenticated views. They expose location, availability and the owner's
// public contact details only, never tenant data.
const contactOf = (p) => ({
  ownerName: p.ownerName,
  // The phone number is shown only when the owner allows it; enquiries always work.
  phone: p.contactPublic ? p.ownerMobile : null,
  whatsapp: p.contactPublic ? `https://wa.me/91${p.ownerMobile}` : null,
});

const card = (p) => ({
  id: p.id, pgName: p.pgName, pgUsername: p.pgUsername, description: p.description, address: p.address, area: p.area,
  city: p.city, state: p.state, pgType: p.pgType, latitude: p.latitude, longitude: p.longitude,
  distanceKm: p.distanceKm != null ? Math.round(p.distanceKm * 10) / 10 : null,
  vacancy: p.showAvailableBeds
    ? { totalBeds: p.totalBeds, vacantBeds: p.vacantBeds, minRent: p.minRent, maxRent: p.maxRent, sharingTypes: p.sharingTypes }
    : null,
  contact: contactOf(p),
});

export const searchPgs = asyncHandler(async (req, res) => {
  const { total, rows } = await pubs.searchPgs(req.query);
  res.json({ success: true, total, pgs: rows.map(card) });
});

export const locations = asyncHandler(async (_req, res) => {
  res.json({ success: true, locations: await pubs.listLocations() });
});

export const pgDetail = asyncHandler(async (req, res) => {
  const pg = await pubs.getPublicPg(normalizeUsername(req.params.username));
  if (!pg) throw ApiError.notFound('PG not found');

  let roomList = [];
  if (pg.showAvailableBeds) {
    roomList = (await rooms.listRooms(pg.id)).map((r) => {
      const rents = r.beds.filter((b) => b.status === 'vacant' && b.rent != null).map((b) => b.rent);
      return {
        id: r.id, roomNumber: r.roomNumber, floor: r.floor, sharingType: r.sharingType, attachedBathroom: r.attachedBathroom,
        totalBeds: r.totalBeds, vacantBeds: r.vacantBeds, rentFrom: rents.length ? Math.min(...rents) : null,
        beds: r.beds.map((b) => ({ id: b.id, bedNumber: b.bedNumber, label: b.label, rent: b.rent, status: b.status === 'vacant' ? 'vacant' : b.status === 'unavailable' ? 'unavailable' : 'occupied' })),
      };
    });
  }
  const counts = pg.showAvailableBeds ? await rooms.vacancyCounts(pg.id) : null;
  res.json({
    success: true,
    pg: { ...card({ ...pg, showAvailableBeds: false }), vacancy: counts && { totalBeds: counts.totalBeds, vacantBeds: counts.vacantBeds } },
    rooms: roomList,
  });
});

export const createEnquiry = asyncHandler(async (req, res) => {
  const pg = await pubs.getPublicPg(normalizeUsername(req.params.username));
  if (!pg) throw ApiError.notFound('PG not found');
  const enquiry = await pubs.createEnquiry(pg.id, req.body);
  await insertNotification(pg.id, {
    dedupeKey: `enquiry-${enquiry.id}`, userId: 'all', userRole: 'owner', category: 'Tenant', type: 'info',
    title: 'New enquiry', message: `${req.body.name} (${req.body.mobile}) asked about ${pg.pgName}.`, link: '/app/owner/enquiries',
  });
  mail.newEnquiry(pg.ownerEmail, pg.pgName, req.body); // best effort, never blocks the response
  res.status(201).json({ success: true, message: 'Your enquiry was sent to the PG owner.' });
});
