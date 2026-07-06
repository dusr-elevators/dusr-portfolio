import { render, screen, fireEvent } from '@testing-library/react';
import DesignStudio from '../DesignStudio';

describe('DesignStudio - Mirror Availability', () => {
  it('disables mirror options that have no variant for the current wall', () => {
    const categories = [
      {
        id: 1,
        name: 'Walls',
        options: [
          { id: 10, name: 'Marble' },
          { id: 11, name: 'Wood' }
        ]
      },
      {
        id: 2,
        name: 'Mirrors',
        depends_on_category: 1,
        options: [
          {
            id: 20,
            name: 'Top Mirror',
            variants: [
              { depends_on_option: 10, projection_image: '/img/top-marble.png' }
            ]
          },
          {
            id: 21,
            name: 'None',
            variants: [
              { depends_on_option: 10, projection_image: '/img/transparent.png' },
              { depends_on_option: 11, projection_image: '/img/transparent.png' }
            ]
          }
        ]
      }
    ];

    render(<DesignStudio categories={categories} initialSelections={{ 1: 10, 2: 21 }} />);

    const wallButtons = screen.getAllByRole('button').filter(b => b.textContent.includes('Wood'));
    if (wallButtons.length > 0) {
      fireEvent.click(wallButtons[0]);
      const topMirrorButton = screen.getByRole('button', { name: 'Top Mirror' });
      expect(topMirrorButton).toBeDisabled();
    }
  });
});
