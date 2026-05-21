from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_root_returns_service_message():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Stock price API is running."}


def test_health_check_is_container_friendly():
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "fantasystocks-api"
    assert "timestamp" in payload
