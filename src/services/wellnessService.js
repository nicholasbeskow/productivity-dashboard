/**
 * Wellness Service
 * Provides data analysis functions for the Wellness Doctor feature
 */

import { format, subDays, parseISO, differenceInDays } from 'date-fns';

// Sleep target for calculations
const SLEEP_TARGET = 7.5;

/**
 * Get last night's sleep entry
 * @returns {Object|null} Sleep entry or null if not found
 */
export const getLastNightSleep = () => {
    const sleepLogStr = localStorage.getItem('sleepLog');
    if (!sleepLogStr) return null;

    try {
        const sleepLog = JSON.parse(sleepLogStr);
        if (sleepLog.length === 0) return null;

        // Get yesterday's date (last night)
        const lastNight = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const today = format(new Date(), 'yyyy-MM-dd');

        // Check for today's entry first (logged this morning), then yesterday
        const entry = sleepLog.find(e => e.date === today) || sleepLog.find(e => e.date === lastNight);

        if (!entry) {
            // Fall back to most recent entry
            const sorted = [...sleepLog].sort((a, b) => b.date.localeCompare(a.date));
            return sorted[0] || null;
        }

        return entry;
    } catch (error) {
        console.error('Error getting last night sleep:', error);
        return null;
    }
};

/**
 * Calculate recency weight (more recent = higher weight)
 * Uses exponential decay: weight = e^(-daysSince / halfLife)
 * @param {string} date - Date string
 * @param {number} halfLife - Days for weight to halve (default 14)
 * @returns {number} Weight between 0 and 1
 */
const getRecencyWeight = (date, halfLife = 14) => {
    const daysSince = differenceInDays(new Date(), parseISO(date));
    return Math.exp(-daysSince / halfLife);
};

/**
 * Get sleep to productivity correlation with recency weighting
 * @param {number} sleepHours - Hours of sleep to analyze
 * @param {number} sleepQuality - Quality rating 1-5 (optional)
 * @returns {Object} Correlation data
 */
export const getSleepProductivityCorrelation = (sleepHours = null, sleepQuality = null) => {
    const sleepLogStr = localStorage.getItem('sleepLog');
    const tasksStr = localStorage.getItem('completedTasks');

    if (!sleepLogStr || !tasksStr) {
        return { avgTasks: 0, dataPoints: 0, confidence: 'low' };
    }

    try {
        const sleepLog = JSON.parse(sleepLogStr);
        const tasks = JSON.parse(tasksStr);

        // Group tasks by completion date
        const tasksByDate = {};
        tasks.forEach(task => {
            const date = format(new Date(task.completedAt), 'yyyy-MM-dd');
            tasksByDate[date] = (tasksByDate[date] || 0) + 1;
        });

        // Correlate sleep with next-day productivity
        const correlations = [];
        sleepLog.forEach(sleepEntry => {
            const sleepDate = sleepEntry.date;
            const nextDay = format(subDays(parseISO(sleepDate), -1), 'yyyy-MM-dd');
            const tasksCompleted = tasksByDate[nextDay] || 0;
            const hours = sleepEntry.totalSleep ?? sleepEntry.hours;
            const quality = sleepEntry.quality || 3;
            const weight = getRecencyWeight(sleepDate);

            correlations.push({
                sleepHours: hours,
                sleepQuality: quality,
                tasksCompleted,
                date: sleepDate,
                weight
            });
        });

        // If specific sleep hours provided, find similar nights
        if (sleepHours !== null) {
            let similar = correlations.filter(c =>
                Math.abs(c.sleepHours - sleepHours) <= 1
            );

            // Also filter by quality if provided
            if (sleepQuality !== null && similar.length > 3) {
                const qualitySimilar = similar.filter(c =>
                    Math.abs(c.sleepQuality - sleepQuality) <= 1
                );
                if (qualitySimilar.length >= 2) {
                    similar = qualitySimilar;
                }
            }

            if (similar.length > 0) {
                // Weighted average (recent data matters more)
                const totalWeight = similar.reduce((sum, c) => sum + c.weight, 0);
                const weightedAvg = similar.reduce((sum, c) => sum + c.tasksCompleted * c.weight, 0) / totalWeight;

                return {
                    avgTasks: weightedAvg.toFixed(1),
                    dataPoints: similar.length,
                    confidence: similar.length >= 5 ? 'high' : similar.length >= 3 ? 'medium' : 'low'
                };
            }
        }

        // Overall weighted average
        if (correlations.length > 0) {
            const totalWeight = correlations.reduce((sum, c) => sum + c.weight, 0);
            const weightedAvg = correlations.reduce((sum, c) => sum + c.tasksCompleted * c.weight, 0) / totalWeight;
            return {
                avgTasks: weightedAvg.toFixed(1),
                dataPoints: correlations.length,
                confidence: correlations.length >= 10 ? 'high' : correlations.length >= 5 ? 'medium' : 'low'
            };
        }

        return { avgTasks: 0, dataPoints: 0, confidence: 'low' };
    } catch (error) {
        console.error('Error calculating sleep-productivity correlation:', error);
        return { avgTasks: 0, dataPoints: 0, confidence: 'low' };
    }
};

