import type { Meta, StoryObj } from '@storybook/react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>You can add components to your app.</AlertDescription>
    </Alert>
  ),
}
