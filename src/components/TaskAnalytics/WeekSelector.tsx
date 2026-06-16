import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WeekSelectorProps {
  currentDate: Date;
  onChange: (date: Date, year: number, week: number) => void;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({ currentDate, onChange }) => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const year = getYear(start); // Year based on the start of the week

  const handlePrev = () => {
    const newDate = subWeeks(currentDate, 1);
    onChange(newDate, getYear(startOfWeek(newDate, { weekStartsOn: 1 })), getWeek(newDate, { weekStartsOn: 1 }));
  };

  const handleNext = () => {
    const newDate = addWeeks(currentDate, 1);
    onChange(newDate, getYear(startOfWeek(newDate, { weekStartsOn: 1 })), getWeek(newDate, { weekStartsOn: 1 }));
  };

  const handleCurrent = () => {
    const newDate = new Date();
    onChange(newDate, getYear(startOfWeek(newDate, { weekStartsOn: 1 })), getWeek(newDate, { weekStartsOn: 1 }));
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Semaine {weekNumber}
          </h2>
          <p className="text-sm text-gray-500 capitalize">
            {format(start, 'dd MMM', { locale: fr })} - {format(end, 'dd MMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrev}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Semaine précédente"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={handleCurrent}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
        >
          Aujourd'hui
        </button>
        <button
          onClick={handleNext}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Semaine suivante"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};
