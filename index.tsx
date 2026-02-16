import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import {
    Dumbbell,
    BookOpen,
    Briefcase,
    Brain,
    Zap,
    Trophy,
    Calendar as CalendarIcon,
    Activity,
    Home,
    Plus,
    Flame,
    CheckCircle2,
    X,
    TrendingUp,
    Clock,
    Sword,
    Sparkles,
    Gift,
    Crown,
    Music,
    Palette,
    Code,
    Gamepad2,
    Bike,
    Utensils,
    Leaf,
    Shield,
    Heart,
    Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

type ActivityType = string; // Changed from union to string to support custom activities

type StatType = 'Strength' | 'Knowledge' | 'Wealth' | 'Mind' | 'Discipline';

interface Log {
    id: string;
    activityType: ActivityType;
    durationMinutes: number;
    xpEarned: number;
    timestamp: number;
    dateStr: string; // YYYY-MM-DD
    isCritical?: boolean;
}

interface CustomActivity {
    id: string;
    name: string;
    stat: StatType;
    iconKey: string;
    color: string;
    baseXP: number;
    baseDuration: number;
}

interface DailyQuestState {
    dateStr: string;
    completed: ActivityType[];
    bonusClaimed: boolean;
}

interface UserState {
    level: number;
    currentXP: number;
    totalXP: number;
    stats: Record<StatType, number>;
    logs: Log[];
    streak: number;
    lastLoginDate: string; // YYYY-MM-DD
    unlockedAchievements: string[];
    dailyQuests: DailyQuestState;
    inventory: string[];
    customActivities: CustomActivity[];
}

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    condition: (state: UserState, newLog?: Log) => boolean;
}

interface RewardEvent {
    type: 'CRITICAL' | 'BONUS' | 'ITEM' | 'LEVEL_UP' | 'QUEST_COMPLETE';
    message: string;
    xp?: number;
    item?: string;
}

// --- Constants & Config ---

const LEVEL_BASE = 100;
const LEVEL_MULTIPLIER = 1.5;

// Map for serializing/deserializing icons
const ICON_MAP: Record<string, React.ElementType> = {
    Dumbbell, BookOpen, Briefcase, Brain, Zap,
    Music, Palette, Code, Gamepad2, Bike,
    Utensils, Leaf, Shield, Heart, Star, Sword
};

const COLOR_PALETTE = [
    { label: 'Red', class: 'text-red-500' },
    { label: 'Orange', class: 'text-orange-500' },
    { label: 'Amber', class: 'text-amber-500' },
    { label: 'Yellow', class: 'text-yellow-500' },
    { label: 'Lime', class: 'text-lime-500' },
    { label: 'Green', class: 'text-green-500' },
    { label: 'Emerald', class: 'text-emerald-500' },
    { label: 'Teal', class: 'text-teal-500' },
    { label: 'Cyan', class: 'text-cyan-500' },
    { label: 'Sky', class: 'text-sky-500' },
    { label: 'Blue', class: 'text-blue-500' },
    { label: 'Indigo', class: 'text-indigo-500' },
    { label: 'Violet', class: 'text-violet-500' },
    { label: 'Purple', class: 'text-purple-500' },
    { label: 'Fuchsia', class: 'text-fuchsia-500' },
    { label: 'Pink', class: 'text-pink-500' },
    { label: 'Rose', class: 'text-rose-500' },
];

const DEFAULT_ACTIVITIES: { type: ActivityType; iconKey: string; stat: StatType; color: string; baseXP: number; baseDuration: number }[] = [
    { type: 'Workout', iconKey: 'Dumbbell', stat: 'Strength', color: 'text-red-500', baseXP: 40, baseDuration: 30 },
    { type: 'Reading', iconKey: 'BookOpen', stat: 'Knowledge', color: 'text-blue-500', baseXP: 25, baseDuration: 30 },
    { type: 'Work/Study', iconKey: 'Briefcase', stat: 'Wealth', color: 'text-yellow-500', baseXP: 50, baseDuration: 60 },
    { type: 'Meditation', iconKey: 'Brain', stat: 'Mind', color: 'text-purple-500', baseXP: 20, baseDuration: 15 },
    { type: 'Skill Learning', iconKey: 'Zap', stat: 'Knowledge', color: 'text-cyan-500', baseXP: 45, baseDuration: 30 },
];

const DAILY_QUESTS: { type: ActivityType; label: string; icon: React.ElementType }[] = [
    { type: 'Workout', label: 'Body Quest', icon: Dumbbell },
    { type: 'Reading', label: 'Knowledge Quest', icon: BookOpen },
    { type: 'Work/Study', label: 'Work Quest', icon: Briefcase },
    { type: 'Meditation', label: 'Mind Quest', icon: Brain },
];