/**
 * Get sleep to mood correlation with recency weighting
 * @param {number} sleepHours - Hours of sleep to analyze
 * @param {number} sleepQuality - Quality rating 1-5 (optional)
 * @returns {Object} Correlation data
 */
export const getSleepMoodCorrelation = (sleepHours = null, sleepQuality = null) => {
    const sleepLogStr = localStorage.getItem('sleepLog');
    const moodLogStr = localStorage.getItem('moodLog');

    if (!sleepLogStr || !moodLogStr) {
        return { avgMood: null, dataPoints: 0, confidence: 'low' };
    }

    try {
        const sleepLog = JSON.parse(sleepLogStr);
        const moodLog = JSON.parse(moodLogStr);

        // Create mood lookup by date
        const moodByDate = {};
        moodLog.forEach(entry => {
            moodByDate[entry.date] = entry.level;
        });

        // Correlate sleep with same-day mood
        const correlations = [];
        sleepLog.forEach(sleepEntry => {
            const date = sleepEntry.date;
            const mood = moodByDate[date];
            const hours = sleepEntry.totalSleep ?? sleepEntry.hours;
            const quality = sleepEntry.quality || 3;
            const weight = getRecencyWeight(date);

            if (mood !== undefined) {
                correlations.push({
                    sleepHours: hours,
                    sleepQuality: quality,
                    mood,
                    date,
                    weight
                });
            }
        });

        // If specific sleep hours provided, find similar nights
        if (sleepHours !== null) {
            let similar = correlations.filter(c =>
                Math.abs(c.sleepHours - sleepHours) <= 1
            );

            // Also filter by quality if provided
            if (sleepQuality !== null && similar.length > 3) {
                const qualitySimilar = similar.filter(c =>
                    Math.abs(c.sleepQuality - sleepQuality) <= 1
                );
                if (qualitySimilar.length >= 2) {
                    similar = qualitySimilar;
                }
            }

            if (similar.length > 0) {
                const totalWeight = similar.reduce((sum, c) => sum + c.weight, 0);
                const weightedAvg = similar.reduce((sum, c) => sum + c.mood * c.weight, 0) / totalWeight;
                return {
                    avgMood: weightedAvg.toFixed(1),
                    dataPoints: similar.length,
                    confidence: similar.length >= 5 ? 'high' : similar.length >= 3 ? 'medium' : 'low'
                };
            }
        }

        // Overall weighted average
        if (correlations.length > 0) {
            const totalWeight = correlations.reduce((sum, c) => sum + c.weight, 0);
            const weightedAvg = correlations.reduce((sum, c) => sum + c.mood * c.weight, 0) / totalWeight;
            return {
                avgMood: weightedAvg.toFixed(1),
                dataPoints: correlations.length,
                confidence: correlations.length >= 10 ? 'high' : correlations.length >= 5 ? 'medium' : 'low'
            };
        }

        return { avgMood: null, dataPoints: 0, confidence: 'low' };
    } catch (error) {
        console.error('Error calculating sleep-mood correlation:', error);
        return { avgMood: null, dataPoints: 0, confidence: 'low' };
    }
};

/**
 * Get day-of-week performance patterns
 * @returns {Object} Day-of-week statistics
 */
