import { render, screen, fireEvent } from '@testing-library/react'
import { Slider } from '../slider'

describe('Slider', () => {
  it('changes value when moved', () => {
    render(<Slider defaultValue={50} />)
    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(slider.value).toBe('50')
    fireEvent.change(slider, { target: { value: '40' } })
    expect(slider.value).toBe('40')
  })
})
