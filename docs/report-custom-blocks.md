# Custom Report Blocks

The V2 report system is intentionally designed for two kinds of work:

1. reusable report sections that can be composed in the builder
2. bespoke coded report blocks that are implemented directly in the codebase

Both are valid. We do not force every report design into the generic builder.

## When to add a custom coded block

Add a custom coded block when:

- the design is highly specific to one assessment or audience
- the visual treatment is richer than the generic block renderer should carry
- the data transformation is too specialized to express cleanly through the generic section model
- we are still exploring a new report pattern and do not want to generalize it prematurely

Do not generalize a block just because it exists once. Prove reuse first.

## Recommended workflow

1. Build the report section in code first.
2. Register the renderer and any resolver logic needed for that block.
3. Use it in the report that needs it.
4. Only move it into the generic builder if it becomes a repeated pattern across assessments or audiences.

## Implementation expectations

- The generic report composer is the default authoring path.
- The advanced block layer is the technical escape hatch.
- Custom blocks are a supported extension path, not a failure of the system.
- Some report sections will always remain bespoke and that is acceptable.

## What to keep aligned

When adding a custom report block:

- define the data contract clearly
- keep the resolver behavior deterministic
- make preview/sample behavior available where possible
- avoid item-level response rendering in candidate-facing reports
- ensure PDF behavior is considered if the block may appear in exported reports

## Generalization rule

Only promote a custom coded block into the reusable builder when all of these are true:

- it has appeared in more than one report context
- the data contract is stable
- the layout is stable enough to expose as a configurable option
- the builder UX would genuinely benefit from making it reusable

If those conditions are not met, keep it coded.
