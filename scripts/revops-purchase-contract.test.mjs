import test from "node:test";
import assert from "node:assert/strict";
import {validateRevopsPurchaseEvent} from "./revops-purchase-contract.mjs";
const valid={version:1,offer:"revops_pulse_lifetime",amount:500,currency:"usd",eventId:"evt_test_12345",type:"payment.paid",paymentIntentId:"pi_test_12345",checkoutSessionId:"cs_test_12345",email:"Sample@Example.com",occurredAt:1792700000};
test("normalizes valid $5 USD event",()=>assert.equal(validateRevopsPurchaseEvent(valid).email,"sample@example.com"));
test("rejects €5 EUR event",()=>assert.throws(()=>validateRevopsPurchaseEvent({...valid,currency:"eur"})));
test("rejects incorrect amount",()=>assert.throws(()=>validateRevopsPurchaseEvent({...valid,amount:499})));
test("rejects unknown offer",()=>assert.throws(()=>validateRevopsPurchaseEvent({...valid,offer:"academy_skills_report"})));
test("rejects unsupported event",()=>assert.throws(()=>validateRevopsPurchaseEvent({...valid,type:"unknown"})));