const TITLES: Record<number, string> = {
    1: 'Novice',
    3: 'Beginner',
    5: 'Focused',
    7: 'Disciplined',
    10: 'Unstoppable',
    15: 'Elite',
    20: 'Ascended'
};

const LOOT_TABLE = [
    "Potion of Focus",
    "Scroll of Wisdom",
    "Dumbbell of Giants",
    "Coin of Discipline",
    "Timekeeper's Hourglass",
    "Meditative Gem"
];

const ACHIEVEMENTS_LIST: Achievement[] = [
    {
        id: 'first_step',
        title: 'First Step',
        description: 'Log your first activity.',
        icon: Activity,
        condition: (state) => state.logs.length >= 1,
    },
    {
        id: 'streak_7',
        title: 'On Fire',
        description: 'Reach a 7-day streak.',
        icon: Flame,
        condition: (state) => state.streak >= 7,
    },
    {
        id: 'reader',
        title: 'Bookworm',
        description: 'Log 30 hours of reading.',
        icon: BookOpen,
        condition: (state) => {
            const readingMins = state.logs
                .filter(l => l.activityType === 'Reading')
                .reduce((acc, curr) => acc + curr.durationMinutes, 0);
            return readingMins >= 30 * 60;
        },
    },
    {
        id: 'daily_grind',
        title: 'Daily Grind',
        description: 'Earn 100 XP in a single day.',
        icon: TrendingUp,
        condition: (state, newLog) => {
            if (!newLog) return false;
            const todayStr = new Date().toISOString().split('T')[0];
            const todayXP = state.logs
                .filter(l => l.dateStr === todayStr)
                .reduce((acc, curr) => acc + curr.xpEarned, 0);
            return todayXP >= 100;
        }
    },
    {
        id: 'early_riser',
        title: 'Early Riser',
        description: 'Log an activity before 8 AM.',
        icon: Clock,
        condition: (state, newLog) => {
            if (!newLog) return false;
            const hour = new Date(newLog.timestamp).getHours();
            return hour < 8 && hour >= 4;
        }
    }
];

const INITIAL_STATE: UserState = {
    level: 1,
    currentXP: 0,
    totalXP: 0,
    stats: {
        Strength: 0,
        Knowledge: 0,
        Wealth: 0,
        Mind: 0,
        Discipline: 0,
    },
    logs: [],
    streak: 0,
    lastLoginDate: '',
    unlockedAchievements: [],
    dailyQuests: { dateStr: '', completed: [], bonusClaimed: false },
    inventory: [],
    customActivities: []
};

// --- Sound Engine ---

const sfx = {
    ctx: null as AudioContext | null,
    init: () => {
        if (!sfx.ctx) {
            sfx.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    },
    play: (type: 'click' | 'success' | 'levelup' | 'critical' | 'quest') => {
        if (!sfx.ctx) sfx.init();
        const ctx = sfx.ctx!;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.1); // C#
            osc.frequency.setValueAtTime(659, now + 0.2); // E
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'critical') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.linearRampToValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'quest') {
            [440, 554, 659, 880].forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);
                o.type = 'sine';
                o.frequency.value = freq;
                g.gain.setValueAtTime(0.05, now + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
                o.start(now + i * 0.1);
                o.stop(now + i * 0.1 + 0.5);
            });
        } else if (type === 'levelup') {
            const melody = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50];
            const timings = [0, 0.1, 0.2, 0.4, 0.6, 1.0];
            melody.forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);
                o.type = 'triangle';
                o.frequency.value = freq;
                g.gain.setValueAtTime(0.1, now + timings[i]);
                g.gain.exponentialRampToValueAtTime(0.01, now + timings[i] + 0.4);
                o.start(now + timings[i]);
                o.stop(now + timings[i] + 0.4);
            });
        }
    }
};

const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(50);
};

const triggerSuccessHaptic = () => {
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
};

// --- Logic Helpers ---

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const getXPForLevel = (level: number) => Math.floor(LEVEL_BASE * Math.pow(level, LEVEL_MULTIPLIER));
const getLevelFromXP = (xp: number) => Math.floor(Math.pow(xp / LEVEL_BASE, 1 / LEVEL_MULTIPLIER)) + 1;

const getTitle = (level: number) => {
    const levels = Object.keys(TITLES).map(Number).sort((a, b) => b - a);
    for (const l of levels) {
        if (level >= l) return TITLES[l];
    }
    return TITLES[1];
};

const calculateXP = (baseXP: number, baseDuration: number, duration: number) => {
    const ratio = duration / baseDuration;
    return Math.round(baseXP * ratio);
};

// --- Components ---

