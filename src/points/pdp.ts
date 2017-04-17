import { expect } from 'chai';
import { Effect, CombiningAlgorithm, Decision, CombiningAlgorithms, Indeterminate, } from '../constants';
import { PolicySet, Policy, Rule, } from '../interfaces';
import { Singleton } from '../classes/singleton';
import { Language } from '../language';
import { Context } from '../context';
import { isBoolean } from '../utils';
import { Prp } from './prp';

// Create rules, policies, policy sets. Reference them by the id.!!!!
//  <AttributeDesignator> - value in request context


interface Error {
  id: string | number;
  message: string;
}


// 7.3.5 Attribute Retrieval 3294
// The PDP SHALL request the values of attributes in the request context from the context handler.
// The context handler MAY also add attributes to the request context without the PDP requesting them.
// The PDP SHALL reference the attributes as if they were in a physical request context document,
// but the context handler is responsible for obtaining and supplying the requested values
// by whatever means it deems appropriate, including by retrieving them from one or more Policy Information Points.



// If the result is “Indeterminate”, then the AttributeId,
// DataType and Issuer of the attribute MAY be listed in the authorization decision
// as described in Section 7.17. However, a PDP MAY choose not to
// return such information for security 3309 reasons.




// 7.3.6 Environment Attributes
// Standard environment attributes are listed in Section B.7. If a value for one of these
// attributes is 3316 supplied in the decision request, then the context handler SHALL use
// that value. Otherwise, the 3317 context handler SHALL supply a value. In the case of date
// and time attributes, the supplied value 3318 SHALL have the semantics
// of the "date and time that apply to the decision request".


// 7.19.3 Missing attributes
// The absence of matching attributes in the request context for any of the attribute
// designators attribute or selectors that are found in the policy will result in an
// enclosing <AllOf> element to return a value of "Indeterminate",if the designator or
// selector has the MustBePresent XML attribute set to true, as described in Sections 5.29
// and 5.30 and may result in a <Decision> element containing the "Indeterminate" value.
// If, in this case a status code is supplied, then the value
// "urn:oasis:names:tc:xacml:1.0:status:missing-attribute"
// SHALL be used, to indicate that more information is needed in order for a definitive decision to be 3605 rendered. In this case, the <Status> element MAY list the names and data-types of any attributes that 3606 are needed by the PDP to refine its decision (see Section 5.58). A PEP MAY resubmit a refined request 3607 context in response to a <Decision> element contents of "Indeterminate" with a status code of 3608
// "urn:oasis:names:tc:xacml:1.0:status:missing-attribute"
// by adding attribute values for the attribute names that were listed in the previous
// response. When the 3610 PDP returns a <Decision> element contents of "Indeterminate",
//  with a status code of "urn:oasis:names:tc:xacml:1.0:status:missing-attribute",
// it MUST NOT list the names and data-types of any attribute for which values were supplied
// in the original 3613 request. Note, this requirement forces the PDP to eventually return
// an authorization decision of 3614 "Permit", "Deny", or "Indeterminate" with some other
// status code, in response to successively-refined 3615 requests.


// 'DenyUnlessPermit',

// // If any decision is Decision.Deny the result is Decision.Deny, otherwise Decision.Permit.
// 'PermitUnlessDeny',

// // Result of first applicable policy, otherwise Decision.NotApplicable.
// 'FirstApplicable',

// // Decision.NotApplicable unless one decision applicable.
// // Decision.Indeterminate if one or more decisions are Decision.Indeterminate.
// // Result of policy if only one applicable.
// 'OnlyOneApplicable'



// <Target> [Required]
// The <Target> element defines the applicability of a policy set to a set of decision requests.
// The <Target> element MAY be declared by the creator of the <PolicySet> or it MAY be computed
// from the <Target> elements of the referenced <Policy> elements, either as an intersection or as a union.

// The system entity that evaluates applicable policy and renders an authorization decision.
export class Pdp extends Singleton {
  private static readonly Tag: string = 'Pdp';

  // The PDP processing this request context locates the policy in its policy repository.
  // It compares the 802 attributes in the request context with the policy target.
  // Since the policy target is empty, the policy 803 matches this context. 804
  // The PDP now compares the attributes in the request context with the target of the one
  // rule in this 805 policy. The requested resource matches the <Target> element and the
  // requested action matches the 806 <Target> element, but the requesting
  // subject-id attribute does not match "med.example.com".

