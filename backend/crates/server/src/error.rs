use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use thiserror::Error;

/// Errors returned by the HTTP API.
///
/// Every variant renders as `{"error":{"code":...,"message":...}}`.
#[derive(Debug, Error)]
pub enum AppError {
    /// The requested workbook does not exist.
    #[error("workbook `{0}` not found")]
    WorkbookNotFound(String),
    /// The request body is not valid JSON matching the API schema.
    #[error("invalid JSON body: {0}")]
    InvalidJson(String),
    /// The request body exceeds the configured limit.
    #[error("request body too large")]
    PayloadTooLarge,
}

impl AppError {
    /// Maps an axum JSON extractor rejection to the API error shape.
    pub fn from_json_rejection(rejection: JsonRejection) -> Self {
        match rejection.status() {
            StatusCode::PAYLOAD_TOO_LARGE => Self::PayloadTooLarge,
            _ => Self::InvalidJson(rejection.body_text()),
        }
    }

    fn status(&self) -> StatusCode {
        match self {
            Self::WorkbookNotFound(_) => StatusCode::NOT_FOUND,
            Self::InvalidJson(_) => StatusCode::BAD_REQUEST,
            Self::PayloadTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
        }
    }

    fn code(&self) -> &'static str {
        match self {
            Self::WorkbookNotFound(_) => "not_found",
            Self::InvalidJson(_) => "invalid_json",
            Self::PayloadTooLarge => "payload_too_large",
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status();
        let body = ErrorResponse {
            error: ErrorBody {
                code: self.code(),
                message: self.to_string(),
            },
        };

        (status, Json(body)).into_response()
    }
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: ErrorBody,
}

#[derive(Debug, Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
}
