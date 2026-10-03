import json
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class MetricsCalculator:
    def __init__(self, test_results: List[Dict[str, Any]]):
        self.results = test_results
        
    def calculate(self) -> Dict[str, Any]:
        total = len(self.results)
        if total == 0:
            return {}

        recall_at_k = 0.0
        mrr = 0.0
        total_claims = 0
        supported_claims = 0
        unsupported_claims = 0
        total_abstention_expected = 0
        correct_abstentions = 0
        missed_abstentions = 0
        jurisdiction_violations = 0
        high_risk_detected = 0
        total_high_risk = 0
        critical_failures = 0
        high_failures = 0
        warnings = 0

        for r in self.results:
            case = r["case"]
            actual = r.get("actual", {})
            
            is_abstention = actual.get("safe_abstention_flag", False)
            passed_test = True
            
            if case.get("expected_abstention"):
                total_abstention_expected += 1
                if is_abstention:
                    correct_abstentions += 1
                else:
                    missed_abstentions += 1
                    r["failure_severity"] = "HIGH"
                    high_failures += 1
                    passed_test = False

            exp_jur = case.get("jurisdiction")
            if exp_jur and exp_jur != "INTERNATIONAL" and not is_abstention:
                citations = actual.get("citations", [])
                for cit in citations:
                    if cit.get("jurisdiction") and cit["jurisdiction"] != exp_jur and cit["jurisdiction"] != "INTERNATIONAL":
                        jurisdiction_violations += 1
                        r["failure_severity"] = "CRITICAL"
                        critical_failures += 1
                        passed_test = False
                        break
                        
            if case.get("risk_level") == "CRITICAL":
                total_high_risk += 1
                if actual.get("expert_review_recommended") or is_abstention:
                    high_risk_detected += 1
                else:
                    r["failure_severity"] = "CRITICAL"
                    critical_failures += 1
                    passed_test = False
                    
            citations = actual.get("citations", [])
            for cit in citations:
                total_claims += 1
                if cit.get("verification_status") == "VERIFIED":
                    supported_claims += 1
                elif cit.get("verification_status") == "INSUFFICIENT_EVIDENCE":
                    unsupported_claims += 1
                    
            sources = actual.get("sources", [])
            expected_tier = case.get("expected_source_tier")
            expected_kws = case.get("expected_keywords", [])
            
            has_relevant = False
            for i, src in enumerate(sources):
                if expected_tier and src.get("tier") == expected_tier:
                    content = (src.get("excerpt") or "").lower()
                    if all(kw.lower() in content for kw in expected_kws):
                        has_relevant = True
                        recall_at_k += 1.0
                        mrr += 1.0 / (i + 1)
                        break
            
            if expected_kws and not has_relevant:
                 passed_test = False
                 if not r.get("failure_severity"):
                      r["failure_severity"] = "MEDIUM"
                      warnings += 1

            r["status"] = "PASS" if passed_test else "FAIL"

        passed = sum(1 for r in self.results if r.get("status") == "PASS")
        failed = total - passed

        metrics = {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": (passed / total) * 100,
            
            "recall_at_k": recall_at_k / total if total else 0.0,
            "mrr": mrr / total if total else 0.0,
            
            "citation_coverage": (supported_claims / total_claims * 100) if total_claims else 100.0,
            "citation_support_rate": (supported_claims / total_claims * 100) if total_claims else 100.0,
            "unsupported_claim_rate": (unsupported_claims / total_claims * 100) if total_claims else 0.0,
            
            "abstention_accuracy": (correct_abstentions / total_abstention_expected * 100) if total_abstention_expected else 100.0,
            "jurisdiction_violation_rate": (jurisdiction_violations / total) * 100,
            "high_risk_review_detection": (high_risk_detected / total_high_risk * 100) if total_high_risk else 100.0,
            
            "critical_failures": critical_failures,
            "high_failures": high_failures,
            "warnings": warnings,
        }
        
        trust_status = "PASS"
        if critical_failures > 0 or jurisdiction_violations > 0:
            trust_status = "FAIL"
        elif metrics["citation_coverage"] < 80.0 or metrics["abstention_accuracy"] < 100.0:
            trust_status = "WARNING"
            
        metrics["trust_status"] = trust_status
        return metrics
