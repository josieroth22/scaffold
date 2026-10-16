// School-calendar framing for the generation prompts.
//
// Before Oct 15, 2026 the prompt hard-coded "current school year = (year-1)-(year)",
// which is only right in summer. From August on it was a year behind, so an
// "11th grader" submitted in October was planned as a current senior with every
// deadline a year early (caught by the Jake re-test). Month decides:
//   Aug-May: school is in session, the stated grade is the CURRENT grade.
//   Jun-Jul: summer, the stated grade is the grade JUST COMPLETED (rising next).

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function schoolCalendar(today = new Date()) {
  const m = today.getMonth();
  const y = today.getFullYear();
  const yy = (n) => String(n).slice(2);
  const currentDate = `${MONTHS[m]} ${y}`;

  // FAFSA opening October 1 of year X covers X+1 to X+2 and uses X-1 taxes
  const fafsa = `The FAFSA opens October 1 each year for the FOLLOWING school year: the FAFSA that opens October 1, ${y} covers ${y + 1}-${yy(y + 2)} and uses ${y - 1} tax returns. A student files in October of senior year.`;

  if (m >= 5 && m <= 6) {
    return {
      currentDate,
      preamble: `**TODAY'S DATE IS ${currentDate}. IT IS SUMMER: the ${y - 1}-${yy(y)} school year just ended and the ${y}-${yy(y + 1)} school year starts in August/September.** The grade the family gives is the grade the student JUST COMPLETED (a "10th grader" is a rising junior: 11th grade in ${y}-${yy(y + 1)}, applying in fall ${y + 1}). "This summer" = summer ${y}. ${fafsa} Never reference a date before ${currentDate} as upcoming or current.`,
    };
  }

  const start = m >= 7 ? y : y - 1; // school year start
  return {
    currentDate,
    preamble: `**TODAY'S DATE IS ${currentDate}. SCHOOL IS IN SESSION: THE CURRENT SCHOOL YEAR IS ${start}-${yy(start + 1)}.** The grade the family gives is the student's CURRENT grade (an "11th grader" is a junior right now, in ${start}-${yy(start + 1)}: senior year is ${start + 1}-${yy(start + 2)}, applications go out in fall ${start + 1}, and they graduate in spring ${start + 2}). Only a current 12th grader is in their application year (fall ${start} applications, spring ${start + 1} decisions). "Next summer" = summer ${start + 1}. ${fafsa} Never reference a date before ${currentDate} as upcoming or current.`,
  };
}

module.exports = { schoolCalendar };