export const getDayOfWeekPatterns = () => {
    const tasksStr = localStorage.getItem('completedTasks');
    const moodLogStr = localStorage.getItem('moodLog');
    const sleepLogStr = localStorage.getItem('sleepLog');

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const patterns = dayNames.map(name => ({
        name,
        avgTasks: 0,
        avgMood: null,
        avgSleep: null,
        dataPoints: 0
    }));

    try {
        // Tasks by day of week
        if (tasksStr) {
            const tasks = JSON.parse(tasksStr);
            const taskCounts = [0, 0, 0, 0, 0, 0, 0];
            const taskDays = [{}, {}, {}, {}, {}, {}, {}];

            tasks.forEach(task => {
                const date = new Date(task.completedAt);
                const dow = date.getDay();
                const dateStr = format(date, 'yyyy-MM-dd');
                taskDays[dow][dateStr] = (taskDays[dow][dateStr] || 0) + 1;
            });

            taskDays.forEach((dayData, dow) => {
                const dates = Object.values(dayData);
                if (dates.length > 0) {
                    patterns[dow].avgTasks = (dates.reduce((a, b) => a + b, 0) / dates.length).toFixed(1);
                    patterns[dow].dataPoints = dates.length;
                }
            });
        }

        // Mood by day of week
        if (moodLogStr) {
            const moodLog = JSON.parse(moodLogStr);
            const moodByDay = [[], [], [], [], [], [], []];

            moodLog.forEach(entry => {
                const date = parseISO(entry.date);
                const dow = date.getDay();
                moodByDay[dow].push(entry.level);
            });

            moodByDay.forEach((moods, dow) => {
                if (moods.length > 0) {
                    patterns[dow].avgMood = (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1);
                }
            });
        }

        // Sleep by day of week
        if (sleepLogStr) {
            const sleepLog = JSON.parse(sleepLogStr);
            const sleepByDay = [[], [], [], [], [], [], []];

            sleepLog.forEach(entry => {
                const date = parseISO(entry.date);
                const dow = date.getDay();
                sleepByDay[dow].push(entry.totalSleep ?? entry.hours);
            });

            sleepByDay.forEach((sleeps, dow) => {
                if (sleeps.length > 0) {
                    patterns[dow].avgSleep = (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1);
                }
            });
        }

        // Find best and worst days
        const withData = patterns.filter(p => p.dataPoints > 0);
        const bestDay = withData.reduce((best, p) =>
            parseFloat(p.avgTasks) > parseFloat(best?.avgTasks || 0) ? p : best, null);
        const worstDay = withData.reduce((worst, p) =>
            parseFloat(p.avgTasks) < parseFloat(worst?.avgTasks || 999) ? p : worst, null);

        return {
            patterns,
            bestDay: bestDay?.name || null,
            worstDay: worstDay?.name || null
        };
    } catch (error) {
        console.error('Error calculating day-of-week patterns:', error);
        return { patterns, bestDay: null, worstDay: null };
    }
};

/**
 * Get current streaks (consecutive good days)
 * @returns {Object} Streak data
 */
export const getStreaks = () => {
    const moodLogStr = localStorage.getItem('moodLog');
    const sleepLogStr = localStorage.getItem('sleepLog');
    const tasksStr = localStorage.getItem('completedTasks');

    const streaks = {
        goodMood: 0,
        goodSleep: 0,
        productive: 0,
        logging: 0
    };

    const today = new Date();
    const last30Days = [];
    for (let i = 0; i < 30; i++) {
        last30Days.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }

    try {
        // Good mood streak (4 or 5)
        if (moodLogStr) {
            const moodLog = JSON.parse(moodLogStr);
            const moodByDate = {};
            moodLog.forEach(m => { moodByDate[m.date] = m.level; });

            for (const date of last30Days) {
                if (moodByDate[date] !== undefined && moodByDate[date] >= 4) {
                    streaks.goodMood++;
                } else if (moodByDate[date] !== undefined) {
                    break;
                }
            }
        }

        // Good sleep streak (7+ hours)
        if (sleepLogStr) {
            const sleepLog = JSON.parse(sleepLogStr);
            const sleepByDate = {};
            sleepLog.forEach(s => { sleepByDate[s.date] = s.totalSleep ?? s.hours; });

            for (const date of last30Days) {
                if (sleepByDate[date] !== undefined && sleepByDate[date] >= 7) {
                    streaks.goodSleep++;
                } else if (sleepByDate[date] !== undefined) {
                    break;
                }
            }
        }

        // Productive days streak (completed at least 1 task)
        if (tasksStr) {
            const tasks = JSON.parse(tasksStr);
            const tasksByDate = {};
            tasks.forEach(t => {
                const date = format(new Date(t.completedAt), 'yyyy-MM-dd');
                tasksByDate[date] = true;
            });

            for (const date of last30Days) {
                if (tasksByDate[date]) {
                    streaks.productive++;
                } else {
                    break;
                }
            }
        }

        // Logging streak (logged mood OR sleep)
        const moodDates = new Set(moodLogStr ? JSON.parse(moodLogStr).map(m => m.date) : []);
        const sleepDates = new Set(sleepLogStr ? JSON.parse(sleepLogStr).map(s => s.date) : []);

        for (const date of last30Days) {
            if (moodDates.has(date) || sleepDates.has(date)) {
                streaks.logging++;
            } else {
                break;
            }
        }

        return streaks;
    } catch (error) {
        console.error('Error calculating streaks:', error);
        return streaks;
    }
};

