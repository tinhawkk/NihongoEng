import { convertSolar2Lunar, getYearGanZhi } from './vietnameseLunar';

export const getSimpleLunarDate = date => {
  const [lunarDay, lunarMonth, lunarYear] = convertSolar2Lunar(date.getDate(), date.getMonth() + 1, date.getFullYear(), 7);
  return { day: lunarDay, month: lunarMonth, year: lunarYear };
};

export const fetchLunarDate = async (day, month, year) => {
  try {
    const [lunarDay, lunarMonth, lunarYear] = convertSolar2Lunar(day, month, year, 7);
    const { gan, zhi } = getYearGanZhi(lunarYear);
    
    return {
      day: lunarDay,
      month: lunarMonth,
      year: lunarYear,
      heavenlyStems: gan,
      earthlyBranches: zhi,
    };
  } catch (error) {
    console.error("[LunarAPI] Local lunar conversion failed.", error);
    return null;
  }
};

