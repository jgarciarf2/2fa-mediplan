const suma =(a,b)=> a + b;

test('suma correctamente dos  numeros', () => {
  expect(suma(1, 2)).toBe(3);
});