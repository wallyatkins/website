import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Search
} from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'med' | 'low';
  category: 'pickem' | 'mud' | 'personal' | 'work';
  due?: string;
  source?: 'cloud' | 'local';
}

interface TasksModuleProps {
  onOpenSwitcher?: () => void;
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: '1',
    title: 'Submit NFL Week picks before Thursday Night Football kickoff',
    completed: false,
    priority: 'high',
    category: 'pickem',
    due: 'Thursday 8:15 PM',
    source: 'local'
  },
  {
    id: '2',
    title: 'Explore Merc Mud School level 2 and train character in WallyMUD',
    completed: false,
    priority: 'med',
    category: 'mud',
    due: 'This Weekend',
    source: 'local'
  },
  {
    id: '3',
    title: 'Enable PWA lock-screen push notifications in Account Settings',
    completed: true,
    priority: 'high',
    category: 'personal',
    source: 'local'
  },
  {
    id: '4',
    title: 'Verify cross-device layout on iPhone Dynamic Island and Pixel nav bar',
    completed: true,
    priority: 'med',
    category: 'work',
    source: 'local'
  }
];

export const TasksModule: React.FC<TasksModuleProps> = ({ onOpenSwitcher }) => {
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('wally_tasks_items');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_TASKS;
  });

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'med' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pickem' | 'mud' | 'personal' | 'work'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'med' | 'low'>('med');
  const [newCategory, setNewCategory] = useState<'pickem' | 'mud' | 'personal' | 'work'>('personal');
  const [newDue, setNewDue] = useState('');

  const [cloudSynced, setCloudSynced] = useState(false);

  // Sync to localStorage whenever tasks change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('wally_tasks_items', JSON.stringify(tasks));
      } catch {}
    }
  }, [tasks]);

  // Try to sync with tasks.wallyatkins.com API
  useEffect(() => {
    let isMounted = true;
    const syncCloud = async () => {
      try {
        const res = await fetch('https://tasks.wallyatkins.com/api.php?route=/tasks', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.tasks) && data.tasks.length > 0 && isMounted) {
            setCloudSynced(true);
            const cloudItems: TaskItem[] = data.tasks.map((t: any) => ({
              id: String(t.task_id || t.id || Math.random()),
              title: t.title || 'Untitled Task',
              completed: t.status === 'completed' || t.status === 'done',
              priority: t.priority === 'urgent' || t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'med',
              category: 'work',
              due: t.due_date || undefined,
              source: 'cloud'
            }));
            // Merge with local items preserving unsynced local tasks
            setTasks((prev) => {
              const localOnly = prev.filter((p) => p.source === 'local');
              return [...cloudItems, ...localOnly];
            });
          }
        }
      } catch {
        // Local mode fallback
      }
    };
    syncCloud();
    return () => { isMounted = false; };
  }, []);

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: TaskItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      completed: false,
      priority: newPriority,
      category: newCategory,
      due: newDue.trim() || undefined,
      source: 'local'
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTitle('');
    setNewDue('');
    setIsAdding(false);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.due && t.due.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = totalTasks - completedCount;
  const percentComplete = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getPriorityBadge = (p: 'high' | 'med' | 'low') => {
    switch (p) {
      case 'high':
        return (
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            HIGH
          </span>
        );
      case 'med':
        return (
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            MED
          </span>
        );
      case 'low':
        return (
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
            LOW
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: 'pickem' | 'mud' | 'personal' | 'work') => {
    const labels = {
      pickem: "🏈 Pick'em",
      mud: '⚔️ WallyMUD',
      personal: '👤 Personal',
      work: '💼 Work'
    };
    return (
      <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '2px 8px', borderRadius: '4px' }}>
        {labels[cat]}
      </span>
    );
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
      {/* Sticky Top Header */}
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
          <span style={{ fontSize: '1.4rem' }}>📋</span>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#f8fafc', lineHeight: 1.1 }}>
              WallyTasks
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>
              {cloudSynced ? 'Cloud Synced' : 'Local + Offline'}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '2px' }}>▾</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          style={{
            backgroundColor: '#0284c7',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 14px',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <Plus size={15} />
          <span>New Task</span>
        </button>
      </header>

      {/* Main Content Area */}
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
        {/* Progress & Overview Card */}
        <div
          style={{
            backgroundColor: '#0d1829',
            border: '1px solid #1e3a5f',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
              Completion Progress
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
              {percentComplete}% ({completedCount}/{totalTasks})
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${percentComplete}%`,
                height: '100%',
                backgroundColor: percentComplete === 100 ? '#10b981' : '#38bdf8',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Add Task Expandable Drawer */}
        {isAdding && (
          <form
            onSubmit={handleAddTask}
            style={{
              backgroundColor: '#0d1829',
              border: '1px solid #38bdf8',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>
              Create New Task
            </h3>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              style={{
                backgroundColor: '#070d17',
                border: '1px solid #1e3a5f',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  style={{
                    width: '100%',
                    backgroundColor: '#070d17',
                    border: '1px solid #1e3a5f',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                >
                  <option value="high">High Priority</option>
                  <option value="med">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  style={{
                    width: '100%',
                    backgroundColor: '#070d17',
                    border: '1px solid #1e3a5f',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                >
                  <option value="pickem">🏈 Pick'em</option>
                  <option value="mud">⚔️ WallyMUD</option>
                  <option value="personal">👤 Personal</option>
                  <option value="work">💼 Work</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Due / Reminder
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tonight, Friday"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#070d17',
                    border: '1px solid #1e3a5f',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Add Task
              </button>
            </div>
          </form>
        )}

        {/* Filters and Search Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0d1829',
                border: '1px solid #1e3a5f',
                borderRadius: '10px',
                padding: '9px 12px 9px 36px',
                color: '#f8fafc',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Tab Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {(['all', 'active', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                style={{
                  backgroundColor: filter === tab ? '#1e3a5f' : '#0d1829',
                  border: '1px solid',
                  borderColor: filter === tab ? '#38bdf8' : '#1e3a5f',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  color: filter === tab ? '#38bdf8' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab} {tab === 'all' ? `(${totalTasks})` : tab === 'active' ? `(${activeCount})` : `(${completedCount})`}
              </button>
            ))}
          </div>

          {/* Priority & Category filter chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, paddingRight: '2px' }}>
              PRIORITY:
            </span>
            {(['all', 'high', 'med', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                style={{
                  backgroundColor: priorityFilter === p ? '#1e293b' : 'transparent',
                  border: '1px solid',
                  borderColor: priorityFilter === p ? '#38bdf8' : '#334155',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  color: priorityFilter === p ? '#38bdf8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {p}
              </button>
            ))}

            <div style={{ width: '1px', height: '14px', backgroundColor: '#334155', margin: '0 4px', flexShrink: 0 }} />

            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, paddingRight: '2px' }}>
              CATEGORY:
            </span>
            {(['all', 'pickem', 'mud', 'personal', 'work'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                style={{
                  backgroundColor: categoryFilter === cat ? '#1e293b' : 'transparent',
                  border: '1px solid',
                  borderColor: categoryFilter === cat ? '#10b981' : '#334155',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  color: categoryFilter === cat ? '#10b981' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Task Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTasks.length === 0 ? (
            <div
              style={{
                backgroundColor: '#0d1829',
                border: '1px dashed #1e3a5f',
                borderRadius: '16px',
                padding: '32px 16px',
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <CheckSquare size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No tasks found in this view</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Create a new task above or adjust your filters.</p>
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: t.completed ? '#09101b' : '#0d1829',
                  border: '1px solid',
                  borderColor: t.completed ? '#142236' : '#1e3a5f',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  gap: '12px',
                  opacity: t.completed ? 0.75 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Complete Toggle Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleTask(t.id)}
                  aria-label={t.completed ? 'Mark task incomplete' : 'Mark task completed'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: t.completed ? '#10b981' : '#64748b',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {t.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>

                {/* Task Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: t.completed ? '#64748b' : '#f8fafc',
                      textDecoration: t.completed ? 'line-through' : 'none',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                      marginBottom: '4px'
                    }}
                  >
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {getPriorityBadge(t.priority)}
                    {getCategoryBadge(t.category)}
                    {t.due && (
                      <span style={{ fontSize: '11px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} color="#38bdf8" /> {t.due}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteTask(t.id)}
                  aria-label="Delete Task"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '6px'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
