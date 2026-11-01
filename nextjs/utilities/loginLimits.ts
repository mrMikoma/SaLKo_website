import { CredentialsSignin } from "next-auth";
import { RateLimiter } from "@/utilities/rateLimit";

/**
 * Limits on failed password logins (auth.ts). Per email address: 10 failures
 * in 15 minutes, then 15 minutes' wait. Per IP address: 20 failures in a
 * minute, then 10 minutes' wait. Unknown addresses count the same way, so the
 * limit doesn't tell which addresses have accounts. Google logins aren't
 * limited: Google checks the password.
 */
export const failedLoginsByEmail = new RateLimiter("login-email", 10, 15 * 60_000, 15 * 60_000);
export const failedLoginsByIp = new RateLimiter("login-ip", 20, 60_000, 10 * 60_000);

/**
 * Wrong current passwords when a logged-in member changes the password
 * (userManagement.ts), per account: the same budget as logins, so a borrowed
 * session can't guess the password faster than the login form allows.
 */
export const failedPasswordChecks = new RateLimiter("password-check", 10, 15 * 60_000, 15 * 60_000);

export const emailKey = (email: string) => email.trim().toLowerCase();

/** Milliseconds until this email or IP may try again; 0 when neither is blocked */
export const loginBlockedFor = (email: string, ip: string) =>
  Math.max(failedLoginsByEmail.blockedFor(emailKey(email)), failedLoginsByIp.blockedFor(ip));

export const TOO_MANY_ATTEMPTS = "too_many_attempts";

/** Thrown from authorize while blocked; the login form tells how long to wait */
export class TooManyLoginAttempts extends CredentialsSignin {
  code = TOO_MANY_ATTEMPTS;
}
