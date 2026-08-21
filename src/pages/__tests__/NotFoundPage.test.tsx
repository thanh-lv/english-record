import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { UserProfile } from '../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('app-language', 'vi');
  });

  it('renders 404 header and guidance properly', () => {
    render(
      <BrowserRouter>
        <LanguageProvider>
          <NotFoundPage />
        </LanguageProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('404')).toBeDefined();
    expect(screen.getByText(/Không Tìm Thấy Trang|Page Not Found/i)).toBeDefined();
  });

  it('navigates to -1 when go back button is clicked', () => {
    render(
      <BrowserRouter>
        <LanguageProvider>
          <NotFoundPage />
        </LanguageProvider>
      </BrowserRouter>
    );

    const backBtn = screen.getByRole('button', { name: /Quay Lại|Go Back/i });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('navigates to teacher attendance when teacher clicks back home', () => {
    const teacherProfile: UserProfile = {
      id: 'teacher-123',
      name: 'Giáo viên',
      role: 'teacher',
      avatar: '👩‍🏫',
    };

    render(
      <BrowserRouter>
        <LanguageProvider>
          <NotFoundPage userProfile={teacherProfile} />
        </LanguageProvider>
      </BrowserRouter>
    );

    const homeBtn = screen.getByRole('button', { name: /Về Trang Chủ|Back to Home/i });
    fireEvent.click(homeBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/attendance');
  });

  it('navigates to student page when student clicks back home', () => {
    const studentProfile: UserProfile = {
      id: 'student-123',
      name: 'Bé An',
      role: 'student',
      avatar: '👦',
    };

    render(
      <BrowserRouter>
        <LanguageProvider>
          <NotFoundPage userProfile={studentProfile} />
        </LanguageProvider>
      </BrowserRouter>
    );

    const homeBtn = screen.getByRole('button', { name: /Về Trang Chủ|Back to Home/i });
    fireEvent.click(homeBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/student');
  });
});
