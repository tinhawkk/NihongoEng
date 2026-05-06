/* 
  Vietnamese Lunar Calendar algorithm.
  Based on astronomical calculations for Vietnamese timezone (UTC+7).
*/

const PI = Math.PI;

function INT(d) {
  return Math.floor(d);
}

function jdFromDate(dd, mm, yyyy) {
  let a = INT((14 - mm) / 12);
  let y = yyyy + 4800 - a;
  let m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

function jdToDate(jd) {
  let a, b, c, d, e, m, day, month, year;
  if (jd > 2299160) {
    a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((146097 * b) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  d = INT((4 * c + 3) / 1461);
  e = c - INT((1461 * d) / 4);
  m = INT((5 * e + 2) / 153);
  day = e - INT((153 * m + 2) / 5) + 1;
  month = m + 3 - 12 * INT(m / 10);
  year = b * 100 + d - 4800 + INT(m / 10);
  return [day, month, year];
}

function getSunLongitude(jdn, timeZone) {
  let t = (jdn - 2451545.0 - timeZone / 24.0) / 36525.0;
  let t2 = t * t;
  let l = 280.46646 + 36000.76983 * t + 0.0003032 * t2;
  let m = 357.52911 + 35999.05029 * t - 0.0001537 * t2;
  let e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t2;
  let c = (1.914602 - 0.004817 * t - 0.000014 * t2) * Math.sin(m * PI / 180) 
        + (0.019993 - 0.000101 * t) * Math.sin(2 * m * PI / 180) 
        + 0.000289 * Math.sin(3 * m * PI / 180);
  let sunLong = l + c;
  sunLong = sunLong - 360.0 * INT(sunLong / 360.0);
  return sunLong;
}

function getNewMoonDay(k, timeZone) {
  let t = k / 1236.85;
  let t2 = t * t;
  let t3 = t2 * t;
  let dr = PI / 180.0;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);
  let m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  let mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  let f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  let c1 = (0.1734 - 0.000393 * t) * Math.sin(m * dr) + 0.0021 * Math.sin(2 * m * dr) 
         - 0.0004 * Math.sin(mpr * dr) + 0.0005 * Math.sin(2 * mpr * dr) 
         - 0.0004 * Math.sin(2 * f * dr);
  let jdNew = jd1 + c1 + 0.5 + timeZone / 24.0;
  return INT(jdNew);
}

function getSunLongitudeDay(sunLong, timeZone) {
  let t = sunLong / 360.0;
  let jd = 2451545.0 + 365.2422 * t;
  let sl = getSunLongitude(jd, timeZone);
  let error = sl - sunLong;
  while (Math.abs(error) > 0.00001) {
    jd = jd - error / 0.9856;
    sl = getSunLongitude(jd, timeZone);
    error = sl - sunLong;
  }
  return INT(jd + 0.5 + timeZone / 24.0);
}

function getLunarMonth11(year, timeZone) {
  let off = jdFromDate(31, 12, year) - 2415021;
  let k = INT(off / 29.53058868);
  let nm = getNewMoonDay(k, timeZone);
  let sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 270) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11, timeZone) {
  let k = INT((a11 - 2415021.0) / 29.53058868) + 1;
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function convertSolar2Lunar(dd, mm, yyyy, timeZone = 7) {
  let dayNumber = jdFromDate(dd, mm, yyyy);
  let k = INT((dayNumber - 2415021.0) / 29.53058868);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  
  let a11 = getLunarMonth11(yyyy, timeZone);
  let b11 = a11;
  if (a11 >= monthStart) {
    a11 = getLunarMonth11(yyyy - 1, timeZone);
  } else {
    b11 = getLunarMonth11(yyyy + 1, timeZone);
  }
  
  let day = dayNumber - monthStart + 1;
  let diff = INT((monthStart - a11) / 29);
  let leapMonthDiff = getLeapMonthOffset(a11, timeZone);
  
  let month = diff - 1;
  let isLeap = 0;
  
  if (b11 - a11 > 365) {
    leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      month = diff - 2;
      if (diff === leapMonthDiff) {
        isLeap = 1;
      }
    }
  }
  
  if (month <= 0) {
    month += 12;
  }
  if (monthStart >= b11) {
    month = 11;
  }
  
  let year = yyyy;
  if (month === 11 || month === 12) {
    let sl = getSunLongitude(monthStart, timeZone);
    if (sl < 270) {
      year = yyyy - 1;
    }
  }
  
  return [day, month, year, isLeap];
}

const GAN = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"];
const ZHI = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"];

export function getYearGanZhi(year) {
  return {
    gan: GAN[year % 10],
    zhi: ZHI[year % 12]
  };
}
