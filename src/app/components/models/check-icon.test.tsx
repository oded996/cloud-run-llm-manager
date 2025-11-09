import { render, screen } from '@testing-library/react';
import { CheckIcon } from '@/app/components/models/models.component';

describe('CheckIcon', () => {
  it('renders the check icon correctly', () => {
    render(<CheckIcon />);
    const svgElement = screen.getByTestId('check-icon');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
    expect(svgElement).toHaveClass('h-5 w-5 text-green-500');
  });
});
