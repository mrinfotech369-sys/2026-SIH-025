# Source Policy

## 1. Source Hierarchy
The system uses the following hierarchy:
- **Tier 1**: Primary official Indian sources (India Code, IP India, CDSCO, FSSAI, AYUSH).
- **Tier 2**: International official sources (WIPO, EPO, FDA, TGA).
- **Tier 3**: Scientific sources (PubMed, AYUSH research).
- **Tier 4**: Secondary sources (explainers, secondary research).

## 2. Verification Status
All sources must have a verification status. Unverified sources are labeled "needs_verification" and cannot be presented as authoritative. 

## 3. Jurisdiction Policy
Documents are strictly assigned a jurisdiction (e.g. INDIA, USA, INTERNATIONAL). Retrieval prioritizes matching jurisdictions. India-only documents are not retrieved for US-specific queries unless requested for comparison.

## 4. TKDL Restriction
The system does not claim unauthorized access to the Traditional Knowledge Digital Library (TKDL). If TKDL references are made, they must be via publicly available secondary notices or official gazettes.

## 5. Citation Requirements
Retrieved chunks must preserve `document_id`, `page_number`, `section_ref`, and `heading` to generate accurate citations in downstream components.

## 6. Unknown Source Handling
The system will never hallucinate or invent sources. If no verified evidence is retrieved, it will return an `INSUFFICIENT_EVIDENCE` status.
