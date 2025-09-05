import { render, screen } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback } from '../avatar'

describe('Avatar', () => {
  it('renders image when provided', () => {
    render(
      <Avatar>
        <AvatarImage src="test.png" alt="Test" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByAltText('Test')).toBeInTheDocument()
  })

  it('renders fallback when image missing', () => {
    render(
      <Avatar>
        <AvatarFallback>CD</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('CD')).toBeInTheDocument()
  })
})
