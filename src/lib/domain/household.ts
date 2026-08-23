/**
 * Household aggregation. Pure: takes each member's accounts (with their
 * shared flag) and month figures, returns the combined household picture.
 *
 * Privacy rule enforced here, not in the UI: only accounts explicitly marked
 * shared contribute anything — an unshared account never leaks its balance,
 * and a member's unshared spending never appears in household totals.
 */

export interface MemberInput {
  name: string;
  isYou: boolean;
  accounts: { name: string; type: string; balanceCents: number; shared: boolean }[];
  /** Month-to-date figures from the member's SHARED accounts only. */
  sharedIncomeCents: number;
  sharedSpendCents: number;
}

export interface MemberView {
  name: string;
  isYou: boolean;
  sharedAccounts: { name: string; type: string; balanceCents: number }[];
  sharedBalanceCents: number;
  sharedIncomeCents: number;
  sharedSpendCents: number;
  /** Share of the household's month spending, 0–1. */
  spendShare: number;
}

export interface HouseholdSummary {
  combinedBalanceCents: number;
  combinedAssetsCents: number;
  combinedLiabilitiesCents: number;
  monthIncomeCents: number;
  monthSpendCents: number;
  members: MemberView[];
}

export function summariseHousehold(members: MemberInput[]): HouseholdSummary {
  const views = members.map((m) => {
    const shared = m.accounts.filter((a) => a.shared);
    return {
      name: m.name,
      isYou: m.isYou,
      sharedAccounts: shared.map(({ name, type, balanceCents }) => ({ name, type, balanceCents })),
      sharedBalanceCents: shared.reduce((a, x) => a + x.balanceCents, 0),
      sharedIncomeCents: m.sharedIncomeCents,
      sharedSpendCents: m.sharedSpendCents,
      spendShare: 0,
    };
  });
  const monthSpend = views.reduce((a, v) => a + v.sharedSpendCents, 0);
  for (const v of views) v.spendShare = monthSpend > 0 ? v.sharedSpendCents / monthSpend : 0;

  const allShared = views.flatMap((v) => v.sharedAccounts);
  return {
    combinedBalanceCents: allShared.reduce((a, x) => a + x.balanceCents, 0),
    combinedAssetsCents: allShared.filter((a) => a.balanceCents > 0).reduce((a, x) => a + x.balanceCents, 0),
    combinedLiabilitiesCents: allShared.filter((a) => a.balanceCents < 0).reduce((a, x) => a + x.balanceCents, 0),
    monthIncomeCents: views.reduce((a, v) => a + v.sharedIncomeCents, 0),
    monthSpendCents: monthSpend,
    members: views.sort((a, b) => (a.isYou ? -1 : 0) - (b.isYou ? -1 : 0)),
  };
}

/** Readable invite code: 8 chars from an unambiguous alphabet (no 0/O/1/I). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(random: () => number = Math.random): string {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
}

export function normaliseInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
