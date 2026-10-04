(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  const SCHEDULE_WINDOWS = {
    ac: {
      tatkalHour: 10,
      tatkalMinute: 0,
      hour: 9,
      minute: 59,
      label: 'AC Tatkal — 10:00 AM IST (Starts at 09:59 AM)'
    },
    'non-ac': {
      tatkalHour: 11,
      tatkalMinute: 0,
      hour: 10,
      minute: 59,
      label: 'Non-AC Tatkal — 11:00 AM IST (Starts at 10:59 AM)'
    }
  };

  IRCTCExt.Schedule = {
    ALARM_AC: 'tatkal-ac',
    ALARM_NON_AC: 'tatkal-non-ac',

    getWindow(schedule) {
      return schedule?.type === 'ac' ? SCHEDULE_WINDOWS.ac : SCHEDULE_WINDOWS['non-ac'];
    },

    getIstParts(date = new Date()) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(date);

      const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
      const hour = get('hour') % 24;
      return {
        year: get('year'),
        month: get('month'),
        day: get('day'),
        hour,
        minute: get('minute'),
        second: get('second')
      };
    },

    getNextIstTime(hour, minute = 0, second = 0, options = {}) {
      const istNow = IRCTCExt.Schedule.getIstParts();
      let { year, month, day } = istNow;

      const nowSeconds = istNow.hour * 3600 + istNow.minute * 60 + istNow.second;
      const targetSeconds = hour * 3600 + minute * 60 + second;
      const tatkalSeconds =
        typeof options.tatkalHour === 'number'
          ? options.tatkalHour * 3600 + (options.tatkalMinute || 0) * 60
          : targetSeconds;

      // If user enables or saves during the 1-minute pre-window (e.g. 09:59:00 - 09:59:59),
      // launch immediately so the bot navigates to train-list before the window opens.
      if (!options.forceNextDay && nowSeconds >= targetSeconds && nowSeconds < tatkalSeconds) {
        return Date.now() + 1000;
      }

      if (options.forceNextDay || targetSeconds <= nowSeconds) {
        const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
        year = nextDay.getUTCFullYear();
        month = nextDay.getUTCMonth() + 1;
        day = nextDay.getUTCDate();
      }

      const pad = (n) => String(n).padStart(2, '0');
      return new Date(
        `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+05:30`
      ).getTime();
    },

    formatIstDateTime(ms) {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(ms));
    },

    getAlarmName(schedule) {
      return schedule?.type === 'ac' ? IRCTCExt.Schedule.ALARM_AC : IRCTCExt.Schedule.ALARM_NON_AC;
    },

    async scheduleAlarms(schedule, options = {}) {
      if (!chrome?.alarms) return null;

      await chrome.alarms.clear(IRCTCExt.Schedule.ALARM_AC);
      await chrome.alarms.clear(IRCTCExt.Schedule.ALARM_NON_AC);

      if (!schedule?.enabled) return null;

      const window = IRCTCExt.Schedule.getWindow(schedule);
      const when = IRCTCExt.Schedule.getNextIstTime(window.hour, window.minute, 0, {
        forceNextDay: !!options.forceNextDay,
        tatkalHour: window.tatkalHour,
        tatkalMinute: window.tatkalMinute
      });
      const name = IRCTCExt.Schedule.getAlarmName(schedule);

      await chrome.alarms.create(name, { when });
      console.log(
        `[IRCTC-Bot] Tatkal alarm scheduled: ${name} at ${IRCTCExt.Schedule.formatIstDateTime(when)}`
      );
      return { name, when, label: window.label };
    },

    async ensureAlarmScheduled(schedule, options = {}) {
      if (!schedule?.enabled || !chrome?.alarms) return null;

      const name = IRCTCExt.Schedule.getAlarmName(schedule);
      const existing = await chrome.alarms.get(name);
      if (existing?.scheduledTime && existing.scheduledTime > Date.now()) {
        return {
          name,
          when: existing.scheduledTime,
          label: IRCTCExt.Schedule.getWindow(schedule).label,
          reused: true
        };
      }

      return IRCTCExt.Schedule.scheduleAlarms(schedule, options);
    },

    async getScheduledAlarmInfo(schedule) {
      if (!schedule?.enabled) {
        return {
          enabled: false,
          message: 'Scheduler disabled. Enable and save to arm the Tatkal alarm.'
        };
      }

      if (!chrome?.alarms) {
        return {
          enabled: true,
          armed: false,
          message: 'Scheduler enabled. Save details to arm the Tatkal alarm.'
        };
      }

      const name = IRCTCExt.Schedule.getAlarmName(schedule);
      const alarm = await chrome.alarms.get(name);
      const window = IRCTCExt.Schedule.getWindow(schedule);

      if (!alarm?.scheduledTime) {
        return {
          enabled: true,
          armed: false,
          message: 'Scheduler enabled but alarm is not set. Click Save on the Timer tab.'
        };
      }

      return {
        enabled: true,
        armed: true,
        scheduledTime: alarm.scheduledTime,
        message: `Next auto-start: ${IRCTCExt.Schedule.formatIstDateTime(alarm.scheduledTime)} (${window.label})`
      };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
