# A memory graph should be able to show its working

A useful assistant should understand a request like “continue the analysis we discussed last week.” That sentence leaves out almost everything a computer needs: which conversation, which dataset, which version of the analysis, and what “continue” permits it to do. The missing information lives across messages, files, decisions, and unfinished work.

Our Julia experiments began with that problem. The ambition is a messaging interface to work that needs a computer: finding local material, running an analysis, continuing a development task, and returning a result. The interesting engineering question is how the system reconstructs enough context to act without turning every answer into an archaeological expedition.

Julia is the context layer in this picture: a memory that connects conversations, artifacts, and decisions across tools. Its value comes from recovering a useful relationship: this file belongs to that analysis, which followed this instruction. The graph matters because the connections mean something, not because it gives us a pleasing way to draw the data.

## Start with a claim and its receipt

Consider a fictional sequence. On Monday, someone writes, “Use the February export for the baseline.” On Thursday, they correct it: “The February export is incomplete. Use March.” An assistant that compresses both messages into “the baseline uses an export” has preserved the topic and lost the decision.

Julia separates original evidence from assertions derived from it. Evidence records retain where a statement came from, when it was made, and who made it. An assertion describes a subject, a relationship or value, supporting evidence, and a status. Confirmed, inferred, disputed, and superseded are different states.

That last detail matters. A recorded user statement can be confirmed as a statement without being independently verified as a fact about the world. Confidence in attribution is not the same as confidence in reality. If a model infers that a particular dataset is suitable, the inference needs to remain distinguishable from a user's instruction to use it.

This draws on a well-established idea. W3C's PROV model describes entities, activities, and agents involved in producing information, including derivation and revision. It provides a vocabulary for tracing a result back through its origins. Julia is not presented as a PROV implementation; the useful design lesson is to preserve those origins instead of flattening them into a persuasive sentence. [W3C PROV Model Primer](https://www.w3.org/TR/prov-primer/)

## Corrections need a history

In the current prototype, correcting an assertion creates a replacement linked to the earlier record. The older assertion becomes superseded, its period of validity ends, and ordinary recall stops treating it as current. The new claim has its own evidence.

For the export example, ordinary recall should surface the March instruction. Inspection should still explain why an older analysis used February. Both are legitimate questions. Destructively replacing the text would make the second harder to answer; retaining both as equally current would make the first unreliable.

Temporal memory research treats changing relationships as a first-class concern. The Zep paper describes an agent-memory architecture built around a temporal knowledge graph. We take that as a useful reference for representing change, not as evidence that our own retrieval works equally well. Architecture diagrams do not transfer benchmark results between implementations. [Zep: A Temporal Knowledge Graph Architecture for Agent Memory](https://arxiv.org/abs/2501.13956)

There is also a boundary memory cannot cross by itself. “The file was available yesterday” does not establish that it exists now. Julia's context package can flag a need for fresh observation. Before executing the analysis, the worker should inspect the file and its current state. Stored knowledge helps locate the evidence; a tool observation checks the present.

## Permission comes before relevance

A memory system used by more than one person cannot treat access control as a final filter on generated prose. By then, unauthorized information may already have influenced retrieval, ranking, or an answer.

Julia's memory boundary first resolves the private and group scopes visible to the requesting person. Retrieval operates within that set. Graph traversal uses scoped assertions, and sharing creates a publication of a selected claim. It does not simply grant access to the original private message, its aliases, or its metadata.

That choice has a cost: shared information needs its own lifecycle. A correction or revocation must affect published copies as well as the private source. The prototype handles those links explicitly. The alternative is deceptively easy: a private record changes while an old shared copy remains authoritative forever.

These controls concern application access. They do not imply local model inference, encrypted computation, or protection against every person with direct access to the host. Those are separate boundaries with separate implementations.

## Retrieval is a budgeted investigation

Names, filenames, and exact identifiers deserve exact matching. Paraphrased concepts benefit from semantic matching. Typed relationships help recover the connection between a project, a task, and its output. No single method covers all three well.

The useful combination is exact lookup, semantic retrieval, and a short traversal over known relationships. An AI asked to continue an analysis should receive the relevant decision and artifact, with enough source information to inspect them. It should not need the entire history of the company in its prompt.

This is one of the places AI can enter a larger pipeline. Retrieval assembles candidate evidence within the permitted scope. The model interprets that evidence for the current task. A fresh observation checks anything that may have changed. Execution follows only when the request and permissions support it.

More context is not automatically more usable context. The “Lost in the Middle” experiments found that the tested models' performance could depend substantially on where relevant material appeared in a long input. Those results concern particular models and tasks; they are a reason to evaluate context selection, not a universal verdict on current models. [Lost in the Middle](https://arxiv.org/abs/2307.03172)

Our practical direction is a compact first pass with evidence available for further inspection. A worker should be able to ask for the underlying message when a decision depends on it. That makes omission recoverable without loading every source into every turn.

## The test is whether work resumes correctly

A larger graph would be an easy demonstration. A better test is a small set of difficult questions with known answers: distinguish two similarly named people; follow a corrected instruction; recover a rarely used file; reject a plausible but unsupported relationship; refuse recall outside the caller's scope.

We would measure answer correctness, source correctness, privacy failures, retrieval latency, and context size separately. An answer with the right conclusion but the wrong receipt is still a failure worth investigating.

Julia is our working exploration of these boundaries. The ambition is continuity across tools and conversations, while retaining a clear distinction between evidence, inference, and permission. The next useful milestone is narrower: recover the right conversation and artifact, explain the relevant decision, inspect the current state, and continue the correct task. Every connection should earn its place by helping that happen.