/**
 * Get weekly stats with week-over-week comparison
 * @param {Date} endDate - End date of the week (defaults to today)
 * @returns {Object} Weekly statistics with trends
 */
export const getWeeklyStats = (endDate = new Date()) => {
    const sleepLogStr = localStorage.getItem('sleepLog');
    const moodLogStr = localStorage.getItem('moodLog');
    const tasksStr = localStorage.getItem('completedTasks');

    const startDate = subDays(endDate, 6);
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Previous week dates
    const prevEndDate = subDays(startDate, 1);
    const prevStartDate = subDays(prevEndDate, 6);
    const prevStartDateStr = format(prevStartDate, 'yyyy-MM-dd');
    const prevEndDateStr = format(prevEndDate, 'yyyy-MM-dd');

    const stats = {
        period: { start: startDateStr, end: endDateStr },
        tasks: { total: 0, daily: [], prevTotal: 0, trend: null },
        mood: { avg: null, entries: 0, prevAvg: null, trend: null },
        sleep: { avgHours: null, avgQuality: null, entries: 0, debt: 0, prevAvgHours: null, trend: null },
        bestDay: null
    };

    try {
        // Tasks
        if (tasksStr) {
            const tasks = JSON.parse(tasksStr);
            const weeklyTasks = tasks.filter(t => {
                const date = format(new Date(t.completedAt), 'yyyy-MM-dd');
                return date >= startDateStr && date <= endDateStr;
            });
            const prevWeekTasks = tasks.filter(t => {
                const date = format(new Date(t.completedAt), 'yyyy-MM-dd');
                return date >= prevStartDateStr && date <= prevEndDateStr;
            });

            stats.tasks.total = weeklyTasks.length;
            stats.tasks.prevTotal = prevWeekTasks.length;
            if (prevWeekTasks.length > 0) {
                const change = ((weeklyTasks.length - prevWeekTasks.length) / prevWeekTasks.length * 100);
                stats.tasks.trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
                stats.tasks.changePercent = change.toFixed(0);
            }

            // Daily breakdown
            const dailyCounts = {};
            weeklyTasks.forEach(t => {
                const date = format(new Date(t.completedAt), 'yyyy-MM-dd');
                dailyCounts[date] = (dailyCounts[date] || 0) + 1;
            });

            // Find best day
            let maxTasks = 0;
            Object.entries(dailyCounts).forEach(([date, count]) => {
                stats.tasks.daily.push({ date, count });
                if (count > maxTasks) {
                    maxTasks = count;
                    stats.bestDay = { date, tasks: count };
                }
            });
        }

        // Mood with trend
        if (moodLogStr) {
            const moodLog = JSON.parse(moodLogStr);
            const weeklyMoods = moodLog.filter(m =>
                m.date >= startDateStr && m.date <= endDateStr
            );
            const prevWeekMoods = moodLog.filter(m =>
                m.date >= prevStartDateStr && m.date <= prevEndDateStr
            );

            if (weeklyMoods.length > 0) {
                const sum = weeklyMoods.reduce((acc, m) => acc + m.level, 0);
                stats.mood.avg = (sum / weeklyMoods.length).toFixed(1);
                stats.mood.entries = weeklyMoods.length;
            }
            if (prevWeekMoods.length > 0) {
                const prevSum = prevWeekMoods.reduce((acc, m) => acc + m.level, 0);
                stats.mood.prevAvg = (prevSum / prevWeekMoods.length).toFixed(1);

                if (stats.mood.avg) {
                    const diff = parseFloat(stats.mood.avg) - parseFloat(stats.mood.prevAvg);
                    stats.mood.trend = diff > 0.2 ? 'up' : diff < -0.2 ? 'down' : 'stable';
                }
            }
        }

        // Sleep with trend
        if (sleepLogStr) {
            const sleepLog = JSON.parse(sleepLogStr);
            const weeklySleep = sleepLog.filter(s =>
                s.date >= startDateStr && s.date <= endDateStr
            );
            const prevWeekSleep = sleepLog.filter(s =>
                s.date >= prevStartDateStr && s.date <= prevEndDateStr
            );

            if (weeklySleep.length > 0) {
                const totalHours = weeklySleep.reduce((acc, s) => acc + (s.totalSleep ?? s.hours), 0);
                const totalQuality = weeklySleep.reduce((acc, s) => acc + s.quality, 0);
                stats.sleep.avgHours = (totalHours / weeklySleep.length).toFixed(1);
                stats.sleep.avgQuality = (totalQuality / weeklySleep.length).toFixed(1);
                stats.sleep.entries = weeklySleep.length;

                // Calculate sleep debt
                // Calculate sleep debt (Chronological with repayment)
                let debt = 0;
                // Sort by date to ensure we calculate debt accumulation/repayment in order
                const sortedSleep = [...weeklySleep].sort((a, b) => a.date.localeCompare(b.date));

                sortedSleep.forEach(s => {
                    const hours = s.totalSleep ?? s.hours;
                    if (hours < SLEEP_TARGET) {
                        // Deficit: add to debt
                        debt += (SLEEP_TARGET - hours);
                    } else {
                        // Surplus: reduce debt (but don't go below 0)
                        const surplus = hours - SLEEP_TARGET;
                        debt = Math.max(0, debt - surplus);
                    }
                });
                stats.sleep.debt = debt.toFixed(1);
            }
            if (prevWeekSleep.length > 0) {
                const prevTotalHours = prevWeekSleep.reduce((acc, s) => acc + (s.totalSleep ?? s.hours), 0);
                stats.sleep.prevAvgHours = (prevTotalHours / prevWeekSleep.length).toFixed(1);

                if (stats.sleep.avgHours) {
                    const diff = parseFloat(stats.sleep.avgHours) - parseFloat(stats.sleep.prevAvgHours);
                    stats.sleep.trend = diff > 0.3 ? 'up' : diff < -0.3 ? 'down' : 'stable';
                }
            }
        }

        return stats;
    } catch (error) {
        console.error('Error calculating weekly stats:', error);
        return stats;
    }
};

