import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient'

async function request(path, options, fallback) {
  const res = await apiRequest(`/api/member/groups${path}`, { cache: false, ...options })
  if (!res.ok) throw new Error(res.json?.message || fallback)
  return unwrapEnvelopeData(res.json)
}

export const getGroups = (accessToken) => request('', { method: 'GET', accessToken }, 'Failed to load groups')
export const createGroup = (data, accessToken) => request('', { method: 'POST', accessToken, body: data }, 'Failed to create group')
export const searchGroupMembers = (q, accessToken) => request(`/member-search?q=${encodeURIComponent(q)}`, { method: 'GET', accessToken }, 'Failed to search members')
export const inviteGroupMember = (groupId, memberNumber, accessToken) => request(`/${groupId}/invitations`, { method: 'POST', accessToken, body: { memberNumber } }, 'Failed to send invitation')
export const respondGroupInvitation = (groupId, membershipId, accept, accessToken) => request(`/${groupId}/invitations/${membershipId}/respond`, { method: 'POST', accessToken, body: { accept } }, 'Failed to respond to invitation')
export const removeGroupMember = (groupId, membershipId, accessToken) => request(`/${groupId}/members/${membershipId}`, { method: 'DELETE', accessToken }, 'Failed to remove member')
export const leaveGroup = (groupId, accessToken) => request(`/${groupId}/leave`, { method: 'POST', accessToken }, 'Failed to leave group')
export const borrowForGroup = (groupId, data, accessToken) => request(`/${groupId}/loans`, { method: 'POST', accessToken, body: data }, 'Failed to record group loan')
export const createGroupLoanProposal = (groupId, data, accessToken) => request(`/${groupId}/proposals`, { method: 'POST', accessToken, body: data }, 'Failed to send proposal')
export const voteGroupLoanProposal = (groupId, proposalId, accept, accessToken) => request(`/${groupId}/proposals/${proposalId}/vote`, {
  method: 'POST', accessToken, body: { accept }, timeoutMs: 60000,
  idempotencyKey: `group-proposal-vote:${proposalId}:${accept ? 'accept' : 'reject'}`,
}, 'Failed to submit vote')
export const disburseGroupLoanProposal = (groupId, proposalId, accessToken) => request(`/${groupId}/proposals/${proposalId}/disburse`, { method: 'POST', accessToken }, 'Failed to disburse proposal')
export const repayGroupLoan = (groupId, loanId, amount, accessToken) => request(`/${groupId}/loans/${loanId}/repay`, { method: 'POST', accessToken, body: { amount } }, 'Failed to record repayment')
