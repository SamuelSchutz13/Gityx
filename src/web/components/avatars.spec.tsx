import { fireEvent, render, screen } from '@testing-library/react';
import { Avatar, TechIcon, avatarUrl } from './avatars';

describe('TechIcon', () => {
  it('draws the bundled brand icon', () => {
    const { container } = render(<TechIcon name="React" />);
    const svg = container.querySelector('svg[data-brand="React"]');
    expect(svg).not.toBeNull();
    expect(svg!.querySelector('path')!.getAttribute('fill')).toBe('#61DAFB');
  });

  it('uses the text color for near-black brands so they stay visible in dark mode', () => {
    const { container } = render(<TechIcon name="Express" />);
    expect(container.querySelector('path')!.getAttribute('fill')).toBe('currentColor');
  });

  it('falls back to a letter for unknown names', () => {
    render(<TechIcon name="Echo" />);
    expect(screen.getByText('E')).toBeInTheDocument();
  });
});

describe('avatarUrl', () => {
  it('uses the account id from GitHub noreply addresses', () => {
    expect(avatarUrl('12345+ana@users.noreply.github.com')).toBe('https://avatars.githubusercontent.com/u/12345?s=64');
  });
  it('asks GitHub by e-mail otherwise', () => {
    expect(avatarUrl('ana+x@example.com')).toBe('https://avatars.githubusercontent.com/u/e?email=ana%2Bx%40example.com&s=64');
  });
});

describe('Avatar', () => {
  it('stays local with initials unless photos are enabled', () => {
    const { container } = render(<Avatar name="Ana Souza" email="ana@example.com" remote={false} />);
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('loads the GitHub photo when enabled and falls back to initials on error', () => {
    const { container } = render(<Avatar name="Bruno" email="b@example.com" remote />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(avatarUrl('b@example.com'));
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
