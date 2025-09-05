import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '../alert'

describe('Alert', () => {
  it('renders with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
  })
})
