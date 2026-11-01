// Snapshots include Valve's permanent/never timestamps. Commands are parsed by
// ordinary JSON on the server, so this tag never bypasses numeric validation.
const NUMBER_TAG = '$coopNumber';

export function encodeMessage(message) {
  return JSON.stringify(message, (_key, value) => value === Infinity
    ? {[NUMBER_TAG]:'Infinity'}
    : value === -Infinity ? {[NUMBER_TAG]:'-Infinity'} : value);
}

export function decodeMessage(message) {
  return JSON.parse(message, (_key, value) => {
    if(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1) {
      if(value[NUMBER_TAG] === 'Infinity') return Infinity;
      if(value[NUMBER_TAG] === '-Infinity') return -Infinity;
    }
    return value;
  });
}
