# RefundHold Demo Simulation Pilot Test Kit

This test kit is for running one controlled demo simulation pilot with a real tester. It does not validate Stripe test-mode or live-money production readiness.

## Pilot objective

The goal is to verify whether a real tester can understand RefundHold without explanation:

- what RefundHold does
- why AI-generated Stripe refunds need review
- how the public demo works
- what the audit trail means
- how the quickstart would be used
- what blocks them before a test-mode pilot

## Tester profile

The ideal tester is a founder, operator, support lead, or technical person who:

- uses or understands Stripe
- is considering AI support agents or automation
- does not already know the internal RefundHold project
- can think aloud for 20 to 30 minutes

## What to send the tester

Use a short message like this:

```text
I am testing RefundHold, a demo for reviewing AI-generated Stripe refunds before they can continue.

Please open the home page, try the refund demo, then open the 5-minute setup page:

Home: /
Demo: /demo
Quickstart: /docs/quickstart

As you go, say what is clear, what is confusing, and where you would get stuck if you had to connect this to an AI support agent.

No real money moves in this demo. Do not enter real Stripe secrets, API keys, or customer data.
```

Do not include private demo passwords or API keys in the tester message.

## Test script

Step 1: Ask the tester to open the home page and explain what they think RefundHold does.

Step 2: Ask them to click Try the refund demo.

Step 3: Ask them to complete the demo by approving the refund.

Step 4: Ask them to restart or repeat the demo and reject the refund.

Step 5: Ask them what they think the audit trail means.

Step 6: Ask them to open the 5-minute setup page.

Step 7: Ask them where they would get stuck if they had to integrate this with an AI support agent.

Step 8: Ask them whether they understand the difference between demo simulation, Stripe test-mode, and live refunds.

Step 9: Ask them whether they would request a test-mode pilot.

## Questions to ask

- What do you think RefundHold does?
- Who do you think this is for?
- At what point did you understand the value?
- What was confusing?
- Did the demo feel safe?
- Did you understand that no real money moved?
- Did you understand what happens before Stripe?
- Did the audit trail make sense?
- Did the quickstart feel usable?
- What would stop you from testing this with your own system?
- Would you trust this enough for Stripe test-mode?
- What would you need before live-money use?

## What to observe silently

- Did they understand the headline without help?
- Did they click the demo CTA?
- Did they complete the demo without guidance?
- Did they notice the no-money-moved safety copy?
- Did they understand why the refund was held?
- Did they understand approve vs reject?
- Did they understand the audit trail?
- Did they understand the API key placeholder?
- Did they confuse demo simulation with Stripe test-mode?
- Did they ask whether RefundHold is affiliated with Stripe?
- Did they ask whether live refunds work?

## Activation signals

Strong signal:

- tester completes demo without help
- explains the product accurately
- understands no real money moved
- asks how to connect their AI support agent
- asks for Stripe test-mode pilot

Medium signal:

- tester understands the demo but struggles with API setup
- asks for more examples
- wants to see reviewer dashboard

Weak signal:

- tester calls it interesting but cannot explain use case
- does not understand why the refund is held
- thinks it is generic compliance/security software
- misses the Stripe refund use case

No-go signal:

- tester believes live money moved
- tester thinks RefundHold is Stripe-approved
- tester cannot explain what problem it solves
- tester does not understand why a human approval step exists

## Pilot notes template

```text
Tester:
Date:
Role:
Company type:
Uses Stripe:
Uses AI support agents:
Demo completed:
Quickstart opened:
Main confusion:
Quote from tester:
Strongest signal:
Weakest signal:
Would request test-mode pilot:
Recommended change before next tester:
```

## What not to do during the pilot

- Do not explain the product before they try the home page.
- Do not guide them through the demo unless they get stuck.
- Do not defend the product.
- Do not mention internal architecture.
- Do not show private demo passwords.
- Do not expose API keys.
- Do not ask them to use live Stripe data.
- Do not discuss pricing yet.
- Do not promise production live refunds.

## Decision after the pilot

If the tester understands the product and asks for test-mode:

Next step is to prepare a controlled Stripe test-mode pilot runbook.

If the tester understands the demo but not the API setup:

Next step is to improve the quickstart and API key onboarding.

If the tester does not understand the product:

Next step is to revise home and demo copy before adding features.

If the tester asks about production live-money:

Answer that live refunds are blocked in v1 and production readiness requires further review.

## Recommended next step

After the first real tester pilot, update `docs/internal/pilot-rehearsal-report.md` with the tester findings and decide whether the next build step is quickstart/API-key onboarding, private reviewer access, or Stripe test-mode pilot runbook.
