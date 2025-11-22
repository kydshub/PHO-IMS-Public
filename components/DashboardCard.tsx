import React from 'react';
import { Link } from 'react-router-dom';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'teal' | 'indigo' | 'sky' | 'blue' | 'yellow' | 'orange' | 'red';
  linkTo?: string;
  linkState?: object;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, subtitle, icon, color, linkTo, linkState }) => {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    teal: 'bg-teal-100 text-teal-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    sky: 'bg-sky-100 text-sky-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  const content = (
    <div className={`bg-white shadow-lg rounded-lg p-5 flex items-center transition-all duration-300 h-full ${linkTo ? 'hover:shadow-xl hover:scale-[1.02]' : ''}`}>
      <div className={`flex-shrink-0 h-16 w-16 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="ml-4 flex-1">
        <p className="text-sm font-medium text-secondary-500 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-secondary-900">{value}</p>
        {subtitle && <p className="text-xs text-secondary-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} state={linkState} className="block h-full">{content}</Link>;
  }
  
  return content;
};

export default DashboardCard;
