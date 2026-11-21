//! HTTP API server for open-calculator.

pub mod app;
pub mod config;
pub mod error;
pub mod routes;
pub mod store;

/// Server name reported by the health endpoint.
pub const SERVER_NAME: &str = "open-calculator-server";
/// Product name reported by the meta endpoint.
pub const APP_NAME: &str = "open-calculator";
/// Server version reported by the API.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
