# Amano — Verified Skills

> Employers care about demonstrated competence, not course completion. Verified
> Skills makes Amano the place where competence is *proven* — the platform's
> defining moat.

## 1. The credential ladder

| Tier | Meaning | How earned |
|---|---|---|
| **Completed** | Finished a course | Watch + pass in-course quizzes |
| **Certificate** | Assessed knowledge | Course final assessment, serial-numbered |
| **Verified Skill** | *Demonstrated performance* | Practical assessment reviewed by AI — and, where stakes warrant, countersigned by a verified human expert |
| **Verified · Distinction** | Top-band performance | Same assessment, distinction band on rubric |

A Verified Skill is a *credential entity* (`VerifiedSkill` in the domain model)
with evidence, scores, reviewer chain, a public serial, and — for volatile domains
like tax — an expiry that triggers re-verification.

## 2. The assessment loop

```
Skill page ("Contract Drafting")
   └─ Start assessment
        1. BRIEF      Realistic scenario: "TechZed Ltd is engaging a freelance
                      developer. Draft the services agreement covering IP,
                      payment milestones, and termination." Timeboxed if the
                      skill demands it (e.g. Excel: 90 min).
        2. PERFORM    In-platform workspace (editor / spreadsheet upload /
                      file upload / recorded video for public speaking) —
                      produces an evidence artifact.
        3. AI REVIEW  Rubric-driven review (Claude): each criterion scored
                      with cited passages from the submission; produces a
                      structured report the candidate always receives —
                      failing is still a learning outcome.
        4. EXPERT     For AI_THEN_EXPERT skills, submissions that clear the
                      AI bar route to a queue of verified practitioners
                      (e.g. admitted lawyers for legal drafting) who spot-check
                      and countersign. Experts are paid per review — a new
                      Earn stream that also scales trust.
        5. ISSUE      Badge ceremony: gold seal animation, serial, auto-added
                      to profile, shareable to WhatsApp/LinkedIn, visible to
                      recruiters immediately.
```

Failure path: report + targeted course/lesson recommendations + cool-down before
retake (attempt fee only on re-takes, first attempt bundled with relevant course
or subscription tier).

## 3. Review modes by skill class

| Skill class | Examples | Mode |
|---|---|---|
| Deterministic | Excel, bookkeeping, financial modelling | AI_ONLY — outputs are checkable (formulas, balances) |
| Craft, judgment-light | CV writing, digital marketing plan, presentation deck | AI_ONLY with distinction band gated on human sample audits |
| High-stakes / professional | Contract drafting, tax filings, clinical adjacent | AI_THEN_EXPERT — countersignature required |
| Performance | Public speaking, teaching demo | Video submission; AI rubric on structure/clarity + expert viewing |

Anti-gaming: randomized scenario banks per `SkillAssessment.version`, plagiarism
and AI-ghostwriting detection on artifacts, proctoring-lite (timebox + paste
telemetry) for deterministic skills, and random expert audits of AI_ONLY passes
(audit rate published — trust is the product).

## 4. Why this compounds the flywheel

- **Learners** get a credential that actually moves hiring decisions → the reason
  to choose Amano over any video library.
- **Experts** earn from reviews and author assessments → deepens the Earn pillar
  and gives senior professionals a role beyond teaching.
- **Recruiters** filter talent search and job posts by *held verified skills*
  (`JobPost.requiredSkillIds`) → recruitment revenue quality no rival can match.
- **Corporates** see verified capability, not completion theatre, in HR dashboards.
- **The catalogue** gains a spine: every course maps to skills (`CourseSkill`),
  every path terminates in verifications — browsing becomes progress.

## 5. Public verification

Every badge and certificate resolves at `/verify/:serial` — issuer, holder, skill,
date, review mode, expiry. Employers can check a credential from a CV in ten
seconds without an account. (Future: signed JSON-LD / Open Badges export.)

## 6. MVP scope (prototype)

Ship the full loop for **three flagship skills** with rich sample data:

1. **Contract Drafting** (Amano Law) — AI_THEN_EXPERT, editor workspace
2. **Microsoft Excel** (Amano Business) — AI_ONLY, timed file-upload workspace
3. **Public Speaking** (Amano Corporate) — video submission

Plus the catalog, skill pages, assessment flow UI, AI review report UI, badge
ceremony, profile/recruiter surfacing, and `/verify/:serial`.
