import { apiRequest, unwrapEnvelopeData } from "../../lib/apiClient.js";

export async function findMemberByNumber(memberNumber, accessToken) {
  const normalized = String(memberNumber || "").trim().toUpperCase();
  if (!normalized) throw new Error("Enter a registration/member number.");

  const params = new URLSearchParams({ memberNumber: normalized });
  const response = await apiRequest(`/api/search/members/by-number?${params}`, {
    method: "GET",
    accessToken,
    cache: false,
  });
  if (!response.ok) {
    throw new Error(response.json?.message || "Unable to search for this member.");
  }
  return {
    member: unwrapEnvelopeData(response.json),
    message: response.json?.message || "Member search completed.",
  };
}
