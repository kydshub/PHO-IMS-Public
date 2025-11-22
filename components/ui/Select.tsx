import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-secondary-700 mb-1">{label}</label>}
      <select
        id={id}
        className="block w-full pl-3 pr-10 py-2 bg-secondary-50 border border-secondary-300 text-secondary-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-secondary-200 disabled:text-secondary-500 disabled:cursor-not-allowed"
        {...props}
      >
        {children}
      </select>
    </div>
  );
};
