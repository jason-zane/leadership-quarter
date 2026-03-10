# Psychometric Workspace Guide

## Purpose
Use the psychometric workspace to do four jobs in order:

1. Define the construct model.
2. Define the reference population used for norms.
3. Run validation to see whether the observed data supports the model.
4. Approve evidence only when the numbers and the construct both look credible.

## Recommended workflow

### 1. Traits and mappings
- Start in `Instrument setup`.
- Make sure every live item is mapped to the intended trait.
- Resolve reverse scoring before you trust alpha, CITC, or factor results.
- Treat construct warnings as setup debt, not as harmless noise.

### 2. Norm groups
- Create a norm group for the population you want to benchmark against.
- Use the guided filters where possible.
- Preview the submission count before saving.
- Recompute norms after changing filters, cohorts, campaigns, or when new data materially changes the population.

### 3. Validation runs
- `Full validation` is the default once the assessment is live and sample size is acceptable.
- `EFA only` is for exploring structure.
- `CFA only` is for checking whether the intended structure still fits.
- `Invariance only` is for subgroup-comparison work.

### 4. Approval
- Review warnings, factor evidence, loadings, and recommendations.
- Check `Math QA` on the workspace before approving a run.
- Do not approve a run if recomputation is failing or norm drift is present.

## How to know the math is working
The workspace now includes a `Math QA` section. It checks three things:

### Score recomputation
- Rebuilds trait and dimension scores from the raw saved item responses.
- Compares those recomputed values to stored score rows.
- `Fail` means stored scores do not match fresh recomputation.
- `Warning` often means configuration drift: old sessions were scored before the latest mapping/config change.

### Norm recomputation
- Rebuilds each norm group from its saved filters.
- Recomputes means and SDs from the matching score rows.
- Compares those values to stored norm stats.
- `Fail` means stored norms no longer reconcile to the current filtered score pool.

### Reliability bounds
- Checks that alpha, alpha CI, CITC, missingness, and keyed means are numerically sane.
- Negative alpha is usually a construct problem, not an arithmetic bug.

## What the status labels mean
- `Pass`: stored outputs reconcile cleanly.
- `Warning`: numbers may still be arithmetically correct, but something needs analyst review.
- `Fail`: stored outputs and live recomputation disagree; do not trust them until fixed.

## Validation run heuristics
- Prefer KMO above roughly `0.60`.
- Strong retained items are usually around `0.40+` on their intended factor.
- Material cross-loadings should trigger review.
- Better CFA runs trend toward higher `CFI/TLI` and lower `RMSEA/SRMR`.
- Use these as heuristics, not absolute approval rules.
