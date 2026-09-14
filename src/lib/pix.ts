import QRCode from 'qrcode';

function crc16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0x8408;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function emv(str: string): string {
  const len = str.length.toString().padStart(2, '0');
  return `${len}${str}`;
}

function emvWithId(id: string, value: string): string {
  return `${id}${emv(value)}`;
}

export function generatePixPayload(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  description?: string;
}): string {
  const { pixKey, merchantName, merchantCity, amount, description } = params;

  const cleanKey = pixKey.replace(/\D/g, '');

  const payloadFormat = '01';
  const merchantAccount = emvWithId('26', `0014BR.GOV.BCB.PIX01${emv(cleanKey)}`);
  const merchantCateg = '52040000';
  const transactionCurrency = '5303986';
  const countryCode = '5802BR';
  const merchantNameField = emvWithId('59', merchantName.substring(0, 25).toUpperCase().trim());
  const merchantCityField = emvWithId('60', merchantCity.substring(0, 15).toUpperCase().trim());
  const amountField = amount > 0 ? emvWithId('54', amount.toFixed(2)) : '';

  let additionalData = '';
  if (description) {
    additionalData = emvWithId('62', `05${emv(description.substring(0, 50).trim())}`);
  }

  const txId = '***';
  const txIdField = emvWithId('62', emvWithId('05', txId));

  let payload = `${payloadFormat}${merchantAccount}${merchantCateg}${transactionCurrency}`;
  if (amountField) payload += amountField;
  payload += `${countryCode}${merchantNameField}${merchantCityField}`;
  payload += txIdField;
  if (additionalData) payload += additionalData;

  const crc = crc16(payload + '6304');
  return payload + '6304' + crc;
}

export async function generatePixQRCode(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    color: { dark: '#1A1A2E', light: '#FFFFFF' },
  });
}

export function cleanPixKey(key: string): string {
  return key.replace(/\D/g, '');
}
