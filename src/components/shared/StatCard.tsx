import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'green' | 'primary' | 'yellow' | 'red';
}

export default function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorStyles = {
    green: 'text-emerald-500 bg-emerald-500/10',
    primary: 'text-blue-500 bg-blue-500/10',
    yellow: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-full", colorStyles[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
