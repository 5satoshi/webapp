import { Zap } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSizeClass = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl';
  const iconSize = size === 'lg' ? 32 : size === 'md' ? 28 : 24;

  return (
    <div className="flex items-center gap-2 text-primary">
      <Zap size={iconSize} className="text-secondary" /> {/* Use secondary for Zap icon color */}
      <span className={`font-headline font-semibold ${textSizeClass}`}>
        5satoshi
      </span>
    </div>
  );
}
