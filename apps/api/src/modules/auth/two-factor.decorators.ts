import { SetMetadata } from "@nestjs/common";

export const ALLOW_TWO_FACTOR_PENDING_KEY = "helios:allow_two_factor_pending";
export const TWO_FACTOR_STEP_UP_KEY = "helios:two_factor_step_up";

// Reachable by a session that has signed in with its password but not yet passed the second
// factor while 2FA is enforced: the routes that set it up and verify it.
export const AllowTwoFactorPending = () => SetMetadata(ALLOW_TWO_FACTOR_PENDING_KEY, true);

// Features that ask for the second factor again when the last verification is older than the
// policy's verificationMinutes ("Tính năng yêu cầu sử dụng bảo mật 2 lớp").
export type TwoFactorStepUpFeature = "payroll";
export const RequireTwoFactorStepUp = (feature: TwoFactorStepUpFeature) => SetMetadata(TWO_FACTOR_STEP_UP_KEY, feature);
