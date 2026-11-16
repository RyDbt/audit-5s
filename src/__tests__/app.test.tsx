import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';

describe('App', () => {
  it('starts, seeds the database and shows the current week', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/S\d{2} \/ \d{4}|W\d{2} \/ \d{4}|KW\d{2} \/ \d{4}/)).toBeTruthy());
    expect(screen.getAllByText(/Réglages|Settings|Einstellungen/).length).toBeGreaterThan(0);
  });
});
