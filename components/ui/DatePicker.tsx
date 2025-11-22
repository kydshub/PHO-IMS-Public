import React, { useState, useRef, useEffect } from 'react';
import { Input } from './Input';

interface DatePickerProps {
  label?: string;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
}

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary-500"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);

export const DatePicker: React.FC<DatePickerProps> = ({ label, selectedDate, onSelectDate, minDate, maxDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    if (selectedDate) {
        setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const handleDateClick = (day: number) => {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      onSelectDate(newDate);
      setIsOpen(false);
  }
  
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const lastDayOfPrevMonth = new Date(year, month, 0);
    lastDayOfPrevMonth.setHours(0,0,0,0);
    const localMinDate = minDate ? new Date(minDate) : null;
    if (localMinDate) localMinDate.setHours(0,0,0,0);
    const isPrevMonthDisabled = localMinDate && lastDayOfPrevMonth < localMinDate;
    
    const firstDayOfNextMonth = new Date(year, month + 1, 1);
    firstDayOfNextMonth.setHours(0,0,0,0);
    const localMaxDate = maxDate ? new Date(maxDate) : null;
    if (localMaxDate) localMaxDate.setHours(0,0,0,0);
    const isNextMonthDisabled = localMaxDate && firstDayOfNextMonth > localMaxDate;

    return (
        <div className="absolute top-full mt-2 w-full max-w-xs bg-white border border-secondary-200 rounded-lg shadow-xl z-50 p-4">
            <div className="flex justify-between items-center mb-2">
                <button type="button" onClick={handlePrevMonth} disabled={isPrevMonthDisabled} className="p-1 rounded-full hover:bg-secondary-100 text-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:text-secondary-300 disabled:hover:bg-transparent disabled:cursor-not-allowed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <div className="font-semibold text-secondary-800">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button type="button" onClick={handleNextMonth} disabled={isNextMonthDisabled} className="p-1 rounded-full hover:bg-secondary-100 text-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:text-secondary-300 disabled:hover:bg-transparent disabled:cursor-not-allowed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {daysOfWeek.map(day => <div key={day} className="font-medium text-secondary-500 p-1">{day}</div>)}
                {blanks.map((_, index) => <div key={`blank-${index}`}></div>)}
                {days.map(day => {
                    const date = new Date(year, month, day);
                    date.setHours(0, 0, 0, 0);

                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const isToday = new Date().toDateString() === date.toDateString();
                    
                    let isDisabled = false;
                    if (localMinDate && date < localMinDate) isDisabled = true;
                    if (localMaxDate && date > localMaxDate) isDisabled = true;

                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => handleDateClick(day)}
                            disabled={isDisabled}
                            className={`w-8 h-8 rounded-full transition-colors ${
                                isDisabled ? 'text-secondary-300 cursor-not-allowed' : 
                                isSelected ? 'bg-primary-600 text-white font-bold hover:bg-primary-700' : 
                                isToday ? 'bg-primary-100 text-primary-700 font-bold' : 'text-secondary-700 hover:bg-secondary-100'
                            }`}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>
        </div>
    )
  }

  return (
    <div className="relative w-full" ref={pickerRef}>
      {label && <label className="block text-sm font-medium text-secondary-700 mb-1">{label}</label>}
      <div className="relative">
        <Input
          type="text"
          value={selectedDate ? selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          placeholder="Select a date"
          className="cursor-pointer"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <CalendarIcon />
        </div>
      </div>
      {isOpen && renderCalendar()}
    </div>
  );
};