/**
 * Get burnout indicators with productivity decline detection
 * @returns {Object} Burnout risk assessment
 */
export const getBurnoutIndicators = () => {
    const moodLogStr = localStorage.getItem('moodLog');
    const sleepLogStr = localStorage.getItem('sleepLog');
    const tasksStr = localStorage.getItem('completedTasks');

    const indicators = {
        lowMoodStreak: 0,
        poorSleepStreak: 0,
        productivityDecline: false,
        productivityChange: null,
        noLogging: 0,
        riskScore: 0,
        riskLevel: 'healthy'
    };

    const today = new Date();
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
        last7Days.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }

    try {
        // Check mood streak
        if (moodLogStr) {
            const moodLog = JSON.parse(moodLogStr);
            const moodByDate = {};
            moodLog.forEach(m => { moodByDate[m.date] = m.level; });

            let streak = 0;
            for (const date of last7Days) {
                if (moodByDate[date] !== undefined && moodByDate[date] <= 2) {
                    streak++;
                } else if (moodByDate[date] !== undefined) {
                    break;
                }
            }
            indicators.lowMoodStreak = streak;
        }

        // Check sleep streak
        if (sleepLogStr) {
            const sleepLog = JSON.parse(sleepLogStr);
            const sleepByDate = {};
            sleepLog.forEach(s => { sleepByDate[s.date] = s.totalSleep ?? s.hours; });

            let streak = 0;
            for (const date of last7Days) {
                if (sleepByDate[date] !== undefined && sleepByDate[date] <= 7) {
                    streak++;
                } else if (sleepByDate[date] !== undefined) {
                    break;
                }
            }
            indicators.poorSleepStreak = streak;
        }

        // Check productivity decline (compare this week to last week, EXCLUDING weekends)
        if (tasksStr) {
            const tasks = JSON.parse(tasksStr);
            const thisWeekStart = format(subDays(today, 6), 'yyyy-MM-dd');
            const lastWeekStart = format(subDays(today, 13), 'yyyy-MM-dd');
            const lastWeekEnd = format(subDays(today, 7), 'yyyy-MM-dd');

            // Helper to check if date is a weekday (Mon-Fri)
            const isWeekday = (dateStr) => {
                const day = parseISO(dateStr).getDay();
                return day !== 0 && day !== 6; // Not Sunday (0) or Saturday (6)
            };

            const thisWeekTasks = tasks.filter(t => {
                const date = format(new Date(t.completedAt), 'yyyy-MM-dd');
                return date >= thisWeekStart && isWeekday(date);
            }).length;

            const lastWeekTasks = tasks.filter(t => {
                const date = format(new Date(t.completedAt), 'yyyy-MM-dd');
                return date >= lastWeekStart && date <= lastWeekEnd && isWeekday(date);
            }).length;

            if (lastWeekTasks > 0) {
                const changePercent = ((thisWeekTasks - lastWeekTasks) / lastWeekTasks) * 100;
                indicators.productivityChange = changePercent.toFixed(0);
                indicators.productivityDecline = changePercent < -30;
            }
        }

        // Check logging gaps
        let noLogDays = 0;
        const moodLog = moodLogStr ? JSON.parse(moodLogStr) : [];
        const sleepLog = sleepLogStr ? JSON.parse(sleepLogStr) : [];
        const moodDates = new Set(moodLog.map(m => m.date));
        const sleepDates = new Set(sleepLog.map(s => s.date));

        for (const date of last7Days.slice(0, 3)) {
            if (!moodDates.has(date) && !sleepDates.has(date)) {
                noLogDays++;
            }
        }
        indicators.noLogging = noLogDays;

        // Calculate risk score (0-100)
        let score = 0;
        score += indicators.lowMoodStreak * 15;
        score += indicators.poorSleepStreak * 12;
        score += indicators.productivityDecline ? 20 : 0;
        score += indicators.noLogging * 5;
        score = Math.min(100, score);

        indicators.riskScore = score;
        if (score <= 30) {
            indicators.riskLevel = 'healthy';
        } else if (score <= 60) {
            indicators.riskLevel = 'caution';
        } else {
            indicators.riskLevel = 'high';
        }

        return indicators;
    } catch (error) {
        console.error('Error calculating burnout indicators:', error);
        return indicators;
    }
};

