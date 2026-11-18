import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toSearch } from '../lib/api';
import { StarRating } from './StarRating';
import { Timer } from './Timer';

describe('StarRating', () => {
  it('note et efface la note en recliquant la même étoile', () => {
    const onChange = vi.fn();
    const { rerender } = render(<StarRating value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: '4 étoiles' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    rerender(<StarRating value={4} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: '4 étoiles' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('s’affiche en lecture seule sans onChange', () => {
    render(<StarRating value={3} />);
    expect(screen.getByLabelText('3 sur 5')).toBeInTheDocument();
  });
});

describe('Timer', () => {
  it('décompte puis passe en état terminé', () => {
    vi.useFakeTimers();
    render(<Timer label="2 secondes" seconds={2} />);
    fireEvent.click(screen.getByRole('button', { name: /Lancer un minuteur/ }));
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByRole('button', { name: 'Réinitialiser le minuteur' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('toSearch', () => {
  it('ignore les valeurs vides et joint les tableaux', () => {
    expect(toSearch({ q: 'curry', mood: ['gourmand', 'rapide'], fridge: false, page: 2, empty: [] })).toBe(
      '?q=curry&mood=gourmand%2Crapide&page=2',
    );
  });
});
