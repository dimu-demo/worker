const WEEK_DAYS = [
    { key: 'mon', label: 'Понедельник' },
    { key: 'tue', label: 'Вторник' },
    { key: 'wed', label: 'Среда' },
    { key: 'thu', label: 'Четверг' },
    { key: 'fri', label: 'Пятница' },
    { key: 'sat', label: 'Суббота' },
    { key: 'sun', label: 'Воскресенье' }
];

const WEEK_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SCHEDULE_TZ = 'Asia/Almaty';

function defaultWeekSchedule() {
    return {
        mon: { enabled: true, open: '10:00', close: '00:00' },
        tue: { enabled: true, open: '10:00', close: '00:00' },
        wed: { enabled: true, open: '10:00', close: '00:00' },
        thu: { enabled: true, open: '10:00', close: '00:00' },
        fri: { enabled: true, open: '10:00', close: '03:00' },
        sat: { enabled: true, open: '10:00', close: '03:00' },
        sun: { enabled: true, open: '10:00', close: '00:00' }
    };
}

function parseHm(value) {
    const parts = String(value || '00:00').split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    return hours * 60 + minutes;
}

function nowInAlmaty() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: SCHEDULE_TZ,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
    }).formatToParts(new Date());

    const map = {};
    parts.forEach(part => {
        if (part.type !== 'literal') map[part.type] = part.value;
    });

    const weekdayMap = { Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };
    const dayKey = weekdayMap[map.weekday] || 'mon';
    const minutes = Number(map.hour || 0) * 60 + Number(map.minute || 0);
    return { dayKey, minutes };
}

function isOpenBySchedule(schedule) {
    const data = schedule && typeof schedule === 'object' ? schedule : defaultWeekSchedule();
    const { dayKey, minutes } = nowInAlmaty();
    const today = data[dayKey];
    const yesterdayKey = WEEK_ORDER[(WEEK_ORDER.indexOf(dayKey) + 6) % 7];
    const yesterday = data[yesterdayKey];

    if (isOpenToday(today, minutes)) return true;
    if (isOpenFromYesterday(yesterday, minutes)) return true;
    return false;
}

function isOpenToday(day, minutes) {
    if (!day || !day.enabled) return false;
    const open = parseHm(day.open);
    let close = parseHm(day.close);
    if (close === 0) close = 1440;
    if (close > open) return minutes >= open && minutes < close;
    if (close < open) return minutes >= open;
    return minutes >= open;
}

function isOpenFromYesterday(day, minutes) {
    if (!day || !day.enabled) return false;
    const open = parseHm(day.open);
    const close = parseHm(day.close);
    if (close === 0) return false;
    if (close < open) return minutes < close;
    return false;
}
