use std::sync::Arc;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::routing::get;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::routes;
use crate::store::WorkbookStore;

/// URL prefix shared by every API route.
pub const API_PREFIX: &str = "/api/v1";
/// Maximum accepted request body: 8 MiB.
pub const MAX_BODY_BYTES: usize = 8 * 1024 * 1024;

/// Shared application state handed to every handler.
#[derive(Debug, Clone)]
pub struct AppState {
    pub workbooks: Arc<WorkbookStore>,
}

impl AppState {
    /// Creates an empty in-memory state.
    pub fn new() -> Self {
        Self {
            workbooks: Arc::new(WorkbookStore::new()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

/// Builds the application router. Binding a socket is the caller's job.
pub fn create_app(state: AppState) -> Router {
    let api = Router::new()
        .route("/health", get(routes::health))
        .route("/meta", get(routes::meta))
        .route(
            "/workbooks/{id}",
            get(routes::get_workbook).put(routes::upsert_workbook),
        );

    Router::new()
        .nest(API_PREFIX, api)
        .layer(DefaultBodyLimit::max(MAX_BODY_BYTES))
        .layer(TraceLayer::new_for_http())
        // Open CORS is intentional for local, split-origin development only.
        .layer(CorsLayer::permissive())
        .with_state(state)
}
