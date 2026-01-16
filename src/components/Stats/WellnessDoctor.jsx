import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    BrainCircuit,
    Sun,
    Calendar,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Moon,
    Smile,
    Target,
    Zap,
    Heart,
    CheckCircle2,
    Trophy,
    Flame,
    Lightbulb
} from 'lucide-react';
import {
    generateDayPrediction,
    getWeeklyStats,
    getBurnoutIndicators,
    getMoodLabel,
    getStreaks,
    getDayOfWeekPatterns,
    getRecommendations
} from '../../services/wellnessService';

const WellnessDoctor = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('today');
    const [dayPrediction, setDayPrediction] = useState(null);
    const [weeklyStats, setWeeklyStats] = useState(null);
    const [burnoutIndicators, setBurnoutIndicators] = useState(null);
    const [streaks, setStreaks] = useState(null);
    const [dayPatterns, setDayPatterns] = useState(null);
    const [recommendations, setRecommendations] = useState([]);

    // Load data on mount
    useEffect(() => {
        setDayPrediction(generateDayPrediction());
        setWeeklyStats(getWeeklyStats());
        setBurnoutIndicators(getBurnoutIndicators());
        setStreaks(getStreaks());
        setDayPatterns(getDayOfWeekPatterns());
        setRecommendations(getRecommendations());
    }, []);

    // Tab configuration
    const tabs = [
        { id: 'today', label: "Today's Prediction", icon: Sun },
        { id: 'weekly', label: 'Weekly Review', icon: Calendar },
        { id: 'insights', label: 'Insights', icon: Lightbulb },
        { id: 'burnout', label: 'Burnout Status', icon: AlertTriangle }
    ];

    const renderTodayPrediction = () => {
        if (!dayPrediction) return null;

        if (!dayPrediction.hasSleepData) {
            return (
                <div className="text-center py-16">
                    <Moon className="mx-auto text-purple-400 mb-4" size={64} />
                    <h3 className="text-2xl font-bold text-text-primary mb-2">No Sleep Data Yet</h3>
                    <p className="text-text-secondary">{dayPrediction.message}</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Energy Level Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-panel p-8 border-2 ${dayPrediction.energyLevel === 'high'
                        ? 'border-green-500/50 bg-green-500/5'
                        : dayPrediction.energyLevel === 'low'
                            ? 'border-orange-500/50 bg-orange-500/5'
                            : 'border-blue-500/50 bg-blue-500/5'
                        }`}
                >
                    <div className="flex items-center gap-6">
                        <div className="text-6xl">{dayPrediction.energyEmoji}</div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-text-primary mb-2">
                                {dayPrediction.energyLevel === 'high' && 'High Energy Day!'}
                                {dayPrediction.energyLevel === 'moderate' && 'Moderate Energy'}
                                {dayPrediction.energyLevel === 'low' && 'Low Energy Day'}
                            </h3>
                            <p className="text-text-secondary text-lg">{dayPrediction.insight}</p>
                        </div>
                        {dayPrediction.sleepScore && (
                            <div className="text-right hidden md:block">
                                <div className="text-4xl font-bold text-text-primary">{dayPrediction.sleepScore}%</div>
                                <div className="text-sm text-text-tertiary">Sleep Score</div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Moon className="text-purple-400" size={24} />
                            <span className="text-text-secondary">Last Night</span>
                        </div>
                        <div className="text-3xl font-bold text-text-primary">{dayPrediction.sleepHours}h</div>
                        <div className="text-sm text-text-tertiary mt-1">Quality: {dayPrediction.sleepQuality}/5</div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Target className="text-green-glow" size={24} />
                            <span className="text-text-secondary">Expected Tasks</span>
                        </div>
                        <div className="text-3xl font-bold text-text-primary">{dayPrediction.predictedTasks || '—'}</div>
                        <div className="text-sm text-text-tertiary mt-1">
                            {dayPrediction.confidence === 'high' ? '🎯 High confidence' :
                                dayPrediction.confidence === 'medium' ? '📊 Medium confidence' :
                                    'Need more data'}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Smile className="text-yellow-500" size={24} />
                            <span className="text-text-secondary">Expected Mood</span>
                        </div>
                        <div className="text-3xl font-bold text-text-primary">
                            {dayPrediction.predictedMood ? getMoodLabel(parseFloat(dayPrediction.predictedMood)) : '—'}
                        </div>
                        <div className="text-sm text-text-tertiary mt-1">
                            {dayPrediction.predictedMood ? `Avg: ${dayPrediction.predictedMood}/5` : 'Log more moods'}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Calendar className="text-blue-400" size={24} />
                            <span className="text-text-secondary">{dayPrediction.dayOfWeek} Avg</span>
                        </div>
                        <div className="text-3xl font-bold text-text-primary">{dayPrediction.dayAvgTasks || '—'}</div>
                        <div className="text-sm text-text-tertiary mt-1">tasks on this day</div>
                    </motion.div>
                </div>

                {/* Streaks */}
                {streaks && (streaks.goodSleep > 0 || streaks.goodMood > 0 || streaks.productive > 0) && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel p-6">
                        <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Flame className="text-orange-500" size={20} />
                            Current Streaks
                        </h4>
                        <div className="flex flex-wrap gap-4">
                            {streaks.goodSleep > 0 && (
                                <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30">
                                    <span className="text-purple-400 font-semibold">🌙 {streaks.goodSleep} days good sleep</span>
                                </div>
                            )}
                            {streaks.goodMood > 0 && (
                                <div className="px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                                    <span className="text-yellow-500 font-semibold">😊 {streaks.goodMood} days good mood</span>
                                </div>
                            )}
                            {streaks.productive > 0 && (
                                <div className="px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
                                    <span className="text-green-glow font-semibold">✅ {streaks.productive} productive days</span>
                                </div>
                            )}
                            {streaks.logging > 0 && (
                                <div className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30">
                                    <span className="text-blue-400 font-semibold">📝 {streaks.logging} days logging</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Tips */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-panel p-6">
                    <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <Zap className="text-yellow-500" size={20} />
                        Today's Tips
                    </h4>
                    <ul className="space-y-3">
                        {dayPrediction.energyLevel === 'high' && (
                            <>
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-green-glow shrink-0 mt-0.5" size={18} />
                                    Tackle your most challenging tasks during peak morning hours
                                </li>
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-green-glow shrink-0 mt-0.5" size={18} />
                                    Great day for creative work and complex problem-solving
                                </li>
                            </>
                        )}
                        {dayPrediction.energyLevel === 'moderate' && (
                            <>
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                    Balance challenging and routine tasks throughout the day
                                </li>
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                    Take short breaks to maintain focus
                                </li>
                            </>
                        )}
                        {dayPrediction.energyLevel === 'low' && (
                            <>
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-orange-400 shrink-0 mt-0.5" size={18} />
                                    Prioritize only essential tasks today
                                </li>
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-orange-400 shrink-0 mt-0.5" size={18} />
                                    Consider a 20-minute power nap if possible
                                </li>
                            </>
                        )}
                    </ul>
                </motion.div>
            </div>
        );
    };

    const renderWeeklyReview = () => {
        if (!weeklyStats) return null;

        const getTrendIcon = (trend) => {
            if (trend === 'up') return <TrendingUp className="text-green-glow" size={16} />;
            if (trend === 'down') return <TrendingDown className="text-red-500" size={16} />;
            return null;
        };

        return (
            <div className="space-y-6">
                {/* Summary Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                        Week of {weeklyStats.period.start} to {weeklyStats.period.end}
                    </h3>
                    <p className="text-text-secondary text-lg">
                        You completed <span className="text-green-glow font-bold">{weeklyStats.tasks.total} tasks</span>
                        {weeklyStats.tasks.trend && (
                            <span className={`ml-2 ${weeklyStats.tasks.trend === 'up' ? 'text-green-glow' : weeklyStats.tasks.trend === 'down' ? 'text-red-500' : 'text-text-tertiary'}`}>
                                ({weeklyStats.tasks.trend === 'up' ? '+' : ''}{weeklyStats.tasks.changePercent}% vs last week)
                            </span>
                        )}
                        {weeklyStats.mood.avg && (
                            <> with avg mood <span className="text-yellow-500 font-bold">{getMoodLabel(parseFloat(weeklyStats.mood.avg))}</span></>
                        )}
                        {weeklyStats.sleep.avgHours && (
                            <> and <span className="text-purple-400 font-bold">{weeklyStats.sleep.avgHours}h</span> avg sleep</>
                        )}.
                    </p>
                </motion.div>

                {/* Stats Grid with Trends */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Target className="text-green-glow" size={24} />
                                <span className="text-text-secondary">Tasks</span>
                            </div>
                            {getTrendIcon(weeklyStats.tasks.trend)}
                        </div>
                        <div className="text-4xl font-bold text-green-glow">{weeklyStats.tasks.total}</div>
                        {weeklyStats.tasks.prevTotal > 0 && (
                            <div className="text-sm text-text-tertiary mt-1">Last week: {weeklyStats.tasks.prevTotal}</div>
                        )}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Smile className="text-yellow-500" size={24} />
                                <span className="text-text-secondary">Avg Mood</span>
                            </div>
                            {getTrendIcon(weeklyStats.mood.trend)}
                        </div>
                        <div className="text-4xl font-bold text-yellow-500">{weeklyStats.mood.avg || '—'}</div>
                        {weeklyStats.mood.prevAvg && (
                            <div className="text-sm text-text-tertiary mt-1">Last week: {weeklyStats.mood.prevAvg}</div>
                        )}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Moon className="text-purple-400" size={24} />
                                <span className="text-text-secondary">Avg Sleep</span>
                            </div>
                            {getTrendIcon(weeklyStats.sleep.trend)}
                        </div>
                        <div className="text-4xl font-bold text-purple-400">{weeklyStats.sleep.avgHours || '—'}h</div>
                        {weeklyStats.sleep.prevAvgHours && (
                            <div className="text-sm text-text-tertiary mt-1">Last week: {weeklyStats.sleep.prevAvgHours}h</div>
                        )}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <AlertTriangle className="text-orange-400" size={24} />
                            <span className="text-text-secondary">Sleep Debt</span>
                        </div>
                        <div className="text-4xl font-bold text-orange-400">{weeklyStats.sleep.debt || '0'}h</div>
                        <div className="text-sm text-text-tertiary mt-1">Below 7.5h target</div>
                    </motion.div>
                </div>

                {/* Best Day */}
                {weeklyStats.bestDay && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel p-6 border border-green-glow/30">
                        <h4 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                            <Trophy className="text-yellow-500" size={20} />
                            Best Day
                        </h4>
                        <p className="text-text-secondary">
                            <span className="text-green-glow font-bold">{weeklyStats.bestDay.date}</span> — {weeklyStats.bestDay.tasks} tasks completed!
                        </p>
                    </motion.div>
                )}
            </div>
        );
    };

    const renderInsights = () => {
        return (
            <div className="space-y-6">
                {/* Day of Week Patterns */}
                {dayPatterns && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
                        <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Calendar className="text-blue-400" size={20} />
                            Day-of-Week Patterns
                        </h4>
                        <div className="grid grid-cols-7 gap-2">
                            {dayPatterns.patterns.map((day, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg text-center ${day.name === dayPatterns.bestDay ? 'bg-green-500/20 border border-green-500/30' :
                                        day.name === dayPatterns.worstDay ? 'bg-orange-500/10 border border-orange-500/20' :
                                            'bg-glass-surface'
                                        }`}
                                >
                                    <div className="text-xs text-text-tertiary mb-1">{day.name.slice(0, 3)}</div>
                                    <div className="text-lg font-bold text-text-primary">{day.avgTasks || '—'}</div>
                                    <div className="text-xs text-text-tertiary">tasks</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex gap-4 text-sm">
                            {dayPatterns.bestDay && (
                                <span className="text-green-glow">🏆 Best: {dayPatterns.bestDay}</span>
                            )}
                            {dayPatterns.worstDay && (
                                <span className="text-text-tertiary">📉 Slowest: {dayPatterns.worstDay}</span>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6">
                        <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Lightbulb className="text-yellow-500" size={20} />
                            Personalized Recommendations
                        </h4>
                        <div className="space-y-4">
                            {recommendations.map((rec, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-4 p-4 rounded-lg ${rec.priority === 'high' ? 'bg-red-500/10 border border-red-500/20' :
                                        rec.priority === 'positive' ? 'bg-green-500/10 border border-green-500/20' :
                                            'bg-glass-surface'
                                        }`}
                                >
                                    <div className="shrink-0">
                                        {rec.type === 'sleep' && <Moon className="text-purple-400" size={24} />}
                                        {rec.type === 'mood' && <Heart className="text-red-400" size={24} />}
                                        {rec.type === 'productivity' && (rec.priority === 'positive' ? <TrendingUp className="text-green-glow" size={24} /> : <TrendingDown className="text-orange-400" size={24} />)}
                                        {rec.type === 'schedule' && <Calendar className="text-blue-400" size={24} />}
                                        {rec.type === 'streak' && <Flame className="text-orange-500" size={24} />}
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-text-primary">{rec.title}</h5>
                                        <p className="text-text-secondary text-sm">{rec.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {recommendations.length === 0 && (
                    <div className="text-center py-16">
                        <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
                        <h3 className="text-2xl font-bold text-text-primary mb-2">Looking Good!</h3>
                        <p className="text-text-secondary">No specific recommendations right now. Keep up the great work!</p>
                    </div>
                )}
            </div>
        );
    };

    const renderBurnoutStatus = () => {
        if (!burnoutIndicators) return null;

        const getRiskColor = () => {
            switch (burnoutIndicators.riskLevel) {
                case 'healthy': return 'text-green-glow border-green-glow/30 bg-green-glow/5';
                case 'caution': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5';
                case 'high': return 'text-red-500 border-red-500/30 bg-red-500/5';
                default: return 'text-text-secondary';
            }
        };

        const getRiskIcon = () => {
            switch (burnoutIndicators.riskLevel) {
                case 'healthy': return <Heart className="text-green-glow" size={48} />;
                case 'caution': return <AlertTriangle className="text-yellow-500" size={48} />;
                case 'high': return <AlertTriangle className="text-red-500" size={48} />;
                default: return null;
            }
        };

        return (
            <div className="space-y-6">
                {/* Risk Score Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`glass-panel p-8 border-2 ${getRiskColor()}`}>
                    <div className="flex items-center gap-6">
                        {getRiskIcon()}
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-text-primary mb-2 capitalize">
                                {burnoutIndicators.riskLevel === 'healthy' && '✅ You\'re Doing Great!'}
                                {burnoutIndicators.riskLevel === 'caution' && '⚠️ Caution Zone'}
                                {burnoutIndicators.riskLevel === 'high' && '🚨 High Burnout Risk'}
                            </h3>
                            <p className="text-text-secondary text-lg">
                                {burnoutIndicators.riskLevel === 'healthy' && 'Your wellness indicators look good. Keep up the healthy habits!'}
                                {burnoutIndicators.riskLevel === 'caution' && 'Some warning signs detected. Consider taking preventive action.'}
                                {burnoutIndicators.riskLevel === 'high' && 'Multiple burnout indicators detected. Please prioritize self-care.'}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-bold text-text-primary">{burnoutIndicators.riskScore}</div>
                            <div className="text-sm text-text-tertiary">Risk Score</div>
                        </div>
                    </div>
                </motion.div>

                {/* Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Smile className={burnoutIndicators.lowMoodStreak >= 3 ? 'text-red-500' : 'text-green-glow'} size={24} />
                            <span className="text-text-secondary">Low Mood Streak</span>
                        </div>
                        <div className={`text-3xl font-bold ${burnoutIndicators.lowMoodStreak >= 3 ? 'text-red-500' : 'text-text-primary'}`}>
                            {burnoutIndicators.lowMoodStreak} days
                        </div>
                        <div className="text-xs text-text-tertiary mt-2">
                            Consecutive days with mood ≤ 2/5
                            {burnoutIndicators.lowMoodStreak >= 3 && <span className="text-red-400 block mt-1">⚠️ 3+ days is concerning</span>}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Moon className={burnoutIndicators.poorSleepStreak >= 3 ? 'text-red-500' : 'text-green-glow'} size={24} />
                            <span className="text-text-secondary">Poor Sleep Streak</span>
                        </div>
                        <div className={`text-3xl font-bold ${burnoutIndicators.poorSleepStreak >= 3 ? 'text-red-500' : 'text-text-primary'}`}>
                            {burnoutIndicators.poorSleepStreak} days
                        </div>
                        <div className="text-xs text-text-tertiary mt-2">
                            Consecutive nights with ≤7 hours
                            {burnoutIndicators.poorSleepStreak >= 3 && <span className="text-red-400 block mt-1">⚠️ Sleep debt building up</span>}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingDown className={burnoutIndicators.productivityDecline ? 'text-red-500' : 'text-green-glow'} size={24} />
                            <span className="text-text-secondary">Week-over-Week</span>
                        </div>
                        <div className={`text-3xl font-bold ${burnoutIndicators.productivityDecline ? 'text-red-500' : 'text-text-primary'}`}>
                            {burnoutIndicators.productivityChange ? `${burnoutIndicators.productivityChange > 0 ? '+' : ''}${burnoutIndicators.productivityChange}%` : '—'}
                        </div>
                        <div className="text-xs text-text-tertiary mt-2">
                            Tasks vs last week (weekdays only)
                            {burnoutIndicators.productivityDecline && <span className="text-red-400 block mt-1">⚠️ 30%+ drop is a warning</span>}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Calendar className={burnoutIndicators.noLogging >= 2 ? 'text-yellow-500' : 'text-green-glow'} size={24} />
                            <span className="text-text-secondary">Logging Gaps</span>
                        </div>
                        <div className={`text-3xl font-bold ${burnoutIndicators.noLogging >= 2 ? 'text-yellow-500' : 'text-text-primary'}`}>
                            {burnoutIndicators.noLogging} days
                        </div>
                        <div className="text-xs text-text-tertiary mt-2">
                            Days without mood/sleep logs (last 3)
                            {burnoutIndicators.noLogging >= 2 && <span className="text-yellow-400 block mt-1">📝 Consider logging today</span>}
                        </div>
                    </motion.div>
                </div>

                {/* Recommendations */}
                {burnoutIndicators.riskLevel !== 'healthy' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel p-6">
                        <h4 className="text-lg font-semibold text-text-primary mb-4">💡 Recommendations</h4>
                        <ul className="space-y-3">
                            {burnoutIndicators.lowMoodStreak >= 2 && (
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-purple-400 shrink-0 mt-0.5" size={18} />
                                    Take time for activities that bring you joy
                                </li>
                            )}
                            {burnoutIndicators.poorSleepStreak >= 2 && (
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-purple-400 shrink-0 mt-0.5" size={18} />
                                    Prioritize sleep - aim for 7+ hours tonight
                                </li>
                            )}
                            {burnoutIndicators.productivityDecline && (
                                <li className="flex items-start gap-3 text-text-secondary">
                                    <CheckCircle2 className="text-purple-400 shrink-0 mt-0.5" size={18} />
                                    Break tasks into smaller, manageable pieces
                                </li>
                            )}
                            <li className="flex items-start gap-3 text-text-secondary">
                                <CheckCircle2 className="text-purple-400 shrink-0 mt-0.5" size={18} />
                                Consider reducing your task load temporarily
                            </li>
                        </ul>
                    </motion.div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <button onClick={onBack} className="relative z-[51] no-drag p-2 rounded-lg hover:bg-glass-surface transition-colors" style={{ WebkitAppRegion: 'no-drag' }}>
                        <ArrowLeft className="text-text-secondary hover:text-text-primary" size={24} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                            <BrainCircuit className="text-blue-400" size={32} />
                            Wellness Doctor
                        </h2>
                        <p className="text-text-secondary">AI-powered insights for your health & productivity</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-8 flex-wrap">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                : 'text-text-secondary hover:bg-glass-surface border border-transparent'
                                }`}
                            style={{ WebkitAppRegion: 'no-drag' }}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === 'today' && renderTodayPrediction()}
                {activeTab === 'weekly' && renderWeeklyReview()}
                {activeTab === 'insights' && renderInsights()}
                {activeTab === 'burnout' && renderBurnoutStatus()}
            </div>
        </div>
    );
};

export default WellnessDoctor;
