import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { vi as viText } from '../../i18n/vi';
import { en as enText } from '../../i18n/en';

function renderHome() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <HomePage />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'vi');
  });

  it('introduces the site with a single top-level heading', () => {
    renderHome();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain(viText.home.hero.titleStart);
    expect(heading.textContent).toContain(viText.home.hero.titleAccent);
  });

  it('points every login call to action at the login page', () => {
    renderHome();

    const links = screen.getAllByRole('link', { name: viText.home.login });
    expect(links.length).toBeGreaterThan(0);
    links.forEach(link => expect(link.getAttribute('href')).toBe('/login'));
  });

  it('jumps to the features section from the secondary call to action', () => {
    const { container } = renderHome();

    const link = screen.getByRole('link', { name: viText.home.hero.secondaryCta });
    expect(link.getAttribute('href')).toBe('#features');
    expect(container.querySelector('#features')).not.toBeNull();
  });

  it('lists all six student features', () => {
    renderHome();

    const { speaking, shadowing, flashcards, stories, games, achievements } = viText.home.features;
    [speaking, shadowing, flashcards, stories, games, achievements].forEach(feature => {
      expect(screen.getByRole('heading', { level: 3, name: feature.title })).toBeDefined();
    });
  });

  it('renders in English when that language is selected', () => {
    localStorage.setItem('app-language', 'en');
    renderHome();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      enText.home.hero.titleStart
    );
    expect(screen.getAllByRole('link', { name: enText.home.login }).length).toBeGreaterThan(0);
  });
});
