import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DiaryEntry, Position, SkipReason, Problem } from '@/src/types';

const formSchema = z.object({
  type: z.enum(['activity', 'skip']),
  positions: z.array(z.string()).optional(),
  count: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  herCount: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
  initiator: z.string().optional(),
  duration: z.number().min(1).optional().or(z.nan().transform(() => undefined)),
  rating: z.number().min(1).max(5).optional(),
  problems: z.array(z.string()).optional(),
  toys: z.string().optional(),
  notes: z.string().optional(),
  skipReason: z.string().optional(),
  skipNotes: z.string().optional(),
});

interface DiaryEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<DiaryEntry>) => void;
  selectedDate: Date;
  initialData?: DiaryEntry | null;
}

const POSITIONS: Position[] = [
  'Місіонерська', 'Ззаду (Doggy Style)', 'Наїздниця', 'Зворотна наїздниця', 'Ложки', 'Стоячи', 'Інше'
];

const SKIP_REASONS: SkipReason[] = [
  'Втома', 'Стрес', 'Хвороба', 'Відсутність бажання', 'Партнер не готовий', 'Місячні', 'Інше'
];

const PROBLEMS: Problem[] = [
  'Проблеми з ерекцією', 'Передчасна еякуляція', 'Затримана еякуляція', 'Біль', 'Втрата інтересу', 'Немає'
];

export function DiaryEntryForm({ isOpen, onClose, onSubmit, selectedDate, initialData }: DiaryEntryFormProps) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      type: 'activity',
      count: 1,
      rating: 5,
      problems: [],
    },
  });

  const type = watch('type');
  const selectedProblems = watch('problems') || [];
  const selectedPositions = watch('positions') || [];

  React.useEffect(() => {
    register('type');
    register('positions');
    register('rating');
    register('problems');
    register('skipReason');
  }, [register]);

  React.useEffect(() => {
    if (initialData) {
      const dataToReset = { ...initialData };
      if ((dataToReset as any).position && (!dataToReset.positions || dataToReset.positions.length === 0)) {
        dataToReset.positions = [(dataToReset as any).position];
      }
      reset(dataToReset);
    } else {
      reset({
        type: 'activity',
        count: 1,
        rating: 5,
        problems: [],
        positions: [],
      });
    }
  }, [initialData, reset, isOpen]);

  const onFormSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit({
      ...data,
      date: selectedDate.toISOString(),
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
    } as DiaryEntry);
    onClose();
  };

  const toggleProblem = (problem: Problem) => {
    const current = selectedProblems;
    if (current.includes(problem)) {
      setValue('problems', current.filter(p => p !== problem));
    } else {
      setValue('problems', [...current, problem]);
    }
  };

  const togglePosition = (position: Position) => {
    const current = selectedPositions;
    if (current.includes(position)) {
      setValue('positions', current.filter(p => p !== position));
    } else {
      setValue('positions', [...current, position]);
    }
  };

  const onFormError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Запис за {format(selectedDate, 'PPP', { locale: uk })}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="space-y-4 py-4">
          <Tabs value={type} onValueChange={(val) => setValue('type', val as 'activity' | 'skip')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="activity">Активність</TabsTrigger>
              <TabsTrigger value="skip">Пропуск</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Пози</Label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map(p => (
                    <Badge
                      key={p}
                      variant={selectedPositions.includes(p) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => togglePosition(p)}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Моя еякуляція (разів)</Label>
                  <Input type="number" {...register('count', { valueAsNumber: true })} />
                  {errors.count && <p className="text-xs text-red-500">{errors.count.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Її оргазм (разів)</Label>
                  <Input type="number" {...register('herCount', { valueAsNumber: true })} />
                  {errors.herCount && <p className="text-xs text-red-500">{errors.herCount.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Хто був ініціатором</Label>
                  <Input {...register('initiator')} placeholder="Наприклад: Я, Вона, Разом" />
                </div>
                <div className="space-y-2">
                  <Label>Тривалість (хв)</Label>
                  <Input type="number" {...register('duration', { valueAsNumber: true })} />
                  {errors.duration && <p className="text-xs text-red-500">{errors.duration.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Оцінка (1-5)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <Button
                      key={r}
                      type="button"
                      variant={watch('rating') === r ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => setValue('rating', r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Проблеми</Label>
                <div className="flex flex-wrap gap-2">
                  {PROBLEMS.map(p => (
                    <Badge
                      key={p}
                      variant={selectedProblems.includes(p) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleProblem(p)}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Використані іграшки</Label>
                <Input {...register('toys')} placeholder="Наприклад: Вібратор, лубрикант..." />
              </div>

              <div className="space-y-2">
                <Label>Примітки</Label>
                <Textarea {...register('notes')} placeholder="Будь-які додаткові примітки..." />
              </div>
            </TabsContent>

            <TabsContent value="skip" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Причина пропуску</Label>
                <Select onValueChange={(val) => setValue('skipReason', val as SkipReason)} defaultValue={initialData?.skipReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть причину" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKIP_REASONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Примітки до пропуску</Label>
                <Textarea {...register('skipNotes')} placeholder="Чому було пропущено?" />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="submit" className="w-full">Зберегти запис</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
