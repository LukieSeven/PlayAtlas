import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Compass, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
        <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: '10s' }} />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white">404 - Level Not Found</h1>
        <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
          The requested page or shared list link could not be located in Play Atlas.
        </p>
      </div>

      <Link to="/">
        <Button variant="glow" size="lg" icon={<Home className="w-4 h-4" />}>
          Return to Home Dashboard
        </Button>
      </Link>
    </div>
  );
};