/**
 * Generate day prediction based on last night's sleep
 * @returns {Object} Day prediction data
 */
export const generateDayPrediction = () => {
    const lastNight = getLastNightSleep();

    if (!lastNight) {
        return {
            hasSleepData: false,
            message: 'Log your sleep to get personalized predictions!'
        };
    }

    const sleepHours = lastNight.totalSleep ?? lastNight.hours;
    const sleepQuality = lastNight.quality;
    const productivityCorr = getSleepProductivityCorrelation(sleepHours, sleepQuality);
    const moodCorr = getSleepMoodCorrelation(sleepHours, sleepQuality);
    const dayPatterns = getDayOfWeekPatterns();
    const todayDow = new Date().getDay();
    const todayPattern = dayPatterns.patterns[todayDow];

    // Calculate combined sleep score (hours + quality weighted)
    const sleepScore = (sleepHours / 8) * 0.6 + (sleepQuality / 5) * 0.4;

    // Determine energy level based on combined score
    let energyLevel = 'moderate';
    let energyEmoji = '⚡';
    if (sleepScore >= 0.85) {
        energyLevel = 'high';
        energyEmoji = '🔥';
    } else if (sleepScore < 0.65) {
        energyLevel = 'low';
        energyEmoji = '😴';
    }

    // Generate insight message (Wellness Focused)
    let insight = '';
    if (sleepHours >= 7 && sleepQuality >= 4) {
        insight = `Excellent rest! ${sleepHours}h with great quality gives you a strong foundation for wellbeing today.`;
    } else if (sleepHours >= 7) {
        insight = `Good quantity (${sleepHours}h), but quality was ${sleepQuality}/5. Prioritize gentle movement to wake up the body.`;
    } else if (sleepQuality >= 4) {
        insight = `Quality sleep (${sleepQuality}/5) but short duration (${sleepHours}h). Listen to your body and rest if needed.`;
    } else if (sleepHours >= 6) {
        insight = `Moderate rest (${sleepHours}h). Be kind to yourself today and avoid overexertion.`;
    } else {
        insight = `Only ${sleepHours}h sleep. Your health comes first—focus on recovery and an early bedtime tonight.`;
    }

    // Add day-of-week context
    if (todayPattern.avgTasks && parseFloat(todayPattern.avgTasks) > 0) {
        insight += ` ${todayPattern.name}s avg: ${todayPattern.avgTasks} tasks.`;
    }

    return {
        hasSleepData: true,
        sleepHours,
        sleepQuality,
        sleepScore: (sleepScore * 100).toFixed(0),
        energyLevel,
        energyEmoji,
        predictedTasks: productivityCorr.avgTasks,
        predictedMood: moodCorr.avgMood,
        confidence: productivityCorr.confidence,
        insight,
        dataPoints: productivityCorr.dataPoints,
        dayOfWeek: todayPattern.name,
        dayAvgTasks: todayPattern.avgTasks
    };
};

