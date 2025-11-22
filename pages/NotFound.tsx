

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-9xl font-extrabold text-primary-600 tracking-widest">404</h1>
      <div className="bg-primary-900 px-2 text-sm rounded rotate-12 absolute text-white">
        Page Not Found
      </div>
      <p className="mt-4 text-lg text-secondary-600">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link to="/analytics">
        <Button className="mt-6">
          Go to Analytics & Reports
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;