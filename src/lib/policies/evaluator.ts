export type PolicyDecision = "allow" | "deny" | "approval_required";

export type PolicyRules = {
  connector?: string;
  action?: string;
  agent_id?: string;
  amount_gte?: number;
  amount_gt?: number;
  amount_lte?: number;
  amount_lt?: number;
};

export type Policy = {
  id: string;
  name: string;
  priority: number;
  decision: PolicyDecision;
  rules: PolicyRules;
};

export type PolicyEvaluationRequest = {
  connector: string;
  action: string;
  agent_id: string;
  parameters?: Record<string, unknown>;
};

export type MatchedPolicyMetadata = {
  id: string;
  name: string;
  priority: number;
  decision: PolicyDecision;
};

export type PolicyEvaluationResult = {
  decision: PolicyDecision;
  reason: string;
  matchedPolicies: MatchedPolicyMetadata[];
  winningPolicy?: MatchedPolicyMetadata;
};

type MatchedPolicy = {
  policy: Policy;
  index: number;
};

const decisionRank: Record<PolicyDecision, number> = {
  deny: 3,
  approval_required: 2,
  allow: 1,
};

export function evaluatePolicies(
  request: PolicyEvaluationRequest,
  policies: Policy[],
): PolicyEvaluationResult {
  const matchedPolicies = policies
    .map((policy, index) => ({ policy, index }))
    .filter(({ policy }) => policyMatchesRequest(policy, request));

  if (matchedPolicies.length === 0) {
    return {
      decision: "deny",
      reason: "no matching policy; default deny",
      matchedPolicies: [],
    };
  }

  const sortedMatches = [...matchedPolicies].sort(compareMatchedPolicies);
  const winningPolicy = sortedMatches[0]?.policy;

  if (!winningPolicy) {
    return {
      decision: "deny",
      reason: "no matching policy; default deny",
      matchedPolicies: [],
    };
  }

  const winningPolicyMetadata = toPolicyMetadata(winningPolicy);

  return {
    decision: winningPolicy.decision,
    reason: `${winningPolicy.decision} policy matched: ${winningPolicy.name}`,
    matchedPolicies: matchedPolicies
      .sort(compareMatchedPoliciesByPriority)
      .map(({ policy }) => toPolicyMetadata(policy)),
    winningPolicy: winningPolicyMetadata,
  };
}

function policyMatchesRequest(
  policy: Policy,
  request: PolicyEvaluationRequest,
): boolean {
  const { rules } = policy;

  return (
    matchesStringRule(rules.connector, request.connector) &&
    matchesStringRule(rules.action, request.action) &&
    matchesStringRule(rules.agent_id, request.agent_id) &&
    matchesAmountRules(rules, request.parameters)
  );
}

function matchesStringRule(
  expected: string | undefined,
  actual: string,
): boolean {
  return expected === undefined || expected === actual;
}

function matchesAmountRules(
  rules: PolicyRules,
  parameters: Record<string, unknown> | undefined,
): boolean {
  const amountRules = [
    rules.amount_gte,
    rules.amount_gt,
    rules.amount_lte,
    rules.amount_lt,
  ];
  const hasAmountRule = amountRules.some((rule) => rule !== undefined);

  if (!hasAmountRule) {
    return true;
  }

  const amount = parameters?.amount;

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return false;
  }

  return (
    matchesAmountThreshold(rules.amount_gte, amount, (actual, expected) => {
      return actual >= expected;
    }) &&
    matchesAmountThreshold(rules.amount_gt, amount, (actual, expected) => {
      return actual > expected;
    }) &&
    matchesAmountThreshold(rules.amount_lte, amount, (actual, expected) => {
      return actual <= expected;
    }) &&
    matchesAmountThreshold(rules.amount_lt, amount, (actual, expected) => {
      return actual < expected;
    })
  );
}

function matchesAmountThreshold(
  threshold: number | undefined,
  amount: number,
  compare: (amount: number, threshold: number) => boolean,
): boolean {
  return threshold === undefined || compare(amount, threshold);
}

function compareMatchedPolicies(
  left: MatchedPolicy,
  right: MatchedPolicy,
): number {
  const rankDifference =
    decisionRank[right.policy.decision] - decisionRank[left.policy.decision];

  if (rankDifference !== 0) {
    return rankDifference;
  }

  return compareMatchedPoliciesByPriority(left, right);
}

function compareMatchedPoliciesByPriority(
  left: MatchedPolicy,
  right: MatchedPolicy,
): number {
  const priorityDifference = left.policy.priority - right.policy.priority;

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return left.index - right.index;
}

function toPolicyMetadata(policy: Policy): MatchedPolicyMetadata {
  return {
    id: policy.id,
    name: policy.name,
    priority: policy.priority,
    decision: policy.decision,
  };
}
