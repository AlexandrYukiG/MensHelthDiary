import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DiaryEntry, Position, SkipReason, Problem } from '@/src/types';
import { format, subDays, isAfter, parseISO, getYear } from 'date-fns';

interface StatsDashboardProps {
  entries: DiaryEntry[];
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export function StatsDashboard({ entries }: StatsDashboardProps) {
  const [period, setPeriod] = useState<string>('30days');

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    entries.forEach(e => {
      try {
        years.add(getYear(parseISO(e.date)));
      } catch (err) {}
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (period === '30days') {
      return entries.filter(e => isAfter(parseISO(e.date), subDays(new Date(), 30)));
    }
    if (period === 'all') {
      return entries;
    }
    const year = parseInt(period);
    return entries.filter(e => {
      try {
        return getYear(parseISO(e.date)) === year;
      } catch (err) {
        return false;
      }
    });
  }, [entries, period]);

  const positionData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEntries.forEach(e => {
      if (e.type === 'activity') {
        if (e.positions && Array.isArray(e.positions)) {
          e.positions.forEach(p => {
            counts[p] = (counts[p] || 0) + 1;
          });
        }
        // Handle legacy data
        if ((e as any).position && typeof (e as any).position === 'string') {
          const p = (e as any).position;
          counts[p] = (counts[p] || 0) + 1;
        }
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  const skipReasonData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEntries.forEach(e => {
      if (e.type === 'skip' && e.skipReason) {
        counts[e.skipReason] = (counts[e.skipReason] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  const ratingData = React.useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredEntries.forEach(e => {
      if (e.type === 'activity' && e.rating) {
        counts[e.rating]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name: `${name} Зірок`, value }));
  }, [filteredEntries]);

  const durationTrend = React.useMemo(() => {
    return filteredEntries
      .filter(e => e.type === 'activity')
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .map(e => ({
        date: format(parseISO(e.date), 'MMM d'),
        duration: e.duration || 0,
      }));
  }, [filteredEntries]);

  const periodLabel = period === '30days' ? 'Останні 30 днів' : period === 'all' ? 'За весь час' : `За ${period} рік`;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Оберіть період" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30days">Останні 30 днів</SelectItem>
            <SelectItem value="all">За весь час</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>{year} рік</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Пози ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={positionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {positionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Тренд тривалості ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={durationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="duration" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Розподіл оцінок ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Причини пропусків ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={skipReasonData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {skipReasonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
