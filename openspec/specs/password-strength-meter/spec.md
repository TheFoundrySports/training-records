---
name: password-strength-meter
description: Visual password strength indicator component
change: auth-security-improvements
status: draft
---

# Delta for Password Strength Meter

> **Domain**: `password-strength-meter`  
> **Change**: `auth-security-improvements`

---

## Purpose

Provide a reusable UI component that displays real-time password strength feedback using a visual meter.

---

## ADDED Requirements

### REQ-PSM1: Password Strength Calculation

The system MUST calculate password strength on a 0-4 scale based on the following criteria:

| Score | Criteria Met                                       |
| ----- | -------------------------------------------------- |
| 0     | Less than 8 characters                             |
| 1     | 8+ characters                                      |
| 2     | 8+ characters AND (uppercase OR number OR symbol)  |
| 3     | 8+ characters AND uppercase AND (number OR symbol) |
| 4     | 8+ characters AND uppercase AND number AND symbol  |

#### Scenario: Very Weak password

- GIVEN a password with fewer than 8 characters
- WHEN strength is calculated
- THEN the result MUST be 0

#### Scenario: Weak password

- GIVEN a password with 8+ characters but no uppercase, number, or symbol
- WHEN strength is calculated
- THEN the result MUST be 1

#### Scenario: Fair password

- GIVEN a password with 8+ characters and one of (uppercase, number, symbol)
- WHEN strength is calculated
- THEN the result MUST be 2

#### Scenario: Good password

- GIVEN a password with 8+ characters and uppercase plus one of (number, symbol)
- WHEN strength is calculated
- THEN the result MUST be 3

#### Scenario: Strong password

- GIVEN a password with 8+ characters, uppercase, number, AND symbol
- WHEN strength is calculated
- THEN the result MUST be 4

---

### REQ-PSM2: PasswordStrengthMeter Component

The system MUST provide a `PasswordStrengthMeter` component with the following interface:

```typescript
interface PasswordStrengthMeterProps {
  password: string
}
```

#### Visual Requirements

- **Color Bar**: Full-width horizontal bar showing progress
  - Strength 0: `bg-red-500` (red)
  - Strength 1: `bg-orange-500` (orange)
  - Strength 2: `bg-yellow-500` (yellow)
  - Strength 3: `bg-lime-500` (lime)
  - Strength 4: `bg-green-500` (green)

- **Width**: Proportional to strength level (`(strength + 1) * 20}%`)

- **Label**: Text below the bar
  - Strength 0: "Very Weak"
  - Strength 1: "Weak"
  - Strength 2: "Fair"
  - Strength 3: "Good"
  - Strength 4: "Strong"

- **Label Color**: Matches bar color using `text-{color}-600` (e.g., `text-red-600`)

- **Transitions**: Smooth CSS transition on width and color changes

#### Scenario: Real-time strength update

- GIVEN a `PasswordStrengthMeter` component with an empty password
- WHEN the user types "Abc1!"
- THEN the component MUST immediately update to show "Weak" with orange color

#### Scenario: Strength increases with complexity

- GIVEN a `PasswordStrengthMeter` component showing "Fair" for "Password1"
- WHEN the user adds a symbol to make "Password1!"
- THEN the component MUST update to show "Strong" with green color

#### Scenario: Empty password

- GIVEN a `PasswordStrengthMeter` component with an empty password string
- THEN the bar SHOULD NOT be visible (width = 0)
- AND no label should be displayed

---

### REQ-PSM3: Styling Requirements

The component MUST use Tailwind CSS for all styling.

#### Implementation Pattern

```tsx
<div className="space-y-1">
  <div className="h-2 w-full rounded-full bg-muted">
    <div
      className={`h-2 rounded-full transition-all bg-${color}-500`}
      style={{ width: `${(strength + 1) * 20}%` }}
    />
  </div>
  {password && <p className={`text-xs text-${color}-600`}>{label}</p>}
</div>
```

---

## Files to Create

| File                                          | Purpose                           |
| --------------------------------------------- | --------------------------------- |
| `src/components/ui/PasswordStrengthMeter.tsx` | Password strength meter component |

---

## Usage Context

The component MUST be used in:

1. **RegisterPage** - Below password input field
2. **AcceptInvitePage** - Below password input field
3. **ResetPasswordPage** - Below new password input field

---

## Dependencies

- Tailwind CSS v4 with shadcn/ui
- CSS transition for smooth updates
- No external dependencies required
