// Shop account profile: the parts a branch may edit itself. Official name, code and route stay in the master.
export const PROFILE_LIMITS = { displayName: 40, contactName: 30, imageMaxBytes: 180 * 1024, imageMaxChars: 340000 };
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const PHONE = /^[0-9()+\- ]{8,15}$/;

export function validateProfile(input) {
  const errors = [];
  const displayName = (input.displayName ?? '').trim();
  const contactName = (input.contactName ?? '').trim();
  const phone = (input.phone ?? '').trim();
  const imageDataUrl = input.imageDataUrl ?? '';
  if ([...displayName].length > PROFILE_LIMITS.displayName) errors.push(`表示名は${PROFILE_LIMITS.displayName}文字以内で入力してください`);
  if ([...contactName].length > PROFILE_LIMITS.contactName) errors.push(`担当者名は${PROFILE_LIMITS.contactName}文字以内で入力してください`);
  if (phone && !PHONE.test(phone)) errors.push('電話番号は数字・ハイフン・括弧で8〜15文字入力してください');
  if (imageDataUrl && (!IMAGE_DATA_URL.test(imageDataUrl) || imageDataUrl.length > PROFILE_LIMITS.imageMaxChars)) errors.push('画像はPNG・JPEG・WebPで、約250KB以下にしてください');
  return {
    ok: errors.length === 0,
    errors,
    value: { displayName, contactName, phone, imageDataUrl },
  };
}
