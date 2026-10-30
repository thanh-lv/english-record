import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { LanguageProvider } from '../i18n/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { vi as viText } from '../i18n/vi';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../pages/StudentPage', () => ({ default: () => <div>student-page</div> }));
vi.mock('../pages/LoginPage', () => ({ default: () => <div>login-page</div> }));

function renderAt(path: string, role: 'student' | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    userProfile: role ? { id: 'student-1', name: 'An', role, avatar: '👦' } : null,
    setUserProfile: vi.fn(),
    authLoading: false,
    isSuperAdmin: false,
    isTeacher: false,
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);

  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('App home route', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'vi');
  });

  it('shows the homepage to signed-out visitors, with a login link in the header', async () => {
    renderAt('/', null);

    const heading = await screen.findByRole('heading', { level: 1, name: /thầy cô nghe từng bài/ });
    expect(heading).toBeDefined();

    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', { name: viText.home.login }).getAttribute('href')).toBe(
      '/login'
    );
  });

  it('sends signed-in users straight to their own home page', async () => {
    renderAt('/', 'student');

    expect(await screen.findByText('student-page')).toBeDefined();
    expect(screen.queryByRole('heading', { name: /thầy cô nghe từng bài/ })).toBeNull();
  });

  it('keeps sending signed-out visitors from protected pages to login', async () => {
    renderAt('/student', null);

    expect(await screen.findByText('login-page')).toBeDefined();
  });

  it('keeps the language switcher name when only its flag fits on small screens', async () => {
    renderAt('/', 'student');
    await screen.findByText('student-page');

    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: 'English' })
    ).toBeDefined();
  });

  it('keeps students out of the teacher movies tab', async () => {
    renderAt('/teacher/movies', 'student');

    expect(await screen.findByText('student-page')).toBeDefined();
  });

  it('hides the header login link while already on the login page', async () => {
    renderAt('/login', null);

    await screen.findByText('login-page');
    expect(
      within(screen.getByRole('banner')).queryByRole('link', { name: viText.home.login })
    ).toBeNull();
  });
});
