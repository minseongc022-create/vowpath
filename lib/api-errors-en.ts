/** API error messages — US English. */



export const apiErrorsEn = {

  userNotFound: "User not found.",

  phoneProvisionFailed: "Could not provision phone number.",

  authMissing: "Authentication required.",

  kvNotConfigured: "Server storage is not configured. Connect Vercel KV.",

  emailAlreadyRegistered: "Email already registered. Log in instead.",

  phoneRequired: "Mobile number is required.",

  phoneAlreadyRegistered: "Mobile number already registered. Use a different number.",

  signupFailed: "Signup failed. Try again.",

  invalidEmail: "Enter a valid email address.",

  passwordTooShort: "Password must be at least 8 characters.",

  passwordMismatch: "Passwords do not match.",

  phoneRequiredSignup: "Enter your mobile number (used for request alerts and SMS approval).",

  codeSent: "Verification code sent. Check your email or SMS.",

  sendCodeFailed: "Could not send verification code.",

  codeExpired: "Verification code expired or not found.",

  codeExpiredResend: "Verification code expired. Request a new one.",

  tooManyAttempts: "Too many incorrect attempts. Start signup again.",

  codeInvalid: "Incorrect verification code.",

  verificationExpired: "Verification expired. Start signup again.",

  verifyFirst: "Complete verification before creating your account.",

  devEmailHint:

    "Dev mode: email not sent. Check the npm run dev terminal for [dev] Signup verification code.",

  devSmsHint:

    "Dev mode: SMS not sent. Check the npm run dev terminal for [dev] Signup verification SMS.",

} as const;


