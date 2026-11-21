use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::app::AppState;
use crate::error::AppError;
use crate::store::Workbook;
use crate::{APP_NAME, SERVER_NAME, VERSION};

/// `GET /api/v1/health`
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        name: SERVER_NAME,
        version: VERSION,
    })
}

/// `GET /api/v1/meta`
pub async fn meta() -> Json<MetaResponse> {
    Json(MetaResponse {
        name: APP_NAME,
        version: VERSION,
        capabilities: Capabilities {
            workbooks: "memory",
            ai: false,
            plugins: false,
        },
    })
}

/// `GET /api/v1/workbooks/{id}`
pub async fn get_workbook(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<WorkbookResponse>, AppError> {
    let workbook = state
        .workbooks
        .get(&id)
        .await
        .ok_or(AppError::WorkbookNotFound(id))?;

    Ok(Json(workbook.into()))
}

/// `PUT /api/v1/workbooks/{id}`
///
/// Upserts the workbook. The extractor accepts `Result` so that malformed JSON
/// is rendered with the API error shape instead of axum's default rejection.
pub async fn upsert_workbook(
    State(state): State<AppState>,
    Path(id): Path<String>,
    payload: Result<Json<UpsertWorkbookRequest>, JsonRejection>,
) -> Result<Json<WorkbookResponse>, AppError> {
    let Json(payload) = payload.map_err(AppError::from_json_rejection)?;
    let workbook = state
        .workbooks
        .upsert(&id, payload.name, payload.snapshot)
        .await;

    Ok(Json(workbook.into()))
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    status: &'static str,
    name: &'static str,
    version: &'static str,
}

#[derive(Debug, Serialize)]
pub struct MetaResponse {
    name: &'static str,
    version: &'static str,
    capabilities: Capabilities,
}

#[derive(Debug, Serialize)]
struct Capabilities {
    workbooks: &'static str,
    ai: bool,
    plugins: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpsertWorkbookRequest {
    pub name: String,
    pub snapshot: Value,
}

impl From<Workbook> for WorkbookResponse {
    fn from(workbook: Workbook) -> Self {
        Self {
            id: workbook.id,
            name: workbook.name,
            snapshot: workbook.snapshot,
            revision: workbook.revision,
            updated_at: workbook.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkbookResponse {
    id: String,
    name: String,
    snapshot: Value,
    revision: u64,
    updated_at: DateTime<Utc>,
}
