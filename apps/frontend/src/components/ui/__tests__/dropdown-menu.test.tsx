import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../dropdown-menu'

describe('DropdownMenu', () => {
  it('opens and displays items', async () => {
    const user = userEvent.setup()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Open</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    await user.click(screen.getByRole('button', { name: /open/i }))
    expect(await screen.findByText('Profile')).toBeInTheDocument()
  })
})
