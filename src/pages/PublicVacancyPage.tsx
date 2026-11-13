import { Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { BedDouble, Building2, MessageCircle, ArrowLeft, MapPin, Bath, Layers } from 'lucide-react';
import { formatINR } from '../utils/format';

export default function PublicVacancyPage() {
  const { data } = useAppStore();

  const vacantBeds = data.beds
    .filter((b) => b.status === 'vacant')
    .map((b) => ({ ...b, room: data.rooms.find((r) => r.id === b.roomId)! }))
    .filter((b) => b.room);

  const noticeBeds = data.beds.filter((b) => b.status === 'notice').length;
  const totalBeds = data.beds.length;

  // Rent guidance per room: use the lowest monthly rent among that room's active tenants.
  const roomRentFrom = (roomId: string) => {
    const rents = data.tenants
      .filter((t) => t.roomId === roomId && t.status !== 'Left')
      .map((t) => t.monthlyRent);
    return rents.length ? Math.min(...rents) : null;
  };

  const whatsappEnquiry = `https://wa.me/919167263576?text=${encodeURIComponent(
    `Hi, I saw the vacancy listing for ${data.settings.name} (${vacantBeds.length} beds available). I would like to enquire about a bed.`
  )}`;

  return (
    <div className="min-h-screen bg-background-200">
      {/* Header */}
      <header className="bg-white border-b border-background-300 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <div className="font-bold text-dark-900 leading-tight">{data.settings.name}</div>
              <div className="text-xs text-dark-400 flex items-center gap-1">
                <MapPin size={11} /> {data.settings.address}, {data.settings.city}
              </div>
            </div>
          </div>
          <Link to="/" className="btn-ghost text-sm">
            <ArrowLeft size={16} /> Back to Website
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-10">
          <span className="badge bg-success-light text-success mb-4">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Live availability • Updated just now
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-dark-900">Vacant Beds Available</h1>
          <p className="text-dark-500 mt-2 max-w-xl mx-auto">
            Currently {vacantBeds.length} of {totalBeds} beds are vacant
            {noticeBeds > 0 ? ` and ${noticeBeds} bed(s) will open soon (notice period)` : ''}. Rooms are allocated on a first-come, first-served basis.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-2xl mx-auto">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-success">{data.beds.filter((b) => b.status === 'occupied').length}</div>
            <div className="text-xs text-dark-400 mt-1">Occupied</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary">{vacantBeds.length}</div>
            <div className="text-xs text-dark-400 mt-1">Vacant Now</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-warning">{noticeBeds}</div>
            <div className="text-xs text-dark-400 mt-1">Opening Soon</div>
          </div>
        </div>

        {/* Vacant beds grouped by room */}
        {vacantBeds.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary flex items-center justify-center mx-auto mb-4">
              <BedDouble size={28} />
            </div>
            <h2 className="text-xl font-bold text-dark-900 mb-2">No vacant beds right now</h2>
            <p className="text-dark-500 text-sm mb-6">All beds are currently occupied. Leave an enquiry and we will contact you when a bed opens up.</p>
            <a href={whatsappEnquiry} target="_blank" rel="noreferrer" className="btn-primary">
              <MessageCircle size={16} /> Enquire on WhatsApp
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(
              vacantBeds.reduce<Record<string, typeof vacantBeds>>((acc, bed) => {
                (acc[bed.room.id] ||= []).push(bed);
                return acc;
              }, {})
            ).map(([roomId, beds]) => {
              const room = beds[0].room;
              const rentFrom = roomRentFrom(roomId);
              return (
                <div key={roomId} className="card p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-dark-900">Room {room.roomNumber}</div>
                        <div className="text-xs text-dark-500 flex flex-wrap gap-x-3">
                          <span className="inline-flex items-center gap-1"><Layers size={12} /> {room.sharingType}-sharing</span>
                          <span>Floor {room.floor}</span>
                          {room.attachedBathroom && <span className="inline-flex items-center gap-1"><Bath size={12} /> Attached bathroom</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {rentFrom ? (
                        <>
                          <div className="text-xs text-dark-400">Rent starting from</div>
                          <div className="font-bold text-primary">{formatINR(rentFrom)}/month</div>
                          <div className="text-[11px] text-dark-400">+ ₹{data.settings.foodCharge}/month food (optional)</div>
                        </>
                      ) : (
                        <div className="text-xs text-dark-400">Contact for pricing</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {beds.map((bed) => (
                      <div
                        key={bed.id}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 border border-primary-100 text-primary font-semibold text-sm"
                      >
                        <BedDouble size={16} />
                        Bed {bed.bedNumber}
                        <span className="text-[10px] font-medium bg-primary text-white px-2 py-0.5 rounded-full">AVAILABLE</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="card p-6 bg-gradient-to-r from-primary to-secondary text-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">Interested in a bed?</h3>
                  <p className="text-sm opacity-90">Contact us on WhatsApp for a visit or to block a bed.</p>
                </div>
                <a
                  href={whatsappEnquiry}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary rounded-xl font-bold hover:bg-primary-50 transition-colors"
                >
                  <MessageCircle size={16} /> Enquire on WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-dark-400 mt-10">
          Powered by <a href="https://pwscoding.co.in" target="_blank" rel="noreferrer" className="text-primary hover:underline">Aapka PG</a> •
          Tenant personal information is never shown on this page.
        </p>
      </main>
    </div>
  );
}
