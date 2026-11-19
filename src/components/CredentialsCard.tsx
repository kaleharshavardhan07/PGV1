import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { Credentials } from '../api/endpoints';

/** One-time display of freshly generated login details, with a copy button. */
export default function CredentialsCard({ credentials, heading }: { credentials: Credentials; heading: string }) {
  const [copied, setCopied] = useState(false);
  const idLabel = credentials.mobile ? 'Mobile' : 'Email';
  const idValue = credentials.mobile ?? credentials.email ?? '';
  const text = `Aapka PG login\n${idLabel}: ${idValue}\nPassword: ${credentials.password}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (insecure context): the values are visible to copy by hand */
    }
  };
  return (
    <div className="rounded-lg border border-success/30 bg-success-light p-4" role="status">
      <div className="font-semibold text-success text-sm mb-2">{heading}</div>
      <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-dark-500">{idLabel}</dt><dd className="font-mono text-dark-900 break-all">{idValue}</dd>
        <dt className="text-dark-500">Password</dt><dd className="font-mono text-dark-900 break-all select-all">{credentials.password}</dd>
      </dl>
      <p className="text-xs text-dark-500 mt-2">Share these now. For security the password is not shown again; you can reset it at any time.</p>
      <button className="btn-secondary !py-1.5 mt-3" onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy login details</>}</button>
    </div>
  );
}
