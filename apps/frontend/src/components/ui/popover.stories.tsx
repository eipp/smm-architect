import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const meta = {
  title: 'UI/Popover',
  component: Popover,
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Toggle</Button>
      </PopoverTrigger>
      <PopoverContent>Some content</PopoverContent>
    </Popover>
  ),
}
