const catColor = {
  Invoice: '#e8ff47',
  Academic: '#47ffe8',
  Identity: '#ff7eb3',
  Vision: '#b47eff',
  Pipeline: '#ff9147',
  General: '#8fff85'
};

const prompts = [
  {id:1,title:"Invoice visual grounding",cat:"Invoice",engine:"Florence-2",status:"existing",ret:"Object-detection bounding boxes for each field",desc:"Locates key invoice fields (Invoice Number, Date, Total Amount, Tax, Vendor Name, Line Item Table) using visual grounding.",prompt:"<OD> Find the Invoice Number, Date, Total Amount, Tax, Vendor Name, Line Item Table."},
  {id:2,title:"Marksheet visual grounding",cat:"Academic",engine:"Florence-2",status:"existing",ret:"Object-detection bounding boxes for each field",desc:"Locates key academic marksheet fields (Student Name, Roll Number, CGPA, Subject Table, University Name) using visual grounding.",prompt:"<OD> Find the Student Name, Roll Number, CGPA, Subject Table, University Name."},
  {id:3,title:"Comprehensive forensic analysis",cat:"Invoice",engine:"LLM",status:"existing",ret:"Classification: authentic | suspicious | forged + flag list",desc:"End-to-end invoice forensics covering extraction of all structured elements, date timeline analysis, financial recomputation, and visual anomaly detection to produce a final authenticity verdict.",prompt:`You are a specialized forensic document analyst for invoices. Process the entire invoice end-to-end — do not check fields in isolation.

Step 1 — Extraction: Extract every structured element: invoice date, order date, payment reference date, line items, duration, numeric totals, amount in words, tax breakdown, and footer statements.

Step 2 — Chronological timeline: Build a timeline of all dates. Verify logical sequence: order_date → invoice_date → payment_reference_date. Flag any date that precedes an earlier anchor date as a potential modification. Detect month or year shifts even when the day is unchanged.

Step 3 — Financial recomputation: Recompute subtotal + tax = total. Compare numeric total with amount-in-words. Validate duration-based service charges against the amount. Verify that subtotal, tax, and total reconcile mathematically.

Step 4 — Visual forensics: Analyze pixel consistency, font uniformity, alignment, spacing, and background texture. Flag pasted regions, overwritten text, whitening artifacts, or spliced sections. Any region showing inconsistent font rendering, noise pattern, or compression vs surroundings should be flagged as suspected tampering.

Output: Classify the document as authentic, suspicious, or forged based strictly on cross-field logical validation and visual anomaly detection.

{evidence}`},
  {id:4,title:"Invoice KPI execution",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { checks_run, checks_passed, checks_failed, notes[] }',desc:"Full invoice integrity audit covering math reconciliation, GSTIN validation, GST rate interpretation, date chronology, field completeness, numeric sanity, Benford's law deviation, vendor domain check, and QR vs visible field comparison.",prompt:`You are a specialized invoice integrity auditor. Using the provided fields, anomalies, and QR payload, run the following checks. Analyze thoroughly and report precise outcomes:

1. Recompute subtotal + tax = total with tolerance {tolerance_pct}% and verify line-item sum vs subtotal.
2. Validate GSTINs (format, state code 01–38, checksum). Note mismatches.
3. Compare CGST/SGST/IGST against declared rates; accept half-rate interpretation where applicable.
4. Validate chronology: payment before order, order after invoice, signature before invoice, future/old dates, span conflicts, duplicate field values.
5. Check field completeness (invoice_number, dates, total_amount mandatory; gstin_numbers/vendor_name/subtotal important).
6. Numeric sanity: negatives, zero/huge totals, subtotal > total.
7. Benford deviation if enough values are available.
8. Vendor email/website domain similarity.
9. QR vs visible: invoice number/date/total/GSTIN/taxes within tolerance.

Return JSON: { "checks_run": n, "checks_passed": n, "checks_failed": n, "notes": ["..."] }
Do not invent values; prefer pipeline numbers. If totals match QR but tax is zero in visible, treat as extraction failure — not forgery.`},
  {id:5,title:"Marksheet KPI execution",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { checks_run, checks_passed, checks_failed, notes[], mismatched_fields[] }',desc:"Academic marksheet validator covering registration number format, grade scale validation, SGPA/CGPA recomputation, attempt/backlog consistency, QR payload comparison, and seal/signature presence.",prompt:`You are a specialized academic records auditor. Using extracted fields and (if available) QR payload, run the following checks. Provide precise, reproducible results:

1. Validate registration/roll number format per institution schema (avoid GSTIN false positives).
2. Confirm department/program names against allowed mappings/codes.
3. Check session_start ≤ session_end ≤ issue_date; flag future/old/temporal conflicts.
4. Validate grade letters/points against the declared scale; flag out-of-range values.
5. Recompute SGPA = sum(credits × grade_points) / sum(credits) and CGPA cumulatively; compare within ±0.5%.
6. Ensure attempt/backlog counts align with pass/fail remarks.
7. Recompute per-subject totals (IA/UE) and overall grand total; allow rounding ±1.
8. Compare QR/barcode payload fields (regno, name, program, semester, sgpa/cgpa) with visible values.
9. Confirm presence of official seal/signature region if expected.

Return JSON: { "checks_run": n, "checks_passed": n, "checks_failed": n, "notes": ["..."], "mismatched_fields": ["..."] }`},
  {id:6,title:"Aadhaar KPI execution",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { aadhaar_valid, qr_consistent, notes[] }',desc:"Aadhaar validation: Verhoeff checksum for full 12-digit numbers, masked-number last-4 comparison, and UIDAI QR field cross-check (name, dob, gender, last4).",prompt:`You are an identity verification specialist. Validate the provided Aadhaar document:

1. If a 12-digit number is present, apply the Verhoeff checksum algorithm and return valid/invalid.
2. If the number is masked (xxxx-xxxx-1234), compare only the last 4 digits vs the QR payload.
3. If UIDAI QR data is present, parse and compare: name, dob, gender, last4 vs visible fields.

Return JSON: { "aadhaar_valid": true|false, "qr_consistent": true|false|"unknown", "notes": ["..."] }`},
  {id:7,title:"Passport KPI execution",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { number_valid, mrz_valid, visual_mrz_consistent, date_conflicts[], notes[] }',desc:"Passport validation: Indian number format check, ICAO MRZ checksum computation, MRZ vs visual field consistency, and date logic (issue ≥ dob+18y, expiry > issue).",prompt:`You are a travel document forensics specialist. Validate the passport document:

1. Number format (India): must be 1 letter + 7 digits (e.g., A1234567). Flag non-conforming values.
2. If MRZ is available, compute ICAO checksums and compare MRZ fields vs visual text (name, passport_no, nationality, dob, expiry).
3. Date logic: issue_date ≥ dob + 18 years (heuristic), expiry_date > issue_date, no extreme future dates beyond tolerance.

Return JSON: { "number_valid": true|false, "mrz_valid": true|false|"unknown", "visual_mrz_consistent": true|false|"unknown", "date_conflicts": ["..."], "notes": ["..."] }`},
  {id:8,title:"PAN extended KPI execution",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { pan_valid, name_alignment, notes }',desc:"PAN card validation: format check (AAAAA9999A), 4th-char taxpayer type validation, and conservative 5th-char initial alignment against the holder's name.",prompt:`You are a financial KYC specialist. Validate the PAN card:

1. Format check: must match pattern AAAAA9999A (5 letters, 4 digits, 1 letter). Flag deviations.
2. 4th character must be a valid taxpayer type code: {P, C, H, A, B, G, J, L, F, T}.
3. If holder name is available, check whether the 5th character of the PAN aligns with the surname/initial — be conservative; prefer "unknown" over "mismatch" if confidence is low.

Return JSON: { "pan_valid": true|false, "name_alignment": "match|mismatch|unknown", "notes": "..." }`},
  {id:9,title:"Address / PIN geocheck",cat:"General",engine:"LLM",status:"existing",ret:'JSON: { pin_valid, region_consistency, notes }',desc:"Extracts 6-digit Indian PIN code, validates format, and checks plausibility of PIN-to-city/state mapping using heuristic lookup.",prompt:`You are a geocoding and address validation specialist. Extract the 6-digit PIN code from the document text. Validate the format. If city and/or state are present, check whether the PIN plausibly maps to that region using heuristic lookup.

Return JSON: { "pin_valid": true|false, "region_consistency": true|false|"unknown", "notes": "..." }`},
  {id:10,title:"ID photo / seal presence",cat:"Vision",engine:"Florence-2",status:"existing",ret:"Object-detection bounding boxes for photo, signature, and seal regions",desc:"Visual detection of portrait photo area, signature region, and official seal/stamp on identity documents.",prompt:"<OD> Find the Photo/Portrait area, Signature area, Official Seal/Stamp area on the document."},
  {id:11,title:"Generic QR consistency",cat:"General",engine:"LLM",status:"existing",ret:'JSON: { matches[], mismatches[], notes }',desc:"Normalizes keys and compares visible document fields vs QR payload for identifiers, dates, holder names, totals, and grades across document types.",prompt:`You are a data normalization and reconciliation expert. Normalize all key names and compare visible document fields vs QR payload for: identifiers (doc no, reg no), dates, holder names, totals/grades as applicable.

Treat parsing failures as unknown.

Return JSON: { "matches": ["...brief reasons..."], "mismatches": ["...brief reasons..."], "notes": "optional parsing notes" }`},
  {id:12,title:"Academic consistency LLM pass",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON array: [{ flag_code, severity, description, evidence }]',desc:"Secondary LLM pass to surface additional marksheet tampering or consistency issues not already caught by the automated rule engine.",prompt:`SYSTEM: You are a specialized academic document forensics expert. Respond with ONLY valid JSON: an array of objects, each with keys flag_code (string), severity (LOW|MEDIUM|HIGH), description (string), and evidence (string, optional). If there are no additional issues, return []. Do not include markdown or explanation.

USER: Review this marksheet extraction and current automated flags. Add only new substantive consistency or tampering issues not already covered.

{ "extracted": { ...selected academic fields... }, "existing_flags": [ ... ] }`},
  {id:13,title:"Academic LLM layer system prompt",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON array: [{ flag_code, severity, description, evidence }]',desc:"System-level instruction for an expert academic document forensics analyst that reasons step-by-step and surfaces anomalies missed by automated checks.",prompt:`You are a specialized academic document forensics analyst. You will be given the extracted structured data from an academic marksheet or transcript, and a list of automated flags already raised.

Your task: identify any additional anomalies, inconsistencies, or suspicious patterns that automated checks may have missed.

Process:
- Reason step by step.
- For each anomaly, output a JSON object with keys: flag_code, severity, description, evidence.

Output: a JSON array of flag objects only. No prose.`},
  {id:14,title:"Document type routing",cat:"Pipeline",engine:"LLM",status:"existing",ret:'JSON: { type, confidence, rationale }',desc:"Classifies a document into one of: invoice, academic_marksheet, id_aadhaar, id_passport, id_pan, bonafide_certificate, bank_statement, or generic — using OCR snippets and file metadata.",prompt:`You are a document router. Given OCR text snippets and file metadata, classify the document as one of: invoice, academic_marksheet, id_aadhaar, id_passport, id_pan, bonafide_certificate, bank_statement, generic.

Provide a short rationale and a confidence score between 0 and 1.

Return JSON: { "type": "...", "confidence": 0.0, "rationale": "..." }`},
  {id:15,title:"OCR strategy advisor",cat:"Pipeline",engine:"LLM",status:"existing",ret:'JSON: { strategy, reasons[], expected_benefits[] }',desc:"Recommends the optimal OCR strategy (native text, PaddleOCR, EasyOCR, or Florence-2 region crops) based on page text quality, engine confidences, and layout complexity.",prompt:`Given: sample page texts (native layer if any), OCR engine confidences, image previews (described), and layout complexity.

Recommend one of: native-text-only, PaddleOCR full, EasyOCR fallback, or Florence-2 region crops + OCR.

Return JSON: { "strategy": "...", "reasons": ["..."], "expected_benefits": ["..."] }`},
  {id:16,title:"QR payload normalizer",cat:"Pipeline",engine:"LLM",status:"existing",ret:"JSON: normalized key-value map (canonical keys only)",desc:"Normalizes noisy QR key/value pairs into canonical keys for downstream comparison, covering invoice, academic, and identity document types.",prompt:`You are a data normalization specialist. Normalize noisy QR key/value pairs into canonical keys for comparison.

Canonical keys: invoice_number, invoice_date, total_amount, seller_gstin, buyer_gstin, cgst, sgst, igst, regno, student_name, program, semester, sgpa, cgpa, dob, gender, last4.

Return a JSON map of normalized keys. Leave unknowns absent. Never guess values.`},
  {id:17,title:"GSTIN deep validation",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { valid_gstins[], rejected[{ value, reason }] }',desc:"Identifies true GSTINs from candidate strings, rejecting false positives such as student registration IDs, with clear exclusion rationale.",prompt:`You are a tax identity validation specialist. Given visible GSTIN candidates and surrounding context lines, identify likely true GSTINs vs false positives (e.g., student registration IDs).

Explain exclusions clearly.

Return JSON: { "valid_gstins": ["..."], "rejected": [{ "value": "...", "reason": "..." }] }`},
  {id:18,title:"Mathematical consistency explainer",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { best_hypothesis, expected_total, stated_total, difference, components[], status }',desc:"Computes the best hypothesis for subtotal+tax=total, explains which combination fails, and quantifies the discrepancy with component-level breakdown.",prompt:`You are a financial reconciliation specialist. Given subtotal, total_amount, cgst/sgst/igst, total_tax, line items, and tolerance, compute the best hypothesis for subtotal + tax = total.

If there is a mismatch, explain which combination fails and by how much.

Return JSON: { "best_hypothesis": "...", "expected_total": n, "stated_total": n, "difference": n, "components": ["..."], "status": "pass|fail" }`},
  {id:19,title:"GST rate interpretation disambiguator",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { chosen_interpretation, fit, details }',desc:"Tests both GST rate interpretations (per-leg vs total/2) and selects the one that best fits the extracted CGST/SGST amounts within tolerance.",prompt:`You are a GST computation specialist. Given extracted GST rates and CGST/SGST amounts, test both interpretations:
- Rate is per-leg (each component = rate%)
- Rate is total/2 (each component = rate/2%)

Decide which interpretation fits best and whether the amounts are correct within tolerance.

Return JSON: { "chosen_interpretation": "per_leg|total_halved", "fit": "good|poor", "details": "..." }`},
  {id:20,title:"Date timeline investigator",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { timeline[{ label, date }], conflicts[{ type, details }] }',desc:"Builds a chronological timeline from all invoice dates and flags impossible sequences: payment-before-order, order-after-invoice, signature-before-invoice.",prompt:`You are a chronology and temporal consistency specialist. Given: order_date, invoice_date, payment_reference_date, signature_date, and any additional dates.

1. Produce a chronological timeline of all dates.
2. Flag impossible sequences: payment before order, order after invoice, signature before invoice.

Return JSON: { "timeline": [{"label": "...", "date": "YYYY-MM-DD"}], "conflicts": [{"type": "...", "details": "..."}] }`},
  {id:21,title:"Field completeness guidance",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { missing_mandatory[], missing_important[], retry_hints[] }',desc:"Identifies missing mandatory and important invoice fields and suggests targeted OCR/vision retry strategies (e.g., 'crop around Invoice No label').",prompt:`You are a document completeness specialist. Given extracted invoice fields, identify:
- Missing mandatory fields (invoice_number, dates, total_amount)
- Missing important fields (gstin_numbers, vendor_name, subtotal)
- Suggest targeted OCR or vision retries (e.g., 'crop around Invoice No label')

Return JSON: { "missing_mandatory": ["..."], "missing_important": ["..."], "retry_hints": ["..."] }`},
  {id:22,title:"Numeric sanity heuristics",cat:"General",engine:"LLM",status:"existing",ret:'JSON: { issues[{ type, value, field }], summary }',desc:"Scans all document amount fields for negatives, zeros, implausibly large values, and subtotal-exceeds-total anomalies.",prompt:`You are a numeric sanity and fraud screening specialist. Scan all amount fields for the following anomalies:
- Negative values
- Zero amounts (where unexpected)
- Implausibly large totals
- Subtotal greater than total

Return JSON: { "issues": [{"type": "negative_amount|zero_total|huge_total|subtotal_exceeds_total", "value": n, "field": "..."}], "summary": "pass|fail" }`},
  {id:23,title:"Benford analysis narration",cat:"General",engine:"LLM",status:"existing",ret:"Plain text ≤60 words",desc:"Writes a concise two-sentence explanation of why a document passes or fails Benford's Law based on chi-square value and first-digit counts.",prompt:`You are a statistical forensics explainer. Given the chi-square value and first-digit counts from Benford analysis, write a two-sentence explanation for a document reviewer on why this document passes or fails Benford's Law expectation.

Return plain text only. Maximum 60 words.`},
  {id:24,title:"Vendor identity consistency",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { email_domain, website_domain, matches, evidence[] }',desc:"Checks whether vendor email domain and website domain align with vendor name tokens to detect identity mismatches.",prompt:`You are a vendor identity consistency specialist. Given vendor_name, vendor_email, and vendor_website, determine whether the email and website domains align with vendor name tokens.

Return JSON: { "email_domain": "...", "website_domain": "...", "matches": true|false, "evidence": ["..."] }`},
  {id:25,title:"QR vs visible reconciliation (Invoice)",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { matches[], mismatches[], notes[] }',desc:"Normalizes and compares invoice_number, invoice_date, total_amount, and taxes between visible document fields and QR payload, distinguishing extraction failures from forgery.",prompt:`You are a cross-source reconciliation specialist. Normalize and compare the following between visible document and QR payload: invoice_number, invoice_date, total_amount, GSTINs, and taxes.

If totals match QR but taxes are zero in visible fields, treat as likely extraction failure — not forgery.

Return JSON: { "matches": ["..."], "mismatches": ["..."], "notes": ["..."] }`},
  {id:26,title:"PDF metadata forensics explainer",cat:"Pipeline",engine:"LLM",status:"existing",ret:"Plain text ≤80 words with gap-threshold analysis",desc:"Produces a short risk explanation from PDF creation/modification timestamps and producer/creator metadata. Applies gap thresholds (>24h critical, ≤1h benign) and names editing tools if present.",prompt:`You are a PDF metadata forensics specialist. Given PDF creation timestamp, modification timestamp, producer, and creator metadata:

Write a short risk explanation (≤80 words). Apply these gap thresholds: modification more than 24 hours after creation = critical risk; gap of 1 hour or less = likely benign. Mention editing tools if present.

Return plain text only.`},
  {id:27,title:"Registration / roll number validation",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { valid[], rejected[{ value, reason }] }',desc:"Validates academic registration and roll numbers against institution-specific patterns, rejecting false positives with clear reasons.",prompt:`You are an academic identifiers specialist. Given candidate registration/roll numbers and institution patterns (if provided), determine which are valid and which are false positives.

Return JSON: { "valid": ["..."], "rejected": [{"value": "...", "reason": "..."}] }`},
  {id:28,title:"Department / program mapping",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { program, department, confidence, notes }',desc:"Maps noisy department/program strings to a normalized catalog using exact match or high-confidence heuristic token matching.",prompt:`You are a program taxonomy specialist. Map the provided department/program string to a normalized catalog entry. If a catalog is provided, match against it directly. Otherwise, apply heuristic token matching with a high-confidence threshold.

Return JSON: { "program": "normalized|unknown", "department": "normalized|unknown", "confidence": 0.0, "notes": "..." }`},
  {id:29,title:"Session & issue date chronology",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { normalized{ session_start, session_end, issue_date }, conflicts[] }',desc:"Normalizes session_start, session_end, and issue_date to YYYY-MM-DD and validates the required chronological ordering.",prompt:`You are a temporal validation specialist. Given session_start, session_end, and issue_date (in any format), normalize all three to YYYY-MM-DD and validate that: session_start ≤ session_end ≤ issue_date.

Return JSON: { "normalized": {"session_start": "...", "session_end": "...", "issue_date": "..."}, "conflicts": ["..."] }`},
  {id:30,title:"Grade scale validator",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { invalid_entries[{ value, reason }], summary }',desc:"Validates grade letters/points against the declared grading scale and flags out-of-range values or unrecognized symbols.",prompt:`You are a grading-scale compliance specialist. Given grade letters/points and the declared grading scale definition, flag:
- Values outside the declared range
- Unmapped or unrecognized symbols

Return JSON: { "invalid_entries": [{"value": "...", "reason": "..."}], "summary": "pass|fail" }`},
  {id:31,title:"SGPA re-computation",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { computed_sgpa, printed_sgpa, difference_pct, status }',desc:"Recomputes SGPA using sum(credits×grade_points)/sum(credits) for the semester and compares with the printed value within ±0.5% tolerance.",prompt:`You are an academic GPA computation specialist. Compute SGPA for this semester using the formula:
SGPA = sum(credits × grade_points) / sum(credits)

Compare the computed value to the printed SGPA. Allow ±0.5% tolerance.

Return JSON: { "computed_sgpa": n, "printed_sgpa": n, "difference_pct": n, "status": "pass|fail" }`},
  {id:32,title:"CGPA re-computation",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { computed_cgpa, printed_cgpa, difference_pct, status }',desc:"Aggregates SGPA and credits across all semesters to recompute cumulative CGPA and compares with the printed value within ±0.5% tolerance.",prompt:`You are an academic GPA computation specialist. Aggregate SGPA and credits across all available semesters to compute the cumulative CGPA.

Compare the computed CGPA to the printed value. Allow ±0.5% tolerance.

Return JSON: { "computed_cgpa": n, "printed_cgpa": n, "difference_pct": n, "status": "pass|fail" }`},
  {id:33,title:"Marks total reconciliation",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { subject_issues[], grand_total{ computed, stated, diff }, status }',desc:"Recomputes per-subject IA/UE totals and grand total, flagging discrepancies beyond the ±1 rounding allowance.",prompt:`You are an examination totals auditor. Recompute per-subject totals (Internal Assessment + University Exam) and the overall grand total. Allow rounding of ±1.

Flag any subject where the computed total differs from the stated value beyond the rounding allowance.

Return JSON: { "subject_issues": [{"subject": "...", "expected": n, "stated": n, "diff": n}], "grand_total": {"computed": n, "stated": n, "diff": n}, "status": "pass|fail" }`},
  {id:34,title:"Attempt / backlog consistency",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { issues[{ subject, type, details }], summary }',desc:"Cross-checks attempt counts against pass/fail remarks and flags contradictions (e.g., passed subjects with non-zero backlog count).",prompt:`You are an academic audit specialist. Check attempt counts against pass/fail remarks for each subject. Flag contradictions such as: a subject marked 'Pass' with a non-zero backlog count, or 'Fail' with zero attempts listed.

Return JSON: { "issues": [{"subject": "...", "type": "...", "details": "..."}], "summary": "pass|fail" }`},
  {id:35,title:"Academic QR / barcode consistency",cat:"Academic",engine:"LLM",status:"existing",ret:'JSON: { matches[], mismatches[], notes[] }',desc:"Compares regno, name, program, semester, SGPA/CGPA between visible marksheet fields and QR/barcode payload.",prompt:`You are a cross-source academic data reconciliation expert. Compare the following fields between visible marksheet and QR/barcode payload: regno, student_name, program, semester, sgpa, cgpa.

Return JSON: { "matches": ["..."], "mismatches": ["..."], "notes": ["..."] }`},
  {id:36,title:"Academic seal / signature presence",cat:"Vision",engine:"Florence-2",status:"existing",ret:"Object-detection bounding boxes for each signature and seal region",desc:"Visual detection of Controller of Examinations signature, Registrar/Principal signature, and Official University Seal on a marksheet.",prompt:"<OD> Find the Controller of Examinations signature, Registrar/Principal signature, and Official University Seal areas on the marksheet."},
  {id:37,title:"Aadhaar Verhoeff & mask handling",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { aadhaar_valid, reason, qr_consistent }',desc:"Applies Verhoeff checksum for full 12-digit Aadhaar. For masked numbers (xxxx-xxxx-1234), compares only the last 4 digits against the QR payload.",prompt:`You are an identity checksum specialist. Process the Aadhaar number as follows:
- If a 12-digit number is present, apply the Verhoeff checksum algorithm.
- If the number is masked (xxxx-xxxx-1234), compare only the last 4 digits vs the QR payload.

Return JSON: { "aadhaar_valid": true|false, "reason": "...", "qr_consistent": true|false|"unknown" }`},
  {id:38,title:"Aadhaar QR normalization",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { matches[], mismatches[], notes[] }',desc:"Parses UIDAI QR data, extracts and normalizes name, dob, gender, and last4, then compares each field against visible document values.",prompt:`You are a UIDAI QR parsing specialist. Parse the UIDAI QR payload. Extract and normalize: name, dob (YYYY-MM-DD), gender, last4.

Compare each field against the visible document values.

Return JSON: { "matches": ["..."], "mismatches": ["..."], "notes": ["..."] }`},
  {id:39,title:"Passport number format (India)",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { number_valid, reason }',desc:"Validates Indian passport number format: exactly 1 uppercase letter followed by 7 digits (e.g., A1234567).",prompt:`You are a passport numbering standard specialist. Validate the Indian passport number format. The required pattern is: 1 uppercase letter followed by exactly 7 digits (e.g., A1234567).

Return JSON: { "number_valid": true|false, "reason": "..." }`},
  {id:40,title:"Passport MRZ checksum & consistency",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { mrz_valid, visual_mrz_consistent, issues[] }',desc:"Computes ICAO MRZ checksums from MRZ lines and verifies consistency against visual text fields: name, passport_no, nationality, dob, expiry.",prompt:`You are an ICAO MRZ compliance specialist. Given the MRZ lines from the passport:
1. Compute ICAO checksums for all MRZ fields.
2. Compare MRZ values against visual text: name, passport_no, nationality, dob, expiry.

Return JSON: { "mrz_valid": true|false, "visual_mrz_consistent": true|false, "issues": ["..."] }`},
  {id:41,title:"Passport date logic",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { conflicts[], summary }',desc:"Validates passport date sequence: issue_date ≥ dob+18y (heuristic), expiry > issue_date, and no extreme future dates beyond tolerance.",prompt:`You are a travel document chronology specialist. Validate passport date logic:
1. issue_date ≥ dob + 18 years (heuristic check)
2. expiry_date > issue_date
3. No dates beyond an extreme future threshold

Return JSON: { "conflicts": ["..."], "summary": "pass|fail" }`},
  {id:42,title:"PAN format, type & name alignment",cat:"Identity",engine:"LLM",status:"existing",ret:'JSON: { pan_valid, name_alignment, notes }',desc:"Validates PAN format (AAAAA9999A), checks 4th-char taxpayer type from the allowed set, and applies conservative 5th-char surname/initial alignment.",prompt:`You are a PAN compliance specialist. Validate the PAN card details:
1. Format: must match AAAAA9999A (5 letters, 4 digits, 1 letter).
2. 4th character must be a valid taxpayer type: {P, C, H, A, B, G, J, L, F, T}.
3. If holder name is present, check whether the 5th character aligns with the surname or initial — be conservative; prefer "unknown" over "mismatch" when confidence is low.

Return JSON: { "pan_valid": true|false, "name_alignment": "match|mismatch|unknown", "notes": "..." }`},
  {id:43,title:"Address & PIN geocheck",cat:"General",engine:"LLM",status:"existing",ret:'JSON: { pin_valid, region_consistency, notes }',desc:"Extracts and validates 6-digit PIN code format, then checks plausible mapping to city/state using heuristic or lookup.",prompt:`You are a geocoding and address validation specialist. Extract the 6-digit PIN code from the text. Validate the format. If city and/or state information is present, check whether the PIN plausibly maps to that region (heuristic or lookup).

Return JSON: { "pin_valid": true|false, "region_consistency": true|false|"unknown", "notes": "..." }`},
  {id:44,title:"ID photo presence (VLM)",cat:"Vision",engine:"Florence-2",status:"existing",ret:"OD bounding box confirming photo presence and proportions",desc:"Detects the photo/portrait area on an ID card and confirms it is present and proportionally rectangular within expected dimensions.",prompt:"<OD> Find the Photo/Portrait area on the ID card and confirm it is present and rectangular within expected proportions."},
  {id:45,title:"Invoice amount-in-words crosscheck",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { match, reason }',desc:'Verifies semantic equivalence between the numeric total and the written amount (e.g., "Five Thousand Rupees only" ≈ 5000.00).',prompt:`You are an amount-in-words verification specialist. Given the numeric total amount and the captured amount-in-words string, verify semantic equivalence (e.g., "Five Thousand Rupees only" ≈ 5000.00).

Return JSON: { "match": true|false, "reason": "..." }`},
  {id:46,title:"Free-trial logic clarifier",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { free_trial_detected, override_total_to_zero, notes }',desc:"Detects free-trial invoices where a zero total is expected and should override a non-zero subtotal — preventing false forgery flags.",prompt:`You are a subscription billing specialist. Given mentions of "free trial" and zeroed totals/balance/payment fields, confirm whether total_amount = 0 is expected and should override a non-zero subtotal.

Return JSON: { "free_trial_detected": true|false, "override_total_to_zero": true|false, "notes": "..." }`},
  {id:47,title:"HSN / SAC disambiguation",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { hsn_candidates[], misreads_as_total[], notes }',desc:"Distinguishes HSN/SAC tax codes from total amounts near tax sections, preventing codes like 996422 from being misread as rupee totals.",prompt:`You are an indirect-tax notation specialist. Given candidate numbers found near tax sections, distinguish HSN/SAC codes from totals.

Example: 996422 is an HSN/SAC code, not a total amount.

Return JSON: { "hsn_candidates": ["..."], "misreads_as_total": ["..."], "notes": "..." }`},
  {id:48,title:"Invoice number robust extractor",cat:"Invoice",engine:"LLM",status:"existing",ret:'JSON: { invoice_number, confidence, evidence }',desc:"Extracts the invoice number from surrounding OCR text blocks, ensuring at least one digit and avoiding 'Place of Supply' false-positive collisions.",prompt:`You are a robust identifier extraction specialist. Given surrounding OCR text blocks, extract the invoice number. Requirements:
- Must contain at least one digit
- Must not be confused with "Place of Supply" or similar labels

Return JSON: { "invoice_number": "...", "confidence": 0.0, "evidence": "..." }`},
  {id:49,title:"Table structure recovery",cat:"Pipeline",engine:"LLM",status:"existing",ret:'JSON: { line_items[{ description, quantity, amount }], omitted_rows[], notes }',desc:"Reconstructs a structured line-items table (description, quantity, amount) from messy OCR output, rejecting ambiguous rows.",prompt:`You are a tabular data reconstruction specialist. From the provided messy OCR lines, reconstruct a line-items table with columns: description, quantity, amount.

Reject rows that are ambiguous or cannot be reliably parsed.

Return JSON: { "line_items": [{"description": "...", "quantity": n, "amount": n}], "omitted_rows": ["..."], "notes": "..." }`},
  {id:50,title:"Risk summarizer across layers",cat:"Pipeline",engine:"LLM",status:"existing",ret:"Plain text: 4–6 bullets with LOW/MEDIUM/HIGH/CRITICAL severity tags",desc:"Synthesizes anomalies from visual forensics, logical validation, metadata analysis, QR consistency, and LLM passes into a concise risk summary identifying the most likely manipulation vector.",prompt:`You are a senior document forensics reviewer. Given anomalies collected from: visual forensics, logical validation, metadata analysis, QR consistency checks, and LLM passes — produce a concise summary.

Format:
- 4–6 bullet points with severity tags (LOW / MEDIUM / HIGH / CRITICAL)
- Identify the single most likely manipulation vector

Return plain text only.`}
];

let activeF = 'All';
let currentPromptText = '';

function setF(f) {
  activeF = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  render();
}

function render() {
  const q = document.getElementById('search').value.toLowerCase();
  const filtered = prompts.filter(p => {
    const fMatch = activeF === 'All' || p.cat === activeF;
    const qMatch = !q || p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q) || p.engine.toLowerCase().includes(q);
    return fMatch && qMatch;
  });
  document.getElementById('rcount').textContent = `${filtered.length} prompt${filtered.length !== 1 ? 's' : ''}`;
  const grid = document.getElementById('grid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">⌕</div><div class="empty-msg">No prompts found</div><div class="empty-sub">Try a different search or filter</div></div>`;
    return;
  }
  grid.innerHTML = filtered.map((p, i) => `
    <div class="card" data-cat="${p.cat}" style="animation-delay:${Math.min(i * 0.04, 0.6)}s" onclick="openModal(${p.id})">
      <div class="card-header">
        <span class="card-id">#${String(p.id).padStart(2,'0')}</span>
        <span class="cat-dot" data-cat="${p.cat}"></span>
      </div>
      <div class="card-title">${p.title}</div>
      <div class="card-desc">${p.desc}</div>
      <div class="card-footer">
        <span class="engine-tag">${p.engine}</span>
        <span class="status-tag status-${p.status}">${p.status}</span>
      </div>
    </div>
  `).join('');
}

