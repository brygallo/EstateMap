'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { Owner } from '@/lib/types';

interface UserFilterProps {
  users: Owner[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
}

/**
 * Combobox de propietario con búsqueda (Popover + Command). Muestra "Todos los
 * usuarios" o el propietario elegido; el filtrado por texto lo resuelve cmdk.
 */
export default function UserFilter({ users, selectedUserId, onSelect }: UserFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedUser = users.find((u) => u.id === parseInt(selectedUserId, 10));
  const displayText =
    selectedUserId === 'all' ? 'Todos los usuarios' : selectedUser?.username || 'Usuario';

  const handleSelect = (userId: string) => {
    onSelect(userId);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between rounded-button border-line bg-white px-3 font-normal text-textPrimary hover:bg-slate-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-textSecondary" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{displayText}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] rounded-card p-0"
      >
        <Command>
          <CommandInput placeholder="Buscar usuario..." className="text-sm" />
          <CommandList>
            <CommandEmpty>No se encontraron usuarios</CommandEmpty>
            <CommandGroup>
              <CommandItem value="Todos los usuarios" onSelect={() => handleSelect('all')}>
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedUserId === 'all' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                Todos los usuarios
              </CommandItem>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.username}
                  onSelect={() => handleSelect(user.id.toString())}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedUserId === user.id.toString() ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {user.username}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
