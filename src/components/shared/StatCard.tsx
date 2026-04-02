import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'green' | 'primary' | 'yellow' | 'red';
  preview?: { label: string; value: string | number; sublabel?: string }[];
}

export default function StatCard({ title, value, icon: Icon, color, preview }: StatCardProps) {
  const colorStyles = {
    green: 'text-emerald-500 bg-emerald-500/10',
    primary: 'text-blue-500 bg-blue-500/10',
    yellow: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-full transition-transform group-hover:scale-110", colorStyles[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold transition-all duration-300 group-hover:text-primary">{value}</div>
        
        {preview && preview.length > 0 && (
          <div className="max-h-0 opacity-0 group-hover:max-h-40 group-hover:opacity-100 group-hover:mt-4 group-hover:pt-4 border-t border-transparent group-hover:border-border transition-all duration-500 ease-in-out overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Resumo Recente</p>
            <div className="space-y-2">
              {preview.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ transitionDelay: `${idx * 50}ms` }}>
                  <div className="truncate pr-2">
                    <span className="font-medium text-foreground block truncate">{item.label}</span>
                    {item.sublabel && <span className="text-muted-foreground text-[9px]">{item.sublabel}</span>}
                  </div>
                  <span className={cn(
                    "font-semibold whitespace-nowrap",
                    typeof item.value === 'string' && item.value.startsWith('R$') ? 'text-emerald-600' : 'text-foreground'
                  )}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