  public static EvaluateDecisionRequest(context: Context): Decision {
    const tag: string = `${Pdp.Tag}.EvaluateDecisionRequest()`;
    const policies: Policy[] = Prp.RetrievePolicies(context);
    if (Context.Pdp.Debug) console.log(tag, 'policies:', policies);
    const policySets: PolicySet[] = Prp.RetrievePolicySets(context);
    if (Context.Pdp.Debug) console.log(tag, 'policySets:', policySets);
    const policySet: PolicySet = {
      id: null,
      combiningAlgorithm: Context.Pdp.CombiningAlgorithm,
      policies,
      policySets,
    };

    const decision: Decision = Pdp.CombineDecision(policySet, context);
    if (Context.Pdp.Debug) console.log(tag, 'decision:', decision);
    return decision;
  }

  public static IsPolicySet(v: any): boolean {
    return v.policies || v.policySets;
  }

  public static EvaluatePolicy(policy: Policy, context: Context): Decision {
    const tag: string = `${Pdp.Tag}.EvaluatePolicy()`;
    if (Context.Pdp.Debug) console.log(tag, 'policy:', policy);

    const targetMatch: boolean | Decision = Pdp.EvaluateTarget(policy, context);
    if (Context.Pdp.Debug) console.log(tag, 'targetMatch:', targetMatch);
    if (targetMatch === Decision.Indeterminate) return Decision.Indeterminate;
    if (!targetMatch) return Decision.NotApplicable;

    const decision: Decision = Pdp.CombineDecision(policy, context);

    return decision;
  }

  // 7.11. Rule evaluatiion
  public static EvaluateRule(rule: Rule, context/*: Context*/): Effect | Decision {
    const tag: string = `${Pdp.Tag}.${rule.id}.EvaluateRule()`;
    // if (Context.Pdp.Debug) console.log(tag, 'rule:', rule);

    const targetMatch: boolean | Decision = Pdp.EvaluateTarget(rule, context);
    if (Context.Pdp.Debug) console.log(tag, 'targetMatch:', targetMatch);
    if (targetMatch === Decision.Indeterminate) return Decision.Indeterminate;
    if (!targetMatch) return Decision.NotApplicable;

    // TODO: !!! EVALUATE AND ADD ADVICES AND OBLIGATIONS !!!
    const decision: boolean | Decision = Pdp.EvaluateCondition(rule, context);
    if (Context.Pdp.Debug) console.log(tag, 'decision:', decision);
    return decision === true ? rule.effect : Decision.NotApplicable;
  }


  // 7.7 Target evaluation
  public static EvaluateTarget(element: Rule | Policy | PolicySet, context: Context): boolean | Decision {
    const tag: string = `${Pdp.Tag}.(Element - ${element.id}).EvaluateTarget()`;
    const anyOf: string[][] = element.target;

    const results: (boolean | Decision)[] = anyOf.map(allOf => Pdp.EvaluateAllOf(allOf, context));
    if (Context.Pdp.Debug) console.log(tag, 'results:', results);

    const falseResults: (boolean | Decision)[] = results.filter(r => r === false);
    if (Context.Pdp.Debug) console.log(tag, 'falseResults:', falseResults);
    if (results.length === falseResults.length) return false;

    const result: boolean | Decision = results.reduce((result, v) => {
      if (result === true || v === true) return true;
      return v;
    }, Decision.Indeterminate);
    if (Context.Pdp.Debug) console.log(tag, 'result:', result);

    return result;
  }

  public static EvaluateCondition(rule: Rule, context: Context): boolean | Decision {
    const tag: string = `${Pdp.Tag}.(Rule - ${rule.id}).EvaluateCondition()`;
    if (Context.Pdp.Debug) console.log(tag, 'rule.condition:', rule.condition);
    if (!rule.condition) {
      if (Context.Pdp.Debug) console.log(tag, 'No condition - evaluates to true.');
      return true;
    }

    // const result: boolean | Decision = Pdp.ExpressionToDecision(rule.condition, context);
    // if (Context.Pdp.Debug) console.log(tag, 'result:', result);
    // return result;

    return Pdp.ExpressionToDecision(rule.condition, context);
  }

  // TODO: Allow to define equal ('===') operator for non-primitive types for expression validation?
  public static ExpressionToDecision(str: string, context: Context): boolean | Decision {
    const tag: string = `${Pdp.Tag}.ExpressionToDecision()`;
    const expression: string = Language.StrToExpression(str, context);
    if (Context.Pdp.Debug) console.log(tag, 'expression:', expression);
    if (!expression) {
      if (Context.Pdp.Debug) console.log(tag, 'String evaluted to an invalid expression.');
      return Decision.Indeterminate;
    }

    let result: boolean;
    try {
      result = eval(expression);
      if (!isBoolean(result)) {
        // Only allow the expression to evaluate to true or false.
        if (Context.Pdp.Debug) console.log(tag, 'Truncated expression result from:', result);
        result = !!result;
        if (Context.Pdp.Debug) console.log(tag, 'To boolean value:', result);
      }
    } catch (err) {
      if (Context.Pdp.Debug) console.log(tag, 'Couldn\'t execute expression.');
      return Decision.Indeterminate;
    }
    if (Context.Pdp.Debug) console.log(tag, 'result:', result);
    return result;
  }

