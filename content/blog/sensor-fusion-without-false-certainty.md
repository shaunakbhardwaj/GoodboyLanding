# Sensor fusion should preserve doubt

A supplier says a facility has restarted. A recent image shows a changed storage yard. A vessel has arrived at a nearby port. Three signals, one reassuring story. Has production actually resumed?

Perhaps. The image could show maintenance. The vessel could be serving another facility. The supplier's statement could be the source of the news report you counted as independent confirmation. A system that combines these observations too eagerly can become more confident while learning very little.

This is the question behind our early sensor-fusion explorations at Goodboy: how can a system reduce uncertainty about the physical world while remaining honest about what it cannot observe? We are exploring an architecture and its evaluation, not announcing a deployed facility-monitoring service.

The starting point is a decision that needs evidence. The choice of sensor comes after that.

## Define the claim before collecting the feeds

“Is the supplier operating?” hides several different questions. Has the site opened? Is equipment running? Is it making the part we need? Can it fulfil our order on time? Evidence for one does not automatically answer the others.

For an initial experiment, we would narrow the target: did activity at a particular facility change during a specified interval in a way consistent with a reported restart? That question identifies an entity, a time window, and an observable comparison. It also leaves room for an inconclusive answer.

The system needs to preserve three layers. An observation describes what a source recorded. An interpretation describes what that could mean. An assessment states what the combined evidence supports. If an image classifier produces “yard activity increased,” that is already an interpretation of pixels. Calling the final output “verified production” would skip several steps.

This discipline makes a modest question considerably more useful than an impressive-looking global map.

## Different sensors leave different gaps

Optical imagery can help compare visible land use, storage areas, or construction. It has limits. Sentinel-2's instrument samples bands at 10, 20, and 60 metres. Those are spatial sampling scales, not a promise that a system can identify individual operations inside a building. [ESA: Sentinel-2 instrument overview](https://step.esa.int/main/wp-content/help/versions/11.0.0/snap-toolboxes/eu.esa.opt.opttbx.s2msi.reader/Sentinel2Overview.html)

Sentinel-1 supplies radar imagery in daylight or darkness and through cloud. That makes it complementary to optical observation, but radar backscatter still requires interpretation. A radar change is not a direct reading of production output. [ESA: Sentinel-1](https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1)

AIS adds another kind of observation: broadcasts associated with vessels. Missing messages are not necessarily proof of intentional silence, and inferred activity is not a direct observation of cargo ownership. Global Fishing Watch explicitly documents completeness, reception, and interpretation limits in its event data. [Global Fishing Watch: data caveats](https://api-doc.globalfishingwatch.org/our-apis/documentation/docs/v3/general-api-doc/data-caveats)

In our proposed facility experiment, a port arrival would therefore be contextual evidence. Connecting it to a supplier would require a defensible relationship, rather than a convenient line drawn on a map. A feed earns its place when it answers part of the question at an appropriate resolution and time scale.

## Three sources can contain one piece of evidence

Suppose a company publishes a restart notice. A trade publication reports that notice. A data vendor extracts the publication into a structured event. Treating all three as independent votes would reward the distribution of the story rather than the strength of the evidence.

A useful system would retain the original source and the derivation chain. It could still keep all three records: one provides the statement, another adds context, and the third offers a searchable representation. They should not silently become three confirmations.

Dependence also appears in numerical estimates. Two models can share training data or use the same underlying sensor. Research on Bayesian fusion explicitly examines cases where cross-correlation between estimates is unknown. The practical lesson is to make dependence an engineering concern before multiplying confidence scores. [A Bayesian Approach to Data Fusion in Sensor Networks](https://arxiv.org/abs/1303.2414)

For a first system, we would make source families visible and use conservative combination rules. We would rather display two genuinely different observations than claim ten sources agree when nine copied the tenth.

## Keep the time attached

Here is a fictional assessment made at noon on Friday. A supplier notice arrived that morning. The latest usable image was acquired on Tuesday but downloaded on Thursday. A vessel position was observed on Friday morning. These records do not describe one simultaneous scene.

Each needs at least an observation time, an arrival time, an entity reference, and a source. An assessment can then say that it contains fresh shipping context but stale visual evidence. If a newer image is cloud-obscured, that is a gap in observation. It does not establish that the facility became inactive.

The distinction matters when evaluating early warning. A retrospective model that sees a Monday event report while pretending to make a decision on the preceding Friday has been given the answer. We would replay evidence in arrival order and require the system to work with only what was available at each assessment time.

History should improve an assessment without rewriting what was knowable then.

## Give AI a defined place in the pipeline

Before a model sees these records, the system should resolve their entity references, preserve their origins, and exclude information outside the assessment window. This produces an evidence package for a specific question. A folder full of feeds is a less useful interface.

The model can then propose interpretations, identify contradictions, or explain which missing observation would change the assessment. Its output should refer back to the records it used. It should not invent a relationship between a vessel and a facility simply because that would complete the story.

A separate check can compare the assessment with new observations or a resolved outcome. This is the unified system we are interested in: collection, interpretation, and verification connected through explicit records. AI performs a defined piece of the reasoning, while the surrounding pipeline makes that reasoning inspectable.

## Confidence needs a test set

A percentage is easy to produce. Giving it a stable meaning is harder. If a system labels comparable assessments as 80 percent likely, calibration asks whether approximately that proportion turns out to be correct over enough resolved cases. Guo and colleagues studied this distinction between prediction accuracy and confidence calibration in neural classifiers. Their results motivate measurement; they do not calibrate our proposed system for us. [On Calibration of Modern Neural Networks](https://proceedings.mlr.press/v70/guo17a.html)

Our first evaluation would use a bounded set of facilities and events with independently established outcomes. We would test detection time, false alarms, missed events, and the rate of inconclusive assessments. We would also remove individual feeds to find out whether they add useful information, and test performance when a source is late or absent.

The output should include the claim, supporting and conflicting observations, relevant gaps, and the next check that would reduce uncertainty. Sometimes that next check will be a call to the facility. Sensors are tools; choosing a better tool is allowed.

The capability we want is an assessment that another person can inspect and challenge. A system that can explain why it is uncertain is a better starting point than one that sounds certain on schedule.
