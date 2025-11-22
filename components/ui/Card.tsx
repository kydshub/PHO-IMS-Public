
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, title, actions, footer, noPadding = false }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="px-4 py-3 sm:px-6 border-b border-secondary-200 flex justify-between items-center">
          {title && <h3 className="text-lg leading-6 font-medium text-secondary-900">{title}</h3>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={`${noPadding ? '' : 'p-4 sm:p-6'} flex-1`}>
        {children}
      </div>
      {footer && (
        <div className="px-4 py-3 sm:px-6 border-t border-secondary-200 bg-secondary-50 rounded-b-lg">
            {footer}
        </div>
      )}
    </div>
  );
};
