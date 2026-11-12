import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal as TermIcon, ShieldAlert, RefreshCw } from 'lucide-react';

interface MudLog {
  id: number;
  text: string;
  type?: string;
  created_at?: string;
}

interface MudTerminalProps {
  onOpenSwitcher?: () => void;
}

export const MudTerminal: React.FC<MudTerminalProps> = ({ onOpenSwitcher }) => {
  const [logs, setLogs] = useState<MudLog[]>([
    {
      id: 1,
      text: "\x1b[1;36m=== Welcome to WallyMUD (PWA Mobile Terminal) ===\x1b[0m\nConnected to the realm of WallyMUD.\nType 'help' for commands, or use the quick action buttons below."
    }
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [lastLogId, setLastLogId] = useState(1);
  const [inCombat, setInCombat] = useState(false);
  const [promptStr, setPromptStr] = useState('<100hp 100m 100mv> ');
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('wallymud_token') : null;
  });
  const [characterName, setCharacterName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Convert basic ANSI colors to HTML styled spans
  const parseAnsi = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const styledSegments = line
        .replace(/\x1b\[1;31m/g, '<span style="color:#ef4444;font-weight:bold;">')
        .replace(/\x1b\[31m/g, '<span style="color:#f87171;">')
        .replace(/\x1b\[1;32m/g, '<span style="color:#10b981;font-weight:bold;">')
        .replace(/\x1b\[32m/g, '<span style="color:#34d399;">')
        .replace(/\x1b\[1;33m/g, '<span style="color:#fbbf24;font-weight:bold;">')
        .replace(/\x1b\[33m/g, '<span style="color:#fcd34d;">')
        .replace(/\x1b\[1;34m/g, '<span style="color:#38bdf8;font-weight:bold;">')
        .replace(/\x1b\[34m/g, '<span style="color:#60a5fa;">')
        .replace(/\x1b\[1;35m/g, '<span style="color:#c084fc;font-weight:bold;">')
        .replace(/\x1b\[35m/g, '<span style="color:#e879f9;">')
        .replace(/\x1b\[1;36m/g, '<span style="color:#22d3ee;font-weight:bold;">')
        .replace(/\x1b\[36m/g, '<span style="color:#67e8f9;">')
        .replace(/\x1b\[1;37m/g, '<span style="color:#ffffff;font-weight:bold;">')
        .replace(/\x1b\[37m/g, '<span style="color:#e2e8f0;">')
        .replace(/\x1b\[0m/g, '</span>');

      return (
        <div
          key={idx}
          dangerouslySetInnerHTML={{ __html: styledSegments || '&nbsp;' }}
          style={{ minHeight: '1.2em', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
        />
      );
    });
  };

  // Background poller
  useEffect(() => {
    if (!token) return;
    const intervalTime = inCombat ? 1500 : 3000;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `https://mud.wallyatkins.com/api/poll.php?token=${encodeURIComponent(token)}&last_log_id=${lastLogId}&cols=80`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.logs && data.logs.length > 0) {
              setLogs((prev) => [
                ...prev,
                ...data.logs.map((l: { id: number; message?: string; text?: string }) => ({
                  id: l.id,
                  text: l.message || l.text || ''
                }))
              ]);
            }
            if (data.last_log_id && data.last_log_id > lastLogId) {
              setLastLogId(data.last_log_id);
            }
            if (data.prompt) setPromptStr(data.prompt);
            if (data.in_combat !== undefined) setInCombat(data.in_combat);
            if (data.character?.name) setCharacterName(data.character.name);
          }
        }
      } catch {
        // Soft fail
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [token, lastLogId, inCombat]);

  const sendCommand = async (cmdToSend?: string) => {
    const cmd = (cmdToSend !== undefined ? cmdToSend : inputCommand).trim();
    if (!cmd && cmdToSend === undefined) return;

    if (cmd) {
      setHistory((prev) => [cmd, ...prev.slice(0, 49)]);
      setHistoryIndex(-1);
    }
    setInputCommand('');

    // Append echo to logs
    setLogs((prev) => [
      ...prev,
      { id: Date.now(), text: `\x1b[1;36m> ${cmd}\x1b[0m` }
    ]);

    setIsLoading(true);
    try {
      const res = await fetch('https://mud.wallyatkins.com/api/command.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || '',
          command: cmd,
          last_log_id: lastLogId,
          cols: 80
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.output) {
            setLogs((prev) => [...prev, { id: Date.now() + 1, text: data.output }]);
          }
          if (data.prompt) setPromptStr(data.prompt);
          if (data.in_combat !== undefined) setInCombat(data.in_combat);
          if (data.last_log_id && data.last_log_id > lastLogId) setLastLogId(data.last_log_id);
          if (data.token) {
            setToken(data.token);
            localStorage.setItem('wallymud_token', data.token);
          }
        } else {
          setLogs((prev) => [
            ...prev,
            { id: Date.now() + 2, text: `\x1b[31m[MUD System]: ${data.error || 'Command rejected'}\x1b[0m` }
          ]);
        }
      } else {
        setLogs((prev) => [
          ...prev,
          { id: Date.now() + 2, text: `\x1b[33m[Offline Echo]: Executed '${cmd}'. Connect to live realm at mud.wallyatkins.com\x1b[0m` }
        ]);
      }
    } catch {
      setLogs((prev) => [
        ...prev,
        { id: Date.now() + 2, text: `\x1b[33m[Local Echo]: '${cmd}'. Live realm unreachable directly from client.\x1b[0m` }
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIdx = historyIndex - 1;
        setHistoryIndex(prevIdx);
        setInputCommand(history[prevIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

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
      {/* Top Shell Header with Module Switcher Trigger */}
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
          aria-label="Switch Module"
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
          <span style={{ fontSize: '1.4rem' }}>⚔️</span>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#f8fafc', lineHeight: 1.1 }}>
              WallyMUD
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>
              Live Terminal
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '2px' }}>▾</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {inCombat && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
              <ShieldAlert size={14} /> In Combat
            </span>
          )}
          <button
            type="button"
            onClick={() => sendCommand('look')}
            title="Refresh Room (Look)"
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#38bdf8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <RefreshCw size={13} />
            <span>Look</span>
          </button>
        </div>
      </header>

      {/* Terminal Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1000px',
          width: '100%',
          margin: '0 auto',
          padding: '8px 12px',
          boxSizing: 'border-box'
        }}
      >
        {/* Terminal Title Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0d1829',
            border: '1px solid #1e3a5f',
            borderBottom: 'none',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            padding: '8px 14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TermIcon size={16} color="#38bdf8" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>
              Realm Console
            </span>
            {characterName && (
              <span style={{ fontSize: '11px', backgroundColor: '#1e293b', color: '#10b981', padding: '1px 6px', borderRadius: '4px' }}>
                {characterName}
              </span>
            )}
          </div>
        </div>

        {/* Terminal Screen */}
        <div
          style={{
            flex: 1,
            minHeight: '260px',
            backgroundColor: '#050a12',
            border: '1px solid #1e3a5f',
            padding: '14px',
            overflowY: 'auto',
            fontFamily: 'JetBrains Mono, "Courier New", Courier, monospace',
            fontSize: '13px',
            lineHeight: '1.45',
            color: '#cbd5e1'
          }}
        >
          {logs.map((log) => (
            <div key={log.id} style={{ marginBottom: '4px' }}>
              {parseAnsi(log.text)}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Quick Action Mobile Bar */}
        <div
          style={{
            backgroundColor: '#0d1829',
            borderLeft: '1px solid #1e3a5f',
            borderRight: '1px solid #1e3a5f',
            padding: '6px 8px',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', paddingRight: '4px' }}>
            Moves:
          </span>

          {['north', 'south', 'east', 'west', 'up', 'down'].map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => sendCommand(dir)}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '5px 9px',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {dir[0].toUpperCase()}
            </button>
          ))}

          <div style={{ width: '1px', height: '18px', backgroundColor: '#334155', margin: '0 4px', flexShrink: 0 }} />

          {['score', 'inventory', 'flee'].map((act) => (
            <button
              key={act}
              type="button"
              onClick={() => sendCommand(act)}
              style={{
                backgroundColor: act === 'flee' ? '#7f1d1d' : '#1e293b',
                border: act === 'flee' ? '1px solid #ef4444' : '1px solid #334155',
                borderRadius: '6px',
                padding: '5px 10px',
                color: act === 'flee' ? '#fca5a5' : '#f8fafc',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {act}
            </button>
          ))}
        </div>

        {/* Command Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#0d1829',
            border: '1px solid #1e3a5f',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            paddingTop: '8px',
            paddingLeft: 'max(12px, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(12px, env(safe-area-inset-right, 0px))',
            paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
            gap: '8px'
          }}
        >
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              color: '#10b981',
              whiteSpace: 'nowrap'
            }}
          >
            {promptStr}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Command (e.g. look, north, cast)..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1,
              backgroundColor: '#070d17',
              border: '1px solid #1e2d42',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#f8fafc',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              outline: 'none'
            }}
          />

          <button
            type="button"
            onClick={() => sendCommand()}
            disabled={isLoading}
            aria-label="Send Command"
            style={{
              backgroundColor: '#0284c7',
              border: 'none',
              borderRadius: '8px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
