/**
 * Recurrence calculation utilities for recurring tasks
 */

/**
 * Calculates the next due date for a recurring task based on its template
 * @param {Object} task - The task instance (needs dueDate or recurrenceAnchor)
 * @param {Object} template - The recurring task template (contains recurrence rules)
 * @returns {string} - The next due date in YYYY-MM-DD format
 */
export const calculateNextDueDate = (task, template) => {
  let nextDate = null;

  try {
    // Validate task parameter
    if (!task || (!task.recurrenceAnchor && !task.dueDate)) {
      throw new Error('Invalid task: missing recurrenceAnchor and dueDate');
    }

    // Use recurrenceAnchor if available, fallback to dueDate for legacy tasks
    const baseDateStr = task.recurrenceAnchor || task.dueDate;
    const baseDate = new Date(baseDateStr + 'T12:00:00');

    // Validate baseDate
    if (isNaN(baseDate.getTime())) {
      throw new Error('Invalid base date');
    }

    if (!template || !template.recurrence) {
      baseDate.setDate(baseDate.getDate() + 1);
      nextDate = baseDate;
    } else {
      const recurrenceType = template.recurrence.type;

      // DAILY: Add 1 day
      if (recurrenceType === 'daily') {
        baseDate.setDate(baseDate.getDate() + 1);
        nextDate = baseDate;
      }

      // WEEKLY: Use days array (ignore for non-weekly types)
      else if (recurrenceType === 'weekly') {
        const selectedDays = template.recurrence.days || [];

        // Validate days array
        if (selectedDays.length > 0 && Array.isArray(selectedDays)) {
          // Filter out invalid day values (must be 0-6)
          const validDays = selectedDays.filter(day => typeof day === 'number' && day >= 0 && day <= 6);

          if (validDays.length > 0) {
            const sortedDays = [...validDays].sort((a, b) => a - b);
            const currentDayOfWeek = baseDate.getDay();
            let daysToAdd = null;

            for (const day of sortedDays) {
              if (day > currentDayOfWeek) {
                daysToAdd = day - currentDayOfWeek;
                break;
              }
            }

            if (daysToAdd === null) {
              daysToAdd = 7 - currentDayOfWeek + sortedDays[0];
            }

            baseDate.setDate(baseDate.getDate() + daysToAdd);
          } else {
            // Invalid days array: fallback to 7 days
            baseDate.setDate(baseDate.getDate() + 7);
          }
        } else {
          // Fallback: add 7 days
          baseDate.setDate(baseDate.getDate() + 7);
        }

        nextDate = baseDate;
      }

      // MONTHLY: Explicitly ignore days array, use recurrenceAnchor date
      else if (recurrenceType === 'monthly') {
        const originalDay = baseDate.getDate();
        baseDate.setMonth(baseDate.getMonth() + 1);

        // Smart date clamping for month-end dates
        if (baseDate.getDate() !== originalDay) {
          baseDate.setDate(0); // Clamp to last day of target month
        }

        nextDate = baseDate;
      }

      // YEARLY: Handle leap year edge case
      else if (recurrenceType === 'yearly') {
        const originalMonth = baseDate.getMonth();
        const originalDay = baseDate.getDate();
        const isFeb29 = originalMonth === 1 && originalDay === 29;

        baseDate.setFullYear(baseDate.getFullYear() + 1);

        // Handle Feb 29 in non-leap years
        if (isFeb29 && baseDate.getMonth() === 2 && baseDate.getDate() === 1) {
          baseDate.setMonth(1);
          baseDate.setDate(28);
        }

        nextDate = baseDate;
      }

      // CUSTOM: Handle all unit types
      else if (recurrenceType === 'custom') {
        const interval = template.recurrence.interval || 1;
        const unit = template.recurrence.unit || 'days';

        switch (unit) {
          case 'days':
            baseDate.setDate(baseDate.getDate() + interval);
            break;

          case 'weeks':
            baseDate.setDate(baseDate.getDate() + (interval * 7));
            break;

          case 'months': {
            const originalDay = baseDate.getDate();
            baseDate.setMonth(baseDate.getMonth() + interval);

            // Smart date clamping
            if (baseDate.getDate() !== originalDay) {
              baseDate.setDate(0);
            }
            break;
          }

          case 'years': {
            const originalMonth = baseDate.getMonth();
            const originalDay = baseDate.getDate();
            const isFeb29 = originalMonth === 1 && originalDay === 29;

            baseDate.setFullYear(baseDate.getFullYear() + interval);

            // Handle Feb 29
            if (isFeb29 && baseDate.getMonth() === 2 && baseDate.getDate() === 1) {
              baseDate.setMonth(1);
              baseDate.setDate(28);
            }
            break;
          }

          default:
            baseDate.setDate(baseDate.getDate() + 1);
        }

        nextDate = baseDate;
      } else {
        // Unknown recurrence type: default to 1 day
        baseDate.setDate(baseDate.getDate() + 1);
        nextDate = baseDate;
      }
    }

    // Validate nextDate before returning
    if (!nextDate || isNaN(nextDate.getTime())) {
      throw new Error('Invalid next date calculated');
    }

    return nextDate.toISOString().split('T')[0];

  } catch (error) {
    // THE IMMORTAL TASK FALLBACK
    // Instead of defaulting to tomorrow, use safe interval based on recurrence type
    console.warn('Recurrence math failed for task:', task?.id, error.message, 'Using safe fallback.');

    const fallbackDate = new Date();
    const recurrenceType = template?.recurrence?.type;

    if (recurrenceType === 'daily') {
      // Daily: Add 1 day
      fallbackDate.setDate(fallbackDate.getDate() + 1);
    } else if (recurrenceType === 'weekly') {
      // Weekly: Add 1 week
      fallbackDate.setDate(fallbackDate.getDate() + 7);
    } else if (recurrenceType === 'monthly') {
      // Monthly: Add 1 month
      fallbackDate.setMonth(fallbackDate.getMonth() + 1);
    } else if (recurrenceType === 'yearly') {
      // Yearly: Add 1 year
      fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
    } else if (recurrenceType === 'custom') {
      // Custom: Add interval units
      const interval = template?.recurrence?.interval || 1;
      const unit = template?.recurrence?.unit || 'days';

      switch (unit) {
        case 'days':
          fallbackDate.setDate(fallbackDate.getDate() + interval);
          break;
        case 'weeks':
          fallbackDate.setDate(fallbackDate.getDate() + (interval * 7));
          break;
        case 'months':
          fallbackDate.setMonth(fallbackDate.getMonth() + interval);
          break;
        case 'years':
          fallbackDate.setFullYear(fallbackDate.getFullYear() + interval);
          break;
        default:
          fallbackDate.setDate(fallbackDate.getDate() + 1);
      }
    } else {
      // Unknown type: Add 1 day
      fallbackDate.setDate(fallbackDate.getDate() + 1);
    }

    return fallbackDate.toISOString().split('T')[0];
  }
};
