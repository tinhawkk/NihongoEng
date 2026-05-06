const { Lunar } = require('lunar-javascript');

const date = new Date(2024, 1, 10); // Feb 10, 2024 (Lunar New Year)
const lunar = Lunar.fromDate(date);

console.log({
  day: lunar.getDay(),
  month: lunar.getMonth(),
  year: lunar.getYear(),
  heavenlyStems: lunar.getYearGan(),
  earthlyBranches: lunar.getYearZhi()
});
