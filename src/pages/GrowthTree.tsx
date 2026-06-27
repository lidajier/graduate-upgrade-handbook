import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { SKILL_NAMES, RECORD_TYPES } from '../types';
import type { UserStats } from '../types';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import {
  Trophy,
  Star,
  TrendingUp,
  Award,
  Lock,
  Zap,
  Flame,
  Target,
  BookOpen,
  Code,
  PenTool,
  Users,
  Lightbulb,
  FlaskConical,
  ArrowLeft,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const SKILL_KEYS = [
  'literature',
  'experiment',
  'coding',
  'writing',
  'presentation',
  'data',
] as const;

type SkillKey = (typeof SKILL_KEYS)[number];

const SKILL_COLORS: Record<SkillKey, { stroke: string; fill: string; bg: string }> = {
  literature: { stroke: '#60A5FA', fill: 'rgba(96,165,250,0.25)', bg: 'rgba(96,165,250,0.12)' },
  experiment: { stroke: '#34D399', fill: 'rgba(52,211,153,0.25)', bg: 'rgba(52,211,153,0.12)' },
  coding: { stroke: '#A78BFA', fill: 'rgba(167,139,250,0.25)', bg: 'rgba(167,139,250,0.12)' },
  writing: { stroke: '#F472B6', fill: 'rgba(244,114,182,0.25)', bg: 'rgba(244,114,182,0.12)' },
  presentation: { stroke: '#FBBF24', fill: 'rgba(251,191,36,0.25)', bg: 'rgba(251,191,36,0.12)' },
  data: { stroke: '#FB923C', fill: 'rgba(251,146,60,0.25)', bg: 'rgba(251,146,60,0.12)' },
};

const SKILL_ICONS: Record<SkillKey, LucideIcon> = {
  literature: BookOpen,
  experiment: FlaskConical,
  coding: Code,
  writing: PenTool,
  presentation: Users,
  data: Lightbulb,
};

const ACTIVITY_TYPE_ICONS: Record<string, LucideIcon> = {
  paper: BookOpen,
  experiment: FlaskConical,
  writing: PenTool,
  code: Code,
  meeting: Users,
  inspiration: Lightbulb,
};

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/** Get a single skill value from UserStats by skill key. */
function getSkillValue(stats: UserStats, key: SkillKey): number {
  const mapping: Record<SkillKey, keyof Pick<UserStats, `skill_${SkillKey}`>> = {
    literature: 'skill_literature',
    experiment: 'skill_experiment',
    coding: 'skill_coding',
    writing: 'skill_writing',
    presentation: 'skill_presentation',
    data: 'skill_data',
  };
  return (stats[mapping[key]] as number) ?? 0;
}

/** Format a timestamp as relative Chinese text. */
function formatRelativeTime(ts: string): string {
  const date = new Date(ts);
  if (isNaN(date.getTime())) return ts;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/** Generate the last 30 calendar days as an array. */
function buildLast30Days(
  activeDates: Set<string>,
): { date: string; dayOfWeek: number; dayOfMonth: number; active: boolean }[] {
  const days: { date: string; dayOfWeek: number; dayOfMonth: number; active: boolean }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      dayOfWeek: d.getDay(),
      dayOfMonth: d.getDate(),
      active: activeDates.has(dateStr),
    });
  }
  return days;
}

/* ─────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────── */

/** Level & XP header card */
const LevelHeader: React.FC<{
  level: number;
  totalXp: number;
  xpToNextLevel: number;
}> = ({ level, totalXp, xpToNextLevel }) => {
  const pct = xpToNextLevel > 0 ? Math.min((totalXp / xpToNextLevel) * 100, 100) : 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-gray-900/80 p-6 shadow-2xl backdrop-blur-xl">
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-indigo-500/15 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Level badge */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
            <span className="text-2xl font-black text-white">{level}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
                当前等级
              </span>
            </div>
            <p className="text-2xl font-bold text-white">Lv.{level}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-white/50">
            <span className="font-mono text-white/80">{totalXp.toLocaleString()}</span> /{' '}
            {xpToNextLevel.toLocaleString()} XP
          </p>
          <p className="text-xs text-white/40">
            距下一级还需 {Math.max(0, xpToNextLevel - totalXp).toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Shimmer */}
        <div
          className="absolute inset-y-0 w-16 animate-pulse rounded-full bg-white/20 blur-sm"
          style={{ left: `${Math.max(pct - 4, 0)}%` }}
        />
      </div>
    </div>
  );
};

