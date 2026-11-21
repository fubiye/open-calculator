use thiserror::Error;

/// Host used when `OPEN_CALCULATOR_HOST` is not set. Binding to loopback only
/// keeps the local-first server off the network by default.
pub const DEFAULT_HOST: &str = "127.0.0.1";
/// Port used when `OPEN_CALCULATOR_PORT` is not set.
pub const DEFAULT_PORT: u16 = 8787;

const ENV_HOST: &str = "OPEN_CALCULATOR_HOST";
const ENV_PORT: &str = "OPEN_CALCULATOR_PORT";

/// Server configuration, read from the environment.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub host: String,
    pub port: u16,
}

impl Config {
    /// Reads the configuration from `OPEN_CALCULATOR_HOST` and
    /// `OPEN_CALCULATOR_PORT`, falling back to [`DEFAULT_HOST`] and
    /// [`DEFAULT_PORT`].
    pub fn from_env() -> Result<Self, ConfigError> {
        let host = std::env::var(ENV_HOST).unwrap_or_else(|_| DEFAULT_HOST.to_owned());
        let port = match std::env::var(ENV_PORT) {
            Ok(value) => value
                .parse()
                .map_err(|source| ConfigError::InvalidPort { value, source })?,
            Err(_) => DEFAULT_PORT,
        };

        Ok(Self { host, port })
    }

    /// Returns the `host:port` pair the server binds to.
    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

/// Errors produced while reading the configuration.
#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("invalid OPEN_CALCULATOR_PORT value `{value}`: {source}")]
    InvalidPort {
        value: String,
        source: std::num::ParseIntError,
    },
}
