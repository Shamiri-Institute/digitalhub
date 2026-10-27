// Whether a draft's form can be published with a given prefill, and the layout it would print
// with. The publish dialog runs it on every render; the publish action runs it again on the stored
// form as the authority.

import {
  checkForm,
  checkPublishable,
  type FormIssue,
  type LockedQuestion,
} from "#/lib/survey/check-form";
import type { SurveyForm } from "#/lib/survey/form";
import { type LayoutOf, type LayoutProblem, layOutForm, type Prefill } from "#/lib/survey/layout";

export type PublishCheck<P extends Prefill> =
  | { ok: true; form: SurveyForm; layout: LayoutOf<P> }
  | { ok: false; issues: FormIssue[]; problems: LayoutProblem[] };

/** Checks a form, typed or straight from storage, and lays it out. Pure. */
export function checkPublish<P extends Prefill>(
  input: unknown,
  locked: LockedQuestion[],
  prefill: P,
): PublishCheck<P> {
  const check = checkForm(input, locked);
  if (!check.success) {
    return { ok: false, issues: check.issues, problems: [] };
  }
  const issues = checkPublishable(check.form);
  const { layout, problems } = layOutForm(check.form, prefill);
  if (issues.length > 0 || problems.length > 0) {
    return { ok: false, issues, problems };
  }
  return { ok: true, form: check.form, layout };
}
