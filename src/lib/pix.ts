function tlv(id: string, value: string) {
  return id + value.length.toString().padStart(2, "0") + value;
}

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(key: string, name: string, amount?: number): string {
  const merchant = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", key);
  const addData  = tlv("05", "***"); // txid placeholder

  const parts = [
    tlv("00", "01"),                       // payload format
    tlv("26", merchant),                   // merchant account
    "52040000",                            // MCC
    "5303986",                             // BRL
    ...(amount && amount > 0
      ? [tlv("54", amount.toFixed(2))]
      : []),
    "5802BR",
    tlv("59", name.slice(0, 25).normalize("NFD").replace(/[̀-ͯ]/g, "")),
    tlv("60", "BRASIL"),
    tlv("62", addData),
    "6304",
  ].join("");

  return parts + crc16(parts);
}
