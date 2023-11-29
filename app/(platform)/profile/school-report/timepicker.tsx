import { addHours, addMinutes, format, getHours, parse } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";

const startHour = 6;
const endHour = 18;

const getHoursList = (time: Date) => {
  const hoursList: { timeValue: Date; timeFormat: string }[] = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => {
      const refDate = new Date(time);
      refDate.setHours(0);
      refDate.setMinutes(0);
      const timeValue = addHours(refDate, i + startHour);
      const timeFormat = format(timeValue, "h:mma");
      return { timeValue, timeFormat };
    },
  );
  return hoursList;
};

function getTimeFromDate(date: Date): Date {
  const hours = getHours(date);
  const newTime = new Date(date);
  newTime.setHours(hours);
  return newTime;
}

function getTimeRangeFormat(time: Date): string {
  const start = format(time, "h:mma");
  const end = format(addHours(addMinutes(time, 30), 1), "h:mma");
  return `${start} - ${end} `;
}

export function Timepicker({
  time,
  onSelect,
}: {
  time: Date;
  onSelect: (date: Date) => void;
}) {
  const handleValueChange = (timeRange: string) => {
    let [startTime, endTime] = timeRange.split(" - ");
    if (!startTime || !endTime) {
      console.error("Invalid time range");
      return;
    }
    const startDateTime = parse(startTime, "h:mmaa", time);
    const newTime = getTimeFromDate(startDateTime);
    onSelect(newTime);
  };

  return (
    <Select onValueChange={handleValueChange}>
      <SelectTrigger
        hideIcon
        className="w-[180px] border-0 px-0 text-xs shadow-none transition-transform focus:ring-0 active:scale-95"
      >
        <SelectValue placeholder={getTimeRangeFormat(time)}>
          {getTimeRangeFormat(time)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="px-0 py-4">
        {getHoursList(time).map(({ timeValue, timeFormat }) => (
          <SelectItem
            key={timeFormat}
            value={getTimeRangeFormat(timeValue)}
            className="pl-8 text-xs"
          >
            {timeFormat}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
