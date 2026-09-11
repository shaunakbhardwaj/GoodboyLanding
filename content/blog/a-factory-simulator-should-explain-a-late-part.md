# A factory simulator should be able to explain a late part

A machine stops. Twenty minutes later, a different machine stops too. Nothing has broken on the second machine. It has finished its work and has nowhere to put it.

That distinction is easy to lose in a dashboard. Both machines look inactive. The causes, and the useful responses, are different.

This is the kind of problem behind our Factory OS research. We are building systems that can help people understand complicated operations. To investigate those systems, we need an environment where delays have causes, actions have consequences, and an explanation can be checked against what actually happened.

Our starting point is a local industrial operations simulator. It is an early, synthetic research prototype. Its machines and work items follow executable rules, but its operating rates are assumptions. We have not validated it against a real production cell. That boundary matters more than how convincing the animation looks.

## Start with the queue

Consider an illustrative line with three stations: preparation, processing, and inspection. Preparation finishes one part every two minutes. Processing takes three minutes. Inspection normally takes one minute. A buffer between processing and inspection holds two waiting parts.

Now pause inspection for ten minutes. Suppose the buffer is empty at the start, and processing completes parts at minutes three, six, and nine. The first two parts fill the buffer. At minute nine, the third finished part cannot leave processing. Under a rule where a machine keeps its finished part until downstream space becomes available, processing is now blocked.

Preparation may continue briefly. Eventually its downstream queue fills as well. The disruption travels upstream through finite storage, even though those upstream machines remain mechanically healthy.

The numbers here are deliberately simple and illustrative; they are not results from an observed factory. They make the causal chain inspectable. If a simulator lets finished parts disappear into unlimited storage, this blocking never occurs. It can report an improvement that the physical operation has no room to accommodate.

This also changes the intervention. Increasing preparation speed cannot reopen inspection. Adding buffer capacity might absorb a short interruption, while increasing work in progress. Assigning another qualified inspector could help only if one is available and inspection is the actual constraint. Each suggestion needs an explicit model of what it consumes and what it changes.

## A worker is a resource, not a label

Our prototype separates setup, loading, processing, and unloading. It distinguishes work that occupies an operator throughout from automatic processing that can release the operator after loading.

That difference can change the answer to a staffing question. Two automatic machines might share a loader while they run. Two manual operations may compete continuously for the same person. Writing “one operator per machine” into both models would hide that distinction.

Maintenance creates another shared constraint. A repair duration alone does not tell us how long a machine will be unavailable. It may first wait for a technician who is already repairing something else. SimPy's machine-shop example demonstrates this directly through interrupted machine processes competing for repair capacity. We use the same general discrete-event approach: scheduled changes and resource requests drive the operation. [SimPy machine-shop example](https://simpy.readthedocs.io/en/latest/examples/machine_shop.html).

These mechanisms give a systems experiment something meaningful to reason about: capacity, eligibility, interruptions, repairs, inspection, and rework. Their presence does not make fictional timings representative of a particular workshop.

## Keep the clock honest

The simulation clock and the screen refresh rate have different jobs. The engine determines when work changes state. The interface makes those changes legible.

Speeding up an animation should not create production. Opening another browser window should not change a random draw. A result should depend on the model, starting conditions, random streams, and timed interventions.

Ordering also matters. A repair completion and a shift closure can share a timestamp while still requiring an explicit processing order. SimPy processes events sequentially and uses a strictly increasing event identifier to break scheduling ties. That provides deterministic ordering; we still have to make sure our operating rules mean what we intend. [SimPy time and scheduling](https://simpy.readthedocs.io/en/latest/topical_guides/time_and_scheduling.html).

Our event records and saved observations let us inspect a run. They do not yet let us restore an arbitrary historical moment and continue down a different branch. A saved view omits the pending processes, resource waiters, and random-generator state needed for that promise. Calling it replay is convenient. Calling it a resumable experiment would currently be wrong.

## What happened, and what was knowable

A future evaluation needs a second clock: when evidence becomes available.

Imagine a simulated stop at 10:05. A status update arrives at 10:08. An operator note arrives at 10:12. An agent assessed at 10:07 must not receive either future message. Otherwise it is being tested with information nobody had at the time.

OPC UA provides a useful reference by distinguishing source and server timestamps and attaching status information to values. Those fields help preserve context that a bare number cannot carry. For our research, this is a useful design reference for a future observation pipeline, rather than a claim that industrial data is already connected. [OPC UA DataValue](https://reference.opcfoundation.org/specs/OPC-10000-4/7.11).

That is also where we would give AI access: a time-bounded view of observations and relevant operating rules, rather than unrestricted access to the simulator’s future. The model could propose a cause or an intervention; a separate simulation run could test its consequences.

Once that observation boundary exists, we can ask better questions: how early was a delivery risk detectable, which evidence supported it, and did the proposed action improve the outcome? Fluent explanations alone would be a very forgiving scoring system.

## Earn the model's credibility

We can verify that queues respect capacity and parts follow their routes. Establishing that those rules represent an actual operation requires different evidence. Simulation validation is purpose-specific: accuracy sufficient for one question or operating condition does not establish accuracy everywhere. [Robert G. Sargent, Verification and Validation of Simulation Models](https://www.informs-sim.org/wsc11papers/016.pdf).

Our next useful reference is one carefully observed cell. We would collect phase durations, staffing rules, buffer sizes, interruption outcomes, and starting work in progress. Then compare the model with a separate observed period, checking queue histories and waiting causes alongside completed output. Every input should retain its origin: measured, reported, or assumed.

A useful simulator makes an assumption easier to challenge. When a part arrives late, we want to follow the chain back through the queue, the resource conflict, and the evidence. That is a better foundation for intelligent industrial software than a factory that merely looks busy.
