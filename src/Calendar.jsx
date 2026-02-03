// File: src/Components/CTO/MiniCalendar.jsx
import React from 'react';
import UserManagement from './Components/CTO/UserManagement';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './Components/CTO/SidebarOther';
import Topbar from './Components/Admin/Topbar';


export default function MiniCalendar({ selectedDate, setSelectedDate }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const daysOfWeek = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1));

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for(let i=0;i<firstDay;i++) days.push(<div key={`empty-${i}`}></div>);

    for(let day=1;day<=daysInMonth;day++){
      const isSelected = selectedDate && selectedDate.getDate()===day && selectedDate.getMonth()===currentDate.getMonth() && selectedDate.getFullYear()===currentDate.getFullYear();
      days.push(
        <div key={day} className="flex items-center justify-center cursor-pointer">
          <div 
            onClick={()=> setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
            className={`w-7 h-7 flex items-center justify-center text-xs transition-colors rounded-full ${
              isSelected ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-gray-100'
            }`}
          >
            {day}
          </div>
        </div>
      );
    }

    return days;
  }

  return (
    <div className="w-[300px] h-[300px] border border-gray-300 rounded-lg p-3 bg-white flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <button onClick={previousMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={16}/></button>
        <div className="flex items-center gap-1">
          <div className="text-sm font-semibold">{monthNames[currentDate.getMonth()]}</div>
          <select 
            value={currentDate.getFullYear()}
            onChange={(e)=> setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth()))}
            className="text-sm font-semibold border border-gray-300 rounded px-1 py-0"
          >
            {Array.from({length:21}, (_, i)=> new Date().getFullYear()-10+i).map(year=>(
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={16}/></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day=> <div key={day} className="text-center text-xs font-medium text-gray-600">{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">{renderCalendarDays()}</div>

    </div>
    
  );
}
