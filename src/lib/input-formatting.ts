export function toTitleCaseInput(value: string | null | undefined): string {
  const source = String(value || '');
  if (!source) return '';

  let result = '';
  let alphaCountInToken = 0;
  let capitalizeNextAlpha = true;

  for (const char of source) {
    if (isAlphabeticChar(char)) {
      result += capitalizeNextAlpha ? char.toLocaleUpperCase('en-US') : char.toLocaleLowerCase('en-US');
      alphaCountInToken += 1;
      capitalizeNextAlpha = false;
      continue;
    }

    result += char;
    if (char === "'" && alphaCountInToken === 1) {
      capitalizeNextAlpha = true;
      continue;
    }
    if (!isDigitChar(char)) {
      alphaCountInToken = 0;
      capitalizeNextAlpha = true;
    }
  }

  return result;
}

export function maybeFormatTitleCaseControl(control: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (!/\s$/.test(control.value)) return false;
  return formatTextControlValue(control, toTitleCaseInput);
}

export function formatTitleCaseControl(control: HTMLInputElement | HTMLTextAreaElement): boolean {
  return formatTextControlValue(control, toTitleCaseInput);
}

function formatTextControlValue(control: HTMLInputElement | HTMLTextAreaElement, formatter: (value: string) => string): boolean {
  const nextValue = formatter(control.value);
  if (nextValue === control.value) return false;

  const selectionStart = control.selectionStart ?? nextValue.length;
  const selectionEnd = control.selectionEnd ?? selectionStart;

  control.value = nextValue;
  if (typeof control.setSelectionRange === 'function') {
    const max = nextValue.length;
    control.setSelectionRange(Math.min(selectionStart, max), Math.min(selectionEnd, max));
  }

  return true;
}

function isAlphabeticChar(char: string): boolean {
  return char.toLocaleLowerCase('en-US') !== char.toLocaleUpperCase('en-US');
}

function isDigitChar(char: string): boolean {
  return char >= '0' && char <= '9';
}