use axum::Router;
use axum::body::{Body, to_bytes};
use axum::http::{Request, StatusCode, header};
use chrono::DateTime;
use open_calculator_server::app::{AppState, MAX_BODY_BYTES, create_app};
use serde_json::{Value, json};
use tower::ServiceExt;

fn app() -> Router {
    create_app(AppState::new())
}

fn get(uri: &str) -> Request<Body> {
    Request::builder()
        .uri(uri)
        .body(Body::empty())
        .expect("valid request")
}

fn put_json(uri: &str, body: &Value) -> Request<Body> {
    Request::builder()
        .method("PUT")
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body.to_string()))
        .expect("valid request")
}

async fn send(app: Router, request: Request<Body>) -> (StatusCode, Value) {
    let response = app.oneshot(request).await.expect("router call");
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    let body = serde_json::from_slice(&bytes).expect("JSON response body");

    (status, body)
}

#[tokio::test]
async fn health_reports_ok() {
    let (status, body) = send(app(), get("/api/v1/health")).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "ok");
    assert_eq!(body["name"], "open-calculator-server");
    assert_eq!(body["version"], "0.1.0");
}

#[tokio::test]
async fn meta_describes_capabilities() {
    let (status, body) = send(app(), get("/api/v1/meta")).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], "open-calculator");
    assert_eq!(body["version"], "0.1.0");
    assert_eq!(body["capabilities"]["workbooks"], "memory");
    assert_eq!(body["capabilities"]["ai"], false);
    assert_eq!(body["capabilities"]["plugins"], false);
}

#[tokio::test]
async fn workbook_put_then_get_roundtrip() {
    let app = app();
    let snapshot = json!({"cells": [{"id": "A1", "value": 42}], "zoom": 1.0});

    let (status, created) = send(
        app.clone(),
        put_json(
            "/api/v1/workbooks/wb-1",
            &json!({"name": "Sheet One", "snapshot": snapshot}),
        ),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(created["id"], "wb-1");
    assert_eq!(created["name"], "Sheet One");
    assert_eq!(created["snapshot"], snapshot);
    assert_eq!(created["revision"], 1);
    let updated_at = created["updatedAt"].as_str().expect("updatedAt string");
    DateTime::parse_from_rfc3339(updated_at).expect("updatedAt is RFC3339");

    let (status, fetched) = send(app.clone(), get("/api/v1/workbooks/wb-1")).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(fetched, created);

    let (status, updated) = send(
        app,
        put_json(
            "/api/v1/workbooks/wb-1",
            &json!({"name": "Sheet One v2", "snapshot": {"cells": []}}),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["id"], "wb-1");
    assert_eq!(updated["name"], "Sheet One v2");
    assert_eq!(updated["snapshot"], json!({"cells": []}));
    assert_eq!(updated["revision"], 2);
}

#[tokio::test]
async fn unknown_workbook_returns_not_found() {
    let (status, body) = send(app(), get("/api/v1/workbooks/missing")).await;

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(body["error"]["code"], "not_found");
    assert!(body["error"]["message"].is_string());
}

#[tokio::test]
async fn invalid_json_returns_bad_request() {
    let request = Request::builder()
        .method("PUT")
        .uri("/api/v1/workbooks/wb-1")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from("{not json"))
        .expect("valid request");

    let (status, body) = send(app(), request).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"]["code"], "invalid_json");
    assert!(body["error"]["message"].is_string());
}

#[tokio::test]
async fn oversized_body_is_rejected() {
    let payload = json!({
        "name": "too big",
        "snapshot": "x".repeat(MAX_BODY_BYTES),
    });

    let (status, body) = send(app(), put_json("/api/v1/workbooks/wb-big", &payload)).await;

    assert_eq!(status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(body["error"]["code"], "payload_too_large");
}
