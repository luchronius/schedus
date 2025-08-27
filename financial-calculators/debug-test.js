// Quick debug test to see what happens with validation
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompoundInterestCalculator from './src/components/CompoundInterestCalculator';

async function debugTest() {
  const user = userEvent.setup();
  render(<CompoundInterestCalculator />);

  // Get the input
  const principalInput = screen.getByLabelText(/principal amount/i);
  console.log('Principal input found:', principalInput);

  // Clear and enter negative value
  await user.clear(principalInput);
  await user.type(principalInput, '-1000');
  console.log('Entered -1000');

  // Click calculate
  const calculateButton = screen.getByRole('button', { name: /calculate compound growth/i });
  await user.click(calculateButton);
  console.log('Clicked calculate button');

  // Try to find error message
  try {
    const errorMessage = screen.getByText(/principal amount cannot be negative/i);
    console.log('Found error message:', errorMessage.textContent);
  } catch (e) {
    console.log('Error message not found, looking for any text with "principal" or "negative"');
    const allElements = screen.getAllByText(/principal|negative/i);
    allElements.forEach(el => console.log('Found element with text:', el.textContent));
  }

  console.log('Document body:', document.body.innerHTML);
}

debugTest().catch(console.error);