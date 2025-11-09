import { render, screen } from '@testing-library/react';
import {
  Spinner,
  ValidationSpinner,
  ErrorIcon,
  GreenCheckIcon,
  RedXIcon,
} from '@/app/components/models/models.component';

describe('Icon and Spinner Components', () => {
  it('renders Spinner correctly', () => {
    render(<Spinner />);
    const svgElement = screen.getByTestId('spinner');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveClass('animate-spin');
  });

  it('renders ValidationSpinner correctly', () => {
    render(<ValidationSpinner />);
    const svgElement = screen.getByTestId('validation-spinner');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveClass('animate-spin');
  });

  it('renders ErrorIcon correctly', () => {
    render(<ErrorIcon />);
    const svgElement = screen.getByTestId('error-icon');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveClass('text-red-500');
  });

  it('renders GreenCheckIcon correctly', () => {
    render(<GreenCheckIcon />);
    const svgElement = screen.getByTestId('green-check-icon');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveClass('text-green-500');
  });

  it('renders RedXIcon correctly', () => {
    render(<RedXIcon />);
    const svgElement = screen.getByTestId('red-x-icon');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveClass('text-red-500');
  });
});
