# Extraction eval

Run 2026-10-12T13:42 · model google/gemini-3.7-flash via OpenRouter · 36 real headlines from the live feeds, labelled by hand.

| Metric | Result |
|---|---|
| 4-class accuracy | **32/36 (89%)** |
| Opportunity recall (missed openings) | **6/7** |
| Opportunity precision | 6/6 |
| Relevant vs not-relevant | 33/36 |
| Gemini cost for this eval | $0.0742 |

Recall matters most: a missed opening is the failure Ananya described. A false positive costs her a minute; and because nothing is hidden (Cold is listed), a misclassified story is still on her screen.

## Confusion matrix (rows = human label, columns = model)

| | opportunity | policy | other | not_relevant |
|---|---|---|---|---|
| **opportunity** | 6 | 0 | 0 | 1 |
| **policy** | 0 | 1 | 1 | 0 |
| **other** | 0 | 0 | 15 | 1 |
| **not_relevant** | 0 | 0 | 1 | 10 |

## Disagreements

| Headline | Human | Model |
|---|---|---|
| CM launches BMC’s ‘Participate Mumbai’, boosts CSR-led collaboration | Mumbai ne | policy | other (new_initiative) |
| Colors for Peace Brings Together 1500 Students and Global Leaders in Delhi | not_relevant | other (other_csr) |
| Janakpuri school gets STEM lab | opportunity | not_relevant (not_relevant) |
| CBM India Trust Supports Early Inclusion of Children with Disabilities | other | not_relevant (not_relevant) |

## Iteration history

| Version | Model / change | 4-class accuracy | Opportunity recall | Precision |
|---|---|---|---|---|
| v1 | gemini-flash (direct). Sector tagged only if the programme itself teaches/trains; "infrastructure alone does not count" | 28/36 (78%) | 2/7 | 2/2 |
| v2 | Same model. School development, scholarships and labs count as education; new labs/centres/cohorts are `new_initiative` | 31/36 (86%) | 6/7 | 6/7 |
| v3 | `google/gemini-3.7-flash` via the course OpenRouter gateway (Google-only providers), same v2 prompt | 32/36 (89%) | 6/7 | 6/6 |

Remaining disagreements are borderline labels (is a BMC CSR platform a policy change or an initiative?) or headline-only stories with no company named. Because Cold stories stay visible, none of them is hidden from Ananya.
