import { useState, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { MessageSquare, Upload, X, Image as ImageIcon } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { ComplaintStatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { formatDateTime, formatRelative } from '../utils/format';
import type { ComplaintCategory } from '../types';

const categories: { name: ComplaintCategory; icon: string }[] = [
  { name: 'AC', icon: '❄️' },
  { name: 'WiFi', icon: '📡' },
  { name: 'Water', icon: '💧' },
  { name: 'Cleaning', icon: '🧹' },
  { name: 'Electrical', icon: '🔌' },
  { name: 'Plumbing', icon: '🔧' },
  { name: 'Other', icon: '📦' },
];

const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB demo storage limit

export default function TenantComplaintsPage() {
  const { data, addComplaint } = useAppStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const tenant = data.tenants.find((t) => t.id === data.activeTenantId);
  const room = data.rooms.find((r) => r.id === tenant?.roomId);

  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [error, setError] = useState('');

  if (!tenant) {
    return (
      <AppLayout role="tenant" title="Complaints">
        <div className="card p-10 text-center text-dark-500">Tenant profile not found. Please log in again.</div>
      </AppLayout>
    );
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPEG or PNG).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large. Please choose one under 1 MB (demo storage limit).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      setError('Please select a complaint category.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please describe the issue in at least 10 characters.');
      return;
    }
    addComplaint({
      tenantId: tenant.id,
      category,
      description: description.trim(),
      imageUrl,
      roomNumber: room?.roomNumber ?? '—',
    });
    toast.show('Complaint submitted! Your manager has been notified.', 'success');
    setCategory('');
    setDescription('');
    setImageUrl(undefined);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const myComplaints = data.complaints
    .filter((c) => c.tenantId === tenant.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const complaintsByStatus = myComplaints.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout role="tenant" title="Complaints">
      <div className="space-y-6">
        {/* Status header */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-dark-600">{complaintsByStatus.Submitted || 0} New</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-dark-600">{(complaintsByStatus.Seen || 0) + (complaintsByStatus['In Progress'] || 0)} In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-dark-600">{complaintsByStatus.Resolved || 0} Resolved</span>
          </div>
        </div>

        {/* Submit Complaint Form */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-dark-900 mb-4">Submit New Complaint</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Complaint Category *</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      category === cat.name
                        ? 'border-primary bg-primary-50'
                        : 'border-background-300 hover:border-primary hover:bg-background-200'
                    }`}
                  >
                    <span className="text-xl mb-1">{cat.icon}</span>
                    <span className="text-xs font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Room Number <span className="text-dark-400 font-normal">(auto-filled)</span>
                </label>
                <input type="text" value={room?.roomNumber ?? ''} disabled className="input-field bg-background-200 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">Date & Time</label>
                <input type="text" value={formatDateTime(new Date().toISOString())} disabled className="input-field bg-background-200 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                Description <span className="text-error">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue in detail..."
                className="input-field resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Upload Photo (Optional)</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {imageUrl ? (
                <div className="flex items-center gap-4 p-3 rounded-xl border border-background-300">
                  <img src={imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-dark-800">Photo attached</div>
                    <div className="text-xs text-dark-400">Will be shared with your manager</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl(undefined);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    className="p-2 rounded-lg hover:bg-error-light text-error"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-background-300 rounded-xl p-6 text-center hover:border-primary transition-colors"
                >
                  <Upload size={28} className="text-dark-300 mx-auto mb-2" />
                  <p className="text-sm text-dark-600">Click to upload a photo of the issue</p>
                  <p className="text-xs text-dark-400 mt-1">JPEG or PNG, up to 1 MB</p>
                </button>
              )}
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button type="submit" className="w-full btn-primary py-3">
              Submit Complaint
            </button>
          </form>
        </div>

        {/* Complaint History */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">My Complaints</h3>

          {myComplaints.length > 0 ? (
            <div className="space-y-4">
              {myComplaints.map((complaint) => (
                <div key={complaint.id} className="border border-background-300 rounded-xl p-5 hover:shadow-card transition-shadow">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
                        <MessageSquare size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-dark-900">{complaint.category}</div>
                        <div className="text-xs text-dark-500">{formatRelative(complaint.submittedAt)} • Room {complaint.roomNumber}</div>
                      </div>
                    </div>
                    <ComplaintStatusBadge status={complaint.status} />
                  </div>
                  <p className="text-dark-600 text-sm mb-3">{complaint.description}</p>
                  {complaint.imageUrl && (
                    <img src={complaint.imageUrl} alt="Complaint" className="rounded-lg max-h-40 object-cover mb-3 border border-background-300" />
                  )}
                  {complaint.remarks && (
                    <div className="p-3 rounded-lg bg-success-light text-success text-sm">
                      <strong>Update from manager:</strong> {complaint.remarks}
                      {complaint.resolvedAt && <span className="block text-xs mt-1 opacity-80">Resolved on {formatDateTime(complaint.resolvedAt)}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-block p-4 rounded-full bg-primary-50 text-primary mb-3">
                <ImageIcon size={32} />
              </div>
              <p className="text-dark-500">No complaints submitted yet. Everything working fine?</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
