import axios from "axios";
import type axiosRetry from "axios-retry";
import {
  addMinutes,
  addMonths,
  format,
  isEqual,
  parse,
  subMonths,
} from "date-fns";
import { writeFileSync } from "fs";
import { createEvents } from "ics";
import { join } from "path";
import config from "./config";
import { base64encode } from "./utils";

// TS types for axios-retry are retarded and there really is no default export
const retry: typeof axiosRetry = require("axios-retry");

// Retry requests on error
retry(axios, { retries: 5 });

type ShiftCode = "P" | "C" | "V" | "H" | "c";

interface WorkShiftResponse {
  weekInfo: {
    eventsOfPersonByDateList: {
      /**
       * Full Finnish date (including weekday)
       * e.g. "ma 1.2.2021"
       */
      fullDayDate: string;
      eventDataList: {
        /**
         * e.g. "07:00"
         */
        beginTime: string;
        /**
         * e.g. "15:00"
         */
        endTime: string;
        /**
         * Shift code explanation.
         * Presence might indicate a day off - shifts don't have this at all.
         * e.g. "Vapaapäivä"
         */
        shiftCodeExplanation: string;
        /**
         * Shift code (maybe same as tCode?)
         */
        packetCode: ShiftCode;
        /**
         * Period cycle.
         * e.g. "2/T32"
         */
        periodCycle: string;
        /**
         * Unit code
         * e.g. "K0032"
         */
        scUnitCode: string;
        /**
         * Unit name
         * e.g. "Kotihoito Orvokki"
         */
        scUnitName: string;
      }[];
    }[];
  }[];
}

interface WorkShift {
  code: ShiftCode;
  periodCycle: string;
  unitName: string;
  start: Date;
  end: Date;
}

export const icsFilePath = join(__dirname, config.icsFileName);

function convertDateFromResponse(fullDayDate: string, time: string) {
  // In some erroneous cases the API might return "24:00" - in this case just convert it to a valid timestamp
  const nextDayAtMidnight = time === "24:00";
  // Full day contains weekday in front - discard it
  const [, date] = fullDayDate.split(/\s+/);
  const result = parse(
    `${date} ${nextDayAtMidnight ? "23:59" : time}`,
    "d.M.yyyy HH:mm",
    new Date()
  );

  // Add the missing 1 minute if needed
  if (nextDayAtMidnight) {
    return addMinutes(result, 1);
  }
  return result;
}

function convertShiftCodeToTitle(code: ShiftCode) {
  return (
    {
      C: "Aamuvuoro",
      c: "Aamuvuoro",
      P: "Iltavuoro",
    }[code] ?? `Työvuoro ${code}`
  );
}

export async function getWorkShifts(dateInMonth: Date) {
  // Use existing session if possible, otherwise re-authenticate
  const sessionId =
    config.sessionId || (await authenticate(config.username, config.password));

  // Fetch data
  const { data } = await axios.post<WorkShiftResponse>(
    "https://hrmpublic.services.plat.fi/nokiaomatitania/rest/pwtFindEventsOfPerson",
    {
      sessionId: base64encode(sessionId),
      language: base64encode("fi"),
      navigateDate: base64encode(format(dateInMonth, "yyyy/MM")),
    }
  );
  return data.weekInfo.reduce(
    (shifts, week) => [
      ...shifts,
      ...week.eventsOfPersonByDateList.reduce(
        (shifts, event) => [
          ...shifts,
          ...event.eventDataList.reduce(
            (shifts, data) => [
              ...shifts,
              // Skip shifts with an explanation - indicates a day off
              ...(!data || data.shiftCodeExplanation
                ? []
                : [
                    <WorkShift>{
                      code: data.packetCode,
                      periodCycle: data.periodCycle,
                      unitName: data.scUnitName,
                      start: convertDateFromResponse(
                        event.fullDayDate,
                        data.beginTime
                      ),
                      end: convertDateFromResponse(
                        event.fullDayDate,
                        data.endTime
                      ),
                    },
                  ]),
            ],
            <WorkShift[]>[]
          ),
        ],
        <WorkShift[]>[]
      ),
    ],
    <WorkShift[]>[]
  );
}

