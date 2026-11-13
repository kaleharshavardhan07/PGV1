import { User, Phone, Mail, Building2, CreditCard, FileText, Camera, FileCheck2, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import AppLayout from '../components/AppLayout';
import { formatDate, formatINR } from '../utils/format';

export default function TenantProfilePage() {
  const { data } = useAppStore();
  const tenant = data.tenants.find((t) => t.id === data.activeTenantId);
  const room = data.rooms.find((r) => r.id === tenant?.roomId);

  if (!tenant) {
    return (
      <AppLayout role="tenant" title="My Profile">
        <div className="card p-10 text-center text-dark-500">Tenant profile not found. Please log in again.</div>
      </AppLayout>
    );
  }

  const documents = [
    { label: 'ID Proof', desc: 'Aadhaar Card / Passport', file: tenant.idProofUrl, icon: FileText, color: 'bg-error-light text-error' },
    { label: 'Photograph', desc: 'Passport size photo', file: tenant.photographUrl, icon: Camera, color: 'bg-primary-50 text-primary' },
    { label: 'Rental Agreement', desc: 'Signed agreement', file: tenant.agreementUrl, icon: FileCheck2, color: 'bg-secondary-50 text-secondary-600' },
  ];

  const verificationIcon =
    tenant.policeVerification === 'Verified' ? ShieldCheck : tenant.policeVerification === 'Pending' ? ShieldAlert : ShieldQuestion;

  return (
    <AppLayout role="tenant" title="My Profile">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {tenant.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-dark-900">{tenant.fullName}</h2>
              <p className="text-dark-500">Tenant • Room {room?.roomNumber}, Bed {tenant.bedNumber} • {data.settings.name}</p>
              <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                <span className={`badge ${tenant.status === 'Active' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>
                  {tenant.status}
                </span>
                <span className="badge bg-primary-50 text-primary">Joined {formatDate(tenant.joiningDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4 flex items-center gap-2">
            <User size={20} className="text-primary" />
            Personal Information
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Mobile Number</label>
                <div className="flex items-center gap-2 text-dark-900 font-medium">
                  <Phone size={16} className="text-primary" />
                  {tenant.mobile}
                </div>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Email</label>
                <div className="flex items-center gap-2 text-dark-900 font-medium">
                  <Mail size={16} className="text-primary" />
                  {tenant.email || '—'}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Emergency Contact</label>
                <div className="flex items-center gap-2 text-dark-900 font-medium">
                  <Phone size={16} className="text-error" />
                  {tenant.emergencyContact || '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Police Verification</label>
                <div className={`inline-flex items-center gap-2 font-medium px-3 py-2 rounded-lg ${
                  tenant.policeVerification === 'Verified'
                    ? 'bg-success-light text-success'
                    : tenant.policeVerification === 'Pending'
                    ? 'bg-warning-light text-warning'
                    : 'bg-background-200 text-dark-500'
                }`}>
                  {(() => {
                    const Icon = verificationIcon;
                    return <Icon size={16} />;
                  })()}
                  {tenant.policeVerification}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accommodation Details */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-secondary" />
            Accommodation Details
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background-200">
              <label className="block text-xs text-dark-400 mb-1">Room Number</label>
              <div className="text-dark-900 font-medium">{room?.roomNumber}</div>
            </div>
            <div className="p-4 rounded-xl bg-background-200">
              <label className="block text-xs text-dark-400 mb-1">Bed Number</label>
              <div className="text-dark-900 font-medium">Bed {tenant.bedNumber}</div>
            </div>
            <div className="p-4 rounded-xl bg-background-200">
              <label className="block text-xs text-dark-400 mb-1">Sharing Type</label>
              <div className="text-dark-900 font-medium">{room?.sharingType}-sharing</div>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-success" />
            Financial Information
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-success to-emerald-600 text-white">
              <label className="text-xs opacity-80 mb-1 block">Security Deposit</label>
              <div className="text-2xl font-bold">{formatINR(tenant.securityDeposit)}</div>
              <div className="text-xs opacity-70 mt-1">Refundable at checkout</div>
            </div>
            <div className="p-4 rounded-xl bg-background-200">
              <label className="block text-xs text-dark-400 mb-1">Monthly Charges</label>
              <div className="text-dark-900 font-medium">
                {formatINR(tenant.monthlyRent)} rent + {formatINR(data.settings.foodCharge)} food
              </div>
              <div className="text-xs text-dark-400 mt-1">
                Total: {formatINR(tenant.monthlyRent + data.settings.foodCharge)} per month
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">Documents</h3>
          <div className="space-y-3">
            {documents.map((doc) => {
              const Icon = doc.icon;
              const uploaded = !!doc.file;
              return (
                <div key={doc.label} className="flex items-center justify-between p-3 rounded-lg bg-background-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${doc.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-dark-900">{doc.label}</div>
                      <div className="text-xs text-dark-500">{uploaded ? doc.file : doc.desc}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${uploaded ? 'text-success' : 'text-dark-400'}`}>
                    {uploaded ? 'Uploaded' : 'Not uploaded'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-dark-400 mt-4">
            Documents are private to you and the PG management. They are never shown publicly.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
