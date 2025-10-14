import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentForm from './DocumentForm';

describe('DocumentForm', () => {
  const defaultProps = {
    title: '',
    content: '',
    errors: { title: '', content: '' },
    fileError: '',
    onTitleChange: vi.fn(),
    onContentChange: vi.fn(),
    onFileUpload: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('renders form fields', () => {
    render(<DocumentForm {...defaultProps} />);

    expect(screen.getByLabelText(/document title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/document content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload document file/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add document/i })).toBeInTheDocument();
  });

  it('calls onTitleChange when title input changes', async () => {
    const user = userEvent.setup();
    const onTitleChange = vi.fn();

    render(<DocumentForm {...defaultProps} onTitleChange={onTitleChange} />);

    const titleInput = screen.getByLabelText(/document title/i);
    await user.type(titleInput, 'Test Title');

    expect(onTitleChange).toHaveBeenCalled();
  });

  it('calls onContentChange when content textarea changes', async () => {
    const user = userEvent.setup();
    const onContentChange = vi.fn();

    render(<DocumentForm {...defaultProps} onContentChange={onContentChange} />);

    const contentTextarea = screen.getByLabelText(/document content/i);
    await user.type(contentTextarea, 'Test content');

    expect(onContentChange).toHaveBeenCalled();
  });

  it('calls onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(<DocumentForm {...defaultProps} onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /add document/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalled();
  });

  it('displays title error message', () => {
    render(
      <DocumentForm
        {...defaultProps}
        errors={{ title: 'Title is required', content: '' }}
      />
    );

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Title is required')).toHaveAttribute('role', 'alert');
  });

  it('displays content error message', () => {
    render(
      <DocumentForm
        {...defaultProps}
        errors={{ title: '', content: 'Content is required' }}
      />
    );

    expect(screen.getByText('Content is required')).toBeInTheDocument();
    expect(screen.getByText('Content is required')).toHaveAttribute('role', 'alert');
  });

  it('displays file error message', () => {
    render(<DocumentForm {...defaultProps} fileError="File too large" />);

    expect(screen.getByText('File too large')).toBeInTheDocument();
    expect(screen.getByText('File too large')).toHaveAttribute('role', 'alert');
  });

  it('shows character count for title', () => {
    render(<DocumentForm {...defaultProps} title="Test" />);

    expect(screen.getByText('4/100')).toBeInTheDocument();
  });

  it('shows character count for content', () => {
    render(<DocumentForm {...defaultProps} content="Test content" />);

    expect(screen.getByText(/12\/50,000/i)).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <DocumentForm
        {...defaultProps}
        errors={{ title: 'Error', content: 'Error' }}
      />
    );

    const titleInput = screen.getByLabelText(/document title/i);
    const contentTextarea = screen.getByLabelText(/document content/i);

    expect(titleInput).toHaveAttribute('aria-required', 'true');
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveAttribute('aria-describedby', 'title-error');

    expect(contentTextarea).toHaveAttribute('aria-required', 'true');
    expect(contentTextarea).toHaveAttribute('aria-invalid', 'true');
    expect(contentTextarea).toHaveAttribute('aria-describedby', 'content-error');
  });

  it('supports keyboard navigation for file upload', () => {
    render(<DocumentForm {...defaultProps} />);

    const fileUploadLabel = screen.getByText(/click to upload/i).closest('label');
    expect(fileUploadLabel).toHaveAttribute('tabIndex', '0');
  });

  it('calls onFileUpload when file is selected', async () => {
    const user = userEvent.setup();
    const onFileUpload = vi.fn();

    render(<DocumentForm {...defaultProps} onFileUpload={onFileUpload} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload document file/i);

    await user.upload(fileInput, file);

    expect(onFileUpload).toHaveBeenCalled();
  });
});
