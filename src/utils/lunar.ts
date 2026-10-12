/**
 * Đổi dương lịch sang âm lịch Việt Nam (múi giờ GMT+7) theo thuật toán của Hồ Ngọc Đức.
 */

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  /** Tháng nhuận */
  leap: boolean;
}

const VN_TIMEZONE = 7;
const SYNODIC_MONTH = 29.530588853;
const DEG = Math.PI / 180;

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  return (
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Ngày Julius (tính theo giờ địa phương) của điểm sóc thứ k kể từ 1/1/1900 */
function getNewMoonDay(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * DEG);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * DEG) + 0.0021 * Math.sin(2 * DEG * M);
  c1 = c1 - 0.4068 * Math.sin(Mpr * DEG) + 0.0161 * Math.sin(DEG * 2 * Mpr);
  c1 = c1 - 0.0004 * Math.sin(DEG * 3 * Mpr);
  c1 = c1 + 0.0104 * Math.sin(DEG * 2 * F) - 0.0051 * Math.sin(DEG * (M + Mpr));
  c1 = c1 - 0.0074 * Math.sin(DEG * (M - Mpr)) + 0.0004 * Math.sin(DEG * (2 * F + M));
  c1 = c1 - 0.0004 * Math.sin(DEG * (2 * F - M)) - 0.0006 * Math.sin(DEG * (2 * F + Mpr));
  c1 = c1 + 0.001 * Math.sin(DEG * (2 * F - Mpr)) + 0.0005 * Math.sin(DEG * (2 * Mpr + M));
  const deltaT =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return Math.floor(jd1 + c1 - deltaT + 0.5 + VN_TIMEZONE / 24);
}

/** Vị trí mặt trời lúc đầu ngày, chia thành 12 cung 30° (0 = xuân phân) */
function getSunLongitude(dayNumber: number): number {
  const T = (dayNumber - 0.5 - VN_TIMEZONE / 24 - 2451545.0) / 36525;
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DEG * M) +
    (0.019993 - 0.000101 * T) * Math.sin(DEG * 2 * M) +
    0.00029 * Math.sin(DEG * 3 * M);
  let L = (L0 + DL) * DEG;
  L -= Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor((L / Math.PI) * 6);
}

/** Ngày bắt đầu tháng 11 âm lịch (tháng chứa đông chí) của năm dương lịch yy */
function getLunarMonth11(yy: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / SYNODIC_MONTH);
  const nm = getNewMoonDay(k);
  return getSunLongitude(nm) >= 9 ? getNewMoonDay(k - 1) : nm;
}

/** Tháng nhuận là tháng đầu tiên sau tháng 11 không chứa trung khí */
function getLeapMonthOffset(a11: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / SYNODIC_MONTH + 0.5);
  let last: number;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i));
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

/**
 * @param month Tháng dương lịch, tính từ 1
 */
export function solarToLunar(day: number, month: number, year: number): LunarDate {
  const dayNumber = jdFromDate(day, month, year);
  const k = Math.floor((dayNumber - 2415021.076998695) / SYNODIC_MONTH);
  let monthStart = getNewMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k);

  let a11 = getLunarMonth11(year);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = year;
    a11 = getLunarMonth11(year - 1);
  } else {
    lunarYear = year + 1;
    b11 = getLunarMonth11(year + 1);
  }

  const diff = Math.floor((monthStart - a11) / 29);
  let lunarMonth = diff + 11;
  let leap = false;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      leap = diff === leapMonthDiff;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  return { day: dayNumber - monthStart + 1, month: lunarMonth, year: lunarYear, leap };
}

export function lunarFromDate(date: Date): LunarDate {
  return solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
}

/** Ngày dương lịch của mùng 1 âm lịch gần nhất sau ngày `from` */
export function nextLunarFirstDay(from: Date): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  do {
    date.setDate(date.getDate() + 1);
  } while (lunarFromDate(date).day !== 1);
  return date;
}

/** Mùng 1 và mùng 2 âm lịch: nhiều gia đình kiêng chi tiền vào đầu tháng */
export function isLunarMonthStart(lunar: LunarDate): boolean {
  return lunar.day === 1 || lunar.day === 2;
}
