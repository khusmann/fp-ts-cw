import React from 'react';
import renderer from 'react-test-renderer';

import App from './App';

describe('<App />', () => {
  it('has 1 child', () => {
    const tree = renderer.create(<App />).toJSON();
    if (Array.isArray(tree)) {
      fail('tree is an array')
    }
    expect(tree.children.length).toBe(1);
  });
});