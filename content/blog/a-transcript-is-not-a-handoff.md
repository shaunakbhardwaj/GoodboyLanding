# A transcript is not a handoff

An idea arrives while you are doing something else. You speak it, get a reasonably accurate transcript, and carry on. Two days later, the words are still there. The project, the constraint, and the reason it mattered have disappeared.

Speech recognition handled one part of that transaction. The system still has to preserve what the words were for.

Our work on a development fork of Talkify starts with a different requirement: preserve enough of the moment that work can continue later. The upstream application provides a native macOS dictation foundation. We are extending it into a local voice workspace, with original captures, project vocabulary, organized ideas, and deliberate task handoffs. This is development work, not a claim of a finished autonomous assistant.

Talkify is the point where spoken intent enters that wider system. The interesting engineering sits between the microphone and the task queue.

## Save before understanding

Consider this illustrative capture:

> “For the factory simulator, show why a machine is waiting. Keep the current graph. Maybe start with the repair queue. Just save this for later.”

A useful system can suggest a title, a project, a constraint, and a possible first step. It must also preserve “maybe” and “just save.” Converting a tentative thought into a firm implementation plan changes its meaning. Starting work changes its consequences.

Our capture design saves the original transcript before organization begins. The structured idea is a second record linked back to those words. If the local model is unavailable or organization fails, the capture still exists. The user can revise the interpretation without losing the source.

A model can propose a project, extract constraints, and turn a rambling note into a useful brief. Giving it that specific job is different from letting it decide the next action. The source capture, its interpretation, and permission to execute belong at different points in the pipeline.

That distinction sets the architecture: storage owns durability; the model proposes organization. The model does not decide whether the thought deserves to survive.

## Keep the uncertain parts visible

Even the transcript is not a single instantaneous fact. Streaming speech systems revise provisional results as more audio arrives. Apple’s SpeechAnalyzer explicitly distinguishes a volatile range, which may change, from results that are no longer subject to replacement. [Apple: volatile results](https://developer.apple.com/documentation/speech/speechanalyzer/volatilerange)

A voice interface needs that distinction. Showing provisional text quickly makes speaking feel responsive. Treating every provisional phrase as a command would make it erratic. Display, final capture, and execution need separate transitions.

Vocabulary adds another layer. Project names and identifiers often look wrong to a general recognizer. A correction should be able to use the chosen project without changing ordinary language everywhere. The broader principle is context with a boundary: use enough information to resolve the ambiguity, and preserve the original when the interpretation changes.

## Context needs a job description

The longer-term inspiration is the fusion of several observations into a usable account of the current situation. In a software workspace, those observations might be speech, selected text, a project, previous decisions, and execution state. The important idea is that different inputs supply different parts of the answer.

Each input should answer a specific question. Speech expresses intent. A selected object can identify what “this” refers to. Current state says what is happening. Earlier notes explain prior decisions. They are not interchangeable evidence.

Suppose an operator selects a simulated machine and asks, “Why is this waiting again?” The selected machine identifies the subject. Its current state and recent events are the evidence to investigate. Yesterday’s note about staffing is a possible lead. It cannot establish today’s cause by itself.

That Factory OS interaction remains a proposed integration. The direction starts with a narrower set of inputs: application context, a chosen project, and selected text when the user chooses to include it. The useful rule already applies: attach context deliberately, preserve where it came from, and avoid promoting a guess into an observation.

Collecting everything is not the same as understanding the relevant thing.

## Execution deserves its own boundary

“Save this idea,” “prepare a brief,” and “work on this” are different requests. Our design treats them differently. Ordinary captures stay in the local inbox. A prepared brief gives the user a review point. Direct voice queueing requires an explicit setting and a selected project; a model-generated interpretation cannot authorize execution.

The brief needs more than a polished summary. It should carry the objective, known constraints, relevant context, and a definition of done. “Keep the current graph” belongs beside the proposed change, where the next system can see it. Otherwise a helpful rewrite becomes a redesign nobody requested.

The local boundary is similarly concrete. Capturing and organizing a thought on-device does not make every later operation local. A handoff to an external coding provider sends the supplied brief outside that local workflow. The interface should distinguish saved, prepared, and sent states without making the user reconstruct the architecture.

## A timeout is not a verdict

Once a brief becomes a job, the problem is partly distributed systems engineering. Imagine the receiving process starts work, but the sender loses the acknowledgment. Blindly retrying could create a second job. Declaring failure could hide work already underway.

Amazon’s guidance on idempotent APIs describes this ambiguity and the value of caller-provided request identifiers. Repeated intent needs an identity that survives a retry; matching two similar payloads is not always enough. [Amazon Builders’ Library: safe retries](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

For our voice queue, the design consequence is persistent job state and reconciliation after interruption. Keep a reference to the work that was submitted. If submission is uncertain, pause and inspect that recorded work before replaying anything. A confident spinner is not a recovery strategy.

The tests that matter follow these boundaries: does capture survive without a model, does a project correction stay in scope, does an ambiguous command remain a draft, and does a lost acknowledgment produce duplicate work? End-to-end latency matters too, but speed cannot compensate for losing the thought or executing it twice.

A good voice workspace lets a person return later and understand what was said, what was inferred, what was authorized, and what actually happened. That is the direction we are exploring: a voice interface connected to a useful system of work, with a clear account of what crossed each boundary.