/** Epic radar chart */
const SkillRadar: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const radarData = SKILL_KEYS.map((key) => ({
    skill: SKILL_NAMES[key] ?? key,
    value: getSkillValue(stats, key),
    fullMark: 100,
  }));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/60 p-4 shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white/80">
        <Target className="h-4 w-4 text-indigo-400" />
        能力雷达
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#818CF8" stopOpacity={0.5} />
              <stop offset="50%" stopColor="#C084FC" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{
              fill: 'rgba(255,255,255,0.6)',
              fontSize: 12,
              fontWeight: 500,
            }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
            axisLine={false}
            tickCount={6}
          />
          <Radar
            name="能力值"
            dataKey="value"
            stroke="#818CF8"
            strokeWidth={2}
            fill="url(#radarGradient)"
            fillOpacity={1}
            dot={{
              r: 3,
              fill: '#C084FC',
              stroke: '#fff',
              strokeWidth: 1,
            }}
            activeDot={{
              r: 6,
              fill: '#E0E7FF',
              stroke: '#818CF8',
              strokeWidth: 2,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Individual skill bar */
const SkillBar: React.FC<{
  skillKey: SkillKey;
  value: number;
}> = ({ skillKey, value }) => {
  const colors = SKILL_COLORS[skillKey];
  const IconComp = SKILL_ICONS[skillKey] ?? Star;
  const name = SKILL_NAMES[skillKey] ?? skillKey;
  // Cap display at 100, show raw value
  const pct = Math.min(value, 100);

  return (
    <div className="group relative rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-all hover:border-white/10 hover:bg-white/[0.06]">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: colors.bg }}
          >
            <IconComp size={14} style={{ color: colors.stroke }} />
          </div>
          <span className="text-sm font-medium text-white/80">{name}</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-bold"
          style={{ color: colors.stroke, backgroundColor: colors.bg }}
        >
          {value} pts
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${colors.stroke}, ${colors.stroke}88)`,
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/30">
        <span>熟练度</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
};

/** Full skill bars grid */
const SkillBars: React.FC<{ stats: UserStats }> = ({ stats }) => (
  <div className="space-y-2">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-white/80">
      <TrendingUp className="h-4 w-4 text-emerald-400" />
      技能详情
    </h3>
    <div className="grid gap-2">
      {SKILL_KEYS.map((key) => (
        <SkillBar key={key} skillKey={key} value={getSkillValue(stats, key)} />
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Achievement definitions
   ───────────────────────────────────────────── */

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

type AchievementCondition = (data: {
  stats: UserStats;
  papersLength: number;
  experimentsLength: number;
  meetingsLength: number;
  hasSummary: boolean;
}) => boolean;

const ACHIEVEMENT_DEFINITIONS: { def: AchievementDef; condition: AchievementCondition }[] = [
  {
    def: {
      id: 'rookie',
      name: '初出茅庐',
      description: '达到5级',
      icon: Award,
    },
    condition: ({ stats }) => stats.level >= 5,
  },
  {
    def: {
      id: 'literature_master',
      name: '文献达人',
      description: '阅读10篇论文',
      icon: BookOpen,
    },
    condition: ({ papersLength }) => papersLength >= 10,
  },
  {
    def: {
      id: 'experiment_master',
      name: '实验狂人',
      description: '完成10次实验',
      icon: FlaskConical,
    },
    condition: ({ experimentsLength }) => experimentsLength >= 10,
  },
  {
    def: {
      id: 'streak_7',
      name: '连续7天',
      description: '连续活跃7天',
      icon: Flame,
    },
    condition: ({ stats }) => stats.current_streak >= 7 || stats.longest_streak >= 7,
  },
  {
    def: {
      id: 'meeting_master',
      name: '组会战神',
      description: '参加5次组会',
      icon: Users,
    },
    condition: ({ meetingsLength }) => meetingsLength >= 5,
  },
  {
    def: {
      id: 'review_master',
      name: '综述大师',
      description: '完成首篇综述',
      icon: PenTool,
    },
    condition: ({ hasSummary }) => hasSummary,
  },
];

/** Achievements section */
const Achievements: React.FC<{
  stats: UserStats;
  papersLength: number;
  experimentsLength: number;
  meetingsLength: number;
  hasSummary: boolean;
}> = ({ stats, papersLength, experimentsLength, meetingsLength, hasSummary }) => {
  // Parse achievements JSON string to get unlocked set
  const unlockedSet = useMemo(() => {
    try {
      const parsed = JSON.parse(stats.achievements || '[]');
      return new Set<string>(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>();
    }
  }, [stats.achievements]);

  const computed = useMemo(
    () =>
      ACHIEVEMENT_DEFINITIONS.map(({ def, condition }) => ({
        ...def,
        earned:
          unlockedSet.has(def.id) ||
          condition({ stats, papersLength, experimentsLength, meetingsLength, hasSummary }),
      })),
    [unlockedSet, stats, papersLength, experimentsLength, meetingsLength, hasSummary],
  );

  const earnedCount = computed.filter((a) => a.earned).length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/60 p-4 shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/8 blur-3xl" />
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <Trophy className="h-4 w-4 text-amber-400" />
          成就徽章
        </h3>
        <span className="text-xs text-white/40">
          {earnedCount} / {computed.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {computed.map((ach) => {
          const IconComp = ach.icon;
          return (
            <div
              key={ach.id}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${
                ach.earned
                  ? 'border-amber-500/30 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                  : 'border-white/5 bg-white/[0.02] opacity-40 grayscale'
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  ach.earned
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-orange-500/20'
                    : 'bg-white/5'
                }`}
              >
                {ach.earned ? (
                  <IconComp size={20} className="text-white" />
                ) : (
                  <Lock size={16} className="text-white/30" />
                )}
              </div>
              <span
                className={`text-[11px] font-semibold leading-tight ${
                  ach.earned ? 'text-white/90' : 'text-white/30'
                }`}
              >
                {ach.name}
              </span>
              <span className="text-[9px] text-white/25">{ach.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Recent activity log (from records) */
const RECORD_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  RECORD_TYPES.map((t) => [t.value, t.label]),
);

