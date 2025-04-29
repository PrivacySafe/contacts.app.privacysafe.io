type PassedDatum = web3n.rpc.PassedDatum;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonToDatum(json: any): PassedDatum {
  const utf8Encoder = new TextEncoder();
  const dataBytes = utf8Encoder.encode(JSON.stringify(json));
  return { bytes: dataBytes };
}

export function datumToJson<T>(data: PassedDatum): T {
  const utf8Decoder = new TextDecoder();
  const jsonStr = utf8Decoder.decode(data.bytes);
  return JSON.parse(jsonStr);
}
