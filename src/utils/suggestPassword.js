export function suggestPassword() {
  const groups = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789', '!@#$%&*?'];
  const alphabet = groups.join('');
  const randomIndex = (length) => {
    const limit = 256 - (256 % length);
    const byte = new Uint8Array(1);
    do { globalThis.crypto.getRandomValues(byte); } while (byte[0] >= limit);
    return byte[0] % length;
  };
  const characters = groups.map((group) => group[randomIndex(group.length)]);
  while (characters.length < 20) characters.push(alphabet[randomIndex(alphabet.length)]);
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1);
    [characters[index], characters[other]] = [characters[other], characters[index]];
  }
  return characters.join('');
}