const ProgressBar = ({ current, max, colorClass = "bg-blue-500", heightClass = "h-4" }: { current: number, max: number, colorClass?: string, heightClass?: string }) => {
    const progress = Math.min(100, Math.max(0, (current / max) * 100));
    return (
        <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${heightClass} border border-slate-700 shadow-inner`}>
            <motion.div
                className={`h-full ${colorClass} relative`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "circOut" }}
            >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
        </div>
    );
};

// --- App Root ---

const App = () => {
    const [gameState, setGameState] = useState<UserState>(() => {
        try {
            const saved = localStorage.getItem('liferpg_data');
            if (!saved) return INITIAL_STATE;
            const parsed = JSON.parse(saved);
            // Migration: ensure customActivities exists
            if (!parsed.customActivities) parsed.customActivities = [];
            return parsed;
        } catch (e) {
            return INITIAL_STATE;
        }
    });

    const [activeTab, setActiveTab] = useState<'dashboard' | 'stats' | 'achievements' | 'history'>('dashboard');
    const [showLogModal, setShowLogModal] = useState(false);
    const [rewardQueue, setRewardQueue] = useState<RewardEvent[]>([]);
    const [currentReward, setCurrentReward] = useState<RewardEvent | null>(null);

    useEffect(() => {
        localStorage.setItem('liferpg_data', JSON.stringify(gameState));
    }, [gameState]);

    useEffect(() => {
        if (!currentReward && rewardQueue.length > 0) {
            setCurrentReward(rewardQueue[0]);
            setRewardQueue(prev => prev.slice(1));
            if (rewardQueue[0].type === 'LEVEL_UP') sfx.play('levelup');
            else if (rewardQueue[0].type === 'CRITICAL') sfx.play('critical');
            else if (rewardQueue[0].type === 'QUEST_COMPLETE') sfx.play('quest');
            else sfx.play('success');
        }
    }, [rewardQueue, currentReward]);

    // Merge default and custom activities
    const allActivities = useMemo(() => {
        const customs = gameState.customActivities.map(c => ({
            type: c.name,
            iconKey: c.iconKey,
            stat: c.stat,
            color: c.color,
            baseXP: c.baseXP,
            baseDuration: c.baseDuration
        }));
        return [...DEFAULT_ACTIVITIES, ...customs];
    }, [gameState.customActivities]);

    // Init & Date Checks
    useEffect(() => {
        const today = formatDate(new Date());
        const yesterday = formatDate(new Date(Date.now() - 86400000));

        setGameState(prev => {
            let newState = { ...prev };
            if (newState.dailyQuests?.dateStr !== today) {
                newState.dailyQuests = { dateStr: today, completed: [], bonusClaimed: false };
            }
            if (prev.lastLoginDate !== today) {
                if (prev.lastLoginDate && prev.lastLoginDate < yesterday) {
                    newState.streak = 0;
                }
            }
            return newState;
        });
    }, []);

    const nextLevelXP = getXPForLevel(gameState.level);
    const currentLevelBaseXP = getXPForLevel(gameState.level - 1);
    const xpProgress = gameState.totalXP - currentLevelBaseXP;
    const xpRequiredForNext = nextLevelXP - currentLevelBaseXP;
    const todayStr = formatDate(new Date());
    const todayXP = gameState.logs.filter(l => l.dateStr === todayStr).reduce((a, b) => a + b.xpEarned, 0);

    const handleAddCustomActivity = (activity: CustomActivity) => {
        setGameState(prev => ({
            ...prev,
            customActivities: [...prev.customActivities, activity]
        }));
    };

    const handleLogActivity = (type: ActivityType, duration: number) => {
        sfx.play('click');
        triggerHaptic();

        const activityDef = allActivities.find(a => a.type === type);
        if (!activityDef) return;

        let baseXP = calculateXP(activityDef.baseXP, activityDef.baseDuration, duration);
        let totalNewXP = baseXP;
        const now = new Date();
        const newRewards: RewardEvent[] = [];

        // --- Random Rewards ---
        const roll = Math.random();
        let isCritical = false;

        if (roll < 0.10) {
            isCritical = true;
            totalNewXP *= 2;
            newRewards.push({ type: 'CRITICAL', message: 'Critical Success! XP Doubled!', xp: totalNewXP });
        } else if (roll < 0.25) {
            const bonus = Math.floor(Math.random() * 20) + 10;
            totalNewXP += bonus;
            newRewards.push({ type: 'BONUS', message: 'Bonus Focus!', xp: bonus });
        } else if (roll < 0.30) {
            const item = LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)];
            newRewards.push({ type: 'ITEM', message: 'You found an item!', item });
        }

        // --- Streak Logic ---
        let newStreak = gameState.streak;
        const lastLogDate = gameState.lastLoginDate;
        const yesterday = formatDate(new Date(Date.now() - 86400000));

        if (lastLogDate !== todayStr) {
            if (lastLogDate === yesterday) newStreak += 1;
            else newStreak = 1;

            if (newStreak > 0 && newStreak % 7 === 0) {
                totalNewXP += 100;
                newRewards.push({ type: 'BONUS', message: '7 Day Streak Bonus!', xp: 100 });
            }
        }

        // --- Daily Quest Logic ---
        let currentDailyState = { ...gameState.dailyQuests };
        const isQuestType = DAILY_QUESTS.some(q => q.type === type);
        if (isQuestType && !currentDailyState.completed.includes(type)) {
            currentDailyState.completed = [...currentDailyState.completed, type];
            if (currentDailyState.completed.length === 4 && !currentDailyState.bonusClaimed) {
                currentDailyState.bonusClaimed = true;
                const questBonus = 80;
                totalNewXP += questBonus;
                newRewards.push({ type: 'QUEST_COMPLETE', message: 'Daily Quests Completed!', xp: questBonus });
                triggerSuccessHaptic();
            }
        }

        const newLog: Log = {
            id: Date.now().toString(),
            activityType: type,
            durationMinutes: duration,
            xpEarned: totalNewXP,
            timestamp: now.getTime(),
            dateStr: todayStr,
            isCritical
        };

        // Update Stats
        const newStats = { ...gameState.stats };
        newStats[activityDef.stat] += baseXP;
        newStats['Discipline'] += 5;

        // Update Level
        const newTotalXP = gameState.totalXP + totalNewXP;
        const newLevel = getLevelFromXP(newTotalXP);

        if (newLevel > gameState.level) {
            newRewards.push({ type: 'LEVEL_UP', message: `Level ${newLevel} Reached!` });
            triggerSuccessHaptic();
        }

        // Achievements
        const newUnlocked = [...gameState.unlockedAchievements];
        const tempState = { ...gameState, logs: [newLog, ...gameState.logs], streak: newStreak, totalXP: newTotalXP };
        ACHIEVEMENTS_LIST.forEach(ach => {
            if (!newUnlocked.includes(ach.id) && ach.condition(tempState, newLog)) {
                newUnlocked.push(ach.id);
                newRewards.push({ type: 'BONUS', message: `Achievement: ${ach.title}` });
            }
        });

        let newInventory = gameState.inventory;
        const itemReward = newRewards.find(r => r.type === 'ITEM');
        if (itemReward && itemReward.item) {
            newInventory = [...newInventory, itemReward.item];
        }

        setGameState(prev => ({
            ...prev,
            level: newLevel,
            currentXP: prev.currentXP + totalNewXP,
            totalXP: newTotalXP,
            stats: newStats,
            logs: [newLog, ...prev.logs],
            streak: newStreak,
            lastLoginDate: todayStr,
            unlockedAchievements: newUnlocked,
            dailyQuests: currentDailyState,
            inventory: newInventory
        }));

        if (newRewards.length > 0) {
            setRewardQueue(prev => [...prev, ...newRewards]);
        }

        setShowLogModal(false);
    };

    const closeReward = () => setCurrentReward(null);

    return (
        <div className="min-h-screen pb-24 relative overflow-x-hidden bg-[#020617] text-slate-200 select-none">

            {/* Reward Overlay */}
            <AnimatePresence>
                {currentReward && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
                        onClick={closeReward}
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.5, y: 50 }}
                            className={`
                            relative w-full max-w-sm p-8 rounded-2xl text-center border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)]
                            ${currentReward.type === 'CRITICAL' ? 'bg-red-950 border-red-500 shadow-red-900/50' : ''}
                            ${currentReward.type === 'LEVEL_UP' ? 'bg-yellow-950 border-yellow-500 shadow-yellow-900/50' : ''}
                            ${currentReward.type === 'QUEST_COMPLETE' ? 'bg-emerald-950 border-emerald-500 shadow-emerald-900/50' : ''}
                            ${currentReward.type === 'ITEM' ? 'bg-indigo-950 border-indigo-500 shadow-indigo-900/50' : ''}
                            ${currentReward.type === 'BONUS' ? 'bg-slate-900 border-slate-600' : ''}
                        `}
                        >
                            <motion.div
                                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="mx-auto mb-6 w-24 h-24 rounded-full flex items-center justify-center border-4 border-white/20 bg-white/10"
                            >
                                {currentReward.type === 'CRITICAL' && <Sword size={48} className="text-red-400" />}
                                {currentReward.type === 'LEVEL_UP' && <Crown size={48} className="text-yellow-400" />}
                                {currentReward.type === 'QUEST_COMPLETE' && <CheckCircle2 size={48} className="text-emerald-400" />}
                                {currentReward.type === 'ITEM' && <Gift size={48} className="text-indigo-400" />}
                                {currentReward.type === 'BONUS' && <Sparkles size={48} className="text-blue-400" />}
                            </motion.div>

                            <h2 className="text-3xl font-display font-bold text-white mb-2 uppercase tracking-widest drop-shadow-md">
                                {currentReward.type === 'CRITICAL' ? 'CRITICAL!' :
                                    currentReward.type === 'LEVEL_UP' ? 'LEVEL UP!' :
                                        currentReward.type === 'QUEST_COMPLETE' ? 'QUEST COMPLETE!' :
                                            currentReward.type === 'ITEM' ? 'LOOT FOUND!' : 'BONUS!'}
                            </h2>

                            <p className="text-lg text-white/90 font-medium mb-2">{currentReward.message}</p>

                            {currentReward.xp && (
                                <div className="text-4xl font-black text-white drop-shadow-lg mb-4">+{currentReward.xp} XP</div>
                            )}
                            {currentReward.item && (
                                <div className="text-xl font-bold text-indigo-300 mb-4">{currentReward.item}</div>
                            )}

                            <p className="text-xs text-white/50 animate-pulse mt-8">Tap to continue</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="max-w-md mx-auto h-full">
                {activeTab === 'dashboard' && (
                    <DashboardView
                        state={gameState} xpProgress={xpProgress} xpRequired={xpRequiredForNext} todayXP={todayXP}
                        onOpenLog={() => {
                            sfx.play('click');
                            setShowLogModal(true);
                        }}
                    />
                )}
                {activeTab === 'stats' && <StatsView state={gameState} allActivities={allActivities} />}
                {activeTab === 'achievements' && <AchievementsView state={gameState} />}
                {activeTab === 'history' && <HistoryView logs={gameState.logs} allActivities={allActivities} />}
            </main>

            {/* Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent pointer-events-none">
                <nav className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl flex justify-between items-center px-2 py-2 pointer-events-auto">
                    <NavButton icon={Home} label="Base" active={activeTab === 'dashboard'} onClick={() => { sfx.play('click'); setActiveTab('dashboard'); }} />
                    <NavButton icon={Activity} label="Stats" active={activeTab === 'stats'} onClick={() => { sfx.play('click'); setActiveTab('stats'); }} />

                    <div className="relative -top-6 mx-2">
                        <button
                            onClick={() => {
                                sfx.play('click');
                                setShowLogModal(true);
                            }}
                            className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center transition-transform active:scale-95 border-4 border-[#020617]"
                        >
                            <Plus className="w-8 h-8" strokeWidth={3} />
                        </button>
                    </div>

                    <NavButton icon={CalendarIcon} label="History" active={activeTab === 'history'} onClick={() => { sfx.play('click'); setActiveTab('history'); }} />
                    <NavButton icon={Trophy} label="Awards" active={activeTab === 'achievements'} onClick={() => { sfx.play('click'); setActiveTab('achievements'); }} />
                </nav>
            </div>

            {/* Log Modal */}
            <AnimatePresence>
                {showLogModal && (
                    <LogActivityModal
                        onClose={() => setShowLogModal(false)}
                        onLog={handleLogActivity}
                        activities={allActivities}
                        onAddCustom={handleAddCustomActivity}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sub-Components ---

const DashboardView = ({ state, xpProgress, xpRequired, todayXP, onOpenLog }: any) => {
    const title = getTitle(state.level);

    return (
        <div className="p-6 pt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-4xl font-display font-bold text-white tracking-tight">LifeRPG</h1>
                    <div className="flex items-center space-x-2 mt-1">
                        <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Rank:</span>
                        <span className="text-indigo-400 text-sm font-bold shadow-indigo-500/20 drop-shadow-sm">{title}</span>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl flex flex-col items-center min-w-[80px]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Level</span>
                    <span className="text-2xl font-black text-white leading-none">{state.level}</span>
                </div>
            </header>

            {/* Main XP Card */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-3xl overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>

                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Next Level Progress</span>
                            <div className="text-3xl font-display font-bold text-white mt-1">
                                {xpProgress} <span className="text-lg text-slate-600 font-medium">/ {xpRequired}</span>
                            </div>
                        </div>
                        <Trophy className="text-yellow-500/20 w-12 h-12 absolute right-6 top-6" />
                    </div>
                    <ProgressBar current={xpProgress} max={xpRequired} heightClass="h-4" colorClass="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x" />
                    <div className="mt-3 text-right text-xs text-indigo-400 font-bold">
                        {xpRequired - xpProgress} XP Remaining
                    </div>
                </div>
            </div>

            {/* Daily Quests Panel */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-slate-200 font-display font-bold text-lg mb-4 flex items-center">
                    <Crown size={18} className="mr-2 text-yellow-500" /> Daily Quests
                </h3>
                <div className="space-y-3">
                    {DAILY_QUESTS.map((quest) => {
                        const isComplete = state.dailyQuests.completed.includes(quest.type);
                        return (
                            <div key={quest.type} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isComplete ? 'bg-emerald-950/30 border-emerald-900' : 'bg-slate-950 border-slate-900'}`}>
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${isComplete ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-900 text-slate-600'}`}>
                                        <quest.icon size={16} />
                                    </div>
                                    <span className={`text-sm font-medium ${isComplete ? 'text-emerald-400 line-through decoration-emerald-500/50' : 'text-slate-400'}`}>{quest.label}</span>
                                </div>
                                {isComplete && <CheckCircle2 size={18} className="text-emerald-500" />}
                            </div>
                        );
                    })}
                </div>
                {state.dailyQuests.bonusClaimed && (
                    <div className="mt-4 text-center text-xs font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                        Daily Bonus Claimed (+80 XP)
                    </div>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 ring-1 ring-orange-500/20">
                        <Flame size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white leading-none">{state.streak}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Day Streak</div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 ring-1 ring-emerald-500/20">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white leading-none">{todayXP}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Today's XP</div>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={onOpenLog}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
                <Plus size={20} strokeWidth={3} />
                <span>LOG ACTIVITY</span>
            </button>
        </div>
    );
};