/**
 * Get personalized recommendations
 * @returns {Array} List of recommendations
 */
export const getRecommendations = () => {
    const burnout = getBurnoutIndicators();
    const streaks = getStreaks();
    const dayPatterns = getDayOfWeekPatterns();
    const weeklyStats = getWeeklyStats();
    const recommendations = [];

    // Sleep-based recommendations
    if (burnout.poorSleepStreak >= 2) {
        recommendations.push({
            type: 'sleep',
            priority: 'high',
            title: 'Prioritize Sleep Tonight',
            description: `You've had ${burnout.poorSleepStreak} nights of poor sleep. Aim for 7+ hours tonight.`,
            icon: 'Moon'
        });
    }

    // Mood-based recommendations
    if (burnout.lowMoodStreak >= 2) {
        recommendations.push({
            type: 'mood',
            priority: 'high',
            title: 'Take Time for Self-Care',
            description: 'Low mood streak detected. Consider activities that bring you joy.',
            icon: 'Heart'
        });
    }

    // Productivity recommendations
    if (burnout.productivityDecline) {
        recommendations.push({
            type: 'productivity',
            priority: 'medium',
            title: 'Energy Lull Detected',
            description: `Output is lower than usual. This might be your body asking for a break, not a push.`,
            icon: 'TrendingDown'
        });
    }

    // Day-of-week optimization
    if (dayPatterns.worstDay) {
        const today = new Date().getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        if (dayNames[today] === dayPatterns.worstDay) {
            recommendations.push({
                type: 'schedule',
                priority: 'low',
                title: `${dayPatterns.worstDay} Rhythms`,
                description: `This is typically a slower energy day for you. It's okay to take it easy matches your natural rhythm.`,
                icon: 'Calendar'
            });
        }
    }

    // Streak encouragement
    if (streaks.goodSleep >= 3) {
        recommendations.push({
            type: 'streak',
            priority: 'positive',
            title: `🔥 ${streaks.goodSleep}-Day Sleep Streak!`,
            description: 'Keep it up! Consistent good sleep compounds your wellbeing.',
            icon: 'Trophy'
        });
    }

    if (streaks.goodMood >= 3) {
        recommendations.push({
            type: 'streak',
            priority: 'positive',
            title: `😊 ${streaks.goodMood}-Day Good Mood Streak!`,
            description: 'You\'re on a roll! Note what\'s been working for you.',
            icon: 'Smile'
        });
    }

    // Week-over-week trends
    if (weeklyStats.tasks.trend === 'up') {
        recommendations.push({
            type: 'productivity',
            priority: 'positive',
            title: 'Healthy Flow State! 🌊',
            description: `You're getting a lot done! Remember to hydrate and take micro-breaks to sustain this healthy energy.`,
            icon: 'TrendingUp'
        });
    }

    return recommendations;
};

/**
 * Get mood label from numeric value
 * @param {number} level - Mood level 1-5
 * @returns {string} Mood label
 */
export const getMoodLabel = (level) => {
    const labels = {
        5: 'Great',
        4: 'Good',
        3: 'Okay',
        2: 'Down',
        1: 'Rocky'
    };
    return labels[Math.round(level)] || 'Unknown';
};