async function authenticate(username: string, password: string) {
  if (!username || !password) {
    throw new Error("Username or password not provided, check your envs!");
  }
  const { data } = await axios.post(
    "https://hrmpublic.services.plat.fi/nokiaomatitania/rest/pwtRestLogin/pwtLogin",
    {
      updTerminal: base64encode("hrmpublic.services.plat.fi"),
      updUser: base64encode(username),
      password: base64encode(password),
    }
  );
  return data.sessionId;
}

export async function updateCalendar() {
  const now = new Date();
  const dates = [
    addMonths(now, 2),
    addMonths(now, 1),
    now,
    subMonths(now, 1),
    subMonths(now, 2),
    subMonths(now, 3),
  ];
  const shifts = (
    await Promise.all(dates.map((date) => getWorkShifts(date)))
  ).reduce(
    (allShifts, newShifts) => [
      ...allShifts,
      ...newShifts.filter(
        (newShift) =>
          // Filter possible duplicates - there may be duplicate dates returned on overlapping requests
          !allShifts.some(
            (otherShift) =>
              isEqual(otherShift.start, newShift.start) &&
              isEqual(otherShift.end, newShift.end)
          )
      ),
    ],
    <WorkShift[]>[]
  );
  // Manually add shifts that are unavailable
  shifts.push(
    {
      code: "C",
      start: new Date("2023-01-09T07:00"),
      end: new Date("2023-01-09T14:15"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-10T07:00"),
      end: new Date("2023-01-10T15:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-11T07:00"),
      end: new Date("2023-01-11T15:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "P",
      start: new Date("2023-01-13T14:30"),
      end: new Date("2023-01-13T21:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "P",
      start: new Date("2023-01-14T14:30"),
      end: new Date("2023-01-14T21:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "P",
      start: new Date("2023-01-15T14:30"),
      end: new Date("2023-01-15T21:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      //
      code: "C",
      start: new Date("2023-01-17T07:00"),
      end: new Date("2023-01-17T15:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-18T07:00"),
      end: new Date("2023-01-18T14:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-19T07:00"),
      end: new Date("2023-01-19T14:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-20T07:00"),
      end: new Date("2023-01-20T14:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      //
      code: "C",
      start: new Date("2023-01-23T07:00"),
      end: new Date("2023-01-23T14:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-24T07:00"),
      end: new Date("2023-01-24T15:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-25T07:00"),
      end: new Date("2023-01-25T14:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-26T07:00"),
      end: new Date("2023-01-26T14:30"),
      periodCycle: "01/23",
      unitName: "-",
    },
    {
      code: "C",
      start: new Date("2023-01-27T07:00"),
      end: new Date("2023-01-27T14:30"),
      periodCycle: "01/23",
      unitName: "-",
    }
  );
  const icsData = workShiftsToIcs(shifts);
  writeFileSync(icsFilePath, icsData);
  console.log(`Successfully updated ${shifts.length} shifts to the ICS file`);
}

function dateToIcsDate(date: Date) {
  return format(date, "yyyy-M-d-H-m").split("-").map(Number) as [
    number,
    number,
    number,
    number,
    number
  ];
}

function workShiftsToIcs(shifts: WorkShift[]) {
  const { error, value } = createEvents(
    shifts.map((shift) => ({
      title: convertShiftCodeToTitle(shift.code),
      start: dateToIcsDate(shift.start),
      end: dateToIcsDate(shift.end),
      description: `${shift.periodCycle} ${shift.unitName}`,
    }))
  );
  if (error) {
    throw error;
  }
  return value;
}

export function clearCalendar() {
  writeFileSync(icsFilePath, "");
  console.log("Cleared calendar data");
}