const StatsView = ({ state, allActivities }: { state: UserState, allActivities: any[] }) => (
    <div className="p-6 pt-10 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl font-display font-bold text-white mb-8">Character Sheet</h2>
        <div className="space-y-6">
            {Object.entries(state.stats).map(([key, value]) => {
                const activity = allActivities.find(a => a.stat === key);
                const Icon = activity && ICON_MAP[activity.iconKey] ? ICON_MAP[activity.iconKey] : Activity;
                const color = activity ? activity.color : (key === 'Discipline' ? 'text-emerald-500' : 'text-slate-500');
                const barColor = color.replace('text-', 'bg-');

                // Stat Level Calculation
                const level = Math.floor(Math.sqrt(value / 50)) + 1;
                const nextXP = 50 * Math.pow(level, 2);
                const prevXP = 50 * Math.pow(level - 1, 2);
                const progress = value - prevXP;
                const required = nextXP - prevXP;

                return (
                    <div key={key} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center space-x-3">
                                <span className={`p-2 rounded-xl bg-slate-950 ${color} ring-1 ring-white/10`}>
                                    {key === 'Discipline' ? <Clock size={18} /> : <Icon size={18} />}
                                </span>
                                <span className="font-bold text-lg text-slate-200">{key}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-500 uppercase">Level</span>
                                <span className="text-xl font-black text-white leading-none">{level}</span>
                            </div>
                        </div>
                        <ProgressBar current={progress} max={required} colorClass={barColor} heightClass="h-3" />
                        <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>{value} Total XP</span>
                            <span>{Math.round(progress)} / {Math.round(required)} XP</span>
                        </div>
                    </div>
                );
            })}
        </div>

        {state.inventory.length > 0 && (
            <div className="mt-8">
                <h3 className="text-xl font-display font-bold text-white mb-4">Inventory</h3>
                <div className="grid grid-cols-2 gap-3">
                    {state.inventory.map((item, i) => (
                        <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center space-x-3">
                            <Gift size={16} className="text-indigo-400" />
                            <span className="text-xs font-bold text-slate-300">{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

const HistoryView = ({ logs, allActivities }: { logs: Log[], allActivities: any[] }) => {
    // Last 35 days for a nice grid
    const days = useMemo(() => {
        const result = [];
        for (let i = 34; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = formatDate(d);
            const dayLogs = logs.filter(l => l.dateStr === dateStr);
            const xp = dayLogs.reduce((acc, l) => acc + l.xpEarned, 0);
            result.push({ date: d, xp, dateStr });
        }
        return result;
    }, [logs]);

    return (
        <div className="p-6 pt-10 animate-in fade-in slide-in-from-right-8 duration-500">
            <h2 className="text-3xl font-display font-bold text-white mb-8">Quest Log</h2>

            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 mb-8 shadow-xl">
                <div className="grid grid-cols-7 gap-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-slate-600 mb-2">{d}</div>
                    ))}
                    {days.map((day) => (
                        <div
                            key={day.dateStr}
                            className={`aspect-square rounded-lg flex items-center justify-center text-[10px] transition-all relative group cursor-default ${day.xp > 0
                                ? day.xp > 150
                                    ? 'bg-emerald-500 text-emerald-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105 z-10'
                                    : 'bg-emerald-900/60 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-950 text-slate-700 border border-slate-900'
                                }`}
                        >
                            {day.date.getDate()}
                        </div>
                    ))}
                </div>
            </div>

            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Adventures</h3>
            <div className="space-y-3 pb-20">
                {logs.length === 0 && <p className="text-slate-600 italic text-center py-8">No legends written yet.</p>}
                {logs.slice(0, 20).map(log => {
                    const act = allActivities.find(a => a.type === log.activityType);
                    const Icon = act && ICON_MAP[act.iconKey] ? ICON_MAP[act.iconKey] : Activity;
                    return (
                        <div key={log.id} className={`flex justify-between items-center p-3 rounded-xl border ${log.isCritical ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-900/50 border-slate-800/50'}`}>
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg bg-slate-950 ${act ? act.color : 'text-slate-400'}`}>
                                    <Icon size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-200 flex items-center">
                                        {log.activityType}
                                        {log.isCritical && <span className="ml-2 text-[10px] bg-red-500 text-white px-1.5 rounded font-black uppercase">Crit!</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.durationMinutes}m
                                    </div>
                                </div>
                            </div>
                            <span className={`text-sm font-bold ${log.isCritical ? 'text-red-400' : 'text-indigo-400'}`}>+{log.xpEarned} XP</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AchievementsView = ({ state }: { state: UserState }) => (
    <div className="p-6 pt-10 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl font-display font-bold text-white mb-2">Hall of Fame</h2>
        <p className="text-slate-400 text-sm mb-8">Legendary feats and titles.</p>

        <div className="space-y-4">
            {ACHIEVEMENTS_LIST.map(ach => {
                const isUnlocked = state.unlockedAchievements.includes(ach.id);
                return (
                    <div key={ach.id} className={`relative flex items-center p-4 rounded-2xl border transition-all overflow-hidden ${isUnlocked ? 'bg-slate-900 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'bg-slate-950 border-slate-900 opacity-60 grayscale'}`}>
                        {isUnlocked && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent" />}
                        <div className={`relative p-3 rounded-xl mr-4 ${isUnlocked ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30' : 'bg-slate-900 text-slate-600'}`}>
                            <ach.icon size={24} />
                        </div>
                        <div className="relative flex-1">
                            <h4 className={`font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{ach.title}</h4>
                            <p className="text-xs text-slate-400">{ach.description}</p>
                        </div>
                        {isUnlocked && <CheckCircle2 className="relative ml-auto text-emerald-500 w-6 h-6" />}
                    </div>
                );
            })}
        </div>
    </div>
);

const CreateActivityForm = ({ onSave, onCancel }: { onSave: (act: CustomActivity) => void, onCancel: () => void }) => {
    const [name, setName] = useState('');
    const [stat, setStat] = useState<StatType>('Strength');
    const [selectedIcon, setSelectedIcon] = useState('Sword');
    const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);

    const handleSave = () => {
        if (!name.trim()) return;
        const newAct: CustomActivity = {
            id: Date.now().toString(),
            name: name,
            stat: stat,
            iconKey: selectedIcon,
            color: selectedColor.class,
            baseXP: 30, // Default balanced XP
            baseDuration: 30
        };
        onSave(newAct);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <button onClick={onCancel} className="text-sm text-indigo-400 font-bold flex items-center mb-4 hover:underline">
                <span className="mr-1">←</span> Back to activities
            </button>

            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-1">Create New Quest</h3>
                <p className="text-xs text-slate-500">Define a new activity to track</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Quest Name</label>
                    <input
                        value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Painting, Soccer, Coding"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none font-bold"
                    />
                </div>

                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Associated Attribute</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['Strength', 'Knowledge', 'Wealth', 'Mind', 'Discipline'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStat(s as StatType)}
                                className={`text-xs font-bold py-2 rounded-lg border ${stat === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Select Icon</label>
                    <div className="grid grid-cols-6 gap-2">
                        {Object.keys(ICON_MAP).map(key => {
                            const Icon = ICON_MAP[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedIcon(key)}
                                    className={`aspect-square flex items-center justify-center rounded-lg border ${selectedIcon === key ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
                                >
                                    <Icon size={18} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Select Color</label>
                    <div className="grid grid-cols-9 gap-2">
                        {COLOR_PALETTE.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedColor(c)}
                                className={`w-6 h-6 rounded-full border-2 ${selectedColor.label === c.label ? 'border-white scale-110' : 'border-transparent'} ${c.class.replace('text-', 'bg-')}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={!name.trim()}
                className={`w-full py-3 rounded-xl font-bold transition-all ${!name.trim() ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95'}`}
            >
                CREATE QUEST
            </button>
        </div>
    );
};

const LogActivityModal = ({ onClose, onLog, activities, onAddCustom }: { onClose: () => void, onLog: (type: ActivityType, duration: number) => void, activities: any[], onAddCustom: (act: CustomActivity) => void }) => {
    const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [customDuration, setCustomDuration] = useState('');

    const handleQuickLog = (duration: number) => {
        if (selectedType) onLog(selectedType, duration);
    };

    if (isCreating) {
        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#0f172a] w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
                >
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <CreateActivityForm
                            onCancel={() => setIsCreating(false)}
                            onSave={(newAct) => {
                                onAddCustom(newAct);
                                setIsCreating(false);
                            }}
                        />
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#0f172a] w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700 flex flex-col max-h-[90vh] shadow-2xl"
            >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0f172a] sticky top-0 z-10 rounded-t-3xl">
                    <h3 className="text-xl font-display font-bold text-white">Log Quest</h3>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {!selectedType ? (
                        <div className="grid grid-cols-2 gap-3">
                            {activities.map(act => {
                                const Icon = ICON_MAP[act.iconKey] || Activity;
                                return (
                                    <button
                                        key={act.type}
                                        onClick={() => {
                                            sfx.play('click');
                                            setSelectedType(act.type);
                                        }}
                                        className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl hover:bg-slate-900 transition-all border border-slate-800 hover:border-indigo-500/50 group"
                                    >
                                        <div className={`p-4 rounded-full bg-slate-900 mb-3 ${act.color} group-hover:scale-110 transition-transform shadow-lg`}>
                                            <Icon size={28} />
                                        </div>
                                        <span className="font-bold text-slate-300 text-sm group-hover:text-white text-center leading-tight">{act.type}</span>
                                    </button>
                                );
                            })}

                            {/* Create New Button */}
                            <button
                                onClick={() => {
                                    sfx.play('click');
                                    setIsCreating(true);
                                }}
                                className="flex flex-col items-center justify-center p-6 bg-indigo-900/10 rounded-2xl hover:bg-indigo-900/20 transition-all border border-indigo-500/30 border-dashed group"
                            >
                                <div className="p-4 rounded-full bg-indigo-500/20 mb-3 text-indigo-400 group-hover:scale-110 transition-transform shadow-lg">
                                    <Plus size={28} />
                                </div>
                                <span className="font-bold text-indigo-300 text-sm group-hover:text-white">Create New</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <button onClick={() => setSelectedType(null)} className="text-sm text-indigo-400 font-bold flex items-center mb-4 hover:underline">
                                <span className="mr-1">←</span> Back to selection
                            </button>

                            <div className="text-center mb-8 bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                                {(() => {
                                    const act = activities.find(a => a.type === selectedType);
                                    if (!act) return null;
                                    const Icon = ICON_MAP[act.iconKey] || Activity;
                                    return (
                                        <>
                                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 ${act.color.replace('text', 'bg')}/10 blur-3xl rounded-full pointer-events-none`}></div>
                                            <Icon className={`relative w-16 h-16 mx-auto mb-4 ${act.color}`} />
                                            <h4 className="relative text-2xl font-bold text-white">{selectedType}</h4>
                                            <p className="relative text-slate-500 text-sm">+{act.baseXP} XP / {act.baseDuration} mins</p>
                                        </>
                                    );
                                })()}
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold mb-3 block">Select Duration</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[15, 30, 45, 60, 90, 120].map(min => (
                                        <button
                                            key={min}
                                            onClick={() => handleQuickLog(min)}
                                            className="bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 py-3 rounded-xl border border-slate-700 transition-all font-bold text-sm active:scale-95"
                                        >
                                            {min}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Custom Duration (mins)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={customDuration}
                                        onChange={(e) => setCustomDuration(e.target.value)}
                                        className="bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 w-full focus:outline-none focus:border-indigo-500 transition-colors font-bold"
                                        placeholder="e.g. 25"
                                    />
                                    <button
                                        onClick={() => {
                                            const val = parseInt(customDuration);
                                            if (val > 0) handleQuickLog(val);
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-xl font-bold transition-colors active:scale-95"
                                    >
                                        LOG
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-14 transition-all rounded-xl ${active ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Icon size={24} className={active ? 'mb-1 stroke-[2.5px] drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'mb-0'} />
        {active && <span className="text-[10px] font-bold">{label}</span>}
    </button>
);

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <HashRouter>
            <App />
        </HashRouter>
    );
}
