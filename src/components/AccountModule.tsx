import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  RotateCcw,
  Globe,
  Sliders
} from 'lucide-react';

interface AccountModuleProps {
  onOpenSwitcher?: () => void;
  onSwitchToWebsite?: () => void;
}

interface UserProfile {
  id?: number;
  username?: string;
  name?: string;
  is_admin?: boolean;
  avatar_url?: string;
}

const CARRIERS = [
  { name: 'Google Fi (msg.fi.google.com)', gateway: 'msg.fi.google.com' },
  { name: 'Verizon (vtext.com)', gateway: 'vtext.com' },
  { name: 'AT&T (txt.att.net)', gateway: 'txt.att.net' },
  { name: 'T-Mobile (tmomail.net)', gateway: 'tmomail.net' },
  { name: 'Sprint (messaging.sprintpcs.com)', gateway: 'messaging.sprintpcs.com' },
  { name: 'US Cellular (email.uscc.net)', gateway: 'email.uscc.net' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC'
];

export const AccountModule: React.FC<AccountModuleProps> = ({
  onOpenSwitcher,
  onSwitchToWebsite
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [clientUuid, setClientUuid] = useState<string>('');
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  // Preference form state
  const [formData, setFormData] = useState({
    phone_number: '',
    carrier_gateway: 'msg.fi.google.com',
    timezone: 'America/New_York',
    push_pick_reminders: true,
    sms_pick_reminders: false,
    email_pick_reminders: false,
    mud_tells: false,
    task_due_reminders: true
  });

  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Load user status, client UUID, and push capability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const uuid = localStorage.getItem('pwa_client_uuid') || '';
      setClientUuid(uuid);

      const pushEnabled = localStorage.getItem('pwa_push_enabled') === 'true';
      setIsPushSubscribed(pushEnabled);

      if ('Notification' in window && 'serviceWorker' in navigator) {
        setIsPushSupported(true);
        setPushPermission(Notification.permission);
        if (Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then((reg) => {
            reg.pushManager.getSubscription().then((sub) => {
              if (sub) {
                setIsPushSubscribed(true);
                localStorage.setItem('pwa_push_enabled', 'true');
              }
            });
          }).catch(() => {});
        }
      }

      // Detect timezone
      try {
        const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detectedTz) {
          setFormData((prev) => ({ ...prev, timezone: detectedTz }));
        }
      } catch {}

      // Fetch user and notification preferences
      fetch('/football_api.php?action=auth_status')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            if (data.user.username) {
              localStorage.setItem('wally_user_name', data.user.username);
            }
          }
        })
        .catch(() => {});

      fetch('/football_api.php?action=get_notification_preferences')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.preferences) {
            const p = data.preferences;
            setFormData((prev) => ({
              ...prev,
              phone_number: p.phone_number || prev.phone_number,
              carrier_gateway: p.carrier_gateway || prev.carrier_gateway,
              timezone: p.timezone || prev.timezone,
              push_pick_reminders: p.push_pick_reminders ?? prev.push_pick_reminders,
              sms_pick_reminders: p.sms_pick_reminders ?? prev.sms_pick_reminders,
              email_pick_reminders: p.email_pick_reminders ?? prev.email_pick_reminders,
              mud_tells: p.mud_tells ?? prev.mud_tells,
              task_due_reminders: p.task_due_reminders ?? prev.task_due_reminders
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleToggle = (field: keyof typeof formData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setSaveSuccessMsg(false);
    try {
      const res = await fetch('/football_api.php?action=update_notification_preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSaveSuccessMsg(true);
        setTimeout(() => setSaveSuccessMsg(false), 3500);
      }
    } catch {
      // offline fallback
      localStorage.setItem('wally_notif_prefs_cache', JSON.stringify(formData));
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3500);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Convert urlBase64 to Uint8Array for VAPID
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    setTestPushStatus(null);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push notifications are not supported on this browser/environment.');
        return;
      }

      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm !== 'granted') {
        alert('Push notification permission was denied or dismissed.');
        return;
      }

      const vapidRes = await fetch('/football_api.php?action=get_vapid_public_key');
      const vapidData = await vapidRes.json();
      if (!vapidData.success || !vapidData.public_key) {
        throw new Error('Unable to fetch push notification server key');
      }

      const reg = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(vapidData.public_key);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource
      });

      const subJson = subscription.toJSON();
      const saveRes = await fetch('/football_api.php?action=save_push_subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subJson.keys,
          client_uuid: clientUuid
        })
      });

      if (saveRes.ok) {
        setIsPushSubscribed(true);
        localStorage.setItem('pwa_push_enabled', 'true');
        setTestPushStatus('Push notifications activated! Welcome notification dispatched.');
      } else {
        alert('Failed to register subscription with server.');
      }
    } catch (err: any) {
      alert(`Error enabling push notifications: ${err?.message || err}`);
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleSendTestPush = async () => {
    setIsSendingTestPush(true);
    setTestPushStatus(null);
    try {
      const res = await fetch('/football_api.php?action=test_push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_uuid: clientUuid })
      });
      const data = await res.json();
      if (data.success) {
        setTestPushStatus('Test notification sent! Check your phone lock screen.');
      } else {
        setTestPushStatus(`Test push failed: ${data.error || 'Server error'}`);
      }
    } catch {
      setTestPushStatus('Could not dispatch test push (offline or network error).');
    } finally {
      setIsSendingTestPush(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear all local PWA data and reload? Your saved preferences will reset to default.')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'WA';
  const displayName = user?.name || user?.username || 'Wally Atkins League Member';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        backgroundColor: '#040810',
        color: '#f8fafc'
      }}
    >
      {/* Sticky Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.65rem)',
          paddingBottom: '0.65rem',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
          backgroundColor: 'rgba(11, 22, 38, 0.95)',
          borderBottom: '1px solid #1e3a5f',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <button
          type="button"
          onClick={onOpenSwitcher}
          aria-label="Switch Application Module"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid #1e3a5f',
            borderRadius: '9999px',
            padding: '4px 14px 4px 10px',
            color: '#f8fafc',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>⚙️</span>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#f8fafc', lineHeight: 1.1 }}>
              Account &amp; Settings
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>
              Device &amp; Alerts
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '2px' }}>▾</span>
        </button>

        {onSwitchToWebsite && (
          <button
            type="button"
            onClick={onSwitchToWebsite}
            title="Switch to Desktop Website"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Globe size={14} />
            <span>Website</span>
          </button>
        )}
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
          padding: '16px 12px 60px 12px',
          boxSizing: 'border-box'
        }}
      >
        {/* Profile Card */}
        <div
          style={{
            backgroundColor: '#0d1829',
            border: '1px solid #1e3a5f',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '9999px',
              backgroundColor: '#1e3a5f',
              border: '2px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              fontWeight: 900,
              fontSize: '20px',
              flexShrink: 0
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
              {displayName}
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                User ID: #{user?.id ?? 1}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: user?.is_admin ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color: user?.is_admin ? '#f59e0b' : '#38bdf8',
                  border: user?.is_admin ? '1px solid #f59e0b' : '1px solid #38bdf8'
                }}
              >
                {user?.is_admin ? 'COMMISSIONER' : 'LEAGUE MEMBER'}
              </span>
            </div>
          </div>
        </div>

        {/* Push Notifications Hub */}
        <div
          style={{
            backgroundColor: '#0d1829',
            border: '1px solid #1e3a5f',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Bell size={20} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
              Mobile Lock Screen Push Notifications
            </h3>
          </div>

          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8', lineHeight: 1.4 }}>
            Get native push alerts on your lock screen before Thursday kickoff, 1 hour before Sunday games, and when MUD events occur.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#070d17',
              border: '1px solid #1e3a5f',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                Push Subscription Status
              </div>
              <div style={{ fontSize: '11px', color: isPushSubscribed ? '#10b981' : '#94a3b8', marginTop: '2px' }}>
                {!isPushSupported ? 'Push notifications not supported on this device/browser' : isPushSubscribed ? '● Active on this device' : `Permission: ${pushPermission}`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {!isPushSubscribed ? (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={isEnablingPush}
                  style={{
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {isEnablingPush ? 'Activating...' : 'Enable Push Notifications'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={isSendingTestPush}
                  style={{
                    backgroundColor: '#0284c7',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Send size={13} />
                  <span>{isSendingTestPush ? 'Dispatching...' : 'Send Test Notification'}</span>
                </button>
              )}
            </div>
          </div>

          {testPushStatus && (
            <div
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{testPushStatus}</span>
            </div>
          )}
        </div>

        {/* Notification Preferences Form */}
        <form
          onSubmit={handleSavePreferences}
          style={{
            backgroundColor: '#0d1829',
            border: '1px solid #1e3a5f',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
              Alerts &amp; Channels
            </h3>
          </div>

          {/* SMS / Carrier */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
              SMS Phone Number &amp; Carrier Gateway
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: '160px',
                  backgroundColor: '#070d17',
                  border: '1px solid #1e3a5f',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#f8fafc',
                  fontSize: '13px'
                }}
              />
              <select
                value={formData.carrier_gateway}
                onChange={(e) => setFormData({ ...formData, carrier_gateway: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: '180px',
                  backgroundColor: '#070d17',
                  border: '1px solid #1e3a5f',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#f8fafc',
                  fontSize: '13px'
                }}
              >
                {CARRIERS.map((c) => (
                  <option key={c.gateway} value={c.gateway}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              style={{
                backgroundColor: '#070d17',
                border: '1px solid #1e3a5f',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#f8fafc',
                fontSize: '13px'
              }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Switches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
            {[
              { id: 'push_pick_reminders', label: 'Push Pick Reminders', sub: 'Native lock screen notifications' },
              { id: 'sms_pick_reminders', label: 'SMS Pick Reminders', sub: 'Text alerts before pick lock' },
              { id: 'email_pick_reminders', label: 'Email Summaries', sub: 'Weekly results & pick recap' },
              { id: 'mud_tells', label: 'WallyMUD Character Tells', sub: 'Instant alert when messaged in MUD' },
              { id: 'task_due_reminders', label: 'WallyTasks Due Date Alerts', sub: 'Reminders for high priority tasks' }
            ].map((pref) => (
              <label
                key={pref.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#070d17',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    {pref.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {pref.sub}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean((formData as any)[pref.id])}
                  onChange={() => handleToggle(pref.id as any)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284c7' }}
                />
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
            {saveSuccessMsg ? (
              <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Preferences saved successfully!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={isSavingPrefs}
              style={{
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>

        {/* Application Reset & Device Info */}
        <div
          style={{
            backgroundColor: '#0d1829',
            border: '1px solid #1e3a5f',
            borderRadius: '16px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <RotateCcw size={18} color="#94a3b8" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#cbd5e1' }}>
              Device &amp; Storage Cache
            </h3>
          </div>

          <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
            If you experience stale assets or want to reset stored local tasks and sessions:
          </p>

          <button
            type="button"
            onClick={handleClearCache}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Clear Local Cache &amp; Reload PWA
          </button>
        </div>
      </main>
    </div>
  );
};
