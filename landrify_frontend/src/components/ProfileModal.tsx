import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Mail, Phone, ShieldCheck, BadgeCheck, Loader2, CheckCircle2, AlertCircle, Crown } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { updateMe } from '../api/auth';
import { verifyNIN } from '../api/payments';
import type { User } from '../types/api';

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onUpdated: () => void;
}

export function ProfileModal({ open, onClose, user, onUpdated }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [nin, setNin] = useState('');
  const [verifyingNin, setVerifyingNin] = useState(false);
  const [ninMsg, setNinMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setNin('');
      setNinMsg(null);
      setProfileMsg(null);
    }
  }, [user, open]);

  if (!user) return null;

  const saveProfile = async () => {
    setSavingProfile(true); setProfileMsg(null);
    try {
      await updateMe({ full_name: fullName, phone });
      setProfileMsg({ type: 'ok', text: 'Profile updated.' });
      onUpdated();
    } catch (e: any) {
      setProfileMsg({ type: 'err', text: e?.response?.data?.detail || 'Could not save changes.' });
    } finally { setSavingProfile(false); }
  };

  const submitNin = async () => {
    setNinMsg(null);
    if (!/^\d{11}$/.test(nin)) {
      setNinMsg({ type: 'err', text: 'NIN must be exactly 11 digits.' });
      return;
    }
    setVerifyingNin(true);
    // Simulated NIMC lookup delay so the UX matches a real verification call
    const minDelay = new Promise((r) => setTimeout(r, 1800));
    try {
      const [res] = await Promise.all([verifyNIN(nin), minDelay]);
      if (res.nin_verified) {
        setNinMsg({ type: 'ok', text: res.message || 'NIN verified successfully.' });
        setNin('');
        onUpdated();
      } else {
        setNinMsg({ type: 'err', text: res.error || 'Verification failed.' });
      }
    } catch (e: any) {
      setNinMsg({ type: 'err', text: e?.response?.data?.error || e?.userMessage || 'Verification failed.' });
    } finally { setVerifyingNin(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-8 bg-gradient-to-br from-landrify-green to-landrify-green-dark text-white">
              <button onClick={onClose} aria-label="Close"
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/15 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-xl font-bold backdrop-blur-sm">
                  {(user.full_name || user.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-2xl truncate">{user.full_name || 'Welcome'}</div>
                  <div className="text-sm text-white/80 truncate">{user.email}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${
                  user.is_pro ? 'bg-yellow-400 text-yellow-900' : 'bg-white/15 text-white'
                }`}>
                  <Crown className="w-3.5 h-3.5" /> {user.is_pro ? 'Pro' : 'Basic'}
                </span>
                {user.nin_verified && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white text-landrify-green">
                    <BadgeCheck className="w-3.5 h-3.5" /> NIN Verified
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-6 space-y-6">
              {/* Profile fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-11" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={user.email} disabled className="pl-11 bg-gray-50 text-gray-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." className="pl-11" />
                  </div>
                </div>

                {/* NIN row */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                    NIN (National Identity Number)
                  </label>

                  {user.nin_verified ? (
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                      <Input
                        value={`••••••• ${user.nin_last_four ?? ''}`}
                        disabled
                        className="pl-11 pr-28 bg-emerald-50/60 text-emerald-800 border-emerald-200 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={nin}
                          onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                          placeholder="Enter your 11-digit NIN"
                          inputMode="numeric"
                          autoComplete="off"
                          disabled={verifyingNin}
                          maxLength={11}
                          className="w-full pl-11 pr-24 py-3 rounded-xl border border-gray-200 bg-white text-base font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-landrify-green/30 focus:border-landrify-green disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <button
                          type="button"
                          onClick={submitNin}
                          disabled={verifyingNin || nin.length !== 11}
                          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-bold text-landrify-green hover:text-landrify-green-dark disabled:text-gray-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-landrify-green/5 transition"
                        >
                          {verifyingNin ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</>
                          ) : (
                            'Verify'
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        We verify your NIN with NIMC. This is required to download official reports.
                      </p>
                    </>
                  )}

                  {ninMsg && (
                    <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                      ninMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {ninMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                      <span>{ninMsg.text}</span>
                    </div>
                  )}
                </div>
              </div>

              {profileMsg && (
                <div className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg ${
                  profileMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}>
                  {profileMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={onClose} className="px-4 py-2 h-10 text-sm">Close</Button>
              <Button onClick={saveProfile} disabled={savingProfile} className="px-6 py-2 h-10 text-sm">
                {savingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Save changes'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