function openModal(id) {
  const p = prompts.find(x => x.id === id);
  if (!p) return;
  currentPromptText = p.prompt;
  const c = catColor[p.cat] || '#fff';
  document.getElementById('mAccent').style.background = c;
  document.getElementById('mNum').textContent = `PROMPT #${String(p.id).padStart(2,'0')}`;
  document.getElementById('mTitle').textContent = p.title;
  document.getElementById('mTags').innerHTML = `
    <span class="m-tag m-tag-cat" data-t="${p.cat}">${p.cat}</span>
    <span class="m-tag m-tag-engine">${p.engine}</span>
    <span class="m-tag m-tag-status-${p.status}">${p.status}</span>
  `;
  document.getElementById('mDesc').textContent = p.desc;
  document.getElementById('mRet').innerHTML = `<span style="color:var(--muted);font-size:10px;letter-spacing:1px;">RETURNS</span><br><span>${p.ret}</span>`;
  document.getElementById('mPrompt').textContent = p.prompt;
  const btn = document.getElementById('copyBtn');
  btn.textContent = 'Copy prompt';
  btn.className = 'copy-btn';
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy prompt`;
  document.getElementById('modalBg').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalBg').classList.remove('open');
  document.body.style.overflow = '';
}
function closeBg(e) {
  if (e.target === document.getElementById('modalBg')) closeModal();
}

function copyP() {
  navigator.clipboard.writeText(currentPromptText).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    btn.className = 'copy-btn ok';
    setTimeout(() => {
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy prompt`;
      btn.className = 'copy-btn';
    }, 2500);
  });
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

render();
