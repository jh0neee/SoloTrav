import { constrainPhoto, photoSwipe } from '../src/media/photoGestures';

test('zoom stays between original size and 4x and resets pan at original size', () => {
  expect(constrainPhoto(0.5, 200, -100, 300, 600)).toEqual({
    scale: 1,
    x: 0,
    y: 0,
  });
  expect(constrainPhoto(10, 0, 0, 300, 600).scale).toBe(4);
});

test('dragging an enlarged photo stays within the viewport bounds', () => {
  expect(constrainPhoto(2, 500, -500, 300, 600)).toEqual({
    scale: 2,
    x: 150,
    y: -300,
  });
  expect(constrainPhoto(2, 25, 60, 300, 600)).toEqual({
    scale: 2,
    x: 25,
    y: 60,
  });
});

test('horizontal swipes change photos only at original zoom', () => {
  expect(photoSwipe(-100, 5, 1)).toBe(1);
  expect(photoSwipe(100, 5, 1)).toBe(-1);
  expect(photoSwipe(-100, 5, 2)).toBe(0);
  expect(photoSwipe(10, 5, 1)).toBe(0);
  expect(photoSwipe(60, 100, 1)).toBe(0);
});
