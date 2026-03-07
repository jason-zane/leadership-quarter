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
          className="rounded-full border border-[rgba(108,136,174,0.16)] bg-[rgba(255,255,255,0.82)] p-2 text-[var(--portal-text-muted)] transition-colors hover:bg-[var(--portal-surface-alt)] hover:text-[var(--portal-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-focus)]"
          aria-label="Open actions menu"
        >
          <DotsVerticalIcon className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[180px] overflow-hidden rounded-2xl border border-[rgba(108,136,174,0.18)] bg-[rgba(255,255,255,0.96)] p-1.5 shadow-[0_18px_42px_rgba(24,45,74,0.16)]"
        >
          {items.map((item, i) =>
            item.type === 'separator' ? (
              <DropdownMenu.Separator
                key={i}
                className="my-1 h-px bg-[rgba(108,136,174,0.18)]"
              />
            ) : (
              <DropdownMenu.Item
                key={i}
                onSelect={item.onSelect}
                disabled={item.disabled}
                className={[
                  'flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors',
                  item.destructive
                    ? 'text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700'
                    : 'text-[var(--portal-text-primary)] data-[highlighted]:bg-[var(--portal-surface-alt)] data-[highlighted]:text-[var(--portal-text-primary)]',
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
