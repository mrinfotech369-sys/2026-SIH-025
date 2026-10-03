import json
import time
import sys
import logging
from typing import Dict, Any, List

from backend.app.models.schemas import SourceDocumentItem, AuthorityTierEnum, JurisdictionEnum
from backend.app.services.intelligence.engine import IntelligenceEngine
from rag.retriever.hybrid import HybridRetriever
from evaluation.metrics import MetricsCalculator

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def map_raw_to_source_doc(ev: Dict[str, Any], target_jurisdiction: str) -> SourceDocumentItem:
    jur_str = ev.get("jurisdiction", target_jurisdiction)
    if not isinstance(jur_str, str):
        jur_str = "INTERNATIONAL"
        
    try:
        jurisdiction = JurisdictionEnum(jur_str)
    except ValueError:
        if jur_str == "IN":
            jurisdiction = JurisdictionEnum.IN
        elif jur_str == "US":
            jurisdiction = JurisdictionEnum.US
        elif jur_str == "AU":
            jurisdiction = JurisdictionEnum.AU
        else:
            jurisdiction = JurisdictionEnum.INTERNATIONAL

    tier_val = ev.get("source_tier", 3)
    if tier_val == 1:
        tier = AuthorityTierEnum.TIER_1
    elif tier_val == 2:
        tier = AuthorityTierEnum.TIER_2
    else:
        tier = AuthorityTierEnum.TIER_3

    return SourceDocumentItem(
        id=ev.get("chunk_id") or ev.get("id") or "doc-1",
        title=ev.get("heading") or ev.get("title") or "Official Document",
        authority=ev.get("authority", "Authority"),
        tier=tier,
        jurisdiction=jurisdiction,
        domain=ev.get("domain", "GENERAL"),
        document_type="DOCUMENT",
        excerpt=ev.get("content") or ev.get("text_content", ""),
        source_url=ev.get("source_url", "")
    )

def run_evaluation():
    try:
        with open("evaluation/dataset.json", "r") as f:
            dataset = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        sys.exit(1)

    retriever = HybridRetriever()
    engine = IntelligenceEngine()

    results = []

    timings = {
        "retrieval": 0,
        "generation": 0,
        "total": 0
    }

    start_total = time.time()

    for idx, case in enumerate(dataset):
        logger.info(f"Running test {idx+1}/{len(dataset)}: {case['id']}")
        
        target_jur = case.get("jurisdiction", "INTERNATIONAL")
        query = case.get("question", "")
        
        start_retrieval = time.time()
        raw_results = retriever.retrieve(
            query=query,
            jurisdiction=target_jur if target_jur != "INTERNATIONAL" else None,
            domain=case.get("domain"),
            top_k=5
        )
        timings["retrieval"] += time.time() - start_retrieval
        
        evidence = raw_results.get("results", [])
        source_docs = [map_raw_to_source_doc(ev, target_jur) for ev in evidence]
        
        start_gen = time.time()
        intel_resp = engine.generate_answer(
            query=query,
            domain=case.get("domain", "GENERAL"),
            innovation_data={},
            retrieved_docs=source_docs,
            target_jurisdiction=target_jur
        )
        timings["generation"] += time.time() - start_gen

        actual_citations = []
        for claim in intel_resp.claims:
            for cit in claim.citations:
                actual_citations.append({
                    "jurisdiction": cit.jurisdiction,
                    "verification_status": claim.verification.status.value if claim.verification else "NOT_VERIFIED"
                })

        actual = {
            "safe_abstention_flag": intel_resp.abstained,
            "expert_review_recommended": intel_resp.review_required,
            "citations": actual_citations,
            "sources": [{"tier": d.tier.value, "excerpt": d.excerpt} for d in source_docs]
        }
        
        results.append({
            "case": case,
            "actual": actual
        })

    timings["total"] = time.time() - start_total

    logger.info("Calculating metrics...")
    calculator = MetricsCalculator(results)
    metrics = calculator.calculate()

    # Create final report
    report = {
        "summary": {
            "dataset_size": metrics.get("total_tests", 0),
            "tests_passed": metrics.get("passed", 0),
            "tests_failed": metrics.get("failed", 0),
            "pass_rate": metrics.get("pass_rate", 0),
        },
        "retrieval": {
            "recall_at_k": metrics.get("recall_at_k", 0),
            "mrr": metrics.get("mrr", 0),
        },
        "trust": {
            "citation_coverage": metrics.get("citation_coverage", 0),
            "citation_support_rate": metrics.get("citation_support_rate", 0),
            "unsupported_claim_rate": metrics.get("unsupported_claim_rate", 0),
        },
        "safety": {
            "abstention_accuracy": metrics.get("abstention_accuracy", 0),
            "jurisdiction_violation_rate": metrics.get("jurisdiction_violation_rate", 0),
            "high_risk_review_detection": metrics.get("high_risk_review_detection", 0),
        },
        "failures": {
            "critical_failures": metrics.get("critical_failures", 0),
            "high_failures": metrics.get("high_failures", 0),
            "warnings": metrics.get("warnings", 0),
        },
        "trust_status": metrics.get("trust_status", "FAIL"),
        "timings": {
            "retrieval_time_ms": int(timings["retrieval"] * 1000),
            "generation_time_ms": int(timings["generation"] * 1000),
            "verification_time_ms": 0,  # Included in generation for now
            "total_time_ms": int(timings["total"] * 1000)
        }
    }

    # Add results details
    report["results"] = results

    with open("evaluation_report.json", "w") as f:
        json.dump(report, f, indent=2)

    logger.info(f"Evaluation finished. Trust Status: {report['trust_status']}")
    
    # Generate Markdown report
    md = f"""# IP-SAKTI TRUST EVALUATION

Dataset size: {report['summary']['dataset_size']}
Tests passed: {report['summary']['tests_passed']}
Tests failed: {report['summary']['tests_failed']}
Pass rate: {report['summary']['pass_rate']:.2f}%

Recall@K: {report['retrieval']['recall_at_k']:.2f}
MRR: {report['retrieval']['mrr']:.2f}

Citation coverage: {report['trust']['citation_coverage']:.2f}%
Citation support rate: {report['trust']['citation_support_rate']:.2f}%
Unsupported claim rate: {report['trust']['unsupported_claim_rate']:.2f}%

Abstention accuracy: {report['safety']['abstention_accuracy']:.2f}%
Jurisdiction violation rate: {report['safety']['jurisdiction_violation_rate']:.2f}%
High-risk review detection: {report['safety']['high_risk_review_detection']:.2f}%

Critical failures: {report['failures']['critical_failures']}
High failures: {report['failures']['high_failures']}
Warnings: {report['failures']['warnings']}

Trust status: {report['trust_status']}

## Timings
- Retrieval: {report['timings']['retrieval_time_ms']} ms
- Generation: {report['timings']['generation_time_ms']} ms
- Total: {report['timings']['total_time_ms']} ms
"""
    with open("evaluation_report.md", "w") as f:
        f.write(md)

if __name__ == "__main__":
    run_evaluation()
