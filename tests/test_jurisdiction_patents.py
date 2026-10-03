"""Jurisdiction actually drives patent matching (not just display): match_innovation() scopes
to Innovation.target_markets; search_patents() filters at the SQL layer, not post-retrieval."""
import uuid

from conftest import login

EXTRACTION_WIZARD = {
    "basic": {"name": "Jurisdiction Test Formulation", "description": "Oral tablet made by enzyme-assisted aqueous extraction.",
              "intended_use": "Support a healthy stress response", "innovation_type": "Formulation"},
    "ingredients": [{"common_name": "Ashwagandha", "botanical_name": "Withania somnifera", "extract": "Root extract", "quantity": "250 mg"}],
    "formulation": {"dosage_form": "Tablet", "delivery_mechanism": "Immediate release"},
    "process": {"extraction": "Enzyme-assisted aqueous extraction with cellulase and pectinase at 45 °C", "manufacturing": "Pune, India"},
    "claims": ["Supports a healthy stress response"],
    "markets": ["IN"],
}


def _register(client, markets):
    email = f"jur-{uuid.uuid4().hex[:8]}@example.org"
    client.post("/api/auth/register", json={"name": "Jur Tester", "email": email, "password": "Str0ngPass", "workspace": "Jur WS"})
    h = login(client, email, "Str0ngPass")
    wizard = {**EXTRACTION_WIZARD, "markets": markets}
    r = client.post("/api/innovations", headers=h, json={"wizard": wizard})
    assert r.status_code == 200, r.text
    return h, r.json()["data"]["id"]


def test_match_innovation_respects_target_markets(client):
    """DEMO-FAM-002 (the enzyme-extraction family) has IN + AU members. An innovation
    targeting only India must never be matched against the AU member."""
    h, iid = _register(client, ["IN"])
    pat = client.get(f"/api/innovations/{iid}/patents", headers=h).json()["data"]
    assert pat["matrix"], "expected the extraction feature to match the fictional enzyme-extraction patent family"
    assert all(m["jurisdiction"] == "IN" for m in pat["matrix"]), f"IN-only innovation matched a non-IN patent: {pat['matrix']}"


def test_match_innovation_multi_market_can_include_au(client):
    """The same formulation, but targeting both IN and AU, should be free to match the AU
    family member too — proving the filter is live, not coincidentally always IN-only."""
    h, iid = _register(client, ["IN", "AU"])
    pat = client.get(f"/api/innovations/{iid}/patents", headers=h).json()["data"]
    jurs = {m["jurisdiction"] for m in pat["matrix"]}
    assert jurs <= {"IN", "AU"}
    assert "AU" in jurs, f"expected the AU family member to be matchable once AU is a target market, got {jurs}"


def test_match_innovation_empty_target_markets_is_unfiltered(client):
    """No target markets selected yet -> fall back to unfiltered matching (surfaces the
    'jurisdiction not selected' gap instead of silently hiding every match)."""
    h, iid = _register(client, [])
    pat = client.get(f"/api/innovations/{iid}/patents", headers=h).json()["data"]
    assert pat["matrix"], "empty target_markets should not suppress matching entirely"
    gaps = client.get(f"/api/innovations/{iid}/evidence-gaps", headers=h).json()["data"]
    assert any(g["gap_key"] == "jurisdiction" for g in gaps)


def test_search_patents_sql_level_jurisdiction_filter(client, researcher):
    """General patent search scoped to AU only must never return an IN/US/EP patent."""
    r = client.post("/api/search/patents", headers=researcher, json={"query": "enzyme-assisted extraction", "jurisdictions": ["AU"]})
    assert r.status_code == 200, r.text
    results = r.json()["data"]["results"]
    assert results, "expected at least the AU member of DEMO-FAM-002 to be found"
    assert all(c["jurisdiction"] == "AU" for c in results)


def test_au_permitted_ingredients_gap_present_when_au_targeted(client):
    """Parity with the existing US NDI / IN NBA gap triggers."""
    h, iid = _register(client, ["AU"])
    gaps = client.get(f"/api/innovations/{iid}/evidence-gaps", headers=h).json()["data"]
    assert any(g["gap_key"] == "au-permitted-ingredients" and g["related"]["jurisdiction"] == "AU" for g in gaps)


def test_rag_monitoring_includes_by_jurisdiction(client, admin, researcher):
    client.post("/api/chat", headers=researcher, json={"message": "What does Section 3(p) exclude?", "jurisdiction": "IN"})
    d = client.get("/api/admin/rag", headers=admin).json()["data"]
    assert "by_jurisdiction" in d
    assert sum(d["by_jurisdiction"].values()) == d["queries"]


def test_citations_monitoring_includes_by_jurisdiction(client, admin, researcher):
    client.post("/api/chat", headers=researcher, json={"message": "What does Section 3(p) exclude?", "jurisdiction": "IN"})
    d = client.get("/api/admin/citations", headers=admin).json()["data"]
    assert "by_jurisdiction" in d
    assert sum(d["by_jurisdiction"].values()) == d["claims"]


def test_corpus_upload_rejects_invalid_jurisdiction(client, researcher):
    r = client.post("/api/documents", headers=researcher,
                    data={"title": "Bad jurisdiction test doc", "jurisdiction": "EU", "privacy_ack": "true"},
                    files={"file": ("test.txt", b"Ashwagandha is a botanical used in Ayurveda.", "text/plain")})
    assert r.status_code == 422


def test_admin_document_ingest_rejects_invalid_jurisdiction(client, admin):
    src_id = next(s["id"] for s in client.get("/api/admin/sources", headers=admin).json()["data"])
    r = client.post("/api/admin/documents/ingest", headers=admin,
                    data={"title": "Bad jurisdiction admin doc", "source_id": src_id, "jurisdiction": "EU", "domain": "REGULATORY", "document_type": "REGULATION"},
                    files={"file": ("test.txt", b"Ashwagandha is a botanical used in Ayurveda.", "text/plain")})
    assert r.status_code == 422