  public static EvaluateAllOf(allOf: string[], context: Context): boolean | Decision {
    return allOf.reduce((result, expression) => {
      // If one of the expressions failed for some reason, return Decision.Indeterminate.
      if (result === Decision.Indeterminate) return Decision.Indeterminate;
      // If one of the expressions evaluated to false, the target is not a match.
      if (result === false) return false;
      // Otherwise return the evaluated expression (true).
      return Pdp.ExpressionToDecision(expression, context);
    }, true as boolean | Decision);
  }

  // !!! The procedure for combining the decision and obligations from multiple policies -
  // obligations have to be combined as well!!!

  // Pass down combining algo?
  public static CombineDecision(policy: Policy | PolicySet, context: Context, combiningAlgorithm: CombiningAlgorithm = policy.combiningAlgorithm): Decision {
    const tag: string = `${Pdp.Tag}.CombineDecision()`;
    switch (combiningAlgorithm) {
      case CombiningAlgorithm.DenyOverrides: return Pdp.DenyOverrides(policy, context);
      case CombiningAlgorithm.PermitOverrides: return Pdp.PermitOverrides(policy, context);
      case CombiningAlgorithm.DenyUnlessPermit: return Pdp.DenyUnlessPermit(policy, context);
      case CombiningAlgorithm.PermitUnlessDeny: return Pdp.PermitUnlessDeny(policy, context);
      case CombiningAlgorithm.PermitOverrides: return Pdp.PermitOverrides(policy, context);
      case CombiningAlgorithm.FirstApplicable: return Pdp.FirstApplicable(policy, context);
      case CombiningAlgorithm.OnlyOneApplicable: return Pdp.OnlyOneApplicable(policy, context);
      default:
        if (Context.Pdp.Debug) console.log(tag, 'Invalid combiningAlgorithm:', combiningAlgorithm,
          '. Will use the Pdp.FallbackDecision:', Decision[Context.Pdp.FallbackDecision]);
        if (Context.Development) expect(combiningAlgorithm).to.be.oneOf(CombiningAlgorithms);
        return Context.Pdp.FallbackDecision;
    }
  }

  public static DenyOverrides(policyOrSet: Policy | PolicySet, context: Context, combiningAlgorithm: CombiningAlgorithm = policyOrSet.combiningAlgorithm) {
    const policy: Policy = Pdp.IsPolicySet(policyOrSet) ? undefined : policyOrSet;
    const policySet: PolicySet = policy === undefined ? policyOrSet : undefined;

    let deny: boolean = false;
    let indeterminate: boolean = false;
    let permit: boolean = false;

    if (policySet) {
      [...policySet.policies, ...policySet.policySets].forEach(policy => {
        if (deny) return Decision.Deny;
        const decision: Decision = Pdp.CombineDecision(policy, context);
        deny = decision === Decision.Deny;
        indeterminate = indeterminate ? true : decision === Decision.Indeterminate;
        permit = permit ? true : decision === Decision.Permit;
      });
    } else {
      policy.rules.forEach(rule => {
        if (deny) return Decision.Deny;
        const decision: Decision = Pdp.EvaluateRule(rule, context);
        deny = decision === Decision.Deny;
        indeterminate = indeterminate ? true : decision === Decision.Indeterminate;
        permit = permit ? true : decision === Decision.Permit;
      });
    }

    if (deny) return Decision.Deny;
    if (indeterminate) return Decision.Indeterminate;
    if (permit) return Decision.Permit;
    return Decision.NotApplicable;
  }

  public static PermitOverrides(policyOrSet: Policy | PolicySet, context: Context, combiningAlgorithm: CombiningAlgorithm = policyOrSet.combiningAlgorithm) {
    const policy: Policy = Pdp.IsPolicySet(policyOrSet) ? undefined : policyOrSet;
    const policySet: PolicySet = policy === undefined ? policyOrSet : undefined;

    let permit: boolean = false;
    let indeterminate: boolean = false;
    let deny: boolean = false;

    if (policySet) {
      [...policySet.policies, ...policySet.policySets].forEach(policy => {
        if (permit) return Decision.Permit;
        const decision: Decision = Pdp.CombineDecision(policy, context);
        permit = decision === Decision.Permit;
        indeterminate = indeterminate ? true : decision === Decision.Indeterminate;
        deny = deny ? true : decision === Decision.Deny;
      });
    } else {
      policy.rules.forEach(rule => {
        if (permit) return Decision.Permit;
        const decision: Decision = Pdp.EvaluateRule(rule, context);
        permit = decision === Decision.Permit;
        indeterminate = indeterminate ? true : decision === Decision.Indeterminate;
        deny = deny ? true : decision === Decision.Deny;
      });
    }

    if (permit) return Decision.Permit;
    if (indeterminate) return Decision.Indeterminate;
    if (deny) return Decision.Deny;
    return Decision.NotApplicable;
  }

