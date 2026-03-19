import { ReversePipe } from './reverse.pipe';

describe('ReversePipe', () => {
  it('reverses array order', () => {
    const pipe = new ReversePipe();
    expect(pipe.transform([1, 2, 3])).toEqual([3, 2, 1]);
  });

  it('does not mutate the original array', () => {
    const pipe = new ReversePipe();
    const source = ['a', 'b', 'c'];

    const result = pipe.transform(source);

    expect(result).toEqual(['c', 'b', 'a']);
    expect(source).toEqual(['a', 'b', 'c']);
  });
});
