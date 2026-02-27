'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DotsVerticalIcon } from '@/components/icons'

export type ActionItem =
  | { type: 'item'; label: string; onSelect: () => void; destructive?: boolean; disabled?: boolean }
  | { type: 'separator' }

export function ActionMenu({ items }: { items: ActionItem[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Open actions menu"
        >
          <DotsVerticalIcon className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[160px] overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {items.map((item, i) =>
            item.type === 'separator' ? (
              <DropdownMenu.Separator
                key={i}
                className="my-1 h-px bg-zinc-200 dark:bg-zinc-700"
              />
            ) : (
              <DropdownMenu.Item
                key={i}
                onSelect={item.onSelect}
                disabled={item.disabled}
                className={[
                  'flex cursor-pointer select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors',
                  item.destructive
                    ? 'text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 dark:text-red-400 dark:data-[highlighted]:bg-red-900/20'
                    : 'text-zinc-700 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900 dark:text-zinc-300 dark:data-[highlighted]:bg-zinc-800 dark:data-[highlighted]:text-zinc-50',
                  item.disabled ? 'pointer-events-none opacity-40' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {item.label}
              </DropdownMenu.Item>
            )
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