  public static DenyUnlessPermit(policyOrSet: Policy | PolicySet, context: Context, combiningAlgorithm: CombiningAlgorithm = policyOrSet.combiningAlgorithm) {
    const policy: Policy = Pdp.IsPolicySet(policyOrSet) ? undefined : policyOrSet;
    const policySet: PolicySet = policy === undefined ? policyOrSet : undefined;

    let permit: boolean = false;
    if (policySet) {
      [...policySet.policies, ...policySet.policySets].forEach(policy => {
        if (permit) return Decision.Permit;
        const decision: Decision = Pdp.CombineDecision(policy, context);
        permit = decision === Decision.Permit;
      });
    } else {
      policy.rules.forEach(rule => {
        if (permit) return Decision.Permit;
        const decision: Decision = Pdp.EvaluateRule(rule, context);
        permit = decision === Decision.Permit;
      });
    }

    if (permit) return Decision.Permit;
    return Decision.Deny;
  }

  public static PermitUnlessDeny(policyOrSet: Policy | PolicySet, context: Context, combiningAlgorithm: CombiningAlgorithm = policyOrSet.combiningAlgorithm) {
    const policy: Policy = Pdp.IsPolicySet(policyOrSet) ? undefined : policyOrSet;
    const policySet: PolicySet = policy === undefined ? policyOrSet : undefined;

    let deny: boolean = false;
    if (policySet) {
      [...policySet.policies, ...policySet.policySets].forEach(policy => {
        if (deny) return Decision.Deny;
        const decision: Decision = Pdp.CombineDecision(policy, context);
        deny = decision === Decision.Deny;
      });
    } else {
      policy.rules.forEach(rule => {
        if (deny) return Decision.Deny;
        const decision: Decision = Pdp.EvaluateRule(rule, context);
        deny = decision === Decision.Deny;
      });
    }

    if (deny) return Decision.Deny;
    return Decision.Permit;
  }

  public static FirstApplicable(policyOrSet: Policy | PolicySet, context: Context, combiningAlgorithm: CombiningAlgorithm = policyOrSet.combiningAlgorithm) {
    const policy: Policy = Pdp.IsPolicySet(policyOrSet) ? undefined : policyOrSet;
    const policySet: PolicySet = policy === undefined ? policyOrSet : undefined;

    if (policySet) {
      return [...policySet.policies, ...policySet.policySets].reduce((decision, policy) =>
        decision !== Decision.NotApplicable ? decision : Pdp.CombineDecision(policy, context)
        , Decision.NotApplicable);
    } else {
      return policy.rules.reduce((decision, rule) =>
        decision !== Decision.NotApplicable ? decision : Pdp.EvaluateRule(rule, context)
        , Decision.NotApplicable);
    }
  }

  public static OnlyOneApplicable(policyOrSet: Policy | PolicySet, context: Context, combiningAlgorithm: CombiningAlgorithm = policyOrSet.combiningAlgorithm) {
    const policy: Policy = Pdp.IsPolicySet(policyOrSet) ? undefined : policyOrSet;
    const policySet: PolicySet = policy === undefined ? policyOrSet : undefined;

    let indeterminate: boolean = false;
    let result: Decision = Decision.NotApplicable;

    if (policySet) {
      [...policySet.policies, ...policySet.policySets].forEach(policy => {
        if (indeterminate) return Decision.Indeterminate;
        const decision: Decision = Pdp.CombineDecision(policy, context);
        indeterminate = decision === Decision.Indeterminate ||
          decision !== Decision.NotApplicable && result !== Decision.NotApplicable;
        result = decision;
      });
    } else {
      policy.rules.forEach(rule => {
        if (indeterminate) return Decision.Indeterminate;
        const decision: Decision = Pdp.EvaluateRule(rule, context);
        indeterminate = decision === Decision.Indeterminate ||
          decision !== Decision.NotApplicable && result !== Decision.NotApplicable;
        result = decision;
      });
    }

    if (indeterminate) return Decision.Indeterminate;
    return result;
  }
}