const ActivityLog: React.FC<{ records: import('../types').Record[] }> = ({ records }) => {
  const recent = useMemo(
    () => [...records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
    [records],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/60 p-4 shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-blue-500/8 blur-3xl" />
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
        <Zap className="h-4 w-4 text-blue-400" />
        最近动态
      </h3>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-white/25">
          <Zap size={32} className="mb-2" />
          <p className="text-xs">暂无活动记录</p>
          <p className="text-[10px]">开始你的学术之旅吧！</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recent.map((record) => {
            const IconComp = ACTIVITY_TYPE_ICONS[record.type] ?? Zap;
            return (
              <div
                key={record.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-white/[0.04]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <IconComp size={14} className="text-white/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/75">{record.title}</p>
                  <p className="text-[10px] text-white/30">
                    {RECORD_TYPE_LABEL[record.type] ?? record.type} · {formatRelativeTime(record.created_at)}
                  </p>
                </div>
                {record.xp_earned > 0 && (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">
                    +{record.xp_earned} XP
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Streak heatmap calendar */
const StreakCalendar: React.FC<{
  activeDates: Set<string>;
  streak: number;
}> = ({ activeDates, streak }) => {
  const days = useMemo(() => buildLast30Days(activeDates), [activeDates]);

  /* Group into weeks (Sun-Sat) for display */
  const weeks = useMemo(() => {
    const w: (typeof days)[] = [];
    let current: typeof days = [];
    days.forEach((d) => {
      current.push(d);
      if (d.dayOfWeek === 6) {
        w.push(current);
        current = [];
      }
    });
    if (current.length > 0) w.push(current);
    return w;
  }, [days]);

  const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/60 p-4 shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-green-500/8 blur-3xl" />
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <Flame className="h-4 w-4 text-orange-400" />
          活跃日历
        </h3>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span>连续</span>
          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 font-bold text-orange-400">
            {streak} 天
          </span>
        </div>
      </div>

      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 pr-1">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="flex h-5 w-5 items-center justify-center text-[9px] text-white/25"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        <div className="flex gap-1 overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`h-5 w-5 rounded-sm transition-all ${
                    day.active
                      ? 'bg-emerald-500/70 shadow-sm shadow-emerald-500/30'
                      : 'bg-white/5'
                  }`}
                  title={`${day.date}${day.active ? ' - 活跃' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-3 text-[10px] text-white/30">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-white/5" />
          <span>未活跃</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-emerald-500/70" />
          <span>活跃</span>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main page component
   ───────────────────────────────────────────── */

const GrowthTree: React.FC = () => {
  const navigate = useNavigate();

  /* Pull everything from the actual Zustand store */
  const stats = useStore((s) => s.stats);
  const papers = useStore((s) => s.papers);
  const experiments = useStore((s) => s.experiments);
  const records = useStore((s) => s.records);
  const meetings = useStore((s) => s.meetings);
  const dailyLogs = useStore((s) => s.dailyLogs);

  // Derived data
  const xpToNextLevel = useMemo(
    () => (stats ? (stats.level ** 2) * 100 : 100),
    [stats?.level],
  );

  // Build active dates set from dailyLogs
  const activeDates = useMemo(() => {
    const set = new Set<string>();
    dailyLogs.forEach((log) => set.add(log.date));
    return set;
  }, [dailyLogs]);

  const hasSummary = useMemo(
    () => papers.some((p) => !!p.summary),
    [papers],
  );

  /* ── Loading / empty state ── */
  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center text-white/40">
          <Sparkles size={48} className="mx-auto mb-4 animate-pulse" />
          <p className="text-sm">正在加载成长数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Subtle background pattern */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.04),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-6">
        {/* ── Top bar ── */}
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/90"
          >
            <ArrowLeft size={16} />
            <span>返回</span>
          </button>
          <div className="flex-1" />
          <h1 className="flex items-center gap-2 text-lg font-bold tracking-wide">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              成长之树
            </span>
          </h1>
          <div className="flex-1" />
          {/* Spacer to balance the back button */}
          <div className="w-[68px]" />
        </div>

        {/* ── Level header ── */}
        <div className="mb-5">
          <LevelHeader
            level={stats.level}
            totalXp={stats.total_xp}
            xpToNextLevel={xpToNextLevel}
          />
        </div>

        {/* ── Radar chart + Skill bars ── */}
        <div className="mb-5 grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <SkillRadar stats={stats} />
          </div>
          <div className="lg:col-span-3">
            <SkillBars stats={stats} />
          </div>
        </div>

        {/* ── Achievements + Activity ── */}
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Achievements
            stats={stats}
            papersLength={papers.length}
            experimentsLength={experiments.length}
            meetingsLength={meetings.length}
            hasSummary={hasSummary}
          />
          <ActivityLog records={records} />
        </div>

        {/* ── Streak calendar ── */}
        <div className="mb-5">
          <StreakCalendar activeDates={activeDates} streak={stats.current_streak} />
        </div>

        {/* ── Footer ── */}
        <div className="text-center text-[10px] text-white/15">
          研究生升级宝典 · 每一步都算数
        </div>
      </div>
    </div>
  );
};

export default GrowthTree;
