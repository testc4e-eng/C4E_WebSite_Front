import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFieldProps {
  placeholder: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  searchPlaceholder?: string;
  emptyText?: string;
}

export default function MultiSelectField({
  placeholder,
  options,
  values,
  onChange,
  searchPlaceholder = 'Rechercher',
  emptyText = 'Aucun résultat',
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);

  const selectedOptions = values
    .map((value) => options.find((option) => option.value === value))
    .filter((item): item is MultiSelectOption => Boolean(item));

  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition hover:border-slate-300"
          >
            <span className={cn('line-clamp-1', !selectedOptions.length && 'text-slate-400')}>
              {selectedOptions.length ? `${selectedOptions.length} sélectionné(s)` : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="z-[9999] w-[420px] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl">
          <Command className="rounded-xl bg-white text-slate-900">
            <CommandInput placeholder={searchPlaceholder} className="border-b border-slate-200 bg-white text-slate-900 placeholder:text-slate-400" />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const checked = values.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => toggle(option.value)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-900 aria-selected:bg-emerald-50 aria-selected:text-slate-900 data-[selected=true]:bg-emerald-50 data-[selected=true]:text-slate-900"
                    >
                      <div className={cn('flex h-4 w-4 items-center justify-center rounded border', checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white')}>
                        <Check className={cn('h-3 w-3', checked ? 'opacity-100' : 'opacity-0')} />
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="mt-3 flex flex-wrap gap-2">
        {selectedOptions.length ? selectedOptions.map((option) => (
          <Badge key={option.value} variant="secondary" className="inline-flex items-center gap-1 rounded-full px-3 py-1">
            {option.label}
            <button
              type="button"
              onClick={() => onChange(values.filter((value) => value !== option.value))}
              className="ml-1 rounded-full p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )) : <span className="text-xs text-slate-400">Aucune sélection</span>}
      </div>
    </div>
  );
}
