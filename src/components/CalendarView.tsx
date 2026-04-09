import React from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DiaryEntry } from '@/src/types';
import { Heart, XCircle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface CalendarViewProps {
  entries: DiaryEntry[];
  onDateSelect: (date: Date) => void;
  onAddEntry: (date: Date) => void;
  onEditEntry: (entry: DiaryEntry) => void;
  onDeleteEntry: (entry: DiaryEntry) => void;
  selectedDate: Date;
}

export function CalendarView({ entries, onDateSelect, onAddEntry, onEditEntry, onDeleteEntry, selectedDate }: CalendarViewProps) {
  const [entryToDelete, setEntryToDelete] = React.useState<DiaryEntry | null>(null);

  const getEntriesForDate = (date: Date) => {
    return entries.filter(e => isSameDay(parseISO(e.date), date));
  };

  const hasActivity = (date: Date) => getEntriesForDate(date).some(e => e.type === 'activity');
  const hasSkip = (date: Date) => getEntriesForDate(date).some(e => e.type === 'skip');

  const selectedEntries = getEntriesForDate(selectedDate);

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col md:flex-row gap-8 pt-6">
        <div className="flex-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onDayClick={(day) => {
              if (isSameDay(day, selectedDate)) {
                onAddEntry(day);
              } else {
                onDateSelect(day);
              }
            }}
            className="rounded-md border shadow-sm w-full h-full"
            locale={uk}
            modifiers={{
              activity: hasActivity,
              skip: (date) => hasSkip(date) && !hasActivity(date),
            }}
            modifiersClassNames={{
              activity: "bg-green-100 text-green-900 font-bold border-green-200",
              skip: "bg-gray-100 text-gray-900 font-bold border-gray-200",
            }}
          />
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Деталі за {format(selectedDate, 'PPP', { locale: uk })}</h3>
            <Button variant="outline" size="sm" onClick={() => onAddEntry(selectedDate)}>Додати запис</Button>
          </div>
          
          {selectedEntries.length > 0 ? (
            <div className="space-y-4">
              {selectedEntries.map((entry, index) => (
                <div key={entry.id || index} className="space-y-4 p-4 border rounded-lg bg-slate-50">
                  {entry.type === 'activity' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Badge variant="default" className="bg-green-500">Активність</Badge>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium mr-2">Оцінка: {entry.rating}/5</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditEntry(entry)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setEntryToDelete(entry)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {entry.positions && entry.positions.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Пози:</span> {entry.positions.join(', ')}
                          </div>
                        )}
                        {!(entry.positions && entry.positions.length > 0) && (entry as any).position && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Поза:</span> {(entry as any).position}
                          </div>
                        )}
                        <div><span className="text-muted-foreground">Моя еякуляція:</span> {entry.count ?? 0}</div>
                        <div><span className="text-muted-foreground">Її оргазм:</span> {entry.herCount ?? 0}</div>
                        <div><span className="text-muted-foreground">Тривалість:</span> {entry.duration ? `${entry.duration} хв` : '-'}</div>
                        <div><span className="text-muted-foreground">Ініціатор:</span> {entry.initiator || '-'}</div>
                      </div>
                      {entry.toys && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Іграшки:</span> {entry.toys}
                        </div>
                      )}
                      {entry.problems && entry.problems.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium flex items-center gap-1 text-amber-600">
                            <AlertCircle className="w-4 h-4" />
                            Проблеми:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {entry.problems.map((p, i) => (
                              <Badge key={`${p}-${i}`} variant="outline" className="text-[10px]">{p}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.notes && (
                        <div className="text-sm italic text-muted-foreground border-t pt-2">
                          "{entry.notes}"
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">Пропуск</Badge>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-muted-foreground mr-2">Причина: {entry.skipReason}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditEntry(entry)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setEntryToDelete(entry)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <XCircle className="w-4 h-4" />
                        <span>Активність пропущена</span>
                      </div>
                      {entry.skipNotes && (
                        <div className="text-sm italic text-muted-foreground border-t pt-2">
                          "{entry.skipNotes}"
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-lg text-muted-foreground">
              <p>Немає записів на цю дату</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="text-xs text-green-600 font-medium uppercase tracking-wider">Всього активностей</div>
              <div className="text-2xl font-bold text-green-900">{entries.filter(e => e.type === 'activity').length}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-600 font-medium uppercase tracking-wider">Всього пропусків</div>
              <div className="text-2xl font-bold text-gray-900">{entries.filter(e => e.type === 'skip').length}</div>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити запис?</DialogTitle>
            <DialogDescription>
              Ви впевнені, що хочете видалити цей запис? Цю дію неможливо скасувати.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryToDelete(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={() => {
              if (entryToDelete) {
                onDeleteEntry(entryToDelete);
                setEntryToDelete(null);
              }
            }}>Видалити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
