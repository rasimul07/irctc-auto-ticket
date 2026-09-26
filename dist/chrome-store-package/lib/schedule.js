(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  const SCHEDULE_WINDOWS = {
    ac: { hour: 10, minute: 0, label: 'AC Tatkal — 10:00 AM IST' },
    'non-ac': { hour: 11, minute: 0, label: 'Non-AC Tatkal — 11:00 AM IST' }
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

    getNextIstTime(hour, minute = 0, second = 0) {
      const istNow = IRCTCExt.Schedule.getIstParts();
      let { year, month, day } = istNow;

      const nowSeconds = istNow.hour * 3600 + istNow.minute * 60 + istNow.second;
      const targetSeconds = hour * 3600 + minute * 60 + second;

      if (targetSeconds <= nowSeconds) {
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

    async scheduleAlarms(schedule) {
      if (!chrome?.alarms) return null;

      await chrome.alarms.clear(IRCTCExt.Schedule.ALARM_AC);
      await chrome.alarms.clear(IRCTCExt.Schedule.ALARM_NON_AC);

      if (!schedule?.enabled) return null;

      const window = IRCTCExt.Schedule.getWindow(schedule);
      const when = IRCTCExt.Schedule.getNextIstTime(window.hour, window.minute);
      const name = IRCTCExt.Schedule.getAlarmName(schedule);

      await chrome.alarms.create(name, { when });
      console.log(
        `[IRCTC-Bot] Tatkal alarm scheduled: ${name} at ${IRCTCExt.Schedule.formatIstDateTime(when)}`
      );
      return { name, when, label: window.label };
    },

    async ensureAlarmScheduled(schedule) {
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

      return IRCTCExt.Schedule.scheduleAlarms(schedule);
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
