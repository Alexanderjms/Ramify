export function validText(
  value: unknown,
  maxLength: number,
  multiline = false,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    value.isWellFormed() &&
    !(multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(
      value,
    )
  );
}

export function validInputId(value: unknown): value is string {
  return validText(value, 128) && value.trim().length > 0;
}

export function validColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === 7 &&
    /^#[a-f\d]{6}$/i.test(value)
  );
}
