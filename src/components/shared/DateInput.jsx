import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const generateYears = (startYear = 1940, endYear = new Date().getFullYear()) => {
  const years = [];
  for (let year = endYear; year >= startYear; year--) {
    years.push(year.toString());
  }
  return years;
};

const generateDays = () => {
  return Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
};

export default function DateInput({ value, onChange, placeholder = 'Select date' }) {
  const [month, setMonth] = React.useState('');
  const [day, setDay] = React.useState('');
  const [year, setYear] = React.useState('');

  React.useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setYear(y || '');
      setMonth(m || '');
      setDay(d || '');
    }
  }, [value]);

  const handleChange = (type, newValue) => {
    let newMonth = month;
    let newDay = day;
    let newYear = year;

    if (type === 'month') newMonth = newValue;
    if (type === 'day') newDay = newValue;
    if (type === 'year') newYear = newValue;

    setMonth(newMonth);
    setDay(newDay);
    setYear(newYear);

    if (newYear && newMonth && newDay) {
      onChange(`${newYear}-${newMonth}-${newDay}`);
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={month} onValueChange={(v) => handleChange('month', v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={day} onValueChange={(v) => handleChange('day', v)}>
        <SelectTrigger className="w-[90px]">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          {generateDays().map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={(v) => handleChange('year', v)}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {generateYears().map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}