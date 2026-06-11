import fs from 'fs';
import path from 'path';

const packingSource = fs.readFileSync(
  path.resolve(__dirname, '../trip/[id]/packing.tsx'),
  'utf8',
);

describe('packing templates UI', () => {
  it('exposes save and apply template actions in the packing screen', () => {
    expect(packingSource).toContain('Packing Templates');
    expect(packingSource).toContain('Save Current List');
    expect(packingSource).toContain('Apply');
    expect(packingSource).toContain('Save a finished packing list to reuse it on future trips.');
  });
});
