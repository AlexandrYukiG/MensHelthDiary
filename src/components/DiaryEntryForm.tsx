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
    register('initiator');
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

  const [entryDate, setEntryDate] = React.useState<string>(format(selectedDate, 'yyyy-MM-dd'));

  React.useEffect(() => {
    if (initialData) {
      setEntryDate(format(new Date(initialData.date), 'yyyy-MM-dd'));
    } else {
      setEntryDate(format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [initialData, selectedDate, isOpen]);

  const onFormSubmit = (data: z.infer<typeof formSchema>) => {
    let finalDate = selectedDate;
    if (entryDate) {
      const parsed = new Date(entryDate);
      if (!isNaN(parsed.getTime())) {
        finalDate = parsed;
      }
    }

    onSubmit({
      ...data,
      date: finalDate.toISOString(),
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

  const [positionInput, setPositionInput] = React.useState('');

  const handlePositionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = positionInput.trim();
      if (newTag && !selectedPositions.includes(newTag)) {
        setValue('positions', [...selectedPositions, newTag]);
      }
      setPositionInput('');
    } else if (e.key === 'Backspace' && !positionInput && selectedPositions.length > 0) {
      setValue('positions', selectedPositions.slice(0, -1));
    }
  };

  const removePosition = (posToRemove: string) => {
    setValue('positions', selectedPositions.filter(p => p !== posToRemove));
  };

  const onFormError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  const displayDate = entryDate && !isNaN(new Date(entryDate).getTime()) 
    ? new Date(entryDate) 
    : selectedDate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Запис за {format(displayDate, 'PPP', { locale: uk })}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Дата</Label>
            <Input 
              type="date" 
              value={entryDate} 
              onChange={(e) => setEntryDate(e.target.value)} 
              className="w-full"
            />
          </div>

          <Tabs value={type} onValueChange={(val) => setValue('type', val as 'activity' | 'skip')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="activity">Активність</TabsTrigger>
              <TabsTrigger value="skip">Пропуск</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Пози (через кому або Enter)</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  {selectedPositions.map(p => (
                    <Badge
                      key={p}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => removePosition(p)}
                        className="text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    value={positionInput}
                    onChange={(e) => setPositionInput(e.target.value)}
                    onKeyDown={handlePositionKeyDown}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                    placeholder={selectedPositions.length === 0 ? "Введіть пози..." : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ким ініційовано?</Label>
                  <div className="flex gap-2">
                    {['мною', 'нею', 'разом'].map(init => (
                      <Button
                        key={init}
                        type="button"
                        variant={watch('initiator') === init ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setValue('initiator', watch('initiator') === init ? '' : init)}
                      >
                        {init}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Тривалість (хв)</Label>
                  <Input type="number" {...register('duration', { valueAsNumber: true })} />
                  {errors.duration && <p className="text-xs text-red-500">{errors.duration.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Оцінка (1-5)</Label>
                <div className="flex gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <Button
                      key={r}
                      type="button"
                      variant={watch('rating') === r ? 'default' : 'outline'}
                      className="flex-1 px-0"
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
