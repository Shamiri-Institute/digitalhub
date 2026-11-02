-- Before 0044, a referral to a clinical lead set clinical_lead_id at once and left the case
-- "Pending" forever, because leads had no accept step. Those leads took the cases, so mark the
-- referrals accepted, the way accepting one does now. "Pending" then always has a recipient.
UPDATE "clinical_screening_info"
SET "accept_case" = true, "referral_status" = NULL
WHERE "referred_to" = 'Clinical Lead'
  AND "referral_status" = 'Pending'
  AND "clinical_lead_id" IS NOT NULL
  AND "referred_to_clinical_lead_id" IS NULL;
