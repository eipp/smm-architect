import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioGroup, RadioGroupItem } from '../radio-group'

describe('RadioGroup', () => {
  it('selects the chosen option', async () => {
    const user = userEvent.setup()
    render(
      <RadioGroup>
        <div>
          <RadioGroupItem value="one" id="r1" />
          <label htmlFor="r1">One</label>
        </div>
        <div>
          <RadioGroupItem value="two" id="r2" />
          <label htmlFor="r2">Two</label>
        </div>
      </RadioGroup>
    )
    const optionTwo = screen.getByLabelText('Two')
    await user.click(optionTwo)
    expect(optionTwo).toBeChecked()
  })
})
