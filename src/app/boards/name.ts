export const BOARD_NAME_MAX_LENGTH = 120

export type BoardNameValidationResult =
  | {
      ok: true
      value: string
    }
  | {
      ok: false
      message: string
    }

export function validateBoardNameInput(input: string): BoardNameValidationResult {
  const value = input.trim()
  if (value.length === 0) {
    return { ok: false, message: 'Board name is required.' }
  }

  if (value.length > BOARD_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Board name must be ${BOARD_NAME_MAX_LENGTH} characters or fewer.`
    }
  }

  return { ok: true, value }
}
