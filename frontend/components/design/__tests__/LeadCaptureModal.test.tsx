import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LeadCaptureModal, { validateLead } from '../LeadCaptureModal';

const validDetails = {
  full_name: 'Sara Ahmed',
  email: 'sara@example.com',
  mobile: '+966501234567',
};

describe('validateLead', () => {
  it('accepts well-formed details', () => {
    expect(validateLead(validDetails, 'en')).toEqual({});
  });

  it('rejects a blank name', () => {
    expect(validateLead({ ...validDetails, full_name: '   ' }, 'en')).toHaveProperty('full_name');
  });

  it('rejects a malformed email', () => {
    expect(validateLead({ ...validDetails, email: 'sara@' }, 'en')).toHaveProperty('email');
  });

  it('rejects a mobile that is too short', () => {
    expect(validateLead({ ...validDetails, mobile: '12345' }, 'en')).toHaveProperty('mobile');
  });

  it('accepts an international mobile with spaces', () => {
    expect(validateLead({ ...validDetails, mobile: '+971 50 123 4567' }, 'en')).toEqual({});
  });

  it('rejects a mobile containing letters', () => {
    expect(validateLead({ ...validDetails, mobile: '+9665O1234567' }, 'en')).toHaveProperty('mobile');
  });

  it('returns Arabic messages when lang is ar', () => {
    const errors = validateLead({ ...validDetails, full_name: '' }, 'ar');
    expect(errors.full_name).toMatch(/[؀-ۿ]/);
  });
});

describe('LeadCaptureModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <LeadCaptureModal open={false} onClose={vi.fn()} onSubmit={vi.fn()} lang="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('does not submit invalid details, and shows the errors', () => {
    const onSubmit = vi.fn();
    render(<LeadCaptureModal open onClose={vi.fn()} onSubmit={onSubmit} lang="en" />);

    fireEvent.click(screen.getByRole('button', { name: /send|إرسال/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('submits the trimmed details when valid', () => {
    const onSubmit = vi.fn();
    render(<LeadCaptureModal open onClose={vi.fn()} onSubmit={onSubmit} lang="en" />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '  Sara Ahmed  ' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'sara@example.com' } });
    fireEvent.change(screen.getByLabelText(/mobile/i), { target: { value: '+966501234567' } });
    fireEvent.click(screen.getByRole('button', { name: /send|إرسال/i }));

    expect(onSubmit).toHaveBeenCalledWith(validDetails);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<LeadCaptureModal open onClose={onClose} onSubmit={vi.fn()} lang="en" />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('shows a server error when one is given', () => {
    render(
      <LeadCaptureModal
        open onClose={vi.fn()} onSubmit={vi.fn()} lang="en" error="Something went wrong"
      />,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders the privacy consent notice as plain text, not a link', () => {
    render(<LeadCaptureModal open onClose={vi.fn()} onSubmit={vi.fn()} lang="en" />);

    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